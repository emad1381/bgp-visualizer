/**
 * BGP Graph Component
 * Interactive graph visualization using React Flow
 */

import { useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Controls,
    MiniMap,
    Background,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network } from 'lucide-react';
import { nodeTypes } from './CustomNodes';
import './BGPGraph.css';

/**
 * BGP Graph Component
 * @param {object} props - Component props
 * @param {object} props.graphData - Graph data with nodes and edges
 */
export default function BGPGraph({ graphData }) {
    const [nodes, setNodes, onNodesChange] = useNodesState(graphData?.nodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(graphData?.edges || []);

    // Update nodes when graphData changes
    useMemo(() => {
        if (graphData?.nodes) {
            setNodes(graphData.nodes);
        }
        if (graphData?.edges) {
            setEdges(graphData.edges);
        }
    }, [graphData, setNodes, setEdges]);

    // Minimap node color based on node type
    const nodeColor = useCallback((node) => {
        switch (node.type) {
            case 'ipNode':
                return '#6366f1';
            case 'asNode':
                return '#8b5cf6';
            case 'upstreamNode':
                return '#22d3ee';
            case 'peerNode':
                return '#f59e0b';
            case 'geoNode':
                return '#f43f5e';
            case 'prefixNode':
                return '#10b981';
            default:
                return '#64748b';
        }
    }, []);

    // Empty state
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
        return (
            <div className="bgp-graph-container">
                <div className="graph-empty-state">
                    <div className="graph-empty-icon">
                        <Network size={40} />
                    </div>
                    <div className="graph-empty-text">
                        <h3 className="graph-empty-title">No Data to Display</h3>
                        <p className="graph-empty-desc">
                            Enter an IP address above to visualize BGP routing
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Check if mobile
    const isMobile = window.innerWidth <= 768;

    return (
        <div className="bgp-graph-container">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={2}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                proOptions={{ hideAttribution: true }}
            >
                <Controls
                    position="bottom-right"
                    showInteractive={false}
                />
                {/* Hide MiniMap on mobile */}
                {!isMobile && (
                    <MiniMap
                        nodeColor={nodeColor}
                        maskColor="rgba(0, 0, 0, 0.8)"
                        position="bottom-left"
                    />
                )}
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="rgba(255, 255, 255, 0.05)"
                />
            </ReactFlow>
        </div>
    );
}
