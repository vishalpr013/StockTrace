import { useEffect, useState } from 'react';
import { useCache } from '../CacheContext';
import { api } from '../api';
import { AlertTriangle } from 'lucide-react';

export const LowStock = () => {
  const { getWarehouses } = useCache();
  const [lowStock, setLowStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadLowStock();
  }, [selectedWarehouse]);

  const loadWarehouses = async () => {
    const data = await getWarehouses();
    setWarehouses(data);
  };

  const loadLowStock = async () => {
    const data = await api.getLowStock(selectedWarehouse);
    setLowStock(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-8 h-8 text-yellow-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Low Stock Items</h1>
          <p className="text-gray-600 mt-1">Products below minimum stock levels</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Warehouse</label>
          <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        {lowStock.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No low stock items found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Warehouse</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Current Stock</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Min Stock</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Deficit</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((item) => {
                const deficit = item.min_stock - parseFloat(item.current_stock);
                return (
                  <tr key={`${item.id}-${item.warehouse_id}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4 font-mono text-sm text-gray-600">{item.sku}</td>
                    <td className="py-3 px-4">{item.warehouse_name}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-red-600">{parseFloat(item.current_stock).toFixed(0)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">{item.min_stock}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-red-600">-{deficit.toFixed(0)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
