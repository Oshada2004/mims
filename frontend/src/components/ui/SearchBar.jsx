import { Search, X } from 'lucide-react';
import './SearchBar.css';

/** Controlled search input. Calls onChange(value) with the new string (empty on clear). */
export default function SearchBar({ value, onChange, placeholder = 'Search…', label = 'Search', className = '' }) {
  return (
    <div className={['search-bar', className].filter(Boolean).join(' ')} role="search">
      <Search className="search-bar__icon" size={16} aria-hidden="true" />
      <input
        type="search"
        className="search-bar__input"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
