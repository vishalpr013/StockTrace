from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from database import get_db_cursor
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
    allow_staff
)

app = FastAPI(title="StockTrace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    default_warehouse_id: Optional[str] = None

class WarehouseCreate(BaseModel):
    name: str
    address: Optional[str] = None

class LocationCreate(BaseModel):
    warehouse_id: str
    name: str
    code: Optional[str] = None
    description: Optional[str] = None

class ProductCreate(BaseModel):
    sku: str
    name: str
    category: str
    uom: str
    default_warehouse_id: Optional[str] = None
    default_location_id: Optional[str] = None
    min_stock: int = 0
    opening_stock_qty: int = 0

class DocumentLineCreate(BaseModel):
    product_id: str
    from_location_id: Optional[str] = None
    to_location_id: Optional[str] = None
    quantity: float

class DocumentCreate(BaseModel):
    date: str
    warehouse_id: Optional[str] = None
    supplier_name: Optional[str] = None
    customer_name: Optional[str] = None
    from_warehouse_id: Optional[str] = None
    to_warehouse_id: Optional[str] = None
    reason: Optional[str] = None
    lines: List[DocumentLineCreate]

@app.post("/auth/login")
def login(request: LoginRequest):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (request.email,))
        user = cursor.fetchone()

        if not user or not verify_password(request.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        
        # Check if user is approved
        if not user.get("is_approved", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is pending approval. Please contact an administrator.",
            )

        access_token = create_access_token(data={"sub": user["id"]})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "default_warehouse_id": user["default_warehouse_id"]
            }
        }
    finally:
        cursor.close()
        conn.close()

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "STAFF"  # Default to STAFF role for new signups

@app.post("/auth/signup")
def signup(request: SignupRequest):
    conn, cursor = get_db_cursor()
    try:
        # Check if user already exists
        cursor.execute("SELECT * FROM users WHERE email = %s", (request.email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # Hash the password
        password_hash = get_password_hash(request.password)
        
        # Create new user (requires admin approval by default)
        cursor.execute(
            """INSERT INTO users (name, email, password_hash, role, is_approved)
               VALUES (%s, %s, %s, %s, %s) RETURNING *""",
            (request.name, request.email, password_hash, request.role, False)
        )
        conn.commit()
        user = cursor.fetchone()
        
        # Return success message (user needs approval before login)
        return {
            "message": "Account created successfully! Please wait for admin approval before logging in.",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "is_approved": user["is_approved"]
            }
        }
    finally:
        cursor.close()
        conn.close()

@app.get("/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "default_warehouse_id": current_user["default_warehouse_id"]
    }

# User Management Endpoints (Admin Only)
@app.get("/users")
def get_users(current_user: dict = Depends(require_admin)):
    """Get all users (Admin only)"""
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("""
            SELECT id, name, email, role, is_approved, created_at, updated_at
            FROM users 
            ORDER BY created_at DESC
        """)
        users = cursor.fetchall()
        return [dict(u) for u in users]
    finally:
        cursor.close()
        conn.close()

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "STAFF"

class UserUpdate(BaseModel):
    name: str
    role: str

@app.post("/users")
def create_user(user: UserCreate, current_user: dict = Depends(require_admin)):
    """Create new user (Admin only) - Auto-approved"""
    conn, cursor = get_db_cursor()
    try:
        # Check if email already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (user.email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password and create user (auto-approved since created by admin)
        password_hash = get_password_hash(user.password)
        cursor.execute(
            """INSERT INTO users (name, email, password_hash, role, is_approved)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING id, name, email, role, is_approved, created_at""",
            (user.name, user.email, password_hash, user.role, True)
        )
        conn.commit()
        new_user = cursor.fetchone()
        return dict(new_user)
    finally:
        cursor.close()
        conn.close()

@app.put("/users/{user_id}")
def update_user(user_id: str, user: UserUpdate, current_user: dict = Depends(require_admin)):
    """Update user (Admin only)"""
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """UPDATE users 
               SET name = %s, role = %s, updated_at = NOW()
               WHERE id = %s
               RETURNING id, name, email, role, created_at, updated_at""",
            (user.name, user.role, user_id)
        )
        conn.commit()
        updated_user = cursor.fetchone()
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(updated_user)
    finally:
        cursor.close()
        conn.close()

@app.delete("/users/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete user (Admin only)"""
    # Prevent deleting yourself
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
        deleted = cursor.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="User not found")
        conn.commit()
        return {"message": "User deleted successfully"}
    finally:
        cursor.close()
        conn.close()

@app.post("/users/{user_id}/approve")
def approve_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Approve a user account (Admin only)"""
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """UPDATE users 
               SET is_approved = TRUE, updated_at = NOW()
               WHERE id = %s
               RETURNING id, name, email, role, is_approved""",
            (user_id,)
        )
        conn.commit()
        updated_user = cursor.fetchone()
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User approved successfully", "user": dict(updated_user)}
    finally:
        cursor.close()
        conn.close()

@app.post("/users/{user_id}/disapprove")
def disapprove_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Disapprove a user account (Admin only)"""
    # Prevent disapproving yourself
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot disapprove yourself"
        )
    
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """UPDATE users 
               SET is_approved = FALSE, updated_at = NOW()
               WHERE id = %s
               RETURNING id, name, email, role, is_approved""",
            (user_id,)
        )
        conn.commit()
        updated_user = cursor.fetchone()
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User disapproved successfully", "user": dict(updated_user)}
    finally:
        cursor.close()
        conn.close()

