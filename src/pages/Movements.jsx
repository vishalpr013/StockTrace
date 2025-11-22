import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCache } from '../CacheContext';
import { api } from '../api';

export const Movements = () => {
  const { getWarehouses, getProducts } = useCache();
  const [searchParams] = useSearchParams();
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    product_id: searchParams.get('product_id') || '',
    warehouse_id: '',
    doc_type: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [filters]);

  const loadMasterData = async () => {
    const [whs, prods] = await Promise.all([getWarehouses(), getProducts()]);
    setWarehouses(whs);
    setProducts(prods);
  };

  const loadMovements = async () => {
    const data = await api.getMovements(filters);
    setMovements(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Movement History</h1>
        <p className="text-gray-600 mt-1">Track all stock movements</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <select value={filters.product_id} onChange={(e) => setFilters({ ...filters, product_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">All Products</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse</label>
            <select value={filters.warehouse_id} onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select value={filters.doc_type} onChange={(e) => setFilters({ ...filters, doc_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">All Types</option>
              <option value="RECEIPT">Receipt</option>
              <option value="DELIVERY">Delivery</option>
              <option value="TRANSFER">Transfer</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Product</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Warehouse</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Location</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Qty Change</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((mov) => (
              <tr key={mov.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">{new Date(mov.movement_date).toLocaleDateString()}</td>
                <td className="py-3 px-4">{mov.product_name}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                    {mov.doc_type}
                  </span>
                </td>
                <td className="py-3 px-4">{mov.warehouse_name}</td>
                <td className="py-3 px-4">{mov.location_name}</td>
                <td className={`py-3 px-4 text-right font-medium ${parseFloat(mov.qty_change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(mov.qty_change) >= 0 ? '+' : ''}{parseFloat(mov.qty_change).toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
