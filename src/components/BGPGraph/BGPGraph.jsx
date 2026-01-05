/**
 * BGP Graph Component
 * Interactive graph visualization using React Flow
 */

import { useMemo } from 'react';
import {
    ReactFlow,
    Controls,
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
 * @param {function} props.onNodeClick - Handler for node click events
 * @param {Set} props.loadingNodes - Set of ASNs currently loading
 */
export default function BGPGraph({ graphData, onNodeClick, loadingNodes }) {
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
                <Controls />
            </ReactFlow>
        </div>
    );
}
