import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCache } from '../CacheContext';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export const Stock = () => {
  const { getWarehouses, getProducts, invalidateCache } = useCache();
  const [searchParams] = useSearchParams();
  const [allStock, setAllStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    product_id: searchParams.get('product_id') || '',
    warehouse_id: '',
    category: ''
  });

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    loadStock();
  }, []);

  const loadMasterData = async () => {
    const [whs, prods] = await Promise.all([getWarehouses(), getProducts()]);
    setWarehouses(whs);
    setProducts(prods);
  };

  const loadStock = async () => {
    setLoading(true);
    try {
      const data = await api.getStock({});
      setAllStock(data);
    } catch (error) {
      console.error('Failed to load stock:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter stock in memory for instant results
  const stock = useMemo(() => {
    let filtered = allStock;

    if (filters.product_id) {
      filtered = filtered.filter(s => s.product_id === filters.product_id);
    }

    if (filters.warehouse_id) {
      filtered = filtered.filter(s => s.warehouse_id === filters.warehouse_id);
    }

    if (filters.category) {
      // Get product IDs in this category
      const categoryProductIds = products
        .filter(p => p.category === filters.category)
        .map(p => p.id);
      filtered = filtered.filter(s => categoryProductIds.includes(s.product_id));
    }

    return filtered;
  }, [allStock, filters, products]);

  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Overview</h1>
          <p className="text-gray-600 mt-1">Current inventory levels across all locations</p>
        </div>
        <div className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${stock.length} items`}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Product</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">SKU</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Warehouse</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Location</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Quantity</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{item.product_name}</td>
                <td className="py-3 px-4 font-mono text-sm text-gray-600">{item.product_sku}</td>
                <td className="py-3 px-4">{item.warehouse_name}</td>
                <td className="py-3 px-4">{item.location_name}</td>
                <td className="py-3 px-4 text-right font-medium">{parseFloat(item.quantity).toFixed(0)}</td>
                <td className="py-3 px-4">
                  <Link to={`/ledger?product_id=${item.product_id}&warehouse_id=${item.warehouse_id}&location_id=${item.location_id}`} className="text-blue-600 hover:text-blue-700 text-sm">
                    View Ledger
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
