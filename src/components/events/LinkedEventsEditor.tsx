import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GitCommitHorizontal, Pencil, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { EVENT_RELATIONSHIP_TYPES } from '@/domain/constants';

interface LinkedEventsEditorProps {
    storyId: string;
    eventId?: string | undefined;
    // For pending/managed state
    pendingLinks: { id?: string; linkId: string; relationshipType: string }[];
    onChangePending: (links: { id?: string; linkId: string; relationshipType: string }[]) => void;
}

export default function LinkedEventsEditor({ storyId, eventId, pendingLinks, onChangePending }: LinkedEventsEditorProps) {
    const [selectedToEventId, setSelectedToEventId] = useState<string | null>(null);
    const [relationshipType, setRelationshipType] = useState<string>('CAUSES');
    const [isEditing, setIsEditing] = useState(false);

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

        // toEventId -> linkId
        onChangePending([...pendingLinks, { linkId: selectedToEventId, relationshipType }]);
        setSelectedToEventId(null);
        setRelationshipType('CAUSES');
        setIsEditing(false);
    };

    const handleDelete = (index: number) => {
        const newLinks = [...pendingLinks];
        newLinks.splice(index, 1);
        onChangePending(newLinks);
    };

    const handleEdit = (index: number) => {
        const link = pendingLinks[index];
        if (!link) return;
        setSelectedToEventId(link.linkId);
        setRelationshipType(link.relationshipType);
        handleDelete(index); // Remove from list while editing
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setSelectedToEventId(null);
        setRelationshipType('CAUSES');
        setIsEditing(false);
    };

    // Derive displayed links
    const displayedLinks = pendingLinks.map((l: any, i: number) => {
        const toEvent = events.find((e: any) => e.id === l.linkId); // linkId
        return {
            id: i, // Use index
            linkId: l.linkId,
            relationshipType: l.relationshipType,
            link: toEvent || { title: 'Unknown Event' } // link object
        };
    });

    // Filter available events (not current, not already linked)
    const linkedEventIds = new Set(displayedLinks.map((l: any) => l.linkId));
    if (eventId) linkedEventIds.add(eventId); // Exclude self if editing
    // If editing, allow the currently selected event
    const availableEvents = events
        .filter((e: any) => (!linkedEventIds.has(e.id) || e.id === selectedToEventId))
        .map((e: any) => ({
            label: e.title,
            value: e.id,
        }));

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <GitCommitHorizontal className="w-4 h-4" /> Linked Events
            </h3>

            <div className="space-y-2">
                {/* List */}
                {displayedLinks.length === 0 && !isEditing && (
                    <div className="text-sm text-muted-foreground italic">No linked events.</div>
                )}
                {displayedLinks.map((link: any) => (
                    <div key={link.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-3">
                            <div className="text-xs font-bold text-muted-foreground">{link.relationshipType}</div>
                            <div className="text-sm font-medium">{link.link?.title || 'Unknown'}</div>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-accent"
                                onClick={() => handleEdit(link.id)}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                onClick={() => handleDelete(link.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add New */}
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">{isEditing ? 'Editing Event Link' : 'Select Event'}</Label>
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
                                {EVENT_RELATIONSHIP_TYPES.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="flex gap-1">
                    {isEditing && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            className="mb-[1px]"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                    <Button
                        onClick={handleAdd}
                        disabled={!selectedToEventId}
                        className="mb-[1px] bg-accent rounded"
                    >
                        {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
