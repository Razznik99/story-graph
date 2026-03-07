import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { calculateLeafNumbers } from './timeline-explorer-helpers';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    MarkerType,
    ReactFlowProvider,
    Position,
    Handle,
    useReactFlow,
    useStore,
    Panel,
    BaseEdge,
    getSmoothStepPath,
    EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTimelineStore } from '@/store/useTimelineStore';
import { TimelineGraph, Event, TimelineNode, TimelineEdge, Branch, Leaf } from '@/lib/timeline-api';
import { calculateBranchNumbers } from './timeline-explorer-helpers';
import { INTENSITY_COLORS } from '@/domain/constants/index';
import CanvasDock from "./CanvasDock";
import { useQueryClient } from '@tanstack/react-query';
import { getLaneLayoutedElements } from './timeline-layout';
import {
    createNode,
    createEdge,
    deleteNode,
    deleteEdge,
    updateNodeLocked,
    duplicateEvent,
    updateNodeLeaf
} from '@/lib/timeline-api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Trash2, Settings, Lock, Unlock, Copy, ExternalLink, Network } from 'lucide-react';
import { SearchableSelect, Option } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CanvasWizard from './CanvasWizard';
import { toast } from 'sonner';

interface TimelineCanvasProps {
    storyId: string;
    events: Event[];
    graphs: TimelineGraph[];
    onSelectEvent: (eventId: string) => void;
}

const nodeWidth = 80;
const nodeHeight = 80;

// --- Custom Nodes & Edges ---
export function FocusEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data }: EdgeProps) {
    const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 20 });

    // Typecast data to our known structure
    const edgeData = data as { label: string, onHover: (e: any, show: boolean, text: string) => void };

    // Avoid passing undefined markerEnd
    const baseEdgeProps: any = { path, style, className: "peer transition-colors duration-200" };
    if (markerEnd) baseEdgeProps.markerEnd = markerEnd;

    return (
        <>
            <BaseEdge {...baseEdgeProps} />
            <path d={path} fill="none" strokeOpacity={0} strokeWidth={24} className="hover:cursor-pointer"
                onMouseEnter={(e) => edgeData?.onHover(e, true, edgeData.label)}
                onMouseMove={(e) => edgeData?.onHover(e, true, edgeData.label)}
                onMouseLeave={(e) => edgeData?.onHover(e, false, '')}
            />
        </>
    );
}

const LeafGroupNode = ({ data }: any) => {
    return (
        <div className="w-full h-full border-x-[3px] border-border bg-transparent flex flex-col relative pt-8 cursor-grab active:cursor-grabbing">
        </div>
    );
};

