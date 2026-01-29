'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    listTLNodes,
    updateTLNodeLabel,
    getTimelineConfig,
    createTLNode,
    deleteTLNode,
    listEvents,
    placeEvent,
    listPlacedEvents,
    reorderPlacedEvent,
    deleteEvent,
    reorderTLNode,
    insertSiblingTLNode,
    unplaceEvent,
    TLNode,
    PlacedEvent,
    TimelineConfig,
    Event as IEvent,
} from '@/lib/timeline-api';
import { useStoryStore } from '@/store/useStoryStore';
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FolderPen,
    MoreHorizontal,
    CirclePlus,
    Trash2,
    ArrowUp,
    ArrowDown,
    CornerUpLeft,
    X,
    SquareArrowOutUpRight,
    FolderPlus,
    Redo2,
    FolderDown,
    FolderUp,
    ChevronsUp,
    ChevronsDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useTimelineDock } from './TimelineDock';
import {
    buildIndex,
    nextLevels,
    getLevelName,
    type NodeIndex,
} from './timeline-explorer-helpers';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { INTENSITY_COLORS } from '@/domain/constants';

type ExpandMap = Record<string, boolean>;
type EditingMap = Record<string, boolean>;

export default function TimelineExplorer() {
    const qc = useQueryClient();
    const { selectedStoryId } = useStoryStore();
    const dock = useTimelineDock(selectedStoryId ?? undefined);

    // --- queries ---
    const { data: cfg } = useQuery<TimelineConfig | null>({
        queryKey: ['tl', 'config', selectedStoryId],
        queryFn: async () => {
            if (!selectedStoryId) return null;
            return await getTimelineConfig(selectedStoryId);
        },
        enabled: !!selectedStoryId,
    });

    const { data: nodes = [], isLoading } = useQuery({
        queryKey: ['tl', 'nodes', selectedStoryId],
        queryFn: () => (selectedStoryId ? listTLNodes(selectedStoryId) : Promise.resolve([])),
        enabled: !!selectedStoryId,
    });

    const { data: allEvents = [] } = useQuery<IEvent[]>({
        queryKey: ['events', 'all', selectedStoryId],
        queryFn: async () => {
            if (!selectedStoryId) return [];
            return await listEvents(selectedStoryId);
        },
        enabled: !!selectedStoryId,
        staleTime: 60_000,
    });

    // Placed events (using listPlacedEvents which maps to events with timelineId)
    const { data: placed = [] } = useQuery<PlacedEvent[]>({
        queryKey: ['tl', 'placed-events', 'all', selectedStoryId],
        queryFn: () => (selectedStoryId ? listPlacedEvents(selectedStoryId) : Promise.resolve([])),
        enabled: !!selectedStoryId,
        staleTime: 15_000,
    });

    // --- local state ---
    const [expanded, setExpanded] = React.useState<ExpandMap>({});
    const [editing, setEditing] = React.useState<EditingMap>({});
    const [addEventNode, setAddEventNode] = React.useState<TLNode | null>(null);
    const [addEventDialogOpen, setAddEventDialogOpen] = React.useState(false);
    // Which scope for adding events: 'unplaced' (default) or 'all'
    const [addEventScope, setAddEventScope] = React.useState<'unplaced' | 'all'>('unplaced');

    // --- mutations ---
    const renameMut = useMutation({
        mutationFn: ({ id, label }: { id: string; label: string }) => updateTLNodeLabel(id, label),
        onSuccess: () => {
            toast.success('Renamed');
            qc.invalidateQueries({ queryKey: ['tl', 'nodes', selectedStoryId] });
        },
        onError: (e: Error) => toast.error(e?.message ?? 'Rename failed'),
    });

    const createMut = useMutation({
        mutationFn: (p: { level: number; parentId?: string; title?: string }) =>
            createTLNode(selectedStoryId!, p.level, p.parentId, p.title),
        onSuccess: () => {
            toast.success('Sub-level added');
            qc.invalidateQueries({ queryKey: ['tl', 'nodes', selectedStoryId] });
        },
        onError: (e: Error) => toast.error(e?.message ?? 'Create failed'),
    });

    const insertSiblingMut = useMutation({
        mutationFn: (p: { targetId: string; position: 'before' | 'after'; title?: string }) =>
            insertSiblingTLNode(selectedStoryId!, p.targetId, p.position, p.title),
        onSuccess: () => {
            toast.success('Level inserted');
            qc.invalidateQueries({ queryKey: ['tl', 'nodes', selectedStoryId] });
        },
        onError: (e: Error) => toast.error(e?.message ?? 'Insert failed'),
    });

    const reorderNodeMut = useMutation({
        mutationFn: (p: { id: string; direction: 'up' | 'down' }) =>
            reorderTLNode(selectedStoryId!, p.id, p.direction),
        onSuccess: () => {
            toast.success('Level moved');
            qc.invalidateQueries({ queryKey: ['tl', 'nodes', selectedStoryId] });
        },
        onError: (e: Error) => toast.error(e?.message ?? 'Move failed'),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteTLNode(id),
        onSuccess: () => {
            toast.success('Level deleted');
            qc.invalidateQueries({ queryKey: ['tl', 'nodes', selectedStoryId] });
            qc.invalidateQueries({ queryKey: ['tl', 'placed-events', 'all', selectedStoryId] });
            qc.invalidateQueries({ queryKey: ['events', 'all', selectedStoryId] });
        },
        onError: (e: Error) => toast.error(e?.message ?? 'Delete failed'),
    });

    const placeMut = useMutation({
        mutationFn: (p: { eventId: string; tlNodeId: string }) => placeEvent(p.eventId, p.tlNodeId),
        onSuccess: () => {
            toast.success('Event moved');
            qc.invalidateQueries({ queryKey: ['tl', 'placed-events', 'all', selectedStoryId] });
            qc.invalidateQueries({ queryKey: ['events', 'all', selectedStoryId] });
            setAddEventDialogOpen(false);
            setAddEventNode(null);
        },
        onError: (e: Error) => toast.error(e?.message ?? 'Could not place event'),
    });

    const unplaceMut = useMutation({
        mutationFn: (eventId: string) => unplaceEvent(eventId),
        onSuccess: () => {
            toast.success('Event unplaced');
            qc.invalidateQueries({ queryKey: ['tl', 'placed-events', 'all', selectedStoryId] });
            qc.invalidateQueries({ queryKey: ['events', 'all', selectedStoryId] });
        },
        onError: (e: Error) => toast.error(e?.message ?? 'Could not unplace'),
    });


    const reorderEventMut = useMutation({
        mutationFn: (p: { eventId: string; direction: 'up' | 'down' }) =>
            reorderPlacedEvent(p.eventId, p.direction),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tl', 'placed-events', 'all', selectedStoryId] });
        },
        onError: (e: Error) => toast.error(e?.message ?? 'Reorder failed'),
    });

    const deleteEventMut = useMutation({
        mutationFn: (eventId: string) => deleteEvent(eventId),
        onSuccess: () => {
            toast.success('Event deleted');
            qc.invalidateQueries({ queryKey: ['tl', 'placed-events', 'all', selectedStoryId] });
            qc.invalidateQueries({ queryKey: ['events', 'all', selectedStoryId] });
        },
        onError: (e: Error) => toast.error(e?.message ?? 'Delete failed'),
    });

    // --- computed ---
    const byParent = React.useMemo(() => buildIndex(nodes), [nodes]);
    const rootNode = React.useMemo(() => nodes.find((n) => n.parentId === null && n.level === 1), [nodes]);

    const eventsByNode = React.useMemo(() => {
        const m = new Map<string, PlacedEvent[]>();
        placed.forEach((pe) => {
            if (pe.timelineId) {
                const arr = m.get(pe.timelineId) ?? [];
                arr.push({ ...pe, nodeId: pe.timelineId });
                m.set(pe.timelineId, arr);
            }
        });
        m.forEach((arr) => arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        return m;
    }, [placed]);

    const rootNodeId = rootNode?.id;

    const availableEventsForAdd = React.useMemo(() => {
        if (!addEventNode) return [];

        let candidates = allEvents;

        if (addEventScope === 'unplaced') {
            // "Unplaced" means timelineId is null OR timelineId is rootNodeId
            candidates = allEvents.filter(e => !e.timelineId || (rootNodeId && e.timelineId === rootNodeId));
        }

        // Filter out events that are already in the target node (redundant to add)
        return candidates
            .filter(e => e.timelineId !== addEventNode.id)
            .map(e => ({
                label: e.title,
                value: e.id,
                description: e.intensity
            }));
    }, [allEvents, addEventNode, addEventScope, rootNodeId]);


    // actions
    const toggle = (id: string) => setExpanded((m) => ({ ...m, [id]: !(m[id] ?? true) })); // default expanded
    const startEdit = (id: string) => setEditing((m) => ({ ...m, [id]: true }));
    const stopEdit = (id: string) => setEditing((m) => ({ ...m, [id]: false }));

    const handleAddEventClick = (n: TLNode) => {
        setAddEventNode(n);
        setAddEventScope('unplaced'); // reset to default
        setAddEventDialogOpen(true);
    };

    const getSiblings = React.useCallback(
        (nodeId: string) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return { parentId: null, siblings: [] as TLNode[], idx: -1 };
            const parentId = node.parentId ?? null;
            const siblings = (byParent.get(parentId) || []).slice();
            // Assuming byParent is sorted by position already or we rely on API order which is sorted
            const idx = siblings.findIndex((s) => s.id === nodeId);
            return { parentId, siblings, idx };
        },
        [nodes, byParent]
    );

    if (!selectedStoryId) {
        return <div className="p-4 text-sm text-text-muted">Please select a story.</div>;
    }
    if (isLoading) return <div className="p-4 text-sm text-text-muted">Loading timeline...</div>;
    if (!cfg) return <div className="p-4 text-sm text-text-muted">No configuration found.</div>;
    if (!rootNode) return <div className="p-4 text-sm text-text-muted">Initializing timeline...</div>;

    return (
        <>
            <div className="h-full flex flex-col bg-surface">
                <ScrollArea className="flex-1">
                    <div className="p-2 pb-12">
                        <TreeNode
                            node={rootNode}
                            byParent={byParent}
                            expanded={expanded}
                            toggle={toggle}
                            editing={editing}
                            startEdit={startEdit}
                            stopEdit={stopEdit}
                            rename={(id, label) => renameMut.mutate({ id, label })}
                            cfg={cfg}
                            eventsByNode={eventsByNode}
                            onAddSubLevel={(n, lvl) => createMut.mutate({ level: lvl, parentId: n.id })}
                            onInsertSibling={(n, pos) => insertSiblingMut.mutate({ targetId: n.id, position: pos })}
                            onAddEvent={handleAddEventClick}
                            onReorderNode={(n, dir) => reorderNodeMut.mutate({ id: n.id, direction: dir })}
                            onDelete={(n) => {
                                if (n.parentId === null && n.level === 1) {
                                    toast.error('Cannot delete the Story root');
                                    return;
                                }
                                if (window.confirm('Delete this level and all its contents? Events will return to Unplaced.')) {
                                    deleteMut.mutate(n.id);
                                }
                            }}
                            onOpenEvent={(ev) => dock.openEventById(ev.id)}
                            onReorderEvent={(ev, dir) => reorderEventMut.mutate({ eventId: ev.id, direction: dir })}
                            onMoveEventToNode={(ev, nodeId) => placeMut.mutate({ eventId: ev.id, tlNodeId: nodeId })}
                            onUnplaceEvent={(ev) => unplaceMut.mutate(ev.id)}
                            onDeleteEvent={(ev) => {
                                if (window.confirm('Permanently delete this event?')) {
                                    deleteEventMut.mutate(ev.id);
                                }
                            }}
                            getSiblings={getSiblings}
                            isRoot={true}
                        />
                    </div>
                </ScrollArea>
            </div>

            <Dialog open={addEventDialogOpen} onOpenChange={setAddEventDialogOpen}>
                <DialogContent className="sm:max-w-md bg-surface border-border">
                    <DialogHeader>
                        <DialogTitle>Add Event to {addEventNode?.title || (addEventNode ? getLevelName(addEventNode.level, cfg) : 'Level')}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-4 text-sm">
                            <span className={cn("cursor-pointer px-2 py-1 rounded transition-colors", addEventScope === 'unplaced' ? "bg-accent/20 text-accent font-medium" : "text-muted-foreground hover:text-foreground")} onClick={() => setAddEventScope('unplaced')}>
                                Unplaced Only
                            </span>
                            <span className="w-px h-4 bg-border" />
                            <span className={cn("cursor-pointer px-2 py-1 rounded transition-colors", addEventScope === 'all' ? "bg-accent/20 text-accent font-medium" : "text-muted-foreground hover:text-foreground")} onClick={() => setAddEventScope('all')}>
                                All Events
                            </span>
                        </div>

                        <SearchableSelect
                            options={availableEventsForAdd}
                            placeholder="Select an event..."
                            searchPlaceholder="Search events..."
                            onChange={(val) => {
                                if (val && addEventNode) {
                                    placeMut.mutate({ eventId: val, tlNodeId: addEventNode.id });
                                }
                            }}
                            resetAfterSelect={false}
                            className="w-full"
                            fullWidth
                            emptyMessage="No events found."
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

// -----------------------------------------------------------------------------------------
// Recursive Tree Node
// -----------------------------------------------------------------------------------------

interface TreeNodeProps {
    node: TLNode;
    byParent: NodeIndex;
    expanded: ExpandMap;
    toggle: (id: string) => void;
    editing: EditingMap;
    startEdit: (id: string) => void;
    stopEdit: (id: string) => void;
    rename: (id: string, label: string) => void;
    cfg: TimelineConfig;
    eventsByNode: Map<string, PlacedEvent[]>;
    onAddSubLevel: (n: TLNode, lvl: number) => void;
    onInsertSibling: (n: TLNode, pos: 'before' | 'after') => void;
    onAddEvent: (n: TLNode) => void;
    onReorderNode: (n: TLNode, dir: 'up' | 'down') => void;
    onDelete: (n: TLNode) => void;

    onOpenEvent: (ev: PlacedEvent) => void;
    onReorderEvent: (ev: PlacedEvent, dir: 'up' | 'down') => void;
    onMoveEventToNode: (ev: PlacedEvent, nodeId: string) => void;
    onUnplaceEvent: (ev: PlacedEvent) => void;
    onDeleteEvent: (ev: PlacedEvent) => void;

    getSiblings: (nodeId: string) => { parentId: string | null; siblings: TLNode[]; idx: number };
    isRoot?: boolean;
}

function TreeNode({
    node,
    byParent,
    expanded,
    toggle,
    editing,
    startEdit,
    stopEdit,
    rename,
    cfg,
    eventsByNode,
    onAddSubLevel,
    onInsertSibling,
    onAddEvent,
    onReorderNode,
    onDelete,
    onOpenEvent,
    onReorderEvent,
    onMoveEventToNode,
    onUnplaceEvent,
    onDeleteEvent,
    getSiblings,
    isRoot = false,
}: TreeNodeProps) {
    const children = byParent.get(node.id) || [];
    const isOpen = expanded[node.id] ?? true;
    const [draft, setDraft] = React.useState(node.title ?? '');

    React.useEffect(() => setDraft(node.title ?? ''), [node.title]);

    const handleSave = () => {
        const val = draft.trim();
        if (val !== (node.title ?? '')) {
            rename(node.id, val);
        }
        stopEdit(node.id);
    };

    const nextLevelOptions = nextLevels(node.level, cfg);
    const events = eventsByNode.get(node.id) || [];

    const { siblings, idx, parentId } = getSiblings(node.id);

    // Sort logic handled by parent container usually, but let's trust getSiblings returns them in order.
    // If we need to disable move buttons:
    const canMoveUp = idx > 0;
    const canMoveDown = idx < siblings.length - 1;

    // Use name or formatted level name
    const levelName = node.name || getLevelName(node.level, cfg);
    const displayName = node.title ? `${levelName} — ${node.title}` : levelName;
    const hasChildren = children.length > 0;
    const hasEvents = events.length > 0;

    const dropdownClass = "bg-surface border-border border-accent z-[150]";

    return (
        <div className={cn("relative", !isRoot && "ml-4 pl-2 border-l border-border/40")}>
            {/* Node Row */}
            <div className="group flex items-center py-1 gap-1 -ml-3">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn("h-6 w-6 text-text-muted hover:text-text-primary", (hasChildren || hasEvents) ? "opacity-100" : "opacity-0")}
                    onClick={() => toggle(node.id)}
                    disabled={!hasChildren && !hasEvents}
                >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>

                <div className="flex items-center gap-2 flex-1 min-w-0 group-hover:bg-accent-hover rounded px-2 py-1 transition-colors">
                    <Folder className="h-4 w-4 text-text-muted" />

                    {editing[node.id] ? (
                        <Input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') stopEdit(node.id);
                            }}
                            className="h-7 py-1 px-2 text-sm w-full focus-within:ring-accent"
                            autoFocus
                        />
                    ) : (
                        <span
                            className="text-sm font-medium text-text-primary cursor-default truncate select-none"
                            onDoubleClick={() => startEdit(node.id)}
                        >
                            {displayName}
                        </span>
                    )}

                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className={dropdownClass}>
                                <DropdownMenuItem onClick={() => startEdit(node.id)}>
                                    <FolderPen className="h-3 w-3" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled>
                                    <SquareArrowOutUpRight className="h-3 w-3" />
                                    Go To (Canvas)
                                </DropdownMenuItem>

                                {/* Add Sub Level */}
                                {nextLevelOptions.length > 0 && node.level < 5 && (
                                    <DropdownMenuItem onClick={() => onAddSubLevel(node, nextLevelOptions[0]!)}>
                                        <FolderPlus className="h-3 w-3" />
                                        Add Sub-Level
                                    </DropdownMenuItem>
                                )}

                                {/* Insert Above/Below - Unavailable for Level 1 */}
                                {!isRoot && (
                                    <>
                                        <DropdownMenuItem onClick={() => onInsertSibling(node, 'before')}>
                                            <FolderUp className="h-3 w-3" />
                                            Insert Level Above
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onInsertSibling(node, 'after')}>
                                            <FolderDown className="h-3 w-3" />
                                            Insert Level Below
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {/* Add Event */}
                                <DropdownMenuItem onClick={() => onAddEvent(node)}>
                                    <CirclePlus className="h-3 w-3" />
                                    Add Event
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {/* Move Up/Down - Unavailable for Level 1 */}
                                {!isRoot && (
                                    <>
                                        <DropdownMenuItem disabled={!canMoveUp} onClick={() => onReorderNode(node, 'up')}>
                                            <ArrowUp className="w-3 h-3 mr-2" /> Move Up
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled={!canMoveDown} onClick={() => onReorderNode(node, 'down')}>
                                            <ArrowDown className="w-3 h-3 mr-2" /> Move Down
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete(node)}
                                            className="text-error focus:text-error"
                                        >
                                            <Trash2 className="w-3 h-3 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Children & Events */}
            {isOpen && (
                <div className="animate-accordion-down">
                    {/* Events */}
                    {events.map((ev, i) => (
                        <div key={ev.id} className="ml-4 pl-4 hover:bg-accent-hover rounded border-l border-border/40 p-1 flex items-center gap-2 group/event">
                            {/* Color Dot */}
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full border",
                                INTENSITY_COLORS[ev.intensity] ? INTENSITY_COLORS[ev.intensity]!.replace('/10', '') : "bg-gray-400 border-gray-500"
                            )} />

                            <button
                                className="text-sm transition-colors truncate text-left flex-1"
                                onClick={() => onOpenEvent(ev)}
                            >
                                {ev.title}
                            </button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon-sm" className="h-5 w-5 opacity-0 group-hover/event:opacity-100 transition-opacity ml-auto">
                                        <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className={dropdownClass}>
                                    <DropdownMenuItem onClick={() => onOpenEvent(ev)}>
                                        <SquareArrowOutUpRight className="h-3 w-3" /> Open Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled={i === 0} onClick={() => onReorderEvent(ev, 'up')}>
                                        <ArrowUp className="w-3 h-3 mr-2" /> Move Up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={i === events.length - 1} onClick={() => onReorderEvent(ev, 'down')}>
                                        <ArrowDown className="w-3 h-3 mr-2" /> Move Down
                                    </DropdownMenuItem>

                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Redo2 className="h-3 w-3" /> Move To...
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className={dropdownClass}>

                                            {/* Previous Sibling Level */}
                                            {idx > 0 && (
                                                <DropdownMenuItem onClick={() => onMoveEventToNode(ev, siblings[idx - 1]!.id)}>
                                                    <ArrowUp className="h-3 w-3 mr-2" /> Previous Level
                                                </DropdownMenuItem>
                                            )}

                                            {/* Next Sibling Level */}
                                            {idx < siblings.length - 1 && (
                                                <DropdownMenuItem onClick={() => onMoveEventToNode(ev, siblings[idx + 1]!.id)}>
                                                    <ArrowDown className="h-3 w-3 mr-2" /> Next Level
                                                </DropdownMenuItem>
                                            )}

                                            {(idx > 0 || idx < siblings.length - 1) && <DropdownMenuSeparator />}

                                            {/* Move Higher (to parent) */}
                                            {parentId && !isRoot && (
                                                <DropdownMenuItem onClick={() => onMoveEventToNode(ev, parentId)}>
                                                    <ChevronsUp className="h-3 w-3" /> Higher (Parent Level)
                                                </DropdownMenuItem>
                                            )}

                                            {/* Move Lower (to children) */}
                                            {children.length > 0 && node.level < 5 && (
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <ChevronsDown className="h-3 w-3" /> Move Lower
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent className={dropdownClass}>
                                                        {children.map(child => (
                                                            <DropdownMenuItem key={child.id} onClick={() => onMoveEventToNode(ev, child.id)}>
                                                                {child.title || getLevelName(child.level, cfg)}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                            )}

                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => onUnplaceEvent(ev)}
                                                disabled={isRoot && node.level === 1}
                                            >
                                                <CornerUpLeft className="w-3 h-3 mr-2" />
                                                Unplace (Root)
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDeleteEvent(ev)} className="text-error">
                                        <Trash2 className="w-3 h-3 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}

                    {/* Nested Levels */}
                    {children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            byParent={byParent}
                            expanded={expanded}
                            toggle={toggle}
                            editing={editing}
                            startEdit={startEdit}
                            stopEdit={stopEdit}
                            rename={rename}
                            cfg={cfg}
                            eventsByNode={eventsByNode}
                            onAddSubLevel={onAddSubLevel}
                            onInsertSibling={onInsertSibling}
                            onAddEvent={onAddEvent}
                            onReorderNode={onReorderNode}
                            onDelete={onDelete}
                            onOpenEvent={onOpenEvent}
                            onReorderEvent={onReorderEvent}
                            onMoveEventToNode={onMoveEventToNode}
                            onUnplaceEvent={onUnplaceEvent}
                            onDeleteEvent={onDeleteEvent}
                            getSiblings={getSiblings}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
