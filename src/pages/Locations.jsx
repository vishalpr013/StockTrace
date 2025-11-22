import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useCache } from '../CacheContext';
import { api } from '../api';
import { Plus, Edit2 } from 'lucide-react';

export const Locations = () => {
  const { isAdmin } = useAuth();
  const { getWarehouses, getLocations, addLocation, updateLocationCache } = useCache();
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({ warehouse_id: '', name: '', code: '', description: '' });

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadLocations();
  }, [selectedWarehouse]);

  const loadWarehouses = async () => {
    const data = await getWarehouses();
    setWarehouses(data);
  };

  const loadLocations = async () => {
    const data = await getLocations(selectedWarehouse);
    setLocations(data);
  };

  const handleAdd = () => {
    setEditingLocation(null);
    setFormData({ warehouse_id: selectedWarehouse, name: '', code: '', description: '' });
    setShowModal(true);
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({ warehouse_id: location.warehouse_id, name: location.name, code: location.code || '', description: location.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        // Optimistic update
        const warehouse = warehouses.find(w => w.id === formData.warehouse_id);
        const updatedLocation = { 
          ...editingLocation, 
          ...formData,
          warehouse_name: warehouse?.name 
        };
        updateLocationCache(updatedLocation);
        setLocations(prev => prev.map(l => l.id === editingLocation.id ? updatedLocation : l));
        
        // API call
        await api.updateLocation(editingLocation.id, formData);
      } else {
        // API call first to get ID
        const newLocation = await api.createLocation(formData);
        
        // Update cache
        addLocation(newLocation);
        // Reload to get proper warehouse_name
        loadLocations();
      }
      setShowModal(false);
    } catch (error) {
      alert('Failed to save location: ' + error.message);
      // Reload on error to fix optimistic update
      loadLocations();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
          <p className="text-gray-600 mt-1">Manage storage locations within warehouses</p>
        </div>
        {isAdmin && (
          <button onClick={handleAdd} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-5 h-5" />
            <span>Add Location</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Warehouse</label>
          <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Warehouse</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Location Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Code</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
              {isAdmin && <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {locations.map((location) => (
              <tr key={location.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">{location.warehouse_name}</td>
                <td className="py-3 px-4 font-medium">{location.name}</td>
                <td className="py-3 px-4 text-gray-600">{location.code || '-'}</td>
                <td className="py-3 px-4 text-gray-600">{location.description || '-'}</td>
                {isAdmin && (
                  <td className="py-3 px-4">
                    <button onClick={() => handleEdit(location)} className="text-blue-600 hover:text-blue-700">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingLocation ? 'Edit Location' : 'Add Location'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                <select value={formData.warehouse_id} onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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
