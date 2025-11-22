# 📦 StockTrace - Inventory Management System

<div align="center">

![StockTrace Logo](src/assets/logo-horizontal.svg)

**A modern, full-stack inventory management system built with React and FastAPI**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue.svg)](https://www.postgresql.org/)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Screenshots](#-screenshots)

</div>

---

## 🌟 Overview

StockTrace is a production-ready inventory management system designed for businesses of all sizes. It provides real-time stock tracking, comprehensive document management, and powerful reporting capabilities with an intuitive user interface.

### ✨ Key Highlights

- 🔐 **Secure Authentication** - JWT-based auth with role-based access control (ADMIN/STAFF)
- 📊 **Real-time Tracking** - Monitor inventory across multiple warehouses and locations
- 📝 **Document Management** - Handle receipts, deliveries, transfers, and adjustments
- 🔄 **Draft-Confirm Workflow** - Review before committing stock changes
- 📈 **Smart Analytics** - Low stock alerts and stockout risk predictions
- 🎨 **Modern UI** - Clean, responsive interface built with Tailwind CSS
- ⚡ **High Performance** - Smart caching for instant data access
- 🔍 **Audit Trail** - Complete movement history with running balance

---

## 🚀 Features

### 👥 User Management
- **Two Role System**: ADMIN (full access) and STAFF (limited access)
- **User Approval Workflow**: New signups require admin approval
- **Secure Authentication**: JWT tokens with password hashing
- **Profile Management**: User-specific default warehouses

### 📦 Master Data Management
| Module | Capabilities |
|--------|-------------|
| **Products** | SKU, name, category, UoM, min stock levels, default locations |
| **Warehouses** | Multiple warehouse support with address management |
| **Locations** | Hierarchical storage locations within warehouses |
| **Users** | Role-based user management with approval workflow |

### 📋 Document Management

All documents follow a **Draft → Confirm** workflow:

1. **Receipts** 📥
   - Record incoming stock from suppliers
   - Multiple line items per receipt
   - Supplier information tracking

2. **Deliveries** 📤
   - Track outgoing stock to customers
   - Customer information management
   - Stock validation before confirmation

3. **Transfers** 🔄
   - Inter-warehouse stock movements
   - Source and destination tracking
   - Automatic stock adjustment

4. **Adjustments** ⚙️
   - Inventory corrections (positive/negative)
   - Reason tracking for audit purposes
   - Physical count reconciliation

### 📊 Reporting & Analytics

- **Dashboard**
  - Summary statistics (products, low stock, pending docs)
  - Recent movements overview
  - Risk alerts with predicted stockout dates
  
- **Stock Overview**
  - Real-time inventory levels
  - Filter by product, warehouse, category, location
  - Export capabilities

- **Movement History**
  - Complete audit trail
  - Filter by date range, product, warehouse
  - Transaction type tracking

- **Low Stock Report**
  - Products below minimum levels
  - Warehouse-wise breakdown
  - Reorder recommendations

- **Stock Ledger**
  - Chronological movement history
  - Running balance calculation
  - Document reference tracking

- **Risk Alerts**
  - Average daily usage calculation
  - Days-to-stockout prediction
  - Proactive inventory management

---

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - Modern UI library with hooks
- **React Router 7.0.1** - Client-side routing
- **Tailwind CSS 3.4.15** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Vite 6.0.1** - Lightning-fast build tool

### Backend
- **FastAPI 0.115.0** - High-performance Python web framework
- **PostgreSQL** - Robust relational database
- **Supabase** - Database hosting and management
- **Pydantic** - Data validation using Python type annotations
- **JWT** - Secure token-based authentication
- **bcrypt** - Password hashing

### DevOps & Tools
- **Git** - Version control
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Python 3.9+** - Backend runtime
- **Node.js 16+** - Frontend runtime

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.9 or higher) - [Download](https://www.python.org/)
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com/) (free tier available)

### 📥 Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/vishalpr013/StockTrace.git
cd StockTrace
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
# Copy the example below and update with your credentials
```

**Backend `.env` file:**
```env
DATABASE_URL=postgresql://postgres.[your-project]:[your-password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

**Apply database migrations:**
```bash
# The schema will be created automatically on first run
# Or you can apply migrations manually:
python apply_migration.py
```

**Start the backend server:**
```bash
python main.py
```

✅ Backend will run at: `http://localhost:8000`
📚 API docs available at: `http://localhost:8000/docs`

#### 3. Frontend Setup

```bash
# Navigate to project root (from backend folder)
cd ..

# Install dependencies
npm install

# Create .env file (optional - only if using custom API URL)
# echo "VITE_API_URL=http://localhost:8000" > .env

# Start development server
npm run dev
```

✅ Frontend will run at: `http://localhost:5173`

### 🎯 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@inventory.com | admin123 |

> ⚠️ **Important**: Change the default admin password after first login!

