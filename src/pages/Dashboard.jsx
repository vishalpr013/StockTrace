import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCache } from '../CacheContext';
import { api } from '../api';
import { Package, AlertTriangle, FileText, Truck, ArrowLeftRight, TrendingDown } from 'lucide-react';

export const Dashboard = () => {
  const { getProducts, getWarehouses, getLocations, getUsers } = useCache();
  const [summary, setSummary] = useState(null);
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Pre-cache all master data for faster navigation
        Promise.all([
          getProducts(),
          getWarehouses(),
          getLocations(),
          getUsers()
        ]).catch(err => console.error('Failed to pre-cache data:', err));
        
        const [summaryData, alertsData] = await Promise.all([
          api.getDashboardSummary(),
          api.getRiskAlerts()
        ]);
        setSummary(summaryData);
        setRiskAlerts(alertsData);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  const cards = [
    {
      title: 'Total Products',
      value: summary.total_products,
      icon: Package,
      color: 'bg-blue-500',
      link: '/products'
    },
    {
      title: 'Low Stock Items',
      value: summary.low_stock_count,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      link: '/low-stock'
    },
    {
      title: 'Pending Receipts',
      value: summary.pending_receipts_count,
      icon: FileText,
      color: 'bg-green-500',
      link: '/receipts?status=DRAFT'
    },
    {
      title: 'Pending Deliveries',
      value: summary.pending_deliveries_count,
      icon: Truck,
      color: 'bg-purple-500',
      link: '/deliveries?status=DRAFT'
    },
    {
      title: 'Pending Transfers',
      value: summary.pending_transfers_count,
      icon: ArrowLeftRight,
      color: 'bg-orange-500',
      link: '/transfers?status=DRAFT'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your inventory system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-full`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {riskAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">At Risk - Predicted Stockouts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">SKU</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Current Stock</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Avg Daily Usage</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Days to Zero</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {riskAlerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{alert.name}</td>
                    <td className="py-3 px-4 text-gray-600">{alert.sku}</td>
                    <td className="py-3 px-4 text-right">{parseFloat(alert.current_stock).toFixed(0)}</td>
                    <td className="py-3 px-4 text-right">{parseFloat(alert.avg_daily_out).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${parseFloat(alert.days_to_zero) <= 3 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {parseFloat(alert.days_to_zero).toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/ledger?product_id=${alert.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Ledger
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingDown className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">Recent Stock Movements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Warehouse</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Location</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Change</th>
              </tr>
            </thead>
            <tbody>
              {summary.last_10_movements.map((movement) => (
                <tr key={movement.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{new Date(movement.movement_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{movement.product_name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                      {movement.doc_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{movement.warehouse_name}</td>
                  <td className="py-3 px-4 text-sm">{movement.location_name}</td>
                  <td className={`py-3 px-4 text-right font-medium ${parseFloat(movement.qty_change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(movement.qty_change) >= 0 ? '+' : ''}{parseFloat(movement.qty_change).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
