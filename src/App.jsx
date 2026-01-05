/**
 * BGP Visualizer - Main Application
 * A modern, professional tool for visualizing BGP routing information
 */

import { useState, useCallback, useEffect } from 'react';
import { Activity, Zap, Sun, Moon } from 'lucide-react';
import SearchBar from './components/SearchBar/SearchBar';
import BGPGraph from './components/BGPGraph/BGPGraph';
import InfoPanel from './components/InfoPanel/InfoPanel';
import { getCompleteBGPData, generateGraphData, fetchASUpstreams } from './services/bgpService';
import './App.css';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bgpData, setBgpData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false); // Panel collapse state

  // State for interactive node exploration
  const [exploredNodes, setExploredNodes] = useState(new Set());
  const [loadingNodes, setLoadingNodes] = useState(new Set());
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

  // Handle IP/Domain search
  const handleSearch = useCallback(async (input) => {
    setIsLoading(true);
    setError(null);

    try {
      let ipAddress = input.trim();

      // Import validation functions
      const { validateIP, validateDomain, resolveDomainToIP, getCompleteBGPData, generateGraphData } =
        await import('./services/bgpService');

      // Check if input is a domain name
      const ipValidation = validateIP(ipAddress);

      if (!ipValidation.valid) {
        // Try as domain name
        if (validateDomain(ipAddress)) {
          // Resolve domain to IP
          ipAddress = await resolveDomainToIP(ipAddress);
          console.log(`Resolved ${input} to ${ipAddress}`);
        } else {
          throw new Error('Invalid IP address or domain name');
        }
      }

      // Fetch complete BGP data
      const data = await getCompleteBGPData(ipAddress);
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

  // Handle node click for recursive upstream exploration
  const handleNodeClick = useCallback(async (event, node) => {
    // Only handle AS and Upstream nodes
    if (!['asNode', 'upstreamNode'].includes(node.type)) {
      return;
    }

    const asn = node.data.asn;

    // Check if already explored or currently loading
    if (exploredNodes.has(asn) || loadingNodes.has(asn)) {
      console.log(`AS${asn} already explored or loading`);
      return;
    }

    console.log(`Fetching upstreams for AS${asn}...`);

    // Mark as loading
    setLoadingNodes(prev => new Set([...prev, asn]));

    try {
      // Fetch upstreams for this ASN
      const upstreams = await fetchASUpstreams(asn);

      if (upstreams.length === 0) {
        console.log(`No upstreams found for AS${asn}`);
        setExploredNodes(prev => new Set([...prev, asn]));
        setLoadingNodes(prev => {
          const updated = new Set(prev);
          updated.delete(asn);
          return updated;
        });
        return;
      }

      console.log(`Found ${upstreams.length} upstreams for AS${asn}`);

      // Calculate positions for new nodes
      const currentNodePos = node.position;
      const newNodes = [];
      const newEdges = [];

      upstreams.forEach((upstream, index) => {
        const upstreamNodeId = `upstream-${upstream.asn}-from-${asn}`;

        // Position new nodes above the clicked node
        const yOffset = 150 + (index * 140);
        const xOffset = (index - upstreams.length / 2) * 100;

        newNodes.push({
          id: upstreamNodeId,
          type: 'upstreamNode',
          position: {
            x: currentNodePos.x + xOffset,
            y: currentNodePos.y - yOffset,
          },
          data: {
            asn: upstream.asn,
            name: upstream.name || `AS${upstream.asn}`,
            countryCode: upstream.countryCode, // Already includes fallback from fetchASUpstreams
            isPrimary: upstream.isPrimary || false,
            isBackup: upstream.isBackup || false,
            isTier1: upstream.isTier1 || false,
          },
        });

        // Add edge from clicked node to new upstream
        newEdges.push({
          id: `${node.id}-to-${upstreamNodeId}`,
          source: node.id,
          target: upstreamNodeId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2 },
          label: 'Upstream',
          labelStyle: { fill: '#10b981', fontSize: 10 },
          labelBgStyle: { fill: '#0a0a10', fillOpacity: 0.8 },
        });
      });

      // Add new nodes and edges to graph
      setGraphData(prev => ({
        nodes: [...prev.nodes, ...newNodes],
        edges: [...prev.edges, ...newEdges],
      }));

      // Mark as explored
      setExploredNodes(prev => new Set([...prev, asn]));

    } catch (error) {
      console.error(`Error fetching upstreams for AS${asn}:`, error);
    } finally {
      // Remove from loading
      setLoadingNodes(prev => {
        const updated = new Set(prev);
        updated.delete(asn);
        return updated;
      });
    }
  }, [exploredNodes, loadingNodes]);

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
      <main className={`app-main ${panelCollapsed ? 'panel-collapsed' : ''}`}>
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
            <BGPGraph
              graphData={graphData}
              onNodeClick={handleNodeClick}
              loadingNodes={loadingNodes}
            />
          )}
        </div>

        {/* Info Panel */}
        <InfoPanel
          data={bgpData}
          panelCollapsed={panelCollapsed}
          onTogglePanel={setPanelCollapsed}
        />
      </main>
    </div>
  );
}