### 🧪 Generate Test Data (Optional)

```bash
cd backend
python generate_test_data.py
```

This creates:
- 7 warehouses
- 42 locations (6 per warehouse)
- 31 products across different categories
- 55+ documents (receipts, deliveries, transfers, adjustments)
- Realistic stock movements and transaction history

---

## 📖 Documentation

### Project Structure

```
StockTrace/
├── backend/                    # Python FastAPI backend
│   ├── main.py                # Main application with all endpoints
│   ├── auth.py                # Authentication & authorization
│   ├── database.py            # Database connection management
│   ├── requirements.txt       # Python dependencies
│   ├── create_admin.py        # Admin user management utility
│   ├── generate_test_data.py  # Test data generation script
│   └── .env                   # Environment variables (create this)
│
├── src/                       # React frontend
│   ├── pages/                 # Page components
│   │   ├── Login.jsx         # Authentication page
│   │   ├── Dashboard.jsx     # Main dashboard with analytics
│   │   ├── Products.jsx      # Product management
│   │   ├── Warehouses.jsx    # Warehouse management
│   │   ├── Locations.jsx     # Location management
│   │   ├── Stock.jsx         # Stock overview
│   │   ├── Movements.jsx     # Movement history
│   │   ├── LowStock.jsx      # Low stock report
│   │   ├── Ledger.jsx        # Stock ledger
│   │   ├── Receipts.jsx      # Receipt documents
│   │   ├── Deliveries.jsx    # Delivery documents
│   │   ├── Transfers.jsx     # Transfer documents
│   │   └── Adjustments.jsx   # Adjustment documents
│   │
│   ├── assets/               # Static assets (logo, images)
│   ├── api.js                # API client functions
│   ├── AuthContext.jsx       # Authentication state management
│   ├── CacheContext.jsx      # Data caching layer
│   ├── Layout.jsx            # Main layout with navigation
│   ├── RoleGuard.jsx         # Role-based component wrapper
│   ├── SearchBar.jsx         # Smart search component
│   └── App.tsx               # React Router configuration
│
├── supabase/migrations/       # Database migrations
│   ├── 20251122034824_create_inventory_schema.sql
│   └── 20251122_add_user_approval.sql
│
├── docs/                      # Documentation files
│   ├── USER_APPROVAL_WORKFLOW.md
│   └── TEST_DATA_GENERATOR.md
│
├── .gitignore                # Git ignore rules
├── package.json              # Node.js dependencies
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── README.md                 # This file
```

### 🗄️ Database Schema

The system uses 8 main tables:

1. **users** - User accounts with roles and approval status
2. **warehouses** - Warehouse master data
3. **locations** - Storage locations within warehouses
4. **products** - Product catalog with SKU and stock settings
5. **documents** - Transaction headers (all document types)
6. **document_lines** - Transaction line items
7. **stock_movements** - Complete movement history
8. **current_stock** - Real-time inventory levels (product × warehouse × location)

### 🔐 Security Features

- **JWT Authentication** - Secure token-based auth with expiration
- **Password Hashing** - Bcrypt for secure password storage
- **Role-Based Access Control** - ADMIN vs STAFF permissions
- **Row Level Security** - Database-level access control
- **SQL Injection Protection** - Parameterized queries throughout
- **CORS Configuration** - Controlled cross-origin requests
- **User Approval Workflow** - Admin must approve new signups

### 📡 API Endpoints

#### Authentication
```http
POST   /auth/login      # User login
POST   /auth/signup     # User registration
GET    /auth/me         # Get current user
```

#### Master Data (Admin only for create/update/delete)
```http
GET    /products        # List all products
POST   /products        # Create product
PUT    /products/{id}   # Update product
DELETE /products/{id}   # Delete product

GET    /warehouses      # List all warehouses
POST   /warehouses      # Create warehouse
PUT    /warehouses/{id} # Update warehouse
DELETE /warehouses/{id} # Delete warehouse

GET    /locations       # List all locations
POST   /locations       # Create location
PUT    /locations/{id}  # Update location
```

#### Documents (Draft by all, Confirm by Admin only)
```http
GET    /receipts        # List receipts
POST   /receipts        # Create draft receipt
PUT    /receipts/{id}   # Update draft receipt
POST   /receipts/{id}/confirm  # Confirm receipt (updates stock)

# Similar endpoints for: deliveries, transfers, adjustments
```

#### Reporting & Analytics
```http
GET    /stock           # Current stock levels
GET    /movements       # Movement history
GET    /reports/low-stock      # Low stock report
GET    /reports/ledger         # Stock ledger
GET    /dashboard/summary      # Dashboard statistics
GET    /dashboard/risk-alerts  # Stockout predictions
```

