import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCache } from '../CacheContext';
import { api } from '../api';
import { Plus, Eye, Edit2, Check } from 'lucide-react';

export const Receipts = () => {
  const { isAdmin } = useAuth();
  const { getWarehouses, getLocations, getProducts, getDocuments, addDocument, updateDocument, invalidateCache } = useCache();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    supplier_name: '',
    lines: []
  });

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    const [docs, whs, locs, prods] = await Promise.all([
      getDocuments('receipts', statusFilter),
      getWarehouses(),
      getLocations(),
      getProducts()
    ]);
    setDocuments(docs);
    setWarehouses(whs);
    setLocations(locs);
    setProducts(prods);
  };

  const handleCreate = () => {
    setEditingDoc(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      warehouse_id: '',
      supplier_name: '',
      lines: [{ product_id: '', to_location_id: '', quantity: 0 }]
    });
    setShowModal(true);
  };

  const handleEdit = async (doc) => {
    const fullDoc = await api.getDocument('receipts', doc.id);
    setEditingDoc(fullDoc);
    setFormData({
      date: fullDoc.date,
      warehouse_id: fullDoc.warehouse_id,
      supplier_name: fullDoc.supplier_name || '',
      lines: fullDoc.lines.map(l => ({ product_id: l.product_id, to_location_id: l.to_location_id, quantity: l.quantity }))
    });
    setShowModal(true);
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: '', to_location_id: '', quantity: 0 }]
    });
  };

  const removeLine = (index) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index)
    });
  };

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDoc) {
        // Update existing document
        const updated = await api.updateDocument('receipts', editingDoc.id, formData);
        updateDocument('receipts', editingDoc.id, updated);
        setDocuments(prev => prev.map(d => d.id === editingDoc.id ? updated : d));
      } else {
        // Create new document
        const newDoc = await api.createDocument('receipts', formData);
        addDocument('receipts', newDoc);
        setDocuments(prev => [...prev, newDoc]);
      }
      setShowModal(false);
    } catch (error) {
      alert('Failed to save receipt: ' + error.message);
      // Reload on error
      invalidateCache('receipts');
      loadData();
    }
  };

  const handleConfirm = async (docId) => {
    if (!confirm('Confirm this receipt? This will update stock levels.')) return;
    try {
      await api.confirmDocument('receipts', docId);
      // Invalidate cache and reload to get updated status
      invalidateCache('receipts');
      loadData();
    } catch (error) {
      alert('Failed to confirm: ' + error.message);
    }
  };

  const warehouseLocations = formData.warehouse_id
    ? locations.filter(l => l.warehouse_id === formData.warehouse_id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-600 mt-1">Manage incoming stock receipts</p>
        </div>
        <button onClick={handleCreate} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>New Receipt</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Supplier</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Warehouse</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">{new Date(doc.date).toLocaleDateString()}</td>
                <td className="py-3 px-4">{doc.supplier_name}</td>
                <td className="py-3 px-4">{doc.warehouse_name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${doc.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="py-3 px-4 flex items-center space-x-2">
                  {doc.status === 'DRAFT' && (
                    <button onClick={() => handleEdit(doc)} className="text-blue-600 hover:text-blue-700">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {doc.status === 'DRAFT' && isAdmin && (
                    <button onClick={() => handleConfirm(doc.id)} className="text-green-600 hover:text-green-700">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl m-4">
            <h2 className="text-xl font-bold mb-4">{editingDoc ? 'Edit Receipt' : 'New Receipt'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                  <select value={formData.warehouse_id} onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input type="text" value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Lines</label>
                  <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:text-blue-700">+ Add Line</button>
                </div>
                <div className="space-y-2">
                  {formData.lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <select value={line.product_id} onChange={(e) => updateLine(index, 'product_id', e.target.value)} required className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select value={line.to_location_id} onChange={(e) => updateLine(index, 'to_location_id', e.target.value)} required className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">Select Location</option>
                        {warehouseLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                      <input type="number" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value))} required min="0.01" step="0.01" className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <button type="button" onClick={() => removeLine(index)} className="col-span-1 text-red-600 hover:text-red-700 text-sm">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
