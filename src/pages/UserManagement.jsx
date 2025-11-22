import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useCache } from '../CacheContext';
import { api } from '../api';
import { Shield, UserPlus, Edit2, Trash2, X, AlertCircle, Check, XCircle } from 'lucide-react';

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { getUsers, addUser, updateUserCache, removeUser } = useCache();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'STAFF'
    });
    setError('');
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't show password
      role: user.role
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        // Optimistic update
        const updatedUser = {
          ...editingUser,
          name: formData.name,
          role: formData.role
        };
        updateUserCache(updatedUser);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
        
        // API call
        await api.updateUser(editingUser.id, {
          name: formData.name,
          role: formData.role
        });
      } else {
        // Create new user
        if (!formData.password || formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        
        // API call first to get ID
        const newUser = await api.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });
        
        // Update cache
        addUser(newUser);
        setUsers(prev => [...prev, newUser]);
      }

      setShowModal(false);
      setEditingUser(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save user');
      // Reload on error to fix optimistic update
      loadUsers();
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return;
    }

    try {
      // Optimistic update
      removeUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      
      // API call
      await api.deleteUser(userId);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
      // Reload on error to fix optimistic update
      loadUsers();
    }
  };

  const handleApprove = async (userId, userName) => {
    try {
      // Optimistic update
      const updatedUser = users.find(u => u.id === userId);
      if (updatedUser) {
        const updated = { ...updatedUser, is_approved: true };
        updateUserCache(updated);
        setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      }
      
      // API call
      await api.approveUser(userId);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve user');
      // Reload on error to fix optimistic update
      loadUsers();
    }
  };

  const handleDisapprove = async (userId, userName) => {
    if (!confirm(`Are you sure you want to disapprove user "${userName}"? They will not be able to login.`)) {
      return;
    }

    try {
      // Optimistic update
      const updatedUser = users.find(u => u.id === userId);
      if (updatedUser) {
        const updated = { ...updatedUser, is_approved: false };
        updateUserCache(updated);
        setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      }
      
      // API call
      await api.disapproveUser(userId);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to disapprove user');
      // Reload on error to fix optimistic update
      loadUsers();
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">Manage system users and their roles</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Role</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">
                  {user.name}
                  {user.id === currentUser.id && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-600">{user.email}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                      user.is_approved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {user.is_approved ? (
                      <>
                        <Check className="w-3 h-3" />
                        Approved
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Pending
                      </>
                    )}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  {/* Approval/Disapproval buttons */}
                  {user.id !== currentUser.id && (
                    <>
                      {user.is_approved ? (
                        <button
                          onClick={() => handleDisapprove(user.id, user.name)}
                          className="text-yellow-600 hover:text-yellow-700 transition inline-flex items-center"
                          title="Disapprove user"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApprove(user.id, user.name)}
                          className="text-green-600 hover:text-green-700 transition inline-flex items-center"
                          title="Approve user"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Edit button */}
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-700 transition inline-flex items-center"
                    title="Edit user"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  
                  {/* Delete button */}
                  {user.id !== currentUser.id && (
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="text-red-600 hover:text-red-700 transition inline-flex items-center"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found. Click "Add User" to create one.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingUser}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="john@example.com"
                />
                {editingUser && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                )}
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Min. 6 characters"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'ADMIN' 
                    ? 'Full access - can manage users and confirm documents'
                    : 'Limited access - can view and create drafts only'
                  }
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
