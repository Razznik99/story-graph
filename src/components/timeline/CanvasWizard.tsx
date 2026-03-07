'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchableSelect, Option } from '@/components/ui/searchable-select';
import { TimelineGraph, Leaf, TimelineNode, createNode, updateNodeLeaf, createEdge, deleteEdge, deleteNode } from '@/lib/timeline-api';
import { calculateLeafNumbers } from './timeline-explorer-helpers';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface CanvasWizardProps {
    eventId: string;
    activeGraph: TimelineGraph;
    onClose: () => void;
}

export default function CanvasWizard({ eventId, activeGraph, onClose }: CanvasWizardProps) {
    const qc = useQueryClient();

    // 1. Find currentNode if it exists
    const allLeaves = useMemo(() => {
        const leaves: Leaf[] = [];
        activeGraph.branches.forEach(b => {
            b.leaves?.forEach(l => leaves.push(l));
        });
        return leaves;
    }, [activeGraph]);

    const leafNums = useMemo(() => calculateLeafNumbers(activeGraph, activeGraph), [activeGraph]);

    // Sort leaves essentially by their structural order
    const sortedLeaves = useMemo(() => {
        return [...allLeaves].sort((a, b) => (leafNums.get(a.id) || 0) - (leafNums.get(b.id) || 0));
    }, [allLeaves, leafNums]);

    const currentNode = useMemo(() => {
        let foundNode: TimelineNode | undefined;
        let foundLeaf: Leaf | undefined;
        for (const l of allLeaves) {
            const n = (l as any).nodes?.find((n: any) => n.eventId === eventId);
            if (n) {
                foundNode = n;
                foundLeaf = l;
                break;
            }
        }
        return { node: foundNode, leaf: foundLeaf };
    }, [allLeaves, eventId]);

    const [selectedLeafId, setSelectedLeafId] = useState<string | null>(currentNode.leaf?.id || null);

    // Edges tracking
    const [fromNodeIds, setFromNodeIds] = useState<string[]>(
        (currentNode.node as any)?.incomingEdges?.map((e: any) => e.fromNodeId) || []
    );
    const [toNodeIds, setToNodeIds] = useState<string[]>(
        (currentNode.node as any)?.outgoingEdges?.map((e: any) => e.toNodeId) || []
    );

    const [isSaving, setIsSaving] = useState(false);

    // Filter available nodes based on leaf context
    const leafOptions: Option[] = sortedLeaves.map(l => ({
        label: `${leafNums.get(l.id)}. ${l.title || l.name || 'Leaf'}`,
        value: l.id
    }));

    const availableNodes = useMemo(() => {
        if (!selectedLeafId) return { from: [], to: [] };
        const leafIdx = sortedLeaves.findIndex(l => l.id === selectedLeafId);
        const prevLeaf = leafIdx > 0 ? sortedLeaves[leafIdx - 1] : null;
        const currentLeaf = sortedLeaves[leafIdx];
        const nextLeaf = leafIdx < sortedLeaves.length - 1 ? sortedLeaves[leafIdx + 1] : null;

        const getNodesFromLeaf = (leaf: Leaf, labelPrefix: string): Option[] => {
            const nodes = (leaf as any).nodes || [];
            return nodes.map((n: any) => {
                let name = n.type;
                if (n.type === 'EVENT' && n.event) name = n.event.title;
                return {
                    label: name,
                    value: n.id,
                    typeLabel: labelPrefix
                };
            }).filter((n: any) => n.value !== currentNode.node?.id);
        };

        const fromOpts: Option[] = [];
        if (prevLeaf) fromOpts.push(...getNodesFromLeaf(prevLeaf, 'Previous Leaf'));
        if (currentLeaf) fromOpts.push(...getNodesFromLeaf(currentLeaf, 'Current Leaf'));
        // Filter out END nodes from "From" source
        const finalFromOpts = fromOpts.filter(o => o.label !== 'END');

        const toOpts: Option[] = [];
        if (currentLeaf) toOpts.push(...getNodesFromLeaf(currentLeaf, 'Current Leaf'));
        if (nextLeaf) toOpts.push(...getNodesFromLeaf(nextLeaf, 'Next Leaf'));
        // Filter out START nodes from "To" target
        const finalToOpts = toOpts.filter(o => o.label !== 'START');

        return { from: finalFromOpts, to: finalToOpts };
    }, [selectedLeafId, sortedLeaves, currentNode]);

    const deleteNodeAndFinish = async () => {
        if (!currentNode.node) return;
        setIsSaving(true);
        try {
            await deleteNode(currentNode.node.id);
            qc.invalidateQueries({ queryKey: ['tl'] });
            toast.success('Node deleted due to 0 connections.');
            onClose();
        } catch (e: any) {
            toast.error(e.message);
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!selectedLeafId) return toast.error('Please select a leaf');

        if (fromNodeIds.some(id => toNodeIds.includes(id))) {
            return toast.error("An event cannot connect to the same node as both a 'From' and 'To' connection.");
        }

        if (fromNodeIds.length === 0 && toNodeIds.length === 0 && !currentNode.node) {
            // Allows creating with 0 connections
        }

        setIsSaving(true);
        try {
            let ndId = currentNode.node?.id;

            // 1. Handle Node Create / Update
            if (!ndId) {
                const newNode = await createNode(selectedLeafId, 'EVENT', eventId);
                ndId = newNode.id;
            } else if (currentNode.leaf?.id !== selectedLeafId) {
                await updateNodeLeaf(ndId, selectedLeafId);
            }

            // 2. Fetch latest node edges if node existed (to diff additions/removals)
            const existingIncoming = (currentNode.node as any)?.incomingEdges || [];
            const existingOutgoing = (currentNode.node as any)?.outgoingEdges || [];

            // Compute edges to delete
            const incomingToDelete = existingIncoming.filter((e: any) => !fromNodeIds.includes(e.fromNodeId));
            const outgoingToDelete = existingOutgoing.filter((e: any) => !toNodeIds.includes(e.toNodeId));

            // Compute edges to add
            const existingIncomingIds = existingIncoming.map((e: any) => e.fromNodeId);
            const existingOutgoingIds = existingOutgoing.map((e: any) => e.toNodeId);

            const fromToAdd = fromNodeIds.filter(id => !existingIncomingIds.includes(id));
            const toToAdd = toNodeIds.filter(id => !existingOutgoingIds.includes(id));

            // Delete
            for (const e of incomingToDelete) {
                await deleteEdge(e.id);
            }
            for (const e of outgoingToDelete) {
                await deleteEdge(e.id);
            }

            // Add
            for (const fid of fromToAdd) {
                await createEdge(fid, ndId, 'CHRONOLOGICAL');
            }
            for (const tid of toToAdd) {
                await createEdge(ndId, tid, 'CHRONOLOGICAL');
            }

            qc.invalidateQueries({ queryKey: ['tl'] });
            toast.success('Event placement updated!');
            onClose();
        } catch (e: any) {
            toast.error(e.message || 'Error saving placement');
            setIsSaving(false);
        }
    };

    // UI Helpers map to node names
    const getNodeName = (nid: string) => {
        const foundFrom = availableNodes.from.find(o => o.value === nid);
        if (foundFrom) return foundFrom.label;
        const foundTo = availableNodes.to.find(o => o.value === nid);
        if (foundTo) return foundTo.label;

        // Lookup globally
        for (const l of allLeaves) {
            const n = (l as any).nodes?.find((nx: any) => nx.id === nid);
            if (n) {
                if (n.type === 'EVENT' && n.event) return n.event.title;
                return n.type;
            }
        }
        return 'Unknown Node';
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl bg-surface border border-border">
                <DialogHeader>
                    <DialogTitle>{currentNode.node ? 'Manage Event Placement' : 'Place Event in Timeline'}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                    {/* Leaf Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-text-secondary">Selected Leaf</label>
                        {!currentNode.node ? (
                            <SearchableSelect
                                options={leafOptions}
                                value={selectedLeafId}
                                onChange={setSelectedLeafId}
                                placeholder="Search & Select a Leaf..."
                                fullWidth
                            />
                        ) : (
                            <div className="px-3 py-2 bg-background border border-border rounded text-sm text-text-primary">
                                {leafOptions.find(o => o.value === selectedLeafId)?.label || 'Unknown Leaf'}
                            </div>
                        )}
                    </div>

                    {selectedLeafId && (
                        <div className="grid grid-cols-2 gap-8">
                            {/* Connected From */}
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-text-secondary block mb-2">Connected From (Left)</label>
                                    <SearchableSelect
                                        options={availableNodes.from.filter(o => !fromNodeIds.includes(o.value))}
                                        onChange={(v) => { if (v) setFromNodeIds([...fromNodeIds, v]) }}
                                        resetAfterSelect
                                        placeholder="Add From Connection..."
                                        fullWidth
                                    />
                                </div>
                                <div className="flex flex-col gap-2 bg-background p-2 rounded min-h-[140px] border border-border/50">
                                    {fromNodeIds.length === 0 && <div className="text-xs text-text-muted text-center pt-8">No connections</div>}
                                    {fromNodeIds.map(fid => (
                                        <div key={fid} className="flex items-center justify-between bg-surface p-2 rounded border border-border text-sm">
                                            <span className="truncate flex-1" title={getNodeName(fid)}>{getNodeName(fid)}</span>
                                            <Button variant="ghost" size="icon-sm" className="h-6 w-6 shrink-0 ml-2 text-error hover:bg-error/10 hover:text-error" onClick={() => setFromNodeIds(fromNodeIds.filter(id => id !== fid))}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Connected To */}
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-text-secondary block mb-2">Connected To (Right)</label>
                                    <SearchableSelect
                                        options={availableNodes.to.filter(o => !toNodeIds.includes(o.value))}
                                        onChange={(v) => { if (v) setToNodeIds([...toNodeIds, v]) }}
                                        resetAfterSelect
                                        placeholder="Add To Connection..."
                                        fullWidth
                                    />
                                </div>
                                <div className="flex flex-col gap-2 bg-background p-2 rounded min-h-[140px] border border-border/50">
                                    {toNodeIds.length === 0 && <div className="text-xs text-text-muted text-center pt-8">No connections</div>}
                                    {toNodeIds.map(tid => (
                                        <div key={tid} className="flex items-center justify-between bg-surface p-2 rounded border border-border text-sm">
                                            <span className="truncate flex-1" title={getNodeName(tid)}>{getNodeName(tid)}</span>
                                            <Button variant="ghost" size="icon-sm" className="h-6 w-6 shrink-0 ml-2 text-error hover:bg-error/10 hover:text-error" onClick={() => setToNodeIds(toNodeIds.filter(id => id !== tid))}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4 border-t border-border pt-4">
                    <div className="flex w-full justify-between items-center">
                        {currentNode.node ? (
                            <Button
                                variant="outline"
                                className="text-error border-error-hover/30 hover:bg-error/10 hover:text-error hover:border-error"
                                disabled={isSaving}
                                onClick={async () => {
                                    if (confirm('Delete this event node from the timeline?')) {
                                        deleteNodeAndFinish();
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Remove from Timeline
                            </Button>
                        ) : <div />}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving || !selectedLeafId} className="bg-primary hover:bg-primary-hover text-white">
                                {isSaving ? 'Saving...' : 'Confirm'}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
