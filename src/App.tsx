import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { CacheProvider } from './CacheContext';
import { Layout } from './Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Warehouses } from './pages/Warehouses';
import { Locations } from './pages/Locations';
import { Stock } from './pages/Stock';
import { Movements } from './pages/Movements';
import { LowStock } from './pages/LowStock';
import { Ledger } from './pages/Ledger';
import { Receipts } from './pages/Receipts';
import { Deliveries } from './pages/Deliveries';
import { Transfers } from './pages/Transfers';
import { Adjustments } from './pages/Adjustments';
import { UserManagement } from './pages/UserManagement';

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <CacheProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="warehouses" element={<Warehouses />} />
              <Route path="locations" element={<Locations />} />
              <Route path="stock" element={<Stock />} />
              <Route path="movements" element={<Movements />} />
              <Route path="low-stock" element={<LowStock />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="deliveries" element={<Deliveries />} />
              <Route path="transfers" element={<Transfers />} />
              <Route path="adjustments" element={<Adjustments />} />
              <Route path="users" element={<UserManagement />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CacheProvider>
    </AuthProvider>
  );
}

export default App;
