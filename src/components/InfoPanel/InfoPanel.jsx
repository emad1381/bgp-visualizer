/**
 * Info Panel Component
 * Displays detailed BGP information in a sidebar
 * On mobile: Draggable bottom sheet with swipe-to-dismiss
 * Portrait: Bottom sheet | Landscape: Side panel
 */

import {
    Server,
    Globe,
    MapPin,
    Layers,
    Network,
    Users,
    Copy,
    ExternalLink,
    CheckCircle,
    ChevronDown,
    Info
} from 'lucide-react';
import Flag from 'react-world-flags';
import { useState, useEffect } from 'react';
import './InfoPanel.css';

/**
 * Flag component with fallback
 */
const FlagIcon = ({ code, size = 16 }) => {
    if (!code || code.length !== 2) {
        return <Globe size={size} className="flag-fallback" />;
    }
    return (
        <Flag
            code={code.toUpperCase()}
            height={size}
            className="country-flag"
            fallback={<Globe size={size} className="flag-fallback" />}
        />
    );
};

// Mobile detection hook with orientation tracking
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

// Orientation detection hook
const useOrientation = () => {
    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    return isLandscape;
};

/**
 * Shared content component to avoid duplication
 */
const PanelContent = ({ data, copied, handleCopy }) => (
    <div className="info-panel-content">
        {/* Primary AS Section */}
        <div className="info-section">
            <div className="info-section-header">
                <Server size={16} />
                <span>Primary AS</span>
            </div>
            <div className="info-card info-card-primary">
                <div className="info-card-header">
                    <span className="info-asn">AS{data.primaryAS.asn}</span>
                    <span className="info-flag"><FlagIcon code={data.primaryAS.countryCode} size={18} /></span>
                </div>
                <div className="info-card-body">
                    <div className="info-row">
                        <span className="info-label">Name</span>
                        <span className="info-value">{data.primaryAS.name}</span>
                    </div>
                    {data.primaryAS.description && (
                        <div className="info-row">
                            <span className="info-label">Description</span>
                            <span className="info-value-small">{data.primaryAS.description}</span>
                        </div>
                    )}
                </div>
                <a
                    className="info-link"
                    href={`https://stat.ripe.net/${data.primaryAS.asn}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span>View on RIPEstat</span>
                    <ExternalLink size={14} />
                </a>
            </div>
        </div>

        {/* Network Prefix Section */}
        {data.prefix && (
            <div className="info-section">
                <div className="info-section-header">
                    <Layers size={16} />
                    <span>Network Prefix</span>
                </div>
                <div className="info-card info-card-prefix">
                    <span className="info-prefix-value">{data.prefix.prefix}</span>
                    <button
                        className="info-copy-btn"
                        onClick={() => handleCopy(data.prefix.prefix, 'prefix')}
                    >
                        {copied === 'prefix' ? <CheckCircle size={14} /> : <Copy size={14} />}
                    </button>
                </div>
                {data.prefix.name && (
                    <span className="info-prefix-name">{data.prefix.name}</span>
                )}
            </div>
        )}

        {/* Location Section */}
        {data.geolocation && (
            <div className="info-section">
                <div className="info-section-header">
                    <MapPin size={16} />
                    <span>Location</span>
                </div>
                <div className="info-card info-card-geo">
                    <div className="info-geo-main">
                        <span className="info-geo-flag"><FlagIcon code={data.geolocation.countryCode} size={28} /></span>
                        <div className="info-geo-text">
                            <span className="info-geo-location">
                                {data.geolocation.city && `${data.geolocation.city}, `}
                                {data.geolocation.country}
                            </span>
                            {data.geolocation.region && (
                                <span className="info-geo-region">{data.geolocation.region}</span>
                            )}
                        </div>
                    </div>
                    {data.geolocation.org && (
                        <div className="info-row">
                            <span className="info-label">Organization</span>
                            <span className="info-value-small">{data.geolocation.org}</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Primary Upstreams */}
        {data.upstreams && data.upstreams.filter(u => u.isPrimary).length > 0 && (
            <div className="info-section">
                <div className="info-section-header">
                    <Network size={16} />
                    <span>Primary Upstreams ({data.upstreams.filter(u => u.isPrimary).length})</span>
                </div>
                <div className="info-list">
                    {data.upstreams.filter(u => u.isPrimary).map((upstream) => (
                        <div key={upstream.asn} className="info-list-item info-list-item-primary">
                            <span className="info-list-asn">AS{upstream.asn}</span>
                            <span className="info-list-name">{upstream.name}</span>
                            <span className="info-list-flag"><FlagIcon code={upstream.countryCode} size={14} /></span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Backup Upstreams */}
        {data.upstreams && data.upstreams.filter(u => u.isBackup).length > 0 && (
            <div className="info-section">
                <div className="info-section-header">
                    <Network size={16} />
                    <span>Backup Upstreams ({data.upstreams.filter(u => u.isBackup).length})</span>
                </div>
                <div className="info-list">
                    {data.upstreams.filter(u => u.isBackup).map((upstream) => (
                        <div key={upstream.asn} className="info-list-item info-list-item-backup">
                            <span className="info-list-asn">AS{upstream.asn}</span>
                            <span className="info-list-name">{upstream.name}</span>
                            <span className="info-list-flag"><FlagIcon code={upstream.countryCode} size={14} /></span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Tier-1 Providers */}
        {data.upstreams && data.upstreams.filter(u => u.isTier1).length > 0 && (
            <div className="info-section">
                <div className="info-section-header">
                    <Network size={16} />
                    <span>Tier-1 Providers ({data.upstreams.filter(u => u.isTier1).length})</span>
                </div>
                <div className="info-list">
                    {data.upstreams.filter(u => u.isTier1).map((upstream) => (
                        <div key={upstream.asn} className="info-list-item info-list-item-tier1">
                            <span className="info-list-asn">AS{upstream.asn}</span>
                            <span className="info-list-name">{upstream.name}</span>
                            <span className="info-list-flag"><FlagIcon code={upstream.countryCode} size={14} /></span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Other Upstreams (neither primary, backup, nor tier-1) */}
        {data.upstreams && data.upstreams.filter(u => !u.isPrimary && !u.isBackup && !u.isTier1).length > 0 && (
            <div className="info-section">
                <div className="info-section-header">
                    <Network size={16} />
                    <span>Other Upstreams ({data.upstreams.filter(u => !u.isPrimary && !u.isBackup && !u.isTier1).length})</span>
                </div>
                <div className="info-list">
                    {data.upstreams.filter(u => !u.isPrimary && !u.isBackup && !u.isTier1).map((upstream) => (
                        <div key={upstream.asn} className="info-list-item">
                            <span className="info-list-asn">AS{upstream.asn}</span>
                            <span className="info-list-name">{upstream.name}</span>
                            <span className="info-list-flag"><FlagIcon code={upstream.countryCode} size={14} /></span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Peers Section */}
        {data.peers && data.peers.length > 0 && (
            <div className="info-section">
                <div className="info-section-header">
                    <Users size={16} />
                    <span>Peers ({data.peers.length})</span>
                </div>
                <div className="info-list">
                    {data.peers.map((peer) => (
                        <div key={peer.asn} className="info-list-item info-list-item-small">
                            <span className="info-list-asn">AS{peer.asn}</span>
                            <span className="info-list-name">{peer.name}</span>
                            <span className="info-list-flag"><FlagIcon code={peer.countryCode} size={14} /></span>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

/**
 * Info Panel Component
 */
export default function InfoPanel({ data, panelCollapsed, onTogglePanel }) {
    const [copied, setCopied] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const isMobile = useIsMobile();
    const isLandscape = useOrientation();

    // Auto-expand when data changes on mobile
    // (intentional: the bottom sheet must open when a new search lands)
    useEffect(() => {
        if (data && isMobile) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: open sheet on new search
            setExpanded(true);
        }
    }, [data, isMobile]);

    // Toggle panel (desktop, tablet, landscape)
    const togglePanel = () => {
        onTogglePanel(!panelCollapsed);
    };

    // Handle copy
    const handleCopy = async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Toggle expansion
    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    // Empty state
    if (!data) {
        return (
            <div className={`info-panel ${isMobile && isLandscape ? 'info-panel-landscape' : ''}`}>
                <div className="info-panel-empty">
                    <Globe size={isMobile ? 24 : 48} />
                    <p>Search for an IP to see details</p>
                </div>
            </div>
        );
    }

    // Desktop version - Side Panel with Toggle
    if (!isMobile) {
        return (
            <>
                {/* Desktop Toggle Button */}
                <button
                    className="panel-toggle-btn"
                    onClick={togglePanel}
                    aria-label="Toggle Info Panel"
                    title={panelCollapsed ? 'Show Info Panel' : 'Hide Info Panel'}
                >
                    <div
                        className="toggle-icon-wrap"
                        style={{ transform: `rotate(${panelCollapsed ? 0 : 180}deg)`, transition: 'transform 0.3s ease' }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </div>
                </button>

                {/* Side Panel */}
                <div
                    className="info-panel"
                    style={{
                        transform: panelCollapsed ? 'translateX(360px)' : 'translateX(0)',
                        transition: 'transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)',
                    }}
                >
                    <div className="info-panel-header">
                        <div className="info-panel-title">
                            <Globe size={20} />
                            <span>BGP Information</span>
                        </div>
                        <div className="info-panel-ip">
                            <span>{data.ip}</span>
                            <button
                                className="info-copy-btn"
                                onClick={() => handleCopy(data.ip, 'ip')}
                            >
                                {copied === 'ip' ? <CheckCircle size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                    <PanelContent data={data} copied={copied} handleCopy={handleCopy} />
                </div>
            </>
        );
    }

    // Mobile Landscape - Side Panel with Toggle
    if (isMobile && isLandscape) {
        return (
            <>
                {/* Landscape Toggle Button */}
                <button
                    className="panel-toggle-btn landscape-toggle-btn"
                    onClick={togglePanel}
                    aria-label="Toggle Info Panel"
                >
                    <div
                        className="toggle-icon-wrap"
                        style={{ transform: `rotate(${panelCollapsed ? 0 : 180}deg)`, transition: 'transform 0.3s ease' }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </div>
                </button>

                {/* Side Panel */}
                <div
                    className="info-panel info-panel-landscape"
                    style={{
                        transform: panelCollapsed ? 'translateX(320px)' : 'translateX(0)',
                        transition: 'transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)',
                    }}
                >
                    <div className="info-panel-header">
                        <div className="info-panel-title">
                            <Globe size={18} />
                            <span>BGP Info</span>
                        </div>
                        <div className="info-panel-ip">
                            <span>{data.ip}</span>
                            <button
                                className="info-copy-btn"
                                onClick={() => handleCopy(data.ip, 'ip')}
                            >
                                {copied === 'ip' ? <CheckCircle size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                    <PanelContent data={data} copied={copied} handleCopy={handleCopy} />
                </div>
            </>
        );
    }

    // Mobile Portrait - Bottom sheet with toggle (no drag, simple & reliable)
    return (
        <div
            className={`info-panel info-panel-mobile ${expanded ? 'info-panel-mobile-expanded' : ''}`}
            style={{
                transform: expanded ? 'translateY(0)' : 'translateY(calc(100vh - 180px))',
                transition: 'transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)',
                touchAction: 'pan-y',
            }}
        >
            {/* Handle — tap to expand/collapse */}
            <div
                className="info-panel-handle"
                onClick={toggleExpand}
            >
                <div className="info-panel-handle-bar" />
                <span className="info-panel-handle-hint">
                    {expanded ? 'Swipe down to minimize' : 'Swipe up for details'}
                </span>
            </div>

            {/* Header */}
            <div className="info-panel-header" onClick={toggleExpand}>
                <div className="info-panel-title">
                    <Globe size={16} />
                    <span>BGP Information</span>
                    <ChevronDown
                        size={20}
                        className={`expand-icon ${expanded ? 'expanded' : ''}`}
                    />
                </div>
                <div className="info-panel-ip">
                    <span>{data.ip}</span>
                    <button
                        className="info-copy-btn"
                        onClick={(e) => { e.stopPropagation(); handleCopy(data.ip, 'ip'); }}
                    >
                        {copied === 'ip' ? <CheckCircle size={14} /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <PanelContent data={data} copied={copied} handleCopy={handleCopy} />
        </div>
    );
}
