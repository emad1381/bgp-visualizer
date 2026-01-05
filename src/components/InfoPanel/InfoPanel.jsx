/**
 * Info Panel Component
 * Displays detailed BGP information in a sidebar
 * On mobile: Draggable bottom sheet with swipe-to-dismiss
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
import { motion } from 'framer-motion';
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

// Mobile detection hook
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

        {/* Upstreams Section */}
        {data.upstreams && data.upstreams.length > 0 && (
            <div className="info-section">
                <div className="info-section-header">
                    <Network size={16} />
                    <span>Upstreams ({data.upstreams.length})</span>
                </div>
                <div className="info-list">
                    {data.upstreams.slice(0, 5).map((upstream) => (
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
                    {data.peers.slice(0, 4).map((peer) => (
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
export default function InfoPanel({ data }) {
    const [copied, setCopied] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const isMobile = useIsMobile();

    // Auto-expand when data changes on mobile
    useEffect(() => {
        if (data && isMobile) {
            setExpanded(true);
        }
    }, [data, isMobile]);

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

    // Handle drag end - swipe to dismiss (mobile only)
    const handleDragEnd = (event, info) => {
        const threshold = 100;
        const velocity = info.velocity.y;

        if (info.offset.y > threshold || velocity > 500) {
            setExpanded(false);
        } else if (info.offset.y < -50 || velocity < -300) {
            setExpanded(true);
        }
    };

    // Mobile FAB when collapsed
    if (isMobile && !expanded && data) {
        return (
            <motion.button
                className="info-panel-fab"
                onClick={toggleExpand}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.95 }}
            >
                <Info size={20} />
                <span>BGP Info</span>
            </motion.button>
        );
    }

    // Empty state
    if (!data) {
        return (
            <div className="info-panel">
                <div className="info-panel-empty">
                    <Globe size={isMobile ? 24 : 48} />
                    <p>Search for an IP to see details</p>
                </div>
            </div>
        );
    }

    // Desktop version
    if (!isMobile) {
        return (
            <div className="info-panel">
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
        );
    }

    // Mobile version - Draggable bottom sheet
    return (
        <motion.div
            className="info-panel info-panel-mobile"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            animate={{ y: expanded ? 0 : "calc(100% - 70px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
            {/* Drag Handle */}
            <div className="info-panel-handle">
                <div className="info-panel-handle-bar" />
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
        </motion.div>
    );
}
