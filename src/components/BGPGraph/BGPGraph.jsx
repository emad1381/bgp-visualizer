/**
 * BGP Graph Component
 * Interactive graph visualization using React Flow
 */

import { useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
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
 * @param {function} props.onNodeClick - Handler for node click events
 * @param {Set} props.loadingNodes - Set of ASNs currently loading
 */
export default function BGPGraph({ graphData, onNodeClick, loadingNodes }) {
    const [nodes, setNodes, onNodesChange] = useNodesState(graphData?.nodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(graphData?.edges || []);

    // Update nodes/edges when a new search provides graphData.
    // Must be an effect, not useMemo: setState inside useMemo is a side effect
    // and runs during render, which React can re-invoke (double-invoke in dev).
    useEffect(() => {
        if (graphData?.nodes) {
            // Mark nodes whose upstreams are being fetched, so their
            // custom node component can show a loading spinner
            const withLoading = graphData.nodes.map(n => ({
                ...n,
                data: {
                    ...n.data,
                    loading: loadingNodes?.has(String(n.data?.asn)),
                },
            }));
            setNodes(withLoading);
        }
        if (graphData?.edges) {
            setEdges(graphData.edges);
        }
    }, [graphData, loadingNodes, setNodes, setEdges]);

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

    return (
        <div className="bgp-graph-container">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick} // Enable node clicking
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                proOptions={{ hideAttribution: true }}
                nodesDraggable
                nodesConnectable={false}
                panOnScroll
                zoomOnDoubleClick={false}
                defaultEdgeOptions={{
                    animated: false,
                    style: { stroke: '#64748b', strokeWidth: 2 },
                }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="rgba(148, 163, 184, 0.1)"
                />
                <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) => {
                        // Color-code minimap nodes by type for quick orientation
                        const colors = {
                            ipNode: '#6366f1',
                            asNode: '#8b5cf6',
                            upstreamNode: '#10b981',
                            peerNode: '#f59e0b',
                            geoNode: '#f43f5e',
                            prefixNode: '#22d3ee',
                        };
                        return colors[node.type] || '#64748b';
                    }}
                    nodeStrokeWidth={2}
                    maskColor="rgba(5, 5, 8, 0.6)"
                    className="react-flow-minimap-custom"
                />
                <Controls />
            </ReactFlow>
        </div>
    );
}
