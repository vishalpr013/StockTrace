import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useCache } from '../CacheContext';
import { api } from '../api';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const Warehouses = () => {
  const { isAdmin } = useAuth();
  const { getWarehouses, addWarehouse, updateWarehouseCache, removeWarehouse } = useCache();
  const [warehouses, setWarehouses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
      setError('Failed to load warehouses. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingWarehouse(null);
    setFormData({ name: '', address: '' });
    setShowModal(true);
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({ name: warehouse.name, address: warehouse.address || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        // Optimistic update
        const updatedWarehouse = { ...editingWarehouse, ...formData };
        updateWarehouseCache(updatedWarehouse);
        setWarehouses(prev => prev.map(w => w.id === editingWarehouse.id ? updatedWarehouse : w));
        
        // API call
        await api.updateWarehouse(editingWarehouse.id, formData);
      } else {
        // API call first for new warehouse to get ID
        const newWarehouse = await api.createWarehouse(formData);
        
        // Update cache
        addWarehouse(newWarehouse);
        setWarehouses(prev => [...prev, newWarehouse]);
      }
      setShowModal(false);
    } catch (error) {
      alert('Failed to save warehouse: ' + error.message);
      // Reload on error to fix optimistic update
      loadData();
    }
  };

  const handleDelete = async (warehouse) => {
    if (!confirm(`Are you sure you want to delete warehouse "${warehouse.name}"?`)) {
      return;
    }

    try {
      // Optimistic update
      removeWarehouse(warehouse.id);
      setWarehouses(prev => prev.filter(w => w.id !== warehouse.id));
      
      // API call
      await api.deleteWarehouse(warehouse.id);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to delete warehouse';
      alert(errorMsg);
      // Reload on error to fix optimistic update
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-600 mt-1">Manage warehouse locations</p>
        </div>
        {isAdmin && (
          <button onClick={handleAdd} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-5 h-5" />
            <span>Add Warehouse</span>
          </button>
        )}
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading warehouses...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={loadData} 
            className="mt-2 text-red-600 underline hover:text-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Address</th>
                {isAdmin && <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{warehouse.name}</td>
                <td className="py-3 px-4 text-gray-600">{warehouse.address || '-'}</td>
                {isAdmin && (
                  <td className="py-3 px-4 space-x-3">
                    <button 
                      onClick={() => handleEdit(warehouse)} 
                      className="text-blue-600 hover:text-blue-700 transition inline-flex items-center"
                      title="Edit warehouse"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(warehouse)} 
                      className="text-red-600 hover:text-red-700 transition inline-flex items-center"
                      title="Delete warehouse"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
              ))}
            </tbody>
          </table>

          {warehouses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No warehouses found. Click "Add Warehouse" to create one.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows="3" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
