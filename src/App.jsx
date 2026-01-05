/**
 * BGP Visualizer - Main Application
 * A modern, professional tool for visualizing BGP routing information
 */

import { useState, useCallback, useEffect } from 'react';
import { Activity, Zap, Sun, Moon } from 'lucide-react';
import SearchBar from './components/SearchBar/SearchBar';
import BGPGraph from './components/BGPGraph/BGPGraph';
import InfoPanel from './components/InfoPanel/InfoPanel';
import { getCompleteBGPData, generateGraphData } from './services/bgpService';
import './App.css';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bgpData, setBgpData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [theme, setTheme] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('bgp-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bgp-theme', theme);
  }, [theme]);

  // Toggle theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Handle IP search
  const handleSearch = useCallback(async (ip) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch complete BGP data
      const data = await getCompleteBGPData(ip);
      setBgpData(data);

      // Generate graph data
      const graph = generateGraphData(data);
      setGraphData(graph);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to fetch BGP data');
      setBgpData(null);
      setGraphData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="app">
      {/* Background Effects */}
      <div className="app-bg">
        <div className="app-bg-gradient" />
        <div className="app-bg-grid" />
        <div className="app-bg-glow app-bg-glow-1" />
        <div className="app-bg-glow app-bg-glow-2" />
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-logo">
            <div className="app-logo-icon">
              <Activity size={24} />
            </div>
            <div className="app-logo-text">
              <span className="app-logo-title">BGP Visualizer</span>
              <span className="app-logo-subtitle">Network Routing Intelligence</span>
            </div>
          </div>

          <div className="app-header-center">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          <div className="app-header-actions">
            {/* Theme Toggle Button */}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun size={20} />
              ) : (
                <Moon size={20} />
              )}
            </button>

            <a
              href="https://stat.ripe.net"
              target="_blank"
              rel="noopener noreferrer"
              className="app-header-link"
            >
              <Zap size={16} />
              <span>Powered by RIPEstat</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Error State */}
        {error && (
          <div className="app-error">
            <div className="app-error-content">
              <span className="app-error-icon">⚠️</span>
              <span className="app-error-text">{error}</span>
              <button
                className="app-error-close"
                onClick={() => setError(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Graph Area */}
        <div className="app-graph">
          {isLoading ? (
            <div className="app-loading">
              <div className="app-loading-spinner">
                <div className="spinner-ring" />
                <div className="spinner-ring" />
                <div className="spinner-ring" />
              </div>
              <span className="app-loading-text">Fetching BGP Data...</span>
            </div>
          ) : (
            <BGPGraph graphData={graphData} />
          )}
        </div>

        {/* Info Panel */}
        <InfoPanel data={bgpData} />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="app-footer-content">
          <span>© 2024 BGP Visualizer</span>
          <span className="app-footer-divider">•</span>
          <span>Built with React & React Flow</span>
        </div>
      </footer>
    </div>
  );
}
