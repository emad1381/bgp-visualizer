/**
 * Node type registry for React Flow.
 * Kept in its own module so CustomNodes.jsx only exports components
 * (satisfies react-refresh/only-export-components).
 */
import { IPNode, ASNode, UpstreamNode, PeerNode, GeoNode, PrefixNode } from './CustomNodes';

// Export all node types for React Flow
export const nodeTypes = {
    ipNode: IPNode,
    asNode: ASNode,
    upstreamNode: UpstreamNode,
    peerNode: PeerNode,
    geoNode: GeoNode,
    prefixNode: PrefixNode,
};
