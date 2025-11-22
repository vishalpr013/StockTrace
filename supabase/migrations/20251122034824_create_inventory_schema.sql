/*
  # Create Inventory Management System Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `password_hash` (text)
      - `role` (text, enum: ADMIN/STAFF)
      - `default_warehouse_id` (uuid, nullable FK)
      - `created_at` (timestamptz)
    
    - `warehouses`
      - `id` (uuid, primary key)
      - `name` (text)
      - `address` (text, nullable)
      - `created_at` (timestamptz)
    
    - `locations`
      - `id` (uuid, primary key)
      - `warehouse_id` (uuid, FK)
      - `name` (text)
      - `code` (text, nullable)
      - `description` (text, nullable)
      - `created_at` (timestamptz)
    
    - `products`
      - `id` (uuid, primary key)
      - `sku` (text, unique)
      - `name` (text)
      - `category` (text)
      - `uom` (text)
      - `default_warehouse_id` (uuid, nullable FK)
      - `default_location_id` (uuid, nullable FK)
      - `min_stock` (integer, default 0)
      - `opening_stock_qty` (integer, default 0)
      - `created_at` (timestamptz)
    
    - `documents`
      - `id` (uuid, primary key)
      - `doc_type` (text, enum: RECEIPT/DELIVERY/TRANSFER/ADJUSTMENT)
      - `status` (text, enum: DRAFT/CONFIRMED)
      - `date` (date)
      - `warehouse_id` (uuid, nullable FK)
      - `supplier_name` (text, nullable - for RECEIPT)
      - `customer_name` (text, nullable - for DELIVERY)
      - `from_warehouse_id` (uuid, nullable FK - for TRANSFER)
      - `to_warehouse_id` (uuid, nullable FK - for TRANSFER)
      - `reason` (text, nullable - for ADJUSTMENT)
      - `created_by_user_id` (uuid, FK)
      - `confirmed_by_user_id` (uuid, nullable FK)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `document_lines`
      - `id` (uuid, primary key)
      - `document_id` (uuid, FK)
      - `product_id` (uuid, FK)
      - `from_location_id` (uuid, nullable FK)
      - `to_location_id` (uuid, nullable FK)
      - `quantity` (numeric)
      - `created_at` (timestamptz)
    
    - `stock_movements`
      - `id` (uuid, primary key)
      - `product_id` (uuid, FK)
      - `warehouse_id` (uuid, FK)
      - `location_id` (uuid, FK)
      - `document_id` (uuid, FK)
      - `document_line_id` (uuid, FK)
      - `movement_date` (date)
      - `qty_change` (numeric)
      - `created_at` (timestamptz)
    
    - `current_stock`
      - `id` (uuid, primary key)
      - `product_id` (uuid, FK)
      - `warehouse_id` (uuid, FK)
      - `location_id` (uuid, FK)
      - `quantity` (numeric, default 0)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on role

  3. Important Notes
    - All tables use UUID primary keys
    - Timestamps use timestamptz for proper timezone handling
    - Stock is updated only when documents are confirmed
    - Opening stock for products can be set via stock adjustments
*/

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'STAFF')),
  default_warehouse_id uuid REFERENCES warehouses(id),
  created_at timestamptz DEFAULT now()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  uom text NOT NULL,
  default_warehouse_id uuid REFERENCES warehouses(id),
  default_location_id uuid REFERENCES locations(id),
  min_stock integer DEFAULT 0,
  opening_stock_qty integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED')),
  date date NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id),
  supplier_name text,
  customer_name text,
  from_warehouse_id uuid REFERENCES warehouses(id),
  to_warehouse_id uuid REFERENCES warehouses(id),
  reason text,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  confirmed_by_user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create document_lines table
CREATE TABLE IF NOT EXISTS document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  from_location_id uuid REFERENCES locations(id),
  to_location_id uuid REFERENCES locations(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now()
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  location_id uuid NOT NULL REFERENCES locations(id),
  document_id uuid NOT NULL REFERENCES documents(id),
  document_line_id uuid NOT NULL REFERENCES document_lines(id),
  movement_date date NOT NULL,
  qty_change numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create current_stock table
CREATE TABLE IF NOT EXISTS current_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  location_id uuid NOT NULL REFERENCES locations(id),
  quantity numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, warehouse_id, location_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_warehouse ON locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_document_lines_document ON document_lines(document_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_current_stock_product ON current_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_current_stock_warehouse ON current_stock(warehouse_id);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_stock ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for warehouses
CREATE POLICY "Authenticated users can view warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert warehouses"
  ON warehouses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update warehouses"
  ON warehouses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policies for locations
CREATE POLICY "Authenticated users can view locations"
  ON locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policies for documents
CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert draft documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (status = 'DRAFT');

CREATE POLICY "Authenticated users can update draft documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (status = 'DRAFT')
  WITH CHECK (
    (status = 'DRAFT') OR 
    (status = 'CONFIRMED' AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    ))
  );

-- RLS Policies for document_lines
CREATE POLICY "Authenticated users can view document lines"
  ON document_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert document lines"
  ON document_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE id = document_id AND status = 'DRAFT'
    )
  );

CREATE POLICY "Authenticated users can update document lines"
  ON document_lines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE id = document_id AND status = 'DRAFT'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE id = document_id AND status = 'DRAFT'
    )
  );

CREATE POLICY "Authenticated users can delete document lines"
  ON document_lines FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE id = document_id AND status = 'DRAFT'
    )
  );

-- RLS Policies for stock_movements
CREATE POLICY "Authenticated users can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for current_stock
CREATE POLICY "Authenticated users can view current stock"
  ON current_stock FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can upsert current stock"
  ON current_stock FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update current stock"
  ON current_stock FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert seed admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Admin User',
  'admin@inventory.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqFhg8YRiK',
  'ADMIN'
) ON CONFLICT (email) DO NOTHING;