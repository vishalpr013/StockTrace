const API_URL = 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const api = {
  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  async signup(name, email, password) {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return response.json();
  },

  async getMe() {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to get user');
    return response.json();
  },

  async getWarehouses() {
    const response = await fetch(`${API_URL}/warehouses`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch warehouses');
    return response.json();
  },

  async createWarehouse(data) {
    const response = await fetch(`${API_URL}/warehouses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create warehouse');
    return response.json();
  },

  async updateWarehouse(id, data) {
    const response = await fetch(`${API_URL}/warehouses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update warehouse');
    return response.json();
  },

  async deleteWarehouse(id) {
    const response = await fetch(`${API_URL}/warehouses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return response.json();
  },

  async getLocations(warehouseId) {
    const url = warehouseId
      ? `${API_URL}/locations?warehouse_id=${warehouseId}`
      : `${API_URL}/locations`;
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch locations');
    return response.json();
  },

  async createLocation(data) {
    const response = await fetch(`${API_URL}/locations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create location');
    return response.json();
  },

  async updateLocation(id, data) {
    const response = await fetch(`${API_URL}/locations/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update location');
    return response.json();
  },

  async getProducts() {
    const response = await fetch(`${API_URL}/products`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  async getProduct(id) {
    const response = await fetch(`${API_URL}/products/${id}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  async createProduct(data) {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  },

  async updateProduct(id, data) {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
  },

  async deleteProduct(id) {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.detail || 'Failed to delete product');
      error.response = { data: errorData };
      throw error;
    }
    return response.json();
  },

  async getDocuments(type, status, warehouseId) {
    let url = `${API_URL}/${type}`;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (warehouseId) params.append('warehouse_id', warehouseId);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch ${type}`);
    return response.json();
  },

  async getDocument(type, id) {
    const response = await fetch(`${API_URL}/${type}/${id}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch ${type}`);
    return response.json();
  },

  async createDocument(type, data) {
    const response = await fetch(`${API_URL}/${type}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to create ${type}`);
    return response.json();
  },

  async updateDocument(type, id, data) {
    const response = await fetch(`${API_URL}/${type}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to update ${type}`);
    return response.json();
  },

  async confirmDocument(type, id) {
    const response = await fetch(`${API_URL}/${type}/${id}/confirm`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to confirm ${type}`);
    return response.json();
  },

  async getStock(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const url = params.toString() ? `${API_URL}/stock?${params}` : `${API_URL}/stock`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch stock');
    return response.json();
  },

  async getMovements(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const url = params.toString() ? `${API_URL}/movements?${params}` : `${API_URL}/movements`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch movements');
    return response.json();
  },

  async getLowStock(warehouseId) {
    const url = warehouseId
      ? `${API_URL}/reports/low-stock?warehouse_id=${warehouseId}`
      : `${API_URL}/reports/low-stock`;
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch low stock');
    return response.json();
  },

  async getLedger(productId, warehouseId, locationId) {
    const params = new URLSearchParams({ product_id: productId });
    if (warehouseId) params.append('warehouse_id', warehouseId);
    if (locationId) params.append('location_id', locationId);

    const response = await fetch(`${API_URL}/reports/ledger?${params}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch ledger');
    return response.json();
  },

  async getDashboardSummary() {
    const response = await fetch(`${API_URL}/dashboard/summary`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard summary');
    return response.json();
  },

  async getRiskAlerts() {
    const response = await fetch(`${API_URL}/dashboard/risk-alerts`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch risk alerts');
    return response.json();
  },

  async searchSuggestions(query) {
    const response = await fetch(`${API_URL}/search/suggestions?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to search');
    return response.json();
  },

  // User Management (Admin only)
  async getUsers() {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async createUser(data) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return response.json();
  },

  async updateUser(id, data) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return response.json();
  },

  async deleteUser(id) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return response.json();
  },

  async approveUser(id) {
    const response = await fetch(`${API_URL}/users/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return response.json();
  },

  async disapproveUser(id) {
    const response = await fetch(`${API_URL}/users/${id}/disapprove`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }
    return response.json();
  }
};
