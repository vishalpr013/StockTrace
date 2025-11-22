import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from './api';

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const result = await api.searchSuggestions(query);

      if (result.type === 'NAVIGATE_LOW_STOCK') {
        navigate('/low-stock');
      } else if (result.type === 'NAVIGATE_STOCK') {
        navigate(`/stock?product_id=${result.product_id}`);
      } else if (result.type === 'NAVIGATE_MOVEMENTS') {
        navigate(`/movements?product_id=${result.product_id}`);
      }

      setQuery('');
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try: 'low stock', 'stock of Widget', 'movements of...'"
        className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
      />
      <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
    </form>
  );
};
