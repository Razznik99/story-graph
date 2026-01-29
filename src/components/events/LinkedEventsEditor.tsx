import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, GitCommitHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface LinkedEventsEditorProps {
    storyId: string;
    eventId?: string | undefined;
    // For pending creation state
    pendingLinks?: { toEventId: string; relationshipType: string }[] | undefined;
    onChangePending?: ((links: { toEventId: string; relationshipType: string }[]) => void) | undefined;
}

const RELATIONSHIP_TYPES = [
    'CAUSES', 'CAUSED_BY', 'FORESHADOWS', 'RESOLVES',
    'ESCALATES', 'DEESCALATES', 'PARALLEL_TO', 'CONTRADICTS'
];

export default function LinkedEventsEditor({ storyId, eventId, pendingLinks, onChangePending }: LinkedEventsEditorProps) {
    const queryClient = useQueryClient();
    const [selectedToEventId, setSelectedToEventId] = useState<string | null>(null);
    const [relationshipType, setRelationshipType] = useState<string>('CAUSES');

    const isPendingMode = !eventId;

    // Fetch existing links (only if eventId exists)
    const { data: linksData, isLoading: isLoadingLinks } = useQuery({
        queryKey: ['event-relations', 'events-outgoing', eventId],
        queryFn: async () => {
            if (!eventId) return { links: [] };
            const res = await fetch(`/api/events/relations?storyId=${storyId}&fromEventId=${eventId}`);
            if (!res.ok) throw new Error('Failed to fetch links');
            return res.json();
        },
        enabled: !!eventId,
    });

    // Fetch all events for selection
    const { data: events = [] } = useQuery({
        queryKey: ['events', storyId],
        queryFn: async () => {
            const res = await fetch(`/api/events?storyId=${storyId}`);
            if (!res.ok) throw new Error('Failed to fetch events');
            return res.json();
        }
    });

    const handleAdd = () => {
        if (!selectedToEventId || !relationshipType) return;

        if (isPendingMode) {
            if (onChangePending && pendingLinks) {
                onChangePending([...pendingLinks, { toEventId: selectedToEventId, relationshipType }]);
                setSelectedToEventId(null);
                setRelationshipType('CAUSES');
            }
        } else {
            addMutation.mutate();
        }
    };

    const handleDelete = (idOrIndex: string | number) => {
        if (isPendingMode) {
            if (onChangePending && pendingLinks && typeof idOrIndex === 'number') {
                const newLinks = [...pendingLinks];
                newLinks.splice(idOrIndex, 1);
                onChangePending(newLinks);
            }
        } else {
            if (typeof idOrIndex === 'string') {
                deleteMutation.mutate(idOrIndex);
            }
        }
    };

    const addMutation = useMutation({
        mutationFn: async () => {
            if (!selectedToEventId || !relationshipType || !eventId) return;
            const res = await fetch('/api/events/relations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'event',
                    storyId,
                    fromEventId: eventId,
                    toEventId: selectedToEventId,
                    relationshipType
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to link event');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-relations', 'events-outgoing', eventId] });
            setSelectedToEventId(null);
            setRelationshipType('CAUSES'); // reset default
            toast.success('Event linked');
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (linkId: string) => {
            const res = await fetch(`/api/events/relations?id=${linkId}&type=event`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete link');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-relations', 'events-outgoing', eventId] });
            toast.success('Link removed');
        },
        onError: () => toast.error('Failed to remove link')
    });

    // Derive displayed links
    const displayedLinks = isPendingMode
        ? pendingLinks?.map((l, i) => {
            const toEvent = events.find((e: any) => e.id === l.toEventId);
            return {
                id: i, // Use index
                toEventId: l.toEventId,
                relationshipType: l.relationshipType,
                toEvent: toEvent || { title: 'Unknown Event' }
            };
        }) || []
        : linksData?.links || [];

    // Filter available events (not current, not already linked)
    const linkedEventIds = new Set(displayedLinks.map((l: any) => l.toEventId));
    if (eventId) linkedEventIds.add(eventId); // Exclude self if editing

    const availableEvents = events
        .filter((e: any) => !linkedEventIds.has(e.id))
        .map((e: any) => ({
            label: e.title,
            value: e.id,
        }));

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <GitCommitHorizontal className="w-4 h-4" /> Linked Events
            </h3>

            {!isPendingMode && isLoadingLinks ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading relations...
                </div>
            ) : (
                <div className="space-y-2">
                    {/* List */}
                    {displayedLinks.length === 0 && (
                        <div className="text-sm text-muted-foreground italic">No linked events.</div>
                    )}
                    {displayedLinks.map((link: any) => (
                        <div key={link.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-3">
                                <div className="text-xs font-bold text-muted-foreground">{link.relationshipType}</div>
                                <div className="text-sm font-medium">{link.toEvent.title}</div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                onClick={() => handleDelete(link.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add New */}
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Select Event</Label>
                    <SearchableSelect
                        options={availableEvents}
                        value={selectedToEventId}
                        onChange={setSelectedToEventId}
                        placeholder="Search event..."
                        fullWidth
                    />
                </div>
                {selectedToEventId && (
                    <div className="w-[180px] space-y-1 animate-in fade-in slide-in-from-left-2">
                        <Label className="text-xs text-muted-foreground">Relationship</Label>
                        <Select value={relationshipType} onValueChange={setRelationshipType}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border border-accent max-h-[200px]">
                                {RELATIONSHIP_TYPES.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <Button
                    onClick={handleAdd}
                    disabled={!selectedToEventId || (!isPendingMode && addMutation.isPending)}
                    className="mb-[1px]"
                >
                    {(!isPendingMode && addMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
}
