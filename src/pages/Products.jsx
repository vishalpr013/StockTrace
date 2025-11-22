import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useCache } from '../CacheContext';
import { AdminOnly } from '../RoleGuard';
import { api } from '../api';
import { Plus, Edit2, Trash2, Search, Lock } from 'lucide-react';

export const Products = () => {
  const { canEditMasterData } = useAuth();
  const { getProducts, getWarehouses, getLocations, addProduct, updateProductCache, removeProduct } = useCache();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    uom: '',
    default_warehouse_id: '',
    default_location_id: '',
    min_stock: 0,
    opening_stock_qty: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, warehousesData, locationsData] = await Promise.all([
        getProducts(),
        getWarehouses(),
        getLocations()
      ]);
      setProducts(productsData);
      setWarehouses(warehousesData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      category: '',
      uom: '',
      default_warehouse_id: '',
      default_location_id: '',
      min_stock: 0,
      opening_stock_qty: 0
    });
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      category: product.category,
      uom: product.uom,
      default_warehouse_id: product.default_warehouse_id || '',
      default_location_id: product.default_location_id || '',
      min_stock: product.min_stock,
      opening_stock_qty: product.opening_stock_qty
    });
    setShowModal(true);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete product "${product.name}" (${product.sku})?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      // Optimistic update
      removeProduct(product.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
      
      await api.deleteProduct(product.id);
      alert('Product deleted successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      alert(error.response?.data?.detail || error.message || 'Failed to delete product');
      // Reload data to recover from failed deletion
      loadData();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        default_warehouse_id: formData.default_warehouse_id || null,
        default_location_id: formData.default_location_id || null
      };

      if (editingProduct) {
        // Optimistic update
        const updatedProduct = { ...editingProduct, ...payload };
        updateProductCache(updatedProduct);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p));
        
        // API call
        await api.updateProduct(editingProduct.id, payload);
      } else {
        // API call first to get ID
        const newProduct = await api.createProduct(payload);
        
        // Update cache
        addProduct(newProduct);
        setProducts(prev => [...prev, newProduct]);
      }
      setShowModal(false);
    } catch (error) {
      alert('Failed to save product: ' + error.message);
      // Reload on error to fix optimistic update
      loadData();
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">
            Manage your product catalog
            {!canEditMasterData && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                <Lock className="w-3 h-3 inline mr-1" />
                View Only
              </span>
            )}
          </p>
        </div>
        <AdminOnly>
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Product</span>
          </button>
        </AdminOnly>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">UoM</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Min Stock</th>
                {canEditMasterData && <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm">{product.sku}</td>
                  <td className="py-3 px-4 font-medium">{product.name}</td>
                  <td className="py-3 px-4">{product.category}</td>
                  <td className="py-3 px-4">{product.uom}</td>
                  <td className="py-3 px-4 text-right">{product.min_stock}</td>
                  <AdminOnly>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-700 transition"
                          title="Edit product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="text-red-600 hover:text-red-700 transition"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </AdminOnly>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
                <input
                  type="text"
                  value={formData.uom}
                  onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                <input
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
