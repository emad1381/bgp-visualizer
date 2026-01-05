/**
 * Search Bar Component
 * IP address input with validation and history
 */

import { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { validateIP } from '../../services/bgpService';
import './SearchBar.css';

// Sample IPs for quick access
const SAMPLE_IPS = [
    { ip: '8.8.8.8', label: 'Google DNS' },
    { ip: '1.1.1.1', label: 'Cloudflare' },
    { ip: '185.143.234.1', label: 'Iranian IP' },
    { ip: '208.67.222.222', label: 'OpenDNS' },
];

/**
 * Search Bar Component
 * @param {object} props - Component props
 * @param {function} props.onSearch - Callback when search is triggered
 * @param {boolean} props.isLoading - Loading state
 */
export default function SearchBar({ onSearch, isLoading }) {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [history, setHistory] = useState([]);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Load history from localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem('bgp-search-history');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    }, []);

    // Save to history
    const saveToHistory = (ip) => {
        const newHistory = [ip, ...history.filter(h => h !== ip)].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('bgp-search-history', JSON.stringify(newHistory));
    };

    // Handle input change
    const handleChange = (e) => {
        const newValue = e.target.value;
        setValue(newValue);
        setError('');

        if (newValue.length > 0) {
            const validation = validateIP(newValue);
            if (!validation.valid && newValue.length > 6) {
                setError('Invalid IP address format');
            }
        }
    };

    // Handle search
    const handleSearch = () => {
        if (!value.trim()) {
            setError('Please enter an IP address');
            return;
        }

        const validation = validateIP(value.trim());
        if (!validation.valid) {
            setError('Invalid IP address format');
            return;
        }

        setError('');
        setShowDropdown(false);
        saveToHistory(value.trim());
        onSearch(value.trim());
    };

    // Handle key press
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Handle sample click
    const handleSampleClick = (ip) => {
        setValue(ip);
        setError('');
        setShowDropdown(false);
        saveToHistory(ip);
        onSearch(ip);
    };

    // Handle clear
    const handleClear = () => {
        setValue('');
        setError('');
        inputRef.current?.focus();
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="search-bar-wrapper" ref={dropdownRef}>
            <div className={`search-bar ${error ? 'search-bar-error' : ''} ${showDropdown ? 'search-bar-active' : ''}`}>
                <div className="search-bar-icon">
                    {isLoading ? (
                        <Loader2 size={20} className="search-spinner" />
                    ) : (
                        <Search size={20} />
                    )}
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    className="search-bar-input"
                    placeholder="Enter IPv4 or IPv6 address (e.g., 8.8.8.8)"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowDropdown(true)}
                    disabled={isLoading}
                />

                {value && (
                    <button
                        className="search-bar-clear"
                        onClick={handleClear}
                        disabled={isLoading}
                    >
                        <X size={18} />
                    </button>
                )}

                <button
                    className="search-bar-button"
                    onClick={handleSearch}
                    disabled={isLoading || !value.trim()}
                >
                    <ArrowRight size={20} />
                    <span>Search</span>
                </button>
            </div>

            {error && (
                <div className="search-bar-error-message">
                    {error}
                </div>
            )}

            {showDropdown && !isLoading && (
                <div className="search-dropdown">
                    {/* Sample IPs */}
                    <div className="search-dropdown-section">
                        <div className="search-dropdown-label">Quick Access</div>
                        <div className="search-dropdown-samples">
                            {SAMPLE_IPS.map((sample) => (
                                <button
                                    key={sample.ip}
                                    className="search-sample-chip"
                                    onClick={() => handleSampleClick(sample.ip)}
                                >
                                    <span className="search-sample-ip">{sample.ip}</span>
                                    <span className="search-sample-label">{sample.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* History */}
                    {history.length > 0 && (
                        <div className="search-dropdown-section">
                            <div className="search-dropdown-label">
                                <Clock size={14} />
                                Recent Searches
                            </div>
                            <div className="search-dropdown-history">
                                {history.slice(0, 5).map((ip, index) => (
                                    <button
                                        key={`${ip}-${index}`}
                                        className="search-history-item"
                                        onClick={() => handleSampleClick(ip)}
                                    >
                                        {ip}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