@app.get("/warehouses")
def get_warehouses(current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT * FROM warehouses ORDER BY name")
        warehouses = cursor.fetchall()
        return [dict(w) for w in warehouses]
    finally:
        cursor.close()
        conn.close()

@app.post("/warehouses")
def create_warehouse(warehouse: WarehouseCreate, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            "INSERT INTO warehouses (name, address) VALUES (%s, %s) RETURNING *",
            (warehouse.name, warehouse.address)
        )
        conn.commit()
        result = cursor.fetchone()
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.put("/warehouses/{warehouse_id}")
def update_warehouse(warehouse_id: str, warehouse: WarehouseCreate, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            "UPDATE warehouses SET name = %s, address = %s WHERE id = %s RETURNING *",
            (warehouse.name, warehouse.address, warehouse_id)
        )
        conn.commit()
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.delete("/warehouses/{warehouse_id}")
def delete_warehouse(warehouse_id: str, current_user: dict = Depends(require_admin)):
    """Delete warehouse (Admin only)"""
    conn, cursor = get_db_cursor()
    try:
        # Check if warehouse has locations
        cursor.execute("SELECT COUNT(*) as count FROM locations WHERE warehouse_id = %s", (warehouse_id,))
        location_count = cursor.fetchone()
        
        if location_count and location_count['count'] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete warehouse. It has {location_count['count']} location(s). Please delete or reassign locations first."
            )
        
        # Check if warehouse has stock
        cursor.execute(
            """SELECT COUNT(*) as count FROM current_stock cs
               JOIN locations l ON cs.location_id = l.id
               WHERE l.warehouse_id = %s AND cs.quantity > 0""",
            (warehouse_id,)
        )
        stock_count = cursor.fetchone()
        
        if stock_count and stock_count['count'] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete warehouse. It has stock in {stock_count['count']} location(s). Please clear stock first."
            )
        
        # Delete the warehouse
        cursor.execute("DELETE FROM warehouses WHERE id = %s RETURNING id, name", (warehouse_id,))
        deleted = cursor.fetchone()
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        
        conn.commit()
        return {"message": f"Warehouse '{deleted['name']}' deleted successfully"}
    finally:
        cursor.close()
        conn.close()

