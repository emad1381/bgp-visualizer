/**
 * Custom Node Components for BGP Graph
 * Professional node designs with animations and gradients
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import Flag from 'react-world-flags';
import {
    Globe,
    Server,
    Network,
    MapPin,
    Layers,
    Users
} from 'lucide-react';
import './BGPGraph.css';

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

/**
 * IP Node - Center node showing the searched IP
 */
export const IPNode = memo(({ data }) => {
    return (
        <div className="node-ip">
            <Handle type="target" position={Position.Bottom} />
            <div className="node-ip-inner">
                <div className="node-ip-icon">
                    <Globe size={24} />
                </div>
                <div className="node-ip-content">
                    <span className="node-ip-label">IP Address</span>
                    <span className="node-ip-value">{data.ip}</span>
                    <span className="node-ip-type">{data.type?.toUpperCase()}</span>
                </div>
            </div>
            <Handle type="source" position={Position.Top} />
            <Handle type="source" position={Position.Left} id="left" />
            <Handle type="source" position={Position.Right} id="right" />
        </div>
    );
});

IPNode.displayName = 'IPNode';

/**
 * AS Node - Autonomous System node
 */
export const ASNode = memo(({ data }) => {
    return (
        <div className={`node-as ${data.isPrimary ? 'node-as-primary' : ''}`}>
            <Handle type="target" position={Position.Bottom} />
            <div className="node-as-header">
                <Server size={18} />
                <span className="node-as-number">AS{data.asn}</span>
                {data.countryCode && (
                    <span className="node-as-flag">
                        <FlagIcon code={data.countryCode} size={16} />
                    </span>
                )}
            </div>
            <div className="node-as-body">
                <span className="node-as-name">{data.name}</span>
                {data.description && (
                    <span className="node-as-desc">{data.description}</span>
                )}
            </div>
            <Handle type="source" position={Position.Top} />
            <Handle type="source" position={Position.Left} id="left" />
            <Handle type="source" position={Position.Right} id="right" />
        </div>
    );
});

ASNode.displayName = 'ASNode';

/**
 * Upstream Node - Upstream provider AS
 * Shows Primary/Backup/Tier-1 status visually with country flag
 */
export const UpstreamNode = memo(({ data }) => {
    const isPrimary = data.isPrimary;
    const isBackup = data.isBackup || data.hasPrepending;
    const isTier1 = data.isTier1;

    // Determine CSS class
    let className = 'node-upstream';
    if (isTier1) className += ' node-upstream-tier1';
    else if (isPrimary) className += ' node-upstream-primary';
    else if (isBackup) className += ' node-upstream-backup';

    return (
        <div className={className}>
            <Handle type="target" position={Position.Bottom} />
            <Handle type="source" position={Position.Top} />

            {/* Country Flag - Top Right Corner */}
            {data.countryCode && (
                <span className="node-upstream-flag">
                    <FlagIcon code={data.countryCode} size={16} />
                </span>
            )}

            <div className="node-upstream-inner">
                <div className="node-upstream-icon">
                    <Network size={16} />
                </div>
                <div className="node-upstream-content">
                    <div className="node-upstream-header">
                        <span className="node-upstream-label">
                            {isTier1 ? '🌐 Tier-1' :
                                isPrimary ? '★ Primary' :
                                    isBackup ? '↺ Backup' :
                                        data.level ? `Level ${data.level}` : 'Transit'}
                        </span>
                        {data.hasPrepending && (
                            <span className="node-upstream-badge node-upstream-badge-prepend">PREPEND</span>
                        )}
                    </div>
                    <span className="node-upstream-asn">AS{data.asn}</span>
                    <span className="node-upstream-name">{data.name}</span>
                </div>
            </div>
        </div>
    );
});

UpstreamNode.displayName = 'UpstreamNode';

/**
 * Peer Node - Peering AS
 */
export const PeerNode = memo(({ data }) => {
    return (
        <div className="node-peer">
            <Handle type="target" position={Position.Right} />

            {/* Country Flag - Top Right */}
            {data.countryCode && (
                <span className="node-peer-flag">
                    <FlagIcon code={data.countryCode} size={14} />
                </span>
            )}

            <div className="node-peer-inner">
                <Users size={14} />
                <div className="node-peer-content">
                    <span className="node-peer-asn">AS{data.asn}</span>
                    <span className="node-peer-name">{data.name}</span>
                </div>
            </div>
        </div>
    );
});

PeerNode.displayName = 'PeerNode';

/**
 * Geolocation Node - Geographic location info
 */
export const GeoNode = memo(({ data }) => {
    return (
        <div className="node-geo">
            <Handle type="target" position={Position.Left} />
            <div className="node-geo-inner">
                <div className="node-geo-icon">
                    <MapPin size={20} />
                </div>
                <div className="node-geo-content">
                    <span className="node-geo-label">Location</span>
                    <span className="node-geo-location">
                        {data.city && `${data.city}, `}{data.country}
                    </span>
                    <span className="node-geo-flag">
                        <FlagIcon code={data.countryCode} size={20} />
                    </span>
                    {data.isp && (
                        <span className="node-geo-isp">{data.isp}</span>
                    )}
                </div>
            </div>
        </div>
    );
});

GeoNode.displayName = 'GeoNode';

/**
 * Prefix Node - Network prefix info
 */
export const PrefixNode = memo(({ data }) => {
    return (
        <div className="node-prefix">
            <Handle type="target" position={Position.Right} />
            <div className="node-prefix-inner">
                <div className="node-prefix-icon">
                    <Layers size={18} />
                </div>
                <div className="node-prefix-content">
                    <span className="node-prefix-label">Prefix</span>
                    <span className="node-prefix-value">{data.prefix}</span>
                    {data.rir && (
                        <span className="node-prefix-rir">{data.rir}</span>
                    )}
                </div>
            </div>
        </div>
    );
});

PrefixNode.displayName = 'PrefixNode';

// Export all node types for React Flow
export const nodeTypes = {
    ipNode: IPNode,
    asNode: ASNode,
    upstreamNode: UpstreamNode,
    peerNode: PeerNode,
    geoNode: GeoNode,
    prefixNode: PrefixNode,
};
