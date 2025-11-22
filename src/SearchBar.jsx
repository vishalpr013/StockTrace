import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Package, 
  MapPin, 
  TrendingDown, 
  Box, 
  AlertTriangle,
  FileText,
  Truck,
  ArrowLeftRight,
  Settings,
  Warehouse
} from 'lucide-react';
import { api } from './api';

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const results = await api.smartSearch(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSuggestionClick = (suggestion) => {
    navigateToSuggestion(suggestion);
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const navigateToSuggestion = (suggestion) => {
    switch (suggestion.type) {
      case 'PRODUCT':
        navigate(`/products`);
        break;
      case 'PRODUCT_STOCK':
        navigate(`/stock?product_id=${suggestion.id}`);
        break;
      case 'PRODUCT_MOVEMENTS':
        navigate(`/movements?product_id=${suggestion.id}`);
        break;
      case 'LOCATION':
        navigate(`/locations`);
        break;
      case 'WAREHOUSE':
        navigate(`/warehouses`);
        break;
      case 'LOW_STOCK':
        navigate('/low-stock');
        break;
      case 'RECEIPTS':
        navigate('/receipts');
        break;
      case 'DELIVERIES':
        navigate('/deliveries');
        break;
      case 'TRANSFERS':
        navigate('/transfers');
        break;
      case 'ADJUSTMENTS':
        navigate('/adjustments');
        break;
      case 'STOCK':
        navigate('/stock');
        break;
      case 'MOVEMENTS':
        navigate('/movements');
        break;
      default:
        break;
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSuggestionClick(suggestions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const getIcon = (type) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'PRODUCT':
      case 'PRODUCT_STOCK':
      case 'PRODUCT_MOVEMENTS':
        return <Package className={iconClass} />;
      case 'LOCATION':
        return <MapPin className={iconClass} />;
      case 'WAREHOUSE':
        return <Warehouse className={iconClass} />;
      case 'LOW_STOCK':
        return <AlertTriangle className={iconClass} />;
      case 'RECEIPTS':
        return <FileText className={iconClass} />;
      case 'DELIVERIES':
        return <Truck className={iconClass} />;
      case 'TRANSFERS':
        return <ArrowLeftRight className={iconClass} />;
      case 'ADJUSTMENTS':
        return <Settings className={iconClass} />;
      case 'STOCK':
        return <Box className={iconClass} />;
      case 'MOVEMENTS':
        return <TrendingDown className={iconClass} />;
      default:
        return <Search className={iconClass} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search products, locations, or type commands like 'low stock'..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition"
        />
        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id || index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 flex items-start space-x-3 hover:bg-gray-700 transition text-left ${
                index === selectedIndex ? 'bg-gray-700' : ''
              } ${index === 0 ? 'rounded-t-lg' : ''} ${
                index === suggestions.length - 1 ? 'rounded-b-lg' : ''
              }`}
            >
              <div className="mt-1 text-blue-400">
                {getIcon(suggestion.type)}
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{suggestion.title}</div>
                {suggestion.subtitle && (
                  <div className="text-gray-400 text-sm mt-0.5">
                    {suggestion.subtitle}
                  </div>
                )}
                {suggestion.badge && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-600 text-white">
                    {suggestion.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