@app.get("/locations")
def get_locations(warehouse_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        if warehouse_id:
            cursor.execute(
                """SELECT l.*, w.name as warehouse_name
                   FROM locations l
                   JOIN warehouses w ON l.warehouse_id = w.id
                   WHERE l.warehouse_id = %s
                   ORDER BY l.name""",
                (warehouse_id,)
            )
        else:
            cursor.execute(
                """SELECT l.*, w.name as warehouse_name
                   FROM locations l
                   JOIN warehouses w ON l.warehouse_id = w.id
                   ORDER BY w.name, l.name"""
            )
        locations = cursor.fetchall()
        return [dict(loc) for loc in locations]
    finally:
        cursor.close()
        conn.close()

@app.post("/locations")
def create_location(location: LocationCreate, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """INSERT INTO locations (warehouse_id, name, code, description)
               VALUES (%s, %s, %s, %s) RETURNING *""",
            (location.warehouse_id, location.name, location.code, location.description)
        )
        conn.commit()
        result = cursor.fetchone()
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.put("/locations/{location_id}")
def update_location(location_id: str, location: LocationCreate, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """UPDATE locations SET warehouse_id = %s, name = %s, code = %s, description = %s
               WHERE id = %s RETURNING *""",
            (location.warehouse_id, location.name, location.code, location.description, location_id)
        )
        conn.commit()
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Location not found")
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.get("/products")
def get_products(current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """SELECT p.*,
                      w.name as default_warehouse_name,
                      l.name as default_location_name
               FROM products p
               LEFT JOIN warehouses w ON p.default_warehouse_id = w.id
               LEFT JOIN locations l ON p.default_location_id = l.id
               ORDER BY p.name"""
        )
        products = cursor.fetchall()
        return [dict(p) for p in products]
    finally:
        cursor.close()
        conn.close()

@app.get("/products/{product_id}")
def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return dict(product)
    finally:
        cursor.close()
        conn.close()

@app.post("/products")
def create_product(product: ProductCreate, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """INSERT INTO products
               (sku, name, category, uom, default_warehouse_id, default_location_id, min_stock, opening_stock_qty)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (product.sku, product.name, product.category, product.uom,
             product.default_warehouse_id, product.default_location_id,
             product.min_stock, product.opening_stock_qty)
        )
        conn.commit()
        result = cursor.fetchone()
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.put("/products/{product_id}")
def update_product(product_id: str, product: ProductCreate, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """UPDATE products SET
               sku = %s, name = %s, category = %s, uom = %s,
               default_warehouse_id = %s, default_location_id = %s,
               min_stock = %s, opening_stock_qty = %s
               WHERE id = %s RETURNING *""",
            (product.sku, product.name, product.category, product.uom,
             product.default_warehouse_id, product.default_location_id,
             product.min_stock, product.opening_stock_qty, product_id)
        )
        conn.commit()
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Product not found")
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.delete("/products/{product_id}")
def delete_product(product_id: str, current_user: dict = Depends(require_admin)):
    """Delete product (Admin only)"""
    conn, cursor = get_db_cursor()
    try:
        # Check if product has stock
        cursor.execute(
            """SELECT COUNT(*) as count FROM current_stock 
               WHERE product_id = %s AND quantity > 0""",
            (product_id,)
        )
        stock_count = cursor.fetchone()
        
        if stock_count and stock_count['count'] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete product. It has stock in {stock_count['count']} location(s). Please clear stock first."
            )
        
        # Check if product is used in any document lines
        cursor.execute(
            """SELECT COUNT(*) as count FROM document_lines 
               WHERE product_id = %s""",
            (product_id,)
        )
        doc_count = cursor.fetchone()
        
        if doc_count and doc_count['count'] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete product. It is referenced in {doc_count['count']} document line(s). This product has transaction history."
            )
        
        # Delete the product
        cursor.execute("DELETE FROM products WHERE id = %s RETURNING id, name", (product_id,))
        deleted = cursor.fetchone()
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Product not found")
        
        conn.commit()
        return {"message": f"Product '{deleted['name']}' deleted successfully"}
    finally:
        cursor.close()
        conn.close()

def get_documents_query(doc_type: str, status_filter: Optional[str], warehouse_id: Optional[str]):
    query = f"""
        SELECT d.*,
               u1.name as created_by_name,
               u2.name as confirmed_by_name,
               w1.name as warehouse_name,
               w2.name as from_warehouse_name,
               w3.name as to_warehouse_name
        FROM documents d
        LEFT JOIN users u1 ON d.created_by_user_id = u1.id
        LEFT JOIN users u2 ON d.confirmed_by_user_id = u2.id
        LEFT JOIN warehouses w1 ON d.warehouse_id = w1.id
        LEFT JOIN warehouses w2 ON d.from_warehouse_id = w2.id
        LEFT JOIN warehouses w3 ON d.to_warehouse_id = w3.id
        WHERE d.doc_type = %s
    """
    params = [doc_type]

    if status_filter:
        query += " AND d.status = %s"
        params.append(status_filter)

    if warehouse_id:
        query += " AND (d.warehouse_id = %s OR d.from_warehouse_id = %s OR d.to_warehouse_id = %s)"
        params.extend([warehouse_id, warehouse_id, warehouse_id])

    query += " ORDER BY d.date DESC, d.created_at DESC"
    return query, params

@app.get("/receipts")
def get_receipts(status: Optional[str] = None, warehouse_id: Optional[str] = None,
                 current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        query, params = get_documents_query("RECEIPT", status, warehouse_id)
        cursor.execute(query, params)
        docs = cursor.fetchall()
        return [dict(d) for d in docs]
    finally:
        cursor.close()
        conn.close()

@app.get("/receipts/{doc_id}")
def get_receipt(doc_id: str, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """SELECT d.*,
                      w.name as warehouse_name
               FROM documents d
               LEFT JOIN warehouses w ON d.warehouse_id = w.id
               WHERE d.id = %s AND d.doc_type = 'RECEIPT'""",
            (doc_id,)
        )
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Receipt not found")

        cursor.execute(
            """SELECT dl.*,
                      p.name as product_name, p.sku as product_sku,
                      l.name as to_location_name
               FROM document_lines dl
               JOIN products p ON dl.product_id = p.id
               LEFT JOIN locations l ON dl.to_location_id = l.id
               WHERE dl.document_id = %s""",
            (doc_id,)
        )
        lines = cursor.fetchall()

        result = dict(doc)
        result["lines"] = [dict(line) for line in lines]
        return result
    finally:
        cursor.close()
        conn.close()

@app.post("/receipts")
def create_receipt(doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """INSERT INTO documents
               (doc_type, status, date, warehouse_id, supplier_name, created_by_user_id)
               VALUES ('RECEIPT', 'DRAFT', %s, %s, %s, %s) RETURNING *""",
            (doc.date, doc.warehouse_id, doc.supplier_name, current_user["id"])
        )
        document = cursor.fetchone()
        doc_id = document["id"]

        for line in doc.lines:
            cursor.execute(
                """INSERT INTO document_lines
                   (document_id, product_id, to_location_id, quantity)
                   VALUES (%s, %s, %s, %s)""",
                (doc_id, line.product_id, line.to_location_id, line.quantity)
            )

        conn.commit()
        return dict(document)
    finally:
        cursor.close()
        conn.close()

@app.put("/receipts/{doc_id}")
def update_receipt(doc_id: str, doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT status FROM documents WHERE id = %s", (doc_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Receipt not found")
        if existing["status"] == "CONFIRMED":
            raise HTTPException(status_code=400, detail="Cannot edit confirmed document")

        cursor.execute(
            """UPDATE documents SET
               date = %s, warehouse_id = %s, supplier_name = %s, updated_at = NOW()
               WHERE id = %s RETURNING *""",
            (doc.date, doc.warehouse_id, doc.supplier_name, doc_id)
        )

        cursor.execute("DELETE FROM document_lines WHERE document_id = %s", (doc_id,))

        for line in doc.lines:
            cursor.execute(
                """INSERT INTO document_lines
                   (document_id, product_id, to_location_id, quantity)
                   VALUES (%s, %s, %s, %s)""",
                (doc_id, line.product_id, line.to_location_id, line.quantity)
            )

        conn.commit()
        document = cursor.fetchone()
        return dict(document)
    finally:
        cursor.close()
        conn.close()

@app.post("/receipts/{doc_id}/confirm")
def confirm_receipt(doc_id: str, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            "SELECT * FROM documents WHERE id = %s AND doc_type = 'RECEIPT'",
            (doc_id,)
        )
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Receipt not found")
        if doc["status"] == "CONFIRMED":
            raise HTTPException(status_code=400, detail="Already confirmed")

        cursor.execute(
            "SELECT * FROM document_lines WHERE document_id = %s",
            (doc_id,)
        )
        lines = cursor.fetchall()

        for line in lines:
            cursor.execute(
                """INSERT INTO stock_movements
                   (product_id, warehouse_id, location_id, document_id, document_line_id,
                    movement_date, qty_change)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (line["product_id"], doc["warehouse_id"], line["to_location_id"],
                 doc_id, line["id"], doc["date"], line["quantity"])
            )

            cursor.execute(
                """INSERT INTO current_stock (product_id, warehouse_id, location_id, quantity)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (product_id, warehouse_id, location_id)
                   DO UPDATE SET quantity = current_stock.quantity + EXCLUDED.quantity,
                                 updated_at = NOW()""",
                (line["product_id"], doc["warehouse_id"], line["to_location_id"], line["quantity"])
            )

        cursor.execute(
            """UPDATE documents SET status = 'CONFIRMED',
               confirmed_by_user_id = %s, updated_at = NOW()
               WHERE id = %s RETURNING *""",
            (current_user["id"], doc_id)
        )

        conn.commit()
        result = cursor.fetchone()
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.get("/deliveries")
def get_deliveries(status: Optional[str] = None, warehouse_id: Optional[str] = None,
                   current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        query, params = get_documents_query("DELIVERY", status, warehouse_id)
        cursor.execute(query, params)
        docs = cursor.fetchall()
        return [dict(d) for d in docs]
    finally:
        cursor.close()
        conn.close()

@app.get("/deliveries/{doc_id}")
def get_delivery(doc_id: str, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """SELECT d.*, w.name as warehouse_name
               FROM documents d
               LEFT JOIN warehouses w ON d.warehouse_id = w.id
               WHERE d.id = %s AND d.doc_type = 'DELIVERY'""",
            (doc_id,)
        )
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Delivery not found")

        cursor.execute(
            """SELECT dl.*,
                      p.name as product_name, p.sku as product_sku,
                      l.name as from_location_name
               FROM document_lines dl
               JOIN products p ON dl.product_id = p.id
               LEFT JOIN locations l ON dl.from_location_id = l.id
               WHERE dl.document_id = %s""",
            (doc_id,)
        )
        lines = cursor.fetchall()

        result = dict(doc)
        result["lines"] = [dict(line) for line in lines]
        return result
    finally:
        cursor.close()
        conn.close()

@app.post("/deliveries")
def create_delivery(doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """INSERT INTO documents
               (doc_type, status, date, warehouse_id, customer_name, created_by_user_id)
               VALUES ('DELIVERY', 'DRAFT', %s, %s, %s, %s) RETURNING *""",
            (doc.date, doc.warehouse_id, doc.customer_name, current_user["id"])
        )
        document = cursor.fetchone()
        doc_id = document["id"]

        for line in doc.lines:
            cursor.execute(
                """INSERT INTO document_lines
                   (document_id, product_id, from_location_id, quantity)
                   VALUES (%s, %s, %s, %s)""",
                (doc_id, line.product_id, line.from_location_id, line.quantity)
            )

        conn.commit()
        return dict(document)
    finally:
        cursor.close()
        conn.close()

@app.put("/deliveries/{doc_id}")
def update_delivery(doc_id: str, doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT status FROM documents WHERE id = %s", (doc_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Delivery not found")
        if existing["status"] == "CONFIRMED":
            raise HTTPException(status_code=400, detail="Cannot edit confirmed document")

        cursor.execute(
            """UPDATE documents SET
               date = %s, warehouse_id = %s, customer_name = %s, updated_at = NOW()
               WHERE id = %s RETURNING *""",
            (doc.date, doc.warehouse_id, doc.customer_name, doc_id)
        )

        cursor.execute("DELETE FROM document_lines WHERE document_id = %s", (doc_id,))

        for line in doc.lines:
            cursor.execute(
                """INSERT INTO document_lines
                   (document_id, product_id, from_location_id, quantity)
                   VALUES (%s, %s, %s, %s)""",
                (doc_id, line.product_id, line.from_location_id, line.quantity)
            )

        conn.commit()
        document = cursor.fetchone()
        return dict(document)
    finally:
        cursor.close()
        conn.close()

@app.post("/deliveries/{doc_id}/confirm")
def confirm_delivery(doc_id: str, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            "SELECT * FROM documents WHERE id = %s AND doc_type = 'DELIVERY'",
            (doc_id,)
        )
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Delivery not found")
        if doc["status"] == "CONFIRMED":
            raise HTTPException(status_code=400, detail="Already confirmed")

        cursor.execute(
            "SELECT * FROM document_lines WHERE document_id = %s",
            (doc_id,)
        )
        lines = cursor.fetchall()

        for line in lines:
            cursor.execute(
                """INSERT INTO stock_movements
                   (product_id, warehouse_id, location_id, document_id, document_line_id,
                    movement_date, qty_change)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (line["product_id"], doc["warehouse_id"], line["from_location_id"],
                 doc_id, line["id"], doc["date"], -line["quantity"])
            )

            cursor.execute(
                """INSERT INTO current_stock (product_id, warehouse_id, location_id, quantity)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (product_id, warehouse_id, location_id)
                   DO UPDATE SET quantity = current_stock.quantity + EXCLUDED.quantity,
                                 updated_at = NOW()""",
                (line["product_id"], doc["warehouse_id"], line["from_location_id"], -line["quantity"])
            )

        cursor.execute(
            """UPDATE documents SET status = 'CONFIRMED',
               confirmed_by_user_id = %s, updated_at = NOW()
               WHERE id = %s RETURNING *""",
            (current_user["id"], doc_id)
        )

        conn.commit()
        result = cursor.fetchone()
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.get("/transfers")
def get_transfers(status: Optional[str] = None, warehouse_id: Optional[str] = None,
                  current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        query, params = get_documents_query("TRANSFER", status, warehouse_id)
        cursor.execute(query, params)
        docs = cursor.fetchall()
        return [dict(d) for d in docs]
    finally:
        cursor.close()
        conn.close()

@app.get("/transfers/{doc_id}")
def get_transfer(doc_id: str, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """SELECT d.*,
                      w1.name as from_warehouse_name,
                      w2.name as to_warehouse_name
               FROM documents d
               LEFT JOIN warehouses w1 ON d.from_warehouse_id = w1.id
               LEFT JOIN warehouses w2 ON d.to_warehouse_id = w2.id
               WHERE d.id = %s AND d.doc_type = 'TRANSFER'""",
            (doc_id,)
        )
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Transfer not found")

        cursor.execute(
            """SELECT dl.*,
                      p.name as product_name, p.sku as product_sku,
                      l1.name as from_location_name,
                      l2.name as to_location_name
               FROM document_lines dl
               JOIN products p ON dl.product_id = p.id
               LEFT JOIN locations l1 ON dl.from_location_id = l1.id
               LEFT JOIN locations l2 ON dl.to_location_id = l2.id
               WHERE dl.document_id = %s""",
            (doc_id,)
        )
        lines = cursor.fetchall()

        result = dict(doc)
        result["lines"] = [dict(line) for line in lines]
        return result
    finally:
        cursor.close()
        conn.close()

@app.post("/transfers")
def create_transfer(doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """INSERT INTO documents
               (doc_type, status, date, from_warehouse_id, to_warehouse_id, created_by_user_id)
               VALUES ('TRANSFER', 'DRAFT', %s, %s, %s, %s) RETURNING *""",
            (doc.date, doc.from_warehouse_id, doc.to_warehouse_id, current_user["id"])
        )
        document = cursor.fetchone()
        doc_id = document["id"]

        for line in doc.lines:
            cursor.execute(
                """INSERT INTO document_lines
                   (document_id, product_id, from_location_id, to_location_id, quantity)
                   VALUES (%s, %s, %s, %s, %s)""",
                (doc_id, line.product_id, line.from_location_id, line.to_location_id, line.quantity)
            )

        conn.commit()
        return dict(document)
    finally:
        cursor.close()
        conn.close()

@app.put("/transfers/{doc_id}")
def update_transfer(doc_id: str, doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT status FROM documents WHERE id = %s", (doc_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Transfer not found")
        if existing["status"] == "CONFIRMED":
            raise HTTPException(status_code=400, detail="Cannot edit confirmed document")

        cursor.execute(
            """UPDATE documents SET
               date = %s, from_warehouse_id = %s, to_warehouse_id = %s, updated_at = NOW()
               WHERE id = %s RETURNING *""",
            (doc.date, doc.from_warehouse_id, doc.to_warehouse_id, doc_id)
        )

        cursor.execute("DELETE FROM document_lines WHERE document_id = %s", (doc_id,))

        for line in doc.lines:
            cursor.execute(
                """INSERT INTO document_lines
                   (document_id, product_id, from_location_id, to_location_id, quantity)
                   VALUES (%s, %s, %s, %s, %s)""",
                (doc_id, line.product_id, line.from_location_id, line.to_location_id, line.quantity)
            )

        conn.commit()
        document = cursor.fetchone()
        return dict(document)
    finally:
        cursor.close()
        conn.close()

@app.post("/transfers/{doc_id}/confirm")
def confirm_transfer(doc_id: str, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            "SELECT * FROM documents WHERE id = %s AND doc_type = 'TRANSFER'",
            (doc_id,)
        )
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Transfer not found")
        if doc["status"] == "CONFIRMED":
            raise HTTPException(status_code=400, detail="Already confirmed")

        cursor.execute(
            "SELECT * FROM document_lines WHERE document_id = %s",
            (doc_id,)
        )
        lines = cursor.fetchall()

        for line in lines:
            cursor.execute(
                """INSERT INTO stock_movements
                   (product_id, warehouse_id, location_id, document_id, document_line_id,
                    movement_date, qty_change)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (line["product_id"], doc["from_warehouse_id"], line["from_location_id"],
                 doc_id, line["id"], doc["date"], -line["quantity"])
            )

            cursor.execute(
                """INSERT INTO current_stock (product_id, warehouse_id, location_id, quantity)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (product_id, warehouse_id, location_id)
                   DO UPDATE SET quantity = current_stock.quantity + EXCLUDED.quantity,
                                 updated_at = NOW()""",
                (line["product_id"], doc["from_warehouse_id"], line["from_location_id"], -line["quantity"])
            )

            cursor.execute(
                """INSERT INTO stock_movements
                   (product_id, warehouse_id, location_id, document_id, document_line_id,
                    movement_date, qty_change)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (line["product_id"], doc["to_warehouse_id"], line["to_location_id"],
                 doc_id, line["id"], doc["date"], line["quantity"])
            )

            cursor.execute(
                """INSERT INTO current_stock (product_id, warehouse_id, location_id, quantity)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (product_id, warehouse_id, location_id)
                   DO UPDATE SET quantity = current_stock.quantity + EXCLUDED.quantity,
                                 updated_at = NOW()""",
                (line["product_id"], doc["to_warehouse_id"], line["to_location_id"], line["quantity"])
            )

        cursor.execute(
            """UPDATE documents SET status = 'CONFIRMED',
               confirmed_by_user_id = %s, updated_at = NOW()
               WHERE id = %s RETURNING *""",
            (current_user["id"], doc_id)
        )

        conn.commit()
        result = cursor.fetchone()
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.get("/adjustments")
def get_adjustments(status: Optional[str] = None, warehouse_id: Optional[str] = None,
                    current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        query, params = get_documents_query("ADJUSTMENT", status, warehouse_id)
        cursor.execute(query, params)
        docs = cursor.fetchall()
        return [dict(d) for d in docs]
    finally:
        cursor.close()
        conn.close()

@app.get("/adjustments/{doc_id}")
def get_adjustment(doc_id: str, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """SELECT d.*, w.name as warehouse_name
               FROM documents d
               LEFT JOIN warehouses w ON d.warehouse_id = w.id
               WHERE d.id = %s AND d.doc_type = 'ADJUSTMENT'""",
            (doc_id,)
        )
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Adjustment not found")

        cursor.execute(
            """SELECT dl.*,
                      p.name as product_name, p.sku as product_sku,
                      l.name as location_name
               FROM document_lines dl
               JOIN products p ON dl.product_id = p.id
               LEFT JOIN locations l ON dl.to_location_id = l.id
               WHERE dl.document_id = %s""",
            (doc_id,)
        )
        lines = cursor.fetchall()

        result = dict(doc)
        result["lines"] = [dict(line) for line in lines]
        return result
    finally:
        cursor.close()
        conn.close()

@app.post("/adjustments")
def create_adjustment(doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            """INSERT INTO documents
               (doc_type, status, date, warehouse_id, reason, created_by_user_id)
               VALUES ('ADJUSTMENT', 'DRAFT', %s, %s, %s, %s) RETURNING *""",
            (doc.date, doc.warehouse_id, doc.reason, current_user["id"])
        )
        document = cursor.fetchone()
        doc_id = document["id"]

        for line in doc.lines:
            cursor.execute(
                """INSERT INTO document_lines
                   (document_id, product_id, to_location_id, quantity)
                   VALUES (%s, %s, %s, %s)""",
                (doc_id, line.product_id, line.to_location_id, line.quantity)
            )

        conn.commit()
        return dict(document)
    finally:
        cursor.close()
        conn.close()

@app.put("/adjustments/{doc_id}")
def update_adjustment(doc_id: str, doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT status FROM documents WHERE id = %s", (doc_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Adjustment not found")
        if existing["status"] == "CONFIRMED":
            raise HTTPException(status_code=400, detail="Cannot edit confirmed document")

        cursor.execute(
            """UPDATE documents SET
               date = %s, warehouse_id = %s, reason = %s, updated_at = NOW()
               WHERE id = %s RETURNING *""",
            (doc.date, doc.warehouse_id, doc.reason, doc_id)
        )

        cursor.execute("DELETE FROM document_lines WHERE document_id = %s", (doc_id,))

        for line in doc.lines:
            cursor.execute(
                """INSERT INTO document_lines
                   (document_id, product_id, to_location_id, quantity)
                   VALUES (%s, %s, %s, %s)""",
                (doc_id, line.product_id, line.to_location_id, line.quantity)
            )

        conn.commit()
        document = cursor.fetchone()
        return dict(document)
    finally:
        cursor.close()
        conn.close()

@app.post("/adjustments/{doc_id}/confirm")
def confirm_adjustment(doc_id: str, current_user: dict = Depends(require_admin)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            "SELECT * FROM documents WHERE id = %s AND doc_type = 'ADJUSTMENT'",
            (doc_id,)
        )
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Adjustment not found")
        if doc["status"] == "CONFIRMED":
            raise HTTPException(status_code=400, detail="Already confirmed")

        cursor.execute(
            "SELECT * FROM document_lines WHERE document_id = %s",
            (doc_id,)
        )
        lines = cursor.fetchall()

        for line in lines:
            cursor.execute(
                """INSERT INTO stock_movements
                   (product_id, warehouse_id, location_id, document_id, document_line_id,
                    movement_date, qty_change)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (line["product_id"], doc["warehouse_id"], line["to_location_id"],
                 doc_id, line["id"], doc["date"], line["quantity"])
            )

            cursor.execute(
                """INSERT INTO current_stock (product_id, warehouse_id, location_id, quantity)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (product_id, warehouse_id, location_id)
                   DO UPDATE SET quantity = current_stock.quantity + EXCLUDED.quantity,
                                 updated_at = NOW()""",
                (line["product_id"], doc["warehouse_id"], line["to_location_id"], line["quantity"])
            )

        cursor.execute(
            """UPDATE documents SET status = 'CONFIRMED',
               confirmed_by_user_id = %s, updated_at = NOW()
               WHERE id = %s RETURNING *""",
            (current_user["id"], doc_id)
        )

        conn.commit()
        result = cursor.fetchone()
        return dict(result)
    finally:
        cursor.close()
        conn.close()

@app.get("/stock")
def get_stock(product_id: Optional[str] = None, warehouse_id: Optional[str] = None,
              location_id: Optional[str] = None, category: Optional[str] = None,
              current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        query = """
            SELECT cs.*,
                   p.name as product_name, p.sku as product_sku, p.category,
                   w.name as warehouse_name,
                   l.name as location_name
            FROM current_stock cs
            JOIN products p ON cs.product_id = p.id
            JOIN warehouses w ON cs.warehouse_id = w.id
            JOIN locations l ON cs.location_id = l.id
            WHERE 1=1
        """
        params = []

        if product_id:
            query += " AND cs.product_id = %s"
            params.append(product_id)

        if warehouse_id:
            query += " AND cs.warehouse_id = %s"
            params.append(warehouse_id)

        if location_id:
            query += " AND cs.location_id = %s"
            params.append(location_id)

        if category:
            query += " AND p.category = %s"
            params.append(category)

        query += " ORDER BY p.name, w.name, l.name"

        cursor.execute(query, params)
        stock = cursor.fetchall()
        return [dict(s) for s in stock]
    finally:
        cursor.close()
        conn.close()

@app.get("/movements")
def get_movements(product_id: Optional[str] = None, warehouse_id: Optional[str] = None,
                  doc_type: Optional[str] = None, date_from: Optional[str] = None,
                  date_to: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        query = """
            SELECT sm.*,
                   p.name as product_name, p.sku as product_sku,
                   w.name as warehouse_name,
                   l.name as location_name,
                   d.doc_type, d.status
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            JOIN warehouses w ON sm.warehouse_id = w.id
            JOIN locations l ON sm.location_id = l.id
            JOIN documents d ON sm.document_id = d.id
            WHERE 1=1
        """
        params = []

        if product_id:
            query += " AND sm.product_id = %s"
            params.append(product_id)

        if warehouse_id:
            query += " AND sm.warehouse_id = %s"
            params.append(warehouse_id)

        if doc_type:
            query += " AND d.doc_type = %s"
            params.append(doc_type)

        if date_from:
            query += " AND sm.movement_date >= %s"
            params.append(date_from)

        if date_to:
            query += " AND sm.movement_date <= %s"
            params.append(date_to)

        query += " ORDER BY sm.movement_date DESC, sm.created_at DESC"

        cursor.execute(query, params)
        movements = cursor.fetchall()
        return [dict(m) for m in movements]
    finally:
        cursor.close()
        conn.close()

@app.get("/reports/low-stock")
def get_low_stock(warehouse_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        query = """
            SELECT p.id, p.name, p.sku, p.min_stock,
                   w.id as warehouse_id, w.name as warehouse_name,
                   COALESCE(SUM(cs.quantity), 0) as current_stock
            FROM products p
            CROSS JOIN warehouses w
            LEFT JOIN current_stock cs ON p.id = cs.product_id AND w.id = cs.warehouse_id
        """
        params = []

        if warehouse_id:
            query += " WHERE w.id = %s"
            params.append(warehouse_id)

        query += """
            GROUP BY p.id, p.name, p.sku, p.min_stock, w.id, w.name
            HAVING COALESCE(SUM(cs.quantity), 0) < p.min_stock
            ORDER BY p.name
        """

        cursor.execute(query, params)
        low_stock = cursor.fetchall()
        return [dict(ls) for ls in low_stock]
    finally:
        cursor.close()
        conn.close()

@app.get("/reports/ledger")
def get_ledger(product_id: str, warehouse_id: Optional[str] = None,
               location_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        query = """
            SELECT sm.*,
                   d.doc_type,
                   w.name as warehouse_name,
                   l1.name as location_name,
                   l2.name as from_location_name,
                   l3.name as to_location_name
            FROM stock_movements sm
            JOIN documents d ON sm.document_id = d.id
            JOIN warehouses w ON sm.warehouse_id = w.id
            JOIN locations l1 ON sm.location_id = l1.id
            LEFT JOIN document_lines dl ON sm.document_line_id = dl.id
            LEFT JOIN locations l2 ON dl.from_location_id = l2.id
            LEFT JOIN locations l3 ON dl.to_location_id = l3.id
            WHERE sm.product_id = %s
        """
        params = [product_id]

        if warehouse_id:
            query += " AND sm.warehouse_id = %s"
            params.append(warehouse_id)

        if location_id:
            query += " AND sm.location_id = %s"
            params.append(location_id)

        query += " ORDER BY sm.movement_date ASC, sm.created_at ASC"

        cursor.execute(query, params)
        movements = cursor.fetchall()

        running_balance = 0
        ledger = []
        for mov in movements:
            running_balance += float(mov["qty_change"])
            entry = dict(mov)
            entry["running_balance"] = running_balance
            ledger.append(entry)

        return ledger
    finally:
        cursor.close()
        conn.close()

@app.get("/dashboard/summary")
def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT COUNT(*) as count FROM products")
        total_products = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT COUNT(DISTINCT p.id) as count
            FROM products p
            LEFT JOIN (
                SELECT product_id, SUM(quantity) as total_qty
                FROM current_stock
                GROUP BY product_id
            ) cs ON p.id = cs.product_id
            WHERE COALESCE(cs.total_qty, 0) < p.min_stock
        """)
        low_stock_count = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT COUNT(*) as count FROM documents
            WHERE doc_type = 'RECEIPT' AND status = 'DRAFT'
        """)
        pending_receipts = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT COUNT(*) as count FROM documents
            WHERE doc_type = 'DELIVERY' AND status = 'DRAFT'
        """)
        pending_deliveries = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT COUNT(*) as count FROM documents
            WHERE doc_type = 'TRANSFER' AND status = 'DRAFT'
        """)
        pending_transfers = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT sm.*,
                   p.name as product_name, p.sku as product_sku,
                   w.name as warehouse_name,
                   l.name as location_name,
                   d.doc_type
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            JOIN warehouses w ON sm.warehouse_id = w.id
            JOIN locations l ON sm.location_id = l.id
            JOIN documents d ON sm.document_id = d.id
            ORDER BY sm.created_at DESC
            LIMIT 10
        """)
        last_movements = cursor.fetchall()

        return {
            "total_products": total_products,
            "low_stock_count": low_stock_count,
            "pending_receipts_count": pending_receipts,
            "pending_deliveries_count": pending_deliveries,
            "pending_transfers_count": pending_transfers,
            "last_10_movements": [dict(m) for m in last_movements]
        }
    finally:
        cursor.close()
        conn.close()

@app.get("/dashboard/risk-alerts")
def get_risk_alerts(current_user: dict = Depends(get_current_user)):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("""
            WITH product_outflows AS (
                SELECT
                    product_id,
                    AVG(ABS(qty_change)) as avg_daily_out
                FROM stock_movements
                WHERE qty_change < 0
                  AND movement_date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY product_id
                HAVING AVG(ABS(qty_change)) > 0
            ),
            current_totals AS (
                SELECT product_id, SUM(quantity) as total_stock
                FROM current_stock
                GROUP BY product_id
            )
            SELECT
                p.id, p.name, p.sku,
                ct.total_stock as current_stock,
                po.avg_daily_out,
                CASE
                    WHEN po.avg_daily_out > 0 THEN ct.total_stock / po.avg_daily_out
                    ELSE 999
                END as days_to_zero
            FROM products p
            LEFT JOIN current_totals ct ON p.id = ct.product_id
            LEFT JOIN product_outflows po ON p.id = po.product_id
            WHERE po.avg_daily_out > 0
              AND ct.total_stock / po.avg_daily_out <= 7
            ORDER BY days_to_zero ASC
        """)
        alerts = cursor.fetchall()
        return [dict(a) for a in alerts]
    finally:
        cursor.close()
        conn.close()

@app.get("/search/suggestions")
def search_suggestions(q: str, current_user: dict = Depends(get_current_user)):
    q_lower = q.lower().strip()

    if q_lower == "low stock":
        return {"type": "NAVIGATE_LOW_STOCK"}

    if q_lower.startswith("stock of "):
        product_search = q_lower.replace("stock of ", "").strip()
        conn, cursor = get_db_cursor()
        try:
            cursor.execute(
                "SELECT id, name, sku FROM products WHERE LOWER(name) LIKE %s OR LOWER(sku) LIKE %s LIMIT 1",
                (f"%{product_search}%", f"%{product_search}%")
            )
            product = cursor.fetchone()
            if product:
                return {
                    "type": "NAVIGATE_STOCK",
                    "product_id": product["id"],
                    "product_name": product["name"]
                }
        finally:
            cursor.close()
            conn.close()

    if q_lower.startswith("movements of "):
        product_search = q_lower.replace("movements of ", "").strip()
        conn, cursor = get_db_cursor()
        try:
            cursor.execute(
                "SELECT id, name, sku FROM products WHERE LOWER(name) LIKE %s OR LOWER(sku) LIKE %s LIMIT 1",
                (f"%{product_search}%", f"%{product_search}%")
            )
            product = cursor.fetchone()
            if product:
                return {
                    "type": "NAVIGATE_MOVEMENTS",
                    "product_id": product["id"],
                    "product_name": product["name"]
                }
        finally:
            cursor.close()
            conn.close()

    return {"type": "NO_MATCH"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
