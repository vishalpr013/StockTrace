import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCache } from '../CacheContext';
import { api } from '../api';
import { BookOpen } from 'lucide-react';

export const Ledger = () => {
  const { getProducts, getWarehouses, getLocations } = useCache();
  const [searchParams] = useSearchParams();
  const [ledger, setLedger] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [productId, setProductId] = useState(searchParams.get('product_id') || '');
  const [warehouseId, setWarehouseId] = useState(searchParams.get('warehouse_id') || '');
  const [locationId, setLocationId] = useState(searchParams.get('location_id') || '');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (productId) {
      loadLedger();
      const product = products.find(p => p.id === productId);
      setSelectedProduct(product);
    }
  }, [productId, warehouseId, locationId]);

  const loadMasterData = async () => {
    const [prods, whs, locs] = await Promise.all([
      getProducts(),
      getWarehouses(),
      getLocations()
    ]);
    setProducts(prods);
    setWarehouses(whs);
    setLocations(locs);
  };

  const loadLedger = async () => {
    if (!productId) return;
    const data = await api.getLedger(productId, warehouseId, locationId);
    setLedger(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <BookOpen className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Ledger</h1>
          <p className="text-gray-600 mt-1">Detailed movement history with running balance</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Select Product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">All Locations</option>
              {locations.filter(l => !warehouseId || l.warehouse_id === warehouseId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {selectedProduct && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900">{selectedProduct.name}</h3>
            <p className="text-sm text-blue-700">SKU: {selectedProduct.sku}</p>
          </div>
        )}

        {!productId ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Please select a product to view its ledger</p>
          </div>
        ) : ledger.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No movements found for this product</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Warehouse</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Location</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">In</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Out</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 bg-blue-50">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => {
                  const qtyChange = parseFloat(entry.qty_change);
                  const isPositive = qtyChange >= 0;
                  return (
                    <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(entry.movement_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                          {entry.doc_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">{entry.warehouse_name}</td>
                      <td className="py-3 px-4">{entry.location_name}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        {isPositive ? qtyChange.toFixed(0) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">
                        {!isPositive ? Math.abs(qtyChange).toFixed(0) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold bg-blue-50">
                        {parseFloat(entry.running_balance).toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