#### User Management (Admin only)
```http
GET    /users                    # List users
POST   /users                    # Create user
PUT    /users/{id}               # Update user
DELETE /users/{id}               # Delete user
POST   /users/{id}/approve       # Approve user
POST   /users/{id}/disapprove    # Disapprove user
```

---

## 🔄 Workflow Examples

### 1. Receiving Stock (Receipt)

```
1. Staff creates a DRAFT receipt
   ├── Select warehouse
   ├── Enter supplier name
   └── Add product lines with quantities and locations

2. Admin reviews and confirms
   ├── Validates quantities and locations
   └── Clicks "Confirm"

3. System automatically:
   ├── Updates current_stock (+quantity)
   ├── Creates stock_movements records
   ├── Changes document status to CONFIRMED
   └── Locks document from further edits
```

### 2. Delivering Stock (Delivery)

```
1. Staff creates a DRAFT delivery
   ├── Select warehouse
   ├── Enter customer name
   └── Add product lines with quantities and locations

2. Admin reviews and confirms
   ├── System validates stock availability
   └── Clicks "Confirm"

3. System automatically:
   ├── Updates current_stock (-quantity)
   ├── Creates stock_movements records
   ├── Changes document status to CONFIRMED
   └── Prevents negative stock (validation)
```

### 3. User Signup & Approval

```
1. New user signs up
   ├── Enters name, email, password
   └── Account created with is_approved = false

2. User tries to login
   └── Gets message: "Your account is pending approval"

3. Admin reviews in User Management
   ├── Sees user with "Pending" badge
   └── Clicks approve button

4. User can now login
   └── Full access based on assigned role (STAFF/ADMIN)
```

---

## 🛡️ Best Practices

### Security
- [ ] Change default admin password
- [ ] Update `SECRET_KEY` in production
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Regular database backups
- [ ] Review user permissions periodically

### Performance
- [ ] Enable database connection pooling
- [ ] Implement Redis caching for high traffic
- [ ] Optimize database queries with indexes
- [ ] Use pagination for large datasets
- [ ] Monitor API response times
- [ ] Set up CDN for static assets

### Maintenance
- [ ] Regular database backups (automated)
- [ ] Monitor error logs
- [ ] Update dependencies regularly
- [ ] Test before production deployment
- [ ] Document custom modifications
- [ ] Version control all changes

---

## 🚢 Deployment

### Backend (FastAPI)

**Option 1: Railway / Render / Heroku**
```bash
# Add Procfile
web: uvicorn main:app --host 0.0.0.0 --port $PORT

# Set environment variables in platform dashboard
# Deploy via Git push
```

**Option 2: Docker**
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend (React)

**Option 1: Vercel / Netlify**
```bash
# Build the project
npm run build

# Deploy dist/ folder
# Configure API_URL environment variable
```

**Option 2: Static Hosting**
```bash
npm run build
# Upload dist/ folder to any static host
# Configure environment variables
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Test thoroughly before submitting PR

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check if port 8000 is already in use
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows

# Check database connection
# Verify .env file has correct DATABASE_URL
```

**Frontend won't connect to backend**
```bash
# Verify backend is running on http://localhost:8000
# Check CORS settings in main.py
# Verify API_URL in frontend .env (if using custom URL)
```

**Login fails**
```bash
# Verify admin user exists
cd backend
python check_users.py

# Create admin if needed
python create_admin.py
```

**Stock not updating**
```bash
# Ensure you're confirming documents (not just saving drafts)
# Check user role (only ADMIN can confirm)
# Verify stock_movements table is being populated
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Vishal Prajapati**

- GitHub: [@vishalpr013](https://github.com/vishalpr013)
- Repository: [StockTrace](https://github.com/vishalpr013/odoo_repo)

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Lucide](https://lucide.dev/) - Beautiful & consistent icon toolkit

---

## 📊 Project Statistics

- **Languages**: JavaScript, Python, SQL
- **Frontend Lines of Code**: ~5,000
- **Backend Lines of Code**: ~2,500
- **Total Components**: 18 pages + 5 shared components
- **API Endpoints**: 32+
- **Database Tables**: 8
- **Features**: 50+

---

## 🗺️ Roadmap

### Planned Features
- [ ] 📱 Mobile app (React Native)
- [ ] 📧 Email notifications
- [ ] 📊 Advanced analytics dashboard
- [ ] 🏷️ Barcode/QR code scanning
- [ ] 📦 Batch/lot tracking
- [ ] 💰 Multi-currency support
- [ ] 🌍 Multi-language support
- [ ] 📄 PDF report generation
- [ ] 🔄 Integration APIs (REST/webhooks)
- [ ] 📈 Forecasting & demand planning

---

## 💬 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search [existing issues](https://github.com/vishalpr013/odoo_repo/issues)
3. Create a [new issue](https://github.com/vishalpr013/odoo_repo/issues/new) with details

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by [Vishal Prajapati](https://github.com/vishalpr013)

</div>
