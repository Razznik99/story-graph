'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTimelineGraphs,
    createTimeline,
    renameTimeline,
    deleteTimeline,
    createBranch,
    renameBranch,
    reorderBranch,
    deleteBranch,
    createLeaf,
    renameLeaf,
    reorderLeaf,
    deleteLeaf,
    listEvents,
    duplicateEvent,
    deleteNode,
    TimelineGraph,
    Branch,
    Leaf,
    Timeline,
} from '@/lib/timeline-api';
import { useStoryStore } from '@/store/useStoryStore';
import { useTimelineStore } from '@/store/useTimelineStore';
import {
    ChevronRight, ChevronDown, Folder, FolderPen, MoreHorizontal,
    Trash2, ArrowUp, ArrowDown, SquareArrowOutUpRight, FolderPlus,
    CirclePlus, GitCompareArrows, FoldVertical, RefreshCw, GitFork,
    ArrowDownNarrowWide, ExternalLink, GitCommitHorizontal, Circle, Settings, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { calculateBranchNumbers, calculateLeafNumbers } from './timeline-explorer-helpers';
import { BranchIcon } from '@/components/notes/StoryNoteList';
import { useTimelineDock } from '@/components/timeline/TimelineDock';
import CanvasWizard from '@/components/timeline/CanvasWizard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TimelineExplorer() {
    const qc = useQueryClient();
    const router = useRouter();
    const { selectedStoryId } = useStoryStore();

    const { data: graphs = [], isLoading, refetch } = useQuery({
        queryKey: ['tl', 'graphs', selectedStoryId],
        queryFn: () => selectedStoryId ? getTimelineGraphs(selectedStoryId) : Promise.resolve([]),
        enabled: !!selectedStoryId,
    });

    const { data: events = [] } = useQuery({
        queryKey: ['tl', 'events', selectedStoryId],
        queryFn: () => selectedStoryId ? listEvents(selectedStoryId) : Promise.resolve([]),
        enabled: !!selectedStoryId,
    });

    const dock = useTimelineDock(selectedStoryId || undefined);

    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    const [editing, setEditing] = React.useState<Record<string, boolean>>({});
    const [swapDialogOpen, setSwapDialogOpen] = React.useState(false);
    const [activeGraphId, setActiveGraphId] = React.useState<string | null>(null);
    const [isEventsOpen, setIsEventsOpen] = React.useState(false);
    const [eventFilter, setEventFilter] = React.useState<'All' | 'Used' | 'Unused'>('Unused');
    const [wizardEventId, setWizardEventId] = React.useState<string | null>(null);

    const toggle = (id: string) => setExpanded(m => ({ ...m, [id]: !(m[id] ?? true) }));
    const startEdit = (id: string) => setEditing(m => ({ ...m, [id]: true }));
    const stopEdit = (id: string) => setEditing(m => ({ ...m, [id]: false }));

    const invalidate = () => qc.invalidateQueries({ queryKey: ['tl', 'graphs', selectedStoryId] });

    const currentLevelId = useTimelineStore(s => s.currentLevelId);
    const setCurrentLevelId = useTimelineStore(s => s.setCurrentLevelId);
    const setFocusEventId = useTimelineStore(s => s.setFocusEventId);
    const [hasHydrated, setHasHydrated] = React.useState(false);
    React.useEffect(() => { setHasHydrated(true); }, []);

    // Auto-select first graph if none selected
    React.useEffect(() => {
        if (!hasHydrated || graphs.length === 0) return;

        let foundGraphId: string | null = null;
        if (currentLevelId) {
            for (const g of graphs) {
                if (g.id === currentLevelId) {
                    foundGraphId = g.id; break;
                }
                const findInBranches = (branches: any[]): string | null => {
                    for (const b of branches) {
                        if (b.id === currentLevelId) return g.id;
                        if (b.leaves?.some((l: any) => l.id === currentLevelId)) return g.id;
                        if (b.childBranches) {
                            const childFound = findInBranches(b.childBranches);
                            if (childFound) return childFound;
                        }
                    }
                    return null;
                };
                foundGraphId = findInBranches(g.branches || []);
                if (foundGraphId) break;
            }
        }

        if (foundGraphId) {
            if (activeGraphId !== foundGraphId) setActiveGraphId(foundGraphId);
        } else if (!activeGraphId || !graphs.find(g => g.id === activeGraphId)) {
            if (graphs[0]) {
                setActiveGraphId(graphs[0].id);
                setCurrentLevelId(graphs[0].id);
            }
        }
    }, [graphs, currentLevelId, activeGraphId, hasHydrated, setCurrentLevelId]);

    const activeGraph = graphs.find(g => g.id === activeGraphId) || graphs[0];

    const createTlMut = useMutation({
        mutationFn: () => createTimeline(selectedStoryId!),
        onSuccess: (newTl) => {
            invalidate();
            setActiveGraphId(newTl.id);
            setCurrentLevelId(newTl.id);
            setSwapDialogOpen(false);
        }
    });

    // Mutations for Timeline
    const renameTlMut = useMutation({ mutationFn: (p: { id: string, title: string }) => renameTimeline(p.id, p.title), onSuccess: invalidate });
    const deleteTlMut = useMutation({
        mutationFn: (id: string) => deleteTimeline(id), onSuccess: () => {
            invalidate();
            setActiveGraphId(null);
        }
    });

    // Mutations for Branch
    const createBranchMut = useMutation({
        mutationFn: (p: { tlId: string, parentId?: string, title?: string, position?: 'above' | 'below', referenceId?: string }) => createBranch(p.tlId, p.parentId, p.title, p.position, p.referenceId),
        onSuccess: invalidate
    });
    const renameBranchMut = useMutation({ mutationFn: (p: { id: string, title: string }) => renameBranch(p.id, p.title), onSuccess: invalidate });
    const reorderBranchMut = useMutation({ mutationFn: (p: { id: string, dir: 'up' | 'down' }) => reorderBranch(p.id, p.dir), onSuccess: invalidate });
    const deleteBranchMut = useMutation({ mutationFn: (id: string) => deleteBranch(id), onSuccess: invalidate });

    // Mutations for Leaf
    const createLeafMut = useMutation({
        mutationFn: (p: { branchId: string, title?: string, position?: 'above' | 'below', referenceId?: string }) => createLeaf(p.branchId, p.title, p.position, p.referenceId),
        onSuccess: invalidate
    });
    const renameLeafMut = useMutation({ mutationFn: (p: { id: string, title: string }) => renameLeaf(p.id, p.title), onSuccess: invalidate });
    const reorderLeafMut = useMutation({ mutationFn: (p: { id: string, dir: 'up' | 'down' }) => reorderLeaf(p.id, p.dir), onSuccess: invalidate });
    const deleteLeafMut = useMutation({ mutationFn: (id: string) => deleteLeaf(id), onSuccess: invalidate });

    if (!selectedStoryId) return <div className="p-4 text-sm text-text-muted">Please select a story.</div>;
    if (isLoading) return <div className="p-4 text-sm text-text-muted">Loading timeline...</div>;

    if (graphs.length === 0) {
        return (
            <div className="p-4 flex flex-col gap-4">
                <span className="text-sm text-text-muted">No timeline exists.</span>
                <Button size="sm" onClick={() => createTlMut.mutate()}>Create Timeline</Button>
            </div>
        );
    }

    if (!activeGraph) return <div className="p-4 text-sm text-text-muted">No active timeline.</div>;

    const branchNums = calculateBranchNumbers(activeGraph, activeGraph);
    const leafNums = calculateLeafNumbers(activeGraph, activeGraph);

    // Organize branches into a tree
    type RichBranch = TimelineGraph['branches'][0];
    const rootBranches = activeGraph.branches.filter(b => !b.parentBranchId);
    const byParentBranch = new Map<string, RichBranch[]>();
    activeGraph.branches.forEach(b => {
        const pid = b.parentBranchId;
        if (pid) {
            if (!byParentBranch.has(pid)) byParentBranch.set(pid, []);
            byParentBranch.get(pid)!.push(b);
        }
    });

    // Determine used events in current timeline
    const usedEventIds = new Set<string>();
    activeGraph.branches.forEach(b => {
        b.leaves?.forEach(l => {
            (l as any).nodes?.forEach((n: any) => {
                if (n.eventId) usedEventIds.add(n.eventId);
            });
        });
    });

    const filteredEvents = events.filter(e => {
        if (eventFilter === 'Used') return usedEventIds.has(e.id);
        if (eventFilter === 'Unused') return !usedEventIds.has(e.id);
        return true;
    });

    const renderBranch = (branch: RichBranch, depth: number) => {
        const isExp = expanded[branch.id] ?? true;
        const children = byParentBranch.get(branch.id) || [];
        const leaves = branch.leaves || [];
        const hasChildren = children.length > 0 || leaves.length > 0;
        const num = branchNums.get(branch.id);

        let bName = activeGraph.branch1Name;
        if (branch.level === 2) bName = activeGraph.branch2Name || activeGraph.branch1Name;
        if (branch.level === 3) bName = activeGraph.branch3Name || activeGraph.branch2Name || activeGraph.branch1Name;

        const isB2Active = !!(activeGraph.branch2Name && activeGraph.branch2Name.trim() !== '');
        const isB3Active = !!(activeGraph.branch3Name && activeGraph.branch3Name.trim() !== '');

        let canCreateSubBranch = false;
        let canCreateLeaf = false;

        if (branch.level === 1) {
            if (isB2Active || isB3Active) canCreateSubBranch = true;
            else canCreateLeaf = true;
        } else if (branch.level === 2) {
            if (isB3Active) canCreateSubBranch = true;
            else canCreateLeaf = true;
        } else {
            canCreateLeaf = true;
        }

        const menuItems = [
            <DropdownMenuItem key="rename" onClick={(e) => { e.stopPropagation(); startEdit(branch.id); }}><BranchIcon state="start" className="h-3 w-3 mr-2" /> Rename</DropdownMenuItem>,
            <DropdownMenuSeparator key="sep1" />
        ];

        if (canCreateSubBranch) {
            menuItems.push(
                <DropdownMenuItem key="addsub" onClick={(e) => { e.stopPropagation(); createBranchMut.mutate({ tlId: activeGraph.id, parentId: branch.id }); }}>
                    <FolderPlus className="h-3 w-3 mr-2" /> Add Sub-Branch
                </DropdownMenuItem>
            );
        }
        if (canCreateLeaf) {
            menuItems.push(
                <DropdownMenuItem key="addleaf" onClick={(e) => { e.stopPropagation(); createLeafMut.mutate({ branchId: branch.id }); }}>
                    <CirclePlus className="h-3 w-3 mr-2" /> Add Leaf
                </DropdownMenuItem>
            );
        }

        menuItems.push(
            <DropdownMenuSeparator key="sep_insert" />,
            <DropdownMenuItem key="insert_above" onClick={(e) => { e.stopPropagation(); createBranchMut.mutate({ tlId: activeGraph.id, ...(branch.parentBranchId ? { parentId: branch.parentBranchId } : {}), position: 'above', referenceId: branch.id }); }}><FolderPlus className="h-3 w-3 mr-2" /> Insert Above</DropdownMenuItem>,
            <DropdownMenuItem key="insert_below" onClick={(e) => { e.stopPropagation(); createBranchMut.mutate({ tlId: activeGraph.id, ...(branch.parentBranchId ? { parentId: branch.parentBranchId } : {}), position: 'below', referenceId: branch.id }); }}><FolderPlus className="h-3 w-3 mr-2" /> Insert Below</DropdownMenuItem>,
            <DropdownMenuSeparator key="sep2" />,
            <DropdownMenuItem key="up" onClick={(e) => { e.stopPropagation(); reorderBranchMut.mutate({ id: branch.id, dir: 'up' }); }}><ArrowUp className="h-3 w-3 mr-2" /> Move Up</DropdownMenuItem>,
            <DropdownMenuItem key="down" onClick={(e) => { e.stopPropagation(); reorderBranchMut.mutate({ id: branch.id, dir: 'down' }); }}><ArrowDown className="h-3 w-3 mr-2" /> Move Down</DropdownMenuItem>,
            <DropdownMenuSeparator key="sep3" />,
            <DropdownMenuItem key="del" className="text-error" onClick={(e) => { e.stopPropagation(); if (confirm('Delete Branch?')) deleteBranchMut.mutate(branch.id); }}><Trash2 className="h-3 w-3 mr-2" /> Delete</DropdownMenuItem>
        );

        // determine branch state from level for BranchIcon
        let branchIconState: 'start' | 'center' | 'end' = 'start';
        if (branch.level === 2) branchIconState = 'center';
        if (branch.level === 3) branchIconState = 'end';

        return (
            <div key={branch.id} className={cn("relative", depth > 0 && "ml-4 pl-2 border-l border-border/40")}>
                <ExplorerItem
                    title={branch.title}
                    baseName={`${bName} ${num}`}
                    isExpanded={isExp}
                    hasChildren={hasChildren}
                    isEditing={editing[branch.id]}
                    onToggle={() => toggle(branch.id)}
                    onStartEdit={() => startEdit(branch.id)}
                    onSave={(val: string) => { renameBranchMut.mutate({ id: branch.id, title: val }); stopEdit(branch.id); }}
                    onCancel={() => stopEdit(branch.id)}
                    menuItems={menuItems}
                    icon={<BranchIcon state={branchIconState} className={cn("h-4 w-4 shrink-0", isExp ? "text-accent" : "text-text-muted")} />}
                />
                {isExp && (
                    <div className="animate-accordion-down">
                        {/* Render Leaves */}
                        {leaves.map((leaf: Leaf) => {
                            const lNum = leafNums.get(leaf.id);
                            const leafNodes = (leaf as any).nodes || [];
                            const eventNodes = leafNodes.filter((n: any) => n.type === 'EVENT' && n.event);

                            return (
                                <div key={leaf.id} className="ml-4 pl-2 border-l border-border/40">
                                    <ExplorerItem
                                        title={leaf.title}
                                        baseName={`${activeGraph.leafName} ${lNum}`}
                                        isExpanded={expanded[leaf.id] ?? true}
                                        hasChildren={eventNodes.length > 0}
                                        isEditing={editing[leaf.id]}
                                        onToggle={() => toggle(leaf.id)}
                                        onStartEdit={() => startEdit(leaf.id)}
                                        onSave={(val: string) => { renameLeafMut.mutate({ id: leaf.id, title: val }); stopEdit(leaf.id); }}
                                        onCancel={() => stopEdit(leaf.id)}
                                        menuItems={[
                                            <DropdownMenuItem key="rename" onClick={(e) => { e.stopPropagation(); startEdit(leaf.id); }}><BranchIcon state="end" className="h-3 w-3 mr-2" /> Rename</DropdownMenuItem>,
                                            <DropdownMenuSeparator key="sep1" />,
                                            <DropdownMenuItem key="insert_above" onClick={(e) => { e.stopPropagation(); createLeafMut.mutate({ branchId: branch.id, position: 'above', referenceId: leaf.id }); }}><CirclePlus className="h-3 w-3 mr-2" /> Insert Above</DropdownMenuItem>,
                                            <DropdownMenuItem key="insert_below" onClick={(e) => { e.stopPropagation(); createLeafMut.mutate({ branchId: branch.id, position: 'below', referenceId: leaf.id }); }}><CirclePlus className="h-3 w-3 mr-2" /> Insert Below</DropdownMenuItem>,
                                            <DropdownMenuSeparator key="sep2" />,
                                            <DropdownMenuItem key="up" onClick={(e) => { e.stopPropagation(); reorderLeafMut.mutate({ id: leaf.id, dir: 'up' }); }}><ArrowUp className="h-3 w-3 mr-2" /> Move Up</DropdownMenuItem>,
                                            <DropdownMenuItem key="down" onClick={(e) => { e.stopPropagation(); reorderLeafMut.mutate({ id: leaf.id, dir: 'down' }); }}><ArrowDown className="h-3 w-3 mr-2" /> Move Down</DropdownMenuItem>,
                                            <DropdownMenuSeparator key="sep3" />,
                                            <DropdownMenuItem key="del" className="text-error" onClick={(e) => { e.stopPropagation(); if (confirm('Delete Leaf?')) deleteLeafMut.mutate(leaf.id); }}><Trash2 className="h-3 w-3 mr-2" /> Delete</DropdownMenuItem>
                                        ]}
                                        icon={<BranchIcon state="end" className={cn("h-4 w-4 shrink-0", expanded[leaf.id] ? "text-accent" : "text-text-muted")} />}
                                    />
                                    {(expanded[leaf.id] !== false) && eventNodes.length > 0 && (
                                        <div className="ml-4 pl-2 border-l border-border/40 pb-1">
                                            {eventNodes.map((n: any) => {
                                                const ev = n.event;
                                                const inDock = (!n.incomingEdges || n.incomingEdges.length === 0) && (!n.outgoingEdges || n.outgoingEdges.length === 0);
                                                return (
                                                    <ExplorerEventItem
                                                        key={n.id}
                                                        title={ev.title || 'Untitled Event'}
                                                        inDock={inDock}
                                                        onClick={() => {
                                                            setCurrentLevelId(activeGraphId);
                                                            setFocusEventId(ev.id);
                                                        }}
                                                        onViewCanvas={() => {
                                                            setCurrentLevelId(activeGraphId);
                                                            setFocusEventId(ev.id);
                                                        }}
                                                        onViewDock={() => dock.openEventById(ev.id)}
                                                        onManageConnection={() => setWizardEventId(ev.id)}
                                                        onDuplicate={async () => {
                                                            try {
                                                                await duplicateEvent(ev.id, selectedStoryId!);
                                                                qc.invalidateQueries({ queryKey: ['tl'] });
                                                                toast.success('Event duplicated');
                                                            } catch (e: any) {
                                                                toast.error(e.message || 'Error duplicating event');
                                                            }
                                                        }}
                                                        onRemove={async () => {
                                                            if (confirm('Delete this event node from the timeline?')) {
                                                                try {
                                                                    await deleteNode(n.id);
                                                                    qc.invalidateQueries({ queryKey: ['tl'] });
                                                                    toast.success('Node removed');
                                                                } catch (e: any) {
                                                                    toast.error(e.message);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {/* Render SubBranches */}
                        {children.map(child => renderBranch(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-surface">
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full bg-surface">
                    <div className="p-2 pb-12">
                        {/* Top Timeline Header */}
                        <div className="group flex flex-col mb-4 p-2 bg-background border border-border rounded shadow-sm">
                            <div className="flex items-center justify-between">
                                {editing[activeGraph.id] ? (
                                    <Input
                                        value={activeGraph.name}
                                        onChange={(e) => renameTlMut.mutate({ id: activeGraph.id, title: e.target.value })}
                                        onBlur={() => stopEdit(activeGraph.id)}
                                        // Make sure we update name internally while typing to give instant visual feedback
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'Escape') stopEdit(activeGraph.id);
                                        }}
                                        className="h-7 py-1 px-2 text-sm w-full focus-within:ring-accent"
                                        autoFocus
                                    />
                                ) : (
                                    <span
                                        className="text-sm font-semibold text-text-primary cursor-pointer hover:underline truncate"
                                        onClick={() => setCurrentLevelId(activeGraphId)}
                                        onDoubleClick={() => startEdit(activeGraph.id)}
                                    >
                                        {activeGraph.name}
                                    </span>
                                )}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-2">
                                    <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-text-muted hover:text-text-primary" onClick={() => refetch()} title="Refresh Timeline">
                                        <RefreshCw className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-text-muted hover:text-text-primary" onClick={() => createBranchMut.mutate({ tlId: activeGraph.id })} title="Add Branch">
                                        <ArrowDownNarrowWide className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-text-muted hover:text-text-primary" onClick={() => setSwapDialogOpen(true)} title="Swap Timeline">
                                        <GitCompareArrows className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            {rootBranches.map(b => renderBranch(b, 0))}
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Events Drawer */}
            <div className={cn("flex flex-col border-t border-border transition-all duration-300", isEventsOpen ? "h-[40%] min-h-[200px]" : "h-10")}>
                <div
                    className="h-10 flex items-center justify-between px-4 cursor-pointer hover:bg-surface-hover select-none bg-surface-2 shrink-0 border-b border-border/50"
                    onClick={() => setIsEventsOpen(!isEventsOpen)}
                >
                    <span className="text-sm font-semibold text-text-primary">Events ({events.filter(e => !usedEventIds.has(e.id)).length})</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 text-text-muted hover:text-text-primary"
                            onClick={(e) => { e.stopPropagation(); setIsEventsOpen(true); dock.openNewEventEditor(); }}
                            title="Create New Event"
                        >
                            <CirclePlus className="h-4 w-4" />
                        </Button>
                        {isEventsOpen ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
                    </div>
                </div>
                {isEventsOpen && (
                    <div className="flex-1 flex flex-col min-h-0 bg-background">
                        <div className="flex items-center gap-2 p-2 border-b border-border text-xs shrink-0">
                            {(['All', 'Used', 'Unused'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setEventFilter(f)}
                                    className={cn("px-2 py-1 rounded transition-colors", eventFilter === f ? "bg-accent text-accent-foreground" : "hover:bg-surface-hover text-text-muted")}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 flex flex-col gap-1">
                                {filteredEvents.length === 0 && (
                                    <p className="text-xs text-text-muted text-center py-4">No events found.</p>
                                )}
                                {filteredEvents.map(ev => {
                                    const isUsed = usedEventIds.has(ev.id);
                                    return (
                                        <div key={ev.id} className="flex flex-col p-2 text-sm border border-border rounded bg-surface hover:bg-surface-hover group transition-colors">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-text-primary truncate">{ev.title || 'Untitled Event'}</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-text-muted hover:text-text-primary" onClick={(e) => { e.stopPropagation(); dock.openEventById(ev.id); }} title="View in Dock">
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {!isUsed && (
                                                        <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-text-muted hover:text-text-primary" onClick={(e) => { e.stopPropagation(); setWizardEventId(ev.id); }} title="Place in Timeline">
                                                            <GitCommitHorizontal className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* Swap Timeline Dialog */}
            <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Swap Timeline</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 max-h-80 overflow-y-auto mt-2 pr-2">
                        {graphs.map(g => (
                            <div key={g.id} className={cn("flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-accent-hover transition-colors", activeGraphId === g.id ? "border-accent bg-accent/5" : "border-border bg-surface")}>
                                <div className="flex-1 font-medium text-sm text-text-primary hover:underline" onClick={() => { setActiveGraphId(g.id); setCurrentLevelId(g.id); setSwapDialogOpen(false); }}>
                                    {g.name}
                                </div>
                                <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-error hover:text-error/80" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete timeline "${g.name}"?`)) deleteTlMut.mutate(g.id); }}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button onClick={() => { setSwapDialogOpen(false); router.push('/settings?tab=timeline'); }} className='bg-accent'>
                            <GitFork className="h-4 w-4 mr-2" /> Create New Timeline
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Canvas Wizard Modal */}
            {wizardEventId && activeGraph && (
                <CanvasWizard
                    eventId={wizardEventId}
                    activeGraph={activeGraph}
                    onClose={() => setWizardEventId(null)}
                />
            )}
        </div>
    );
}

function ExplorerItem({
    title, baseName, isExpanded, hasChildren, isEditing,
    onToggle, onStartEdit, onSave, onCancel, menuItems, icon
}: any) {
    const [draft, setDraft] = React.useState(title || '');
    React.useEffect(() => setDraft(title || ''), [title]);

    const handleSave = () => {
        const val = draft.trim();
        if (val !== (title || '')) {
            onSave(val);
        } else {
            onCancel();
        }
    };

    const displayName = title ? `${baseName} — ${title}` : baseName;

    return (
        <div className="group flex items-center py-1 gap-1 -ml-3">
            <Button
                variant="ghost"
                size="icon-sm"
                className={cn("h-6 w-6 text-text-muted hover:text-text-primary z-10", hasChildren ? "opacity-100" : "opacity-0")}
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                disabled={!hasChildren}
            >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            {isEditing ? (
                <div className="flex items-center gap-2 flex-1 min-w-0 bg-accent-hover rounded px-2 py-1 transition-colors">
                    {icon || <Folder className="h-4 w-4 text-text-muted shrink-0" />}
                    <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') onCancel();
                        }}
                        className="h-7 py-1 px-2 text-sm w-full focus-within:ring-accent"
                        autoFocus
                    />
                </div>
            ) : (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="cursor-pointer flex items-center gap-2 flex-1 min-w-0 group-hover:bg-accent-hover rounded px-2 py-1 transition-colors">
                            {icon || <Folder className="h-4 w-4 text-text-muted shrink-0" />}
                            <span
                                className="text-sm font-medium text-text-primary truncate select-none flex-1"
                                onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(); }}
                            >
                                {displayName}
                            </span>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
                                <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface border-border border-accent z-[150]">
                        {menuItems}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

function ExplorerEventItem({
    title, inDock, onClick, onViewCanvas, onViewDock, onManageConnection, onDuplicate, onRemove
}: any) {
    return (
        <div className="group flex items-center py-1 gap-1 -ml-3">
            <div className="w-6 shrink-0 flex items-center justify-center">
                {inDock ? <Circle className="h-3.5 w-3.5 text-text-muted/60" /> : <GitCommitHorizontal className="h-3.5 w-3.5 text-accent" />}
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div
                        className="cursor-pointer flex items-center gap-2 flex-1 min-w-0 group-hover:bg-accent-hover rounded px-2 py-1 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                    >
                        <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary truncate select-none flex-1">
                            {title}
                        </span>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
                            <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-surface border-border border-accent z-[150]">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewCanvas(); }}>
                        <GitCommitHorizontal className="h-4 w-4 mr-2" /> View in Canvas
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDock(); }}>
                        <ExternalLink className="h-4 w-4 mr-2" /> View in Dock
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManageConnection(); }}>
                        <Settings className="h-4 w-4 mr-2" /> Manage Connection
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-error" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                        <Trash2 className="h-4 w-4 mr-2 text-error" /> Remove
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