const EventNodeComponent = ({ data }: any) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="relative flex flex-col items-center justify-center w-14 h-14 group cursor-pointer">
                    <div className={`w-12 h-12 rounded-full bg-text-primary flex items-center justify-center shadow-lg transition-transform hover:scale-105 border-4 border-transparent hover:border-accent hover:bg-primary z-10 relative`}>
                        <Handle type="target" position={Position.Left} className="w-1 h-1 opacity-0" />
                        <Handle type="source" position={Position.Right} className="w-1 h-1 opacity-0" />
                        <Handle type="source" position={Position.Top} id="rel-top" className="w-1 h-1 opacity-0" />
                        <Handle type="source" position={Position.Bottom} id="rel-bottom" className="w-1 h-1 opacity-0" />
                    </div>
                    <div className="absolute top-14 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm font-semibold text-text-tertiary px-2 py-1 z-20 pointer-events-none">
                        {data.label}
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-surface border-border border-accent z-[200]">
                <DropdownMenuItem onClick={() => data.onClick()}>
                    <ExternalLink className="w-4 h-4 mr-2 text-text-muted" /> View in Dock
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                    <Network className="w-4 h-4 mr-2 text-text-muted" /> View Relations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => data.onOpenWizard(data.eventId)}>
                    <Settings className="w-4 h-4 mr-2 text-text-muted" /> Manage Connection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => data.onDuplicateEvent(data.eventId)}>
                    <Copy className="w-4 h-4 mr-2 text-text-muted" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-error" onClick={() => data.onRemove(data.nodeId)}>
                    <Trash2 className="w-4 h-4 mr-2 text-error" /> Remove
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const StartEndNodeComponent = ({ data }: any) => {
    const isEnd = data.type === 'END';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className={`relative flex flex-col items-center justify-center w-14 h-14 group ${isEnd ? 'cursor-pointer' : ''}`}>
                    <div className={`w-14 h-14 rounded-full bg-text-secondary flex items-center justify-center shadow-md z-10 relative`}>
                        {data.type !== 'START' && <Handle type="target" position={Position.Left} className="w-1 h-1" />}
                        {data.type !== 'END' && <Handle type="source" position={Position.Right} className="w-1 h-1" />}
                        {data.isLocked && <Lock className="w-4 h-4 text-white absolute bottom-1 right-1 bg-background/50 rounded-full" />}
                    </div>
                    <div className="absolute top-16 whitespace-nowrap text-xs font-semibold text-text-tertiary pointer-events-none">
                        {data.label}
                    </div>
                </div>
            </DropdownMenuTrigger>
            {isEnd && (
                <DropdownMenuContent align="center" className="bg-surface border-border border-accent z-[200]">
                    <DropdownMenuItem onClick={() => data.onLockToggle()}>
                        {data.isLocked ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                        {data.isLocked ? 'Unlock' : 'Lock'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => data.onMoveTo()}>
                        <Settings className="w-4 h-4 mr-2" /> Move To...
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => data.onDuplicateEnd()}>
                        <Copy className="w-4 h-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    );
};

const nodeTypes = {
    eventNode: EventNodeComponent,
    startEndNode: StartEndNodeComponent,
    leafGroupNode: LeafGroupNode,
};

const edgeTypes = {
    focusEdge: FocusEdge
};

function FlowCanvas({ storyId, events, graphs, onSelectEvent }: TimelineCanvasProps) {
    const qc = useQueryClient();
    const reactFlow = useReactFlow();
    const { currentLevelId, focusEventId, setFocusEventId } = useTimelineStore();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const [hoverTooltip, setHoverTooltip] = useState<{ visible: boolean, x: number, y: number, text: string }>({ visible: false, x: 0, y: 0, text: '' });

    // Determine the active scope based on currentLevelId.
    // If it's a branch, we show leafs in that branch.
    // If it's a leaf, we show that leaf.
    const [activeScope, setActiveScope] = useState<{ type: 'timeline' | 'branch' | 'leaf', item: any, rootGraph?: TimelineGraph } | null>(null);

    const [unconnectedNodes, setUnconnectedNodes] = useState<any[]>([]);
    const [wizardEventId, setWizardEventId] = useState<string | null>(null);
    const [moveNodeId, setMoveNodeId] = useState<string | null>(null);

    useEffect(() => {
        let found = false;
        let rootGraph: TimelineGraph | null = null;

        if (!currentLevelId) {
            // Default to first graph
            if (graphs.length > 0) {
                const first = graphs[0] as TimelineGraph;
                setActiveScope({ type: 'timeline', item: first, rootGraph: first });
            }
            return;
        }

        for (const g of graphs) {
            if (g.id === currentLevelId) {
                setActiveScope({ type: 'timeline', item: g, rootGraph: g });
                found = true;
                break;
            }
            const findInBranch = (branches: any[]) => {
                for (const b of branches) {
                    if (b.id === currentLevelId) {
                        setActiveScope({ type: 'branch', item: b, rootGraph: g });
                        found = true;
                        return;
                    }
                    if (b.leaves) {
                        for (const l of b.leaves) {
                            if (l.id === currentLevelId) {
                                setActiveScope({ type: 'leaf', item: l, rootGraph: g });
                                found = true;
                                return;
                            }
                        }
                    }
                    if ((b as any).childBranches) {
                        findInBranch((b as any).childBranches);
                    }
                }
            };
            findInBranch(g.branches || []);
            if (found) break;
        }

        if (!found && graphs.length > 0) {
            const first = graphs[0] as TimelineGraph;
            setActiveScope({ type: 'timeline', item: first, rootGraph: first });
        }
    }, [currentLevelId, graphs]);


    useEffect(() => {
        if (!activeScope) return;

        const rawNodes: Node[] = [];
        const rawEdges: Edge[] = [];

        type RichNode = TimelineGraph['branches'][0]['leaves'][0]['nodes'][0];
        let allNodes: RichNode[] = [];

        if (activeScope.type === 'leaf') {
            allNodes = (activeScope.item.nodes || []) as RichNode[];
        } else if (activeScope.type === 'branch') {
            (activeScope.item.leaves || []).forEach((l: Leaf) => {
                if ((l as any).nodes) allNodes.push(...(l as any).nodes);
            });
        } else if (activeScope.type === 'timeline') {
            const gatherNodes = (b: any) => {
                if (b.leaves) {
                    b.leaves.forEach((l: any) => {
                        if (l.nodes) allNodes.push(...l.nodes);
                    });
                }
                if (b.childBranches) {
                    b.childBranches.forEach((cb: any) => gatherNodes(cb));
                }
            };
            (activeScope.item.branches || []).forEach(gatherNodes);
        }

        // First generate leaf groups if we are in a broader scope
        const leafGroups: Record<string, Node> = {};
        let leafNums = new Map<string, number>();
        if (activeScope.rootGraph) {
            leafNums = calculateLeafNumbers(activeScope.rootGraph, activeScope.rootGraph);
        }

        if (activeScope.type === 'branch') {
            (activeScope.item.leaves || []).forEach((l: Leaf) => {
                leafGroups[l.id] = {
                    id: l.id,
                    type: 'leafGroupNode',
                    position: { x: 0, y: 0 },
                    data: { label: l.title || l.name || 'Leaf', orderKey: leafNums.get(l.id) },
                    style: { width: 300, height: 500 } // Will be resized by layout
                };
            });
        } else if (activeScope.type === 'timeline') {
            const gatherLeaves = (b: any) => {
                if (b.leaves) {
                    b.leaves.forEach((l: any) => {
                        leafGroups[l.id] = {
                            id: l.id,
                            type: 'leafGroupNode',
                            position: { x: 0, y: 0 },
                            data: { label: l.title || l.name || 'Leaf', orderKey: leafNums.get(l.id) },
                            style: { width: 300, height: 500 }
                        };
                    });
                }
                if (b.childBranches) {
                    b.childBranches.forEach((cb: any) => gatherLeaves(cb));
                }
            };
            (activeScope.item.branches || []).forEach(gatherLeaves);
        }

        // Add all leaf groups to raw nodes
        Object.values(leafGroups).forEach(lg => rawNodes.push(lg));

        const ucNodes: any[] = [];

        allNodes.forEach((rn: any) => {
            const ev = rn.event;
            const isEvent = rn.type === 'EVENT' && ev;

            // Check if node has no edges
            const noEdges = (!rn.outgoingEdges || rn.outgoingEdges.length === 0) && (!rn.incomingEdges || rn.incomingEdges.length === 0);

            if (isEvent && noEdges) {
                ucNodes.push(rn);
                return; // Put in docking list, skip canvas
            }

            // Assign parent if we are in a broader scope than leaf
            const parentId = activeScope.type !== 'leaf' ? rn.leafId : undefined;

            const newNode: Node = {
                id: rn.id,
                type: isEvent ? 'eventNode' : 'startEndNode',
                position: { x: 0, y: 0 },
                data: {
                    label: isEvent ? ev.title : (rn.type === 'START' ? 'Start' : 'End'),
                    intensity: ev?.intensity || 'LOW',
                    type: rn.type,
                    nodeId: rn.id,
                    eventId: ev?.id,
                    isLocked: rn.isLocked,
                    leafId: rn.leafId,
                    onClick: () => {
                        if (ev) onSelectEvent(ev.id);
                    },
                    onOpenWizard: (eId: string) => setWizardEventId(eId),
                    onDuplicateEvent: async (eId: string) => {
                        try {
                            const duplicate = await duplicateEvent(eId, storyId);
                            // Create the duplicate node in the same leaf
                            const dNode = await createNode(rn.leafId, 'EVENT', duplicate.id);
                            // Link original node -> duplicate node
                            await createEdge(rn.id, dNode.id, 'CHRONOLOGICAL');
                            qc.invalidateQueries({ queryKey: ['tl'] });
                            toast.success('Event duplicated on canvas');
                        } catch (e: any) {
                            toast.error(e.message || 'Error duplicating event');
                        }
                    },
                    onRemove: async (nId: string) => {
                        if (confirm('Delete this event node from the timeline?')) {
                            try {
                                await deleteNode(nId);
                                qc.invalidateQueries({ queryKey: ['tl'] });
                                toast.success('Node removed');
                            } catch (e: any) {
                                toast.error(e.message);
                            }
                        }
                    },
                    onLockToggle: async () => {
                        if (!rn.isLocked && rn.type === 'END') {
                            const unlockedEndNodes = allNodes.filter(n => n.type === 'END' && !n.isLocked);
                            if (unlockedEndNodes.length <= 1) {
                                toast.error("You must have at least one unlocked End Node.");
                                return;
                            }
                        }
                        try {
                            await updateNodeLocked(rn.id, !rn.isLocked);
                            qc.invalidateQueries({ queryKey: ['tl'] });
                        } catch (e: any) {
                            toast.error(e.message);
                        }
                    },
                    onMoveTo: () => {
                        setMoveNodeId(rn.id);
                    },
                    onDuplicateEnd: async () => {
                        try {
                            await createNode(rn.leafId, 'END');
                            qc.invalidateQueries({ queryKey: ['tl'] });
                        } catch (e: any) {
                            toast.error(e.message);
                        }
                    }
                }
            };

            if (parentId) {
                newNode.parentId = parentId;
            }

            rawNodes.push(newNode);

            if (rn.outgoingEdges) {
                rn.outgoingEdges.forEach((re: any) => {
                    const toNode = allNodes.find(n => n.id === re.toNodeId) as any;
                    let fromLabel = isEvent ? ev.title : (rn.type === 'START' ? 'Start' : 'End');
                    let toLabel = 'Node';
                    if (toNode) {
                        toLabel = toNode.type === 'EVENT' && toNode.event ? toNode.event.title : (toNode.type === 'START' ? 'Start' : 'End');
                    }
                    rawEdges.push({
                        id: re.id,
                        source: re.fromNodeId,
                        target: re.toNodeId,
                        animated: false,
                        type: re.type === 'CHRONOLOGICAL' ? 'focusEdge' : 'default',
                        style: {
                            stroke: re.type === 'CHRONOLOGICAL' ? 'var(--color-text-primary)' : 'var(--color-accent)',
                            strokeWidth: re.type === 'CHRONOLOGICAL' ? 6 : 2,
                            zIndex: 0,
                        },
                        data: {
                            dbId: re.id,
                            label: `${fromLabel} > ${toLabel}`,
                            onHover: (e: any, show: boolean, text: string) => {
                                setHoverTooltip({ visible: show, x: e.clientX, y: e.clientY, text });
                                setEdges(eds => eds.map(ed => ({
                                    ...ed,
                                    zIndex: ed.id === re.id && show ? 100 : 0,
                                    style: {
                                        ...ed.style,
                                        stroke: ed.id === re.id && show ? 'var(--color-accent)' : (ed.data?.isChrono ? 'var(--color-text-primary)' : 'var(--color-accent)')
                                    }
                                })));
                            },
                            isChrono: re.type === 'CHRONOLOGICAL'
                        }
                    });
                });
            }
        });

        setUnconnectedNodes(ucNodes);

        // Ensure default start and end if completely empty
        if (allNodes.length === 0) {
            let startLeafId = activeScope.type === 'leaf' ? activeScope.item.id : null;
            let endLeafId = startLeafId;

            if (activeScope.type === 'timeline' || activeScope.type === 'branch') {
                const scopeLeaves: Leaf[] = [];

                // Helper to safely recursively gather leaves from any branch
                const gatherLeaves = (branches: any[]) => {
                    branches.forEach(b => {
                        if (b.leaves && Array.isArray(b.leaves)) {
                            scopeLeaves.push(...b.leaves);
                        }
                        if (b.childBranches && Array.isArray(b.childBranches)) {
                            gatherLeaves(b.childBranches);
                        }
                    });
                };

                if (activeScope.type === 'branch') {
                    if (activeScope.item.leaves) scopeLeaves.push(...activeScope.item.leaves);
                    if (activeScope.item.childBranches) gatherLeaves(activeScope.item.childBranches);
                } else if (activeScope.type === 'timeline') {
                    if (activeScope.item.branches) gatherLeaves(activeScope.item.branches);
                }

                if (scopeLeaves.length > 0) {
                    const firstLeaf = scopeLeaves[0];
                    const lastLeaf = scopeLeaves[scopeLeaves.length - 1];
                    if (firstLeaf && lastLeaf) {
                        startLeafId = firstLeaf.id;
                        endLeafId = lastLeaf.id;
                    }
                }
            }

            if (startLeafId && endLeafId) {
                // Create Start and End node automatically through API
                (async () => {
                    const startNode = await createNode(startLeafId, 'START');
                    const endNode = await createNode(endLeafId, 'END');
                    await createEdge(startNode.id, endNode.id, 'CHRONOLOGICAL');
                    qc.invalidateQueries({ queryKey: ['tl'] });
                })();
                return;
            }
        }

        if (rawNodes.length > 0) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLaneLayoutedElements(
                rawNodes,
                rawEdges
            );

            // Check for automatically migrating unlocked END nodes here
            const lastLeaf = Object.values(leafGroups).pop();
            if (lastLeaf) {
                const unlockedEndNodes = rawNodes.filter(n => n.type === 'startEndNode' && n.data.type === 'END' && !n.data.isLocked && n.parentId !== lastLeaf.id);
                if (unlockedEndNodes.length > 0) {
                    (async () => {
                        // To avoid infinite loops, just update visually instantly and kick off async update
                        for (const uen of unlockedEndNodes) {
                            if (uen.data && (uen.data as any).nodeId) {
                                await updateNodeLeaf((uen.data as any).nodeId as string, lastLeaf.id);
                            }
                        }
                        qc.invalidateQueries({ queryKey: ['tl'] });
                    })();
                }
            }

            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);
        } else {
            setNodes([]);
            setEdges([]);
        }

    }, [activeScope, qc, onSelectEvent]);

    const onConnect = useCallback(
        async (params: Connection) => {
            if (params.source && params.target) {
                const edge = await createEdge(params.source, params.target, 'CHRONOLOGICAL');
                qc.invalidateQueries({ queryKey: ['tl', 'graphs'] });
            }
        },
        [qc],
    );

    // Focus Effect
    useEffect(() => {
        if (!focusEventId || nodes.length === 0) return;
        const targetNode = nodes.find(n => n.data?.eventId === focusEventId);
        if (targetNode) {
            reactFlow.setCenter(targetNode.position.x + nodeWidth / 2, targetNode.position.y + nodeHeight / 2, { duration: 800, zoom: 1 });
            // Flash node effect via DOM
            const el = document.querySelector(`[data-id="${targetNode.id}"] .bg-text-primary`);
            if (el) {
                el.classList.add('ring-4', 'ring-accent', 'scale-110');
                setTimeout(() => el.classList.remove('ring-4', 'ring-accent', 'scale-110'), 2000);
            }
            // Clear focus event so it can re-trigger
            setTimeout(() => setFocusEventId(null), 100);
        }
    }, [focusEventId, nodes, reactFlow, setFocusEventId]);

    const branchNums = useMemo(() => activeScope?.rootGraph ? calculateBranchNumbers(activeScope.rootGraph, activeScope.rootGraph) : new Map(), [activeScope?.rootGraph]);
    const leafNums = useMemo(() => activeScope?.rootGraph ? calculateLeafNumbers(activeScope.rootGraph, activeScope.rootGraph) : new Map(), [activeScope?.rootGraph]);

    return (
        <div className="w-full h-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                fitView
                minZoom={0.05}
                className="bg-background relative"
            >
                <CanvasDock
                    unconnectedNodes={unconnectedNodes}
                    onOpenWizard={setWizardEventId}
                    onRemoveNode={async (nodeId) => {
                        if (confirm('Delete this unused node?')) {
                            try {
                                await deleteNode(nodeId);
                                qc.invalidateQueries({ queryKey: ['tl'] });
                                toast.success('Node removed');
                            } catch (e: any) {
                                toast.error(e.message);
                            }
                        }
                    }}
                />
                <Background color="var(--color-text-primary)" variant={"dots" as any} />
                <Controls showInteractive={false} className="[&>button]:!bg-surface [&>button:hover]:!bg-surface-hover [&>button]:!border-border [&>button]:!text-text-primary [&_svg]:!fill-current border !border-border rounded-md shadow-sm" />
                {hoverTooltip.visible && (
                    <div className="fixed z-[100] px-2 py-1 text-xs font-medium text-white bg-black/80 rounded shadow pointer-events-none transform -translate-x-1/2 mt-4" style={{ left: hoverTooltip.x, top: hoverTooltip.y }}>
                        {hoverTooltip.text}
                    </div>
                )}
            </ReactFlow>
            {wizardEventId && activeScope?.rootGraph && (
                <CanvasWizard
                    eventId={wizardEventId}
                    activeGraph={activeScope.rootGraph}
                    onClose={() => setWizardEventId(null)}
                />
            )}

            <Dialog open={!!moveNodeId} onOpenChange={(open) => !open && setMoveNodeId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Move End Node</DialogTitle>
                        <DialogDescription>
                            Select a leaf to move this End Node to. Note: If the node is unlocked, it will automatically jump to the end of the timeline later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="w-full flex flex-col py-4">
                        <SearchableSelect
                            options={
                                activeScope?.rootGraph?.branches.flatMap(b =>
                                    b.leaves.map(l => ({
                                        value: l.id,
                                        label: `${b.name} ${branchNums.get(b.id) || ''} - ${l.name} ${leafNums.get(l.id) || ''}`
                                    }))
                                ) || []
                            }
                            value={''}
                            placeholder="Select a destination leaf..."
                            onChange={async (val) => {
                                if (val && moveNodeId) {
                                    try {
                                        await updateNodeLeaf(moveNodeId, val);
                                        toast.success('Node moved successfully');
                                        qc.invalidateQueries({ queryKey: ['tl'] });
                                    } catch (e: any) {
                                        toast.error(e.message || 'Failed to move node');
                                    } finally {
                                        setMoveNodeId(null);
                                    }
                                }
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function TimelineCanvas(props: TimelineCanvasProps) {
    return (
        <ReactFlowProvider>
            <FlowCanvas {...props} />
        </ReactFlowProvider>
    );
}
