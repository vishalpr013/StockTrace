import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { SearchBar } from './SearchBar';
import { AdminOnly } from './RoleGuard';
import {
  LayoutDashboard, Package, Warehouse, MapPin, Box,
  TrendingDown, FileText, Truck, ArrowLeftRight, Settings as SettingsIcon,
  LogOut, User, Shield
} from 'lucide-react';
import logo from './assets/logo-horizontal.svg';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/warehouses', label: 'Warehouses', icon: Warehouse },
    { path: '/locations', label: 'Locations', icon: MapPin },
    { path: '/stock', label: 'Stock Overview', icon: Box },
    { path: '/movements', label: 'Movements', icon: TrendingDown },
    { path: '/receipts', label: 'Receipts', icon: FileText },
    { path: '/deliveries', label: 'Deliveries', icon: Truck },
    { path: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
    { path: '/adjustments', label: 'Adjustments', icon: SettingsIcon },
    { path: '/users', label: 'Users', icon: Shield, adminOnly: true }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center flex-1">
              <Link to="/dashboard" className="flex items-center hover:opacity-80 transition">
                <img src={logo} alt="StockTrace" className="h-10" />
              </Link>
              <div className="ml-8 flex-1 max-w-md">
                <SearchBar />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5" />
                <div className="text-sm">
                  <div className="font-medium">{user?.name}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user?.role === 'ADMIN'
                          ? 'bg-purple-600 text-white'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 rounded hover:bg-gray-800 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-4rem)]">
          <nav className="py-4">
            {navItems.map(({ path, label, icon: Icon, adminOnly }) => {
              const navLink = (
                <Link
                  key={path}
                  to={path}
                  className="flex items-center space-x-3 px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </Link>
              );
              
              return adminOnly ? (
                <AdminOnly key={path}>{navLink}</AdminOnly>
              ) : (
                navLink
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
