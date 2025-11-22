import { createContext, useContext, useState, useCallback } from 'react';
import { api } from './api';

const CacheContext = createContext();

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within CacheProvider');
  }
  return context;
};

export const CacheProvider = ({ children }) => {
  // Cache storage with timestamps
  const [cache, setCache] = useState({
    warehouses: { data: null, timestamp: null, loading: false },
    locations: { data: null, timestamp: null, loading: false },
    products: { data: null, timestamp: null, loading: false },
    users: { data: null, timestamp: null, loading: false },
    receipts: { data: null, timestamp: null, loading: false },
    deliveries: { data: null, timestamp: null, loading: false },
    transfers: { data: null, timestamp: null, loading: false },
    adjustments: { data: null, timestamp: null, loading: false }
  });

  // Cache expiry time (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Check if cache is valid
  const isCacheValid = (key) => {
    const cached = cache[key];
    if (!cached.data || !cached.timestamp) return false;
    return Date.now() - cached.timestamp < CACHE_DURATION;
  };

  // Generic fetch with caching
  const fetchWithCache = useCallback(async (key, fetchFunction, forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid(key)) {
      return cache[key].data;
    }

    // If already loading, wait for existing request
    if (cache[key].loading) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!cache[key].loading) {
            clearInterval(checkInterval);
            resolve(cache[key].data);
          }
        }, 100);
      });
    }

    // Set loading state
    setCache(prev => ({
      ...prev,
      [key]: { ...prev[key], loading: true }
    }));

    try {
      const data = await fetchFunction();
      
      // Update cache
      setCache(prev => ({
        ...prev,
        [key]: {
          data,
          timestamp: Date.now(),
          loading: false
        }
      }));

      return data;
    } catch (error) {
      // Reset loading on error
      setCache(prev => ({
        ...prev,
        [key]: { ...prev[key], loading: false }
      }));
      throw error;
    }
  }, [cache]);

  // Update cache manually (for optimistic updates)
  const updateCache = useCallback((key, updater) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data: typeof updater === 'function' ? updater(prev[key].data) : updater,
        timestamp: Date.now(),
        loading: false
      }
    }));
  }, []);

  // Invalidate cache (force refresh on next fetch)
  const invalidateCache = useCallback((key) => {
    setCache(prev => ({
      ...prev,
      [key]: { data: null, timestamp: null, loading: false }
    }));
  }, []);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    setCache({
      warehouses: { data: null, timestamp: null, loading: false },
      locations: { data: null, timestamp: null, loading: false },
      products: { data: null, timestamp: null, loading: false },
      users: { data: null, timestamp: null, loading: false },
      receipts: { data: null, timestamp: null, loading: false },
      deliveries: { data: null, timestamp: null, loading: false },
      transfers: { data: null, timestamp: null, loading: false },
      adjustments: { data: null, timestamp: null, loading: false }
    });
  }, []);

  // Specific data fetchers with caching
  const getWarehouses = useCallback((forceRefresh = false) => {
    return fetchWithCache('warehouses', api.getWarehouses, forceRefresh);
  }, [fetchWithCache]);

  const getLocations = useCallback((warehouseId = null, forceRefresh = false) => {
    return fetchWithCache('locations', () => api.getLocations(warehouseId), forceRefresh);
  }, [fetchWithCache]);

  const getProducts = useCallback((forceRefresh = false) => {
    return fetchWithCache('products', api.getProducts, forceRefresh);
  }, [fetchWithCache]);

  const getUsers = useCallback((forceRefresh = false) => {
    return fetchWithCache('users', api.getUsers, forceRefresh);
  }, [fetchWithCache]);

  // Document fetchers with caching (key includes status filter)
  const getDocuments = useCallback((type, statusFilter = '', forceRefresh = false) => {
    const cacheKey = `${type}`;
    // For documents, we use a shorter cache (1 minute) as they change more frequently
    const DOCUMENT_CACHE_DURATION = 1 * 60 * 1000;
    
    const cached = cache[cacheKey];
    if (!forceRefresh && cached.data && cached.timestamp && 
        Date.now() - cached.timestamp < DOCUMENT_CACHE_DURATION) {
      // Filter in memory if status filter is applied
      if (statusFilter) {
        return Promise.resolve(cached.data.filter(doc => doc.status === statusFilter));
      }
      return Promise.resolve(cached.data);
    }

    return fetchWithCache(cacheKey, () => api.getDocuments(type, '', ''), forceRefresh)
      .then(data => {
        // Filter in memory if needed
        if (statusFilter) {
          return data.filter(doc => doc.status === statusFilter);
        }
        return data;
      });
  }, [cache, fetchWithCache]);

  // Optimistic update helpers
  const addWarehouse = useCallback((warehouse) => {
    updateCache('warehouses', (current) => 
      current ? [...current, warehouse] : [warehouse]
    );
  }, [updateCache]);

  const updateWarehouse = useCallback((id, updates) => {
    updateCache('warehouses', (current) =>
      current ? current.map(w => w.id === id ? { ...w, ...updates } : w) : current
    );
  }, [updateCache]);

  const removeWarehouse = useCallback((id) => {
    updateCache('warehouses', (current) =>
      current ? current.filter(w => w.id !== id) : current
    );
  }, [updateCache]);

  const addLocation = useCallback((location) => {
    updateCache('locations', (current) => 
      current ? [...current, location] : [location]
    );
  }, [updateCache]);

  const addProduct = useCallback((product) => {
    updateCache('products', (current) => 
      current ? [...current, product] : [product]
    );
  }, [updateCache]);

  const removeProduct = useCallback((id) => {
    updateCache('products', (current) =>
      current ? current.filter(p => p.id !== id) : current
    );
  }, [updateCache]);

  const addUser = useCallback((user) => {
    updateCache('users', (current) => 
      current ? [...current, user] : [user]
    );
  }, [updateCache]);

  const updateUser = useCallback((id, updates) => {
    updateCache('users', (current) =>
      current ? current.map(u => u.id === id ? { ...u, ...updates } : u) : current
    );
  }, [updateCache]);

  const removeUser = useCallback((id) => {
    updateCache('users', (current) =>
      current ? current.filter(u => u.id !== id) : current
    );
  }, [updateCache]);

  // Document optimistic update helpers
  const addDocument = useCallback((type, document) => {
    updateCache(type, (current) => 
      current ? [...current, document] : [document]
    );
  }, [updateCache]);

  const updateDocument = useCallback((type, id, updates) => {
    updateCache(type, (current) =>
      current ? current.map(doc => doc.id === id ? { ...doc, ...updates } : doc) : current
    );
  }, [updateCache]);

  const removeDocument = useCallback((type, id) => {
    updateCache(type, (current) =>
      current ? current.filter(doc => doc.id !== id) : current
    );
  }, [updateCache]);

  const value = {
    // Data fetchers
    getWarehouses,
    getLocations,
    getProducts,
    getUsers,
    getDocuments,
    
    // Cache management
    invalidateCache,
    clearAllCache,
    isCacheValid: (key) => isCacheValid(key),
    
    // Optimistic updates - Master Data
    addWarehouse,
    updateWarehouse,
    removeWarehouse,
    addLocation,
    updateLocationCache: (location) => updateCache('locations', (current) =>
      current ? current.map(l => l.id === location.id ? location : l) : current
    ),
    updateProductCache: (product) => updateCache('products', (current) =>
      current ? current.map(p => p.id === product.id ? product : p) : current
    ),
    addProduct,
    removeProduct,
    addUser,
    updateUser,
    updateUserCache: (user) => updateCache('users', (current) =>
      current ? current.map(u => u.id === user.id ? user : u) : current
    ),
    removeUser,
    
    // Optimistic updates - Documents
    addDocument,
    updateDocument,
    removeDocument,
    
    // Direct cache access (for reading)
    cache
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};
