import { useState, useEffect } from 'react';
import { Event, EventType, EventIntensity, EventVisibility } from '@/domain/types';
import LinkedCardsEditor from './LinkedCardsEditor';
import LinkedEventsEditor from './LinkedEventsEditor';
import InverseRelationManager from './InverseRelationManager';
import TagInput from '../TagInput';
import { X, Loader2, Trash, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { duplicateEvent } from '@/lib/timeline-api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

const INTENSITIES: EventIntensity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VISIBILITIES: EventVisibility[] = ['PUBLIC', 'PRIVATE', 'SECRET'];

interface EventEditorProps {
    storyId: string;
    event?: (Event & { eventType?: EventType }) | null;
    onClose: () => void;
    onDelete?: () => void;
    inline?: boolean;
}

export default function EventEditor({
    storyId,
    event,
    onClose,
    onDelete,
    inline = false,
}: EventEditorProps) {
    // ... existing hooks ...
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        eventTypeId: '',
        description: '',
        intensity: 'MEDIUM' as EventIntensity,
        visibility: 'PUBLIC' as EventVisibility,
        outcome: '',
        tags: [] as string[],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [pendingCardLinks, setPendingCardLinks] = useState<{ id?: string; cardId: string; roleId?: string | null }[]>([]);
    const [pendingEventLinks, setPendingEventLinks] = useState<{ id?: string; linkId: string; relationshipType: string }[]>([]);

    // For diffing
    const [initialCardLinks, setInitialCardLinks] = useState<{ id: string; cardId: string; roleId?: string | null }[]>([]);
    const [initialEventLinks, setInitialEventLinks] = useState<{ id: string; linkId: string; relationshipType: string }[]>([]);

    const [showInverseManager, setShowInverseManager] = useState(false);
    const [executedRelations, setExecutedRelations] = useState<{ added: any[], deleted: any[] }>({ added: [], deleted: [] });

    useEffect(() => {
        // Fetch event types
        fetch(`/api/event-types?storyId=${storyId}`)
            .then(res => res.json())
            .then(types => {
                setEventTypes(types);
                // Set default type if creating new and types exist
                if (types.length > 0 && !formData.eventTypeId && !event) {
                    setFormData(prev => ({ ...prev, eventTypeId: types[0].id }));
                }
            })
            .catch(console.error);

        if (event) {
            setFormData({
                title: event.title,
                eventTypeId: event.eventTypeId,
                description: event.description || '',
                intensity: event.intensity,
                visibility: event.visibility,
                outcome: event.outcome || '',
                tags: event.tags || [],
            });

            // Fetch relations
            Promise.all([
                fetch(`/api/events/relations?storyId=${storyId}&eventId=${event.id}&type=card`).then(res => res.json()),
                fetch(`/api/events/relations?storyId=${storyId}&eventId=${event.id}&type=event`).then(res => res.json())
            ]).then(([cardData, eventData]) => {
                if (cardData && cardData.links) {
                    const mappedCards = cardData.links.map((l: any) => ({
                        id: l.id,
                        cardId: l.cardId,
                        roleId: l.roleId
                    }));
                    setCardLinksState(mappedCards);
                }
                if (eventData && eventData.links) {
                    const mappedEvents = eventData.links.map((l: any) => ({
                        id: l.id,
                        linkId: l.linkId,
                        relationshipType: l.relationshipType
                    }));
                    setEventLinksState(mappedEvents);
                }
            }).catch(console.error);
        }
    }, [storyId, event]);

    // Helper to set both initial and pending
    const setCardLinksState = (links: any[]) => {
        setInitialCardLinks(links);
        setPendingCardLinks(links);
    };
    const setEventLinksState = (links: any[]) => {
        setInitialEventLinks(links);
        setPendingEventLinks(links);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const method = event ? 'PUT' : 'POST';
            const payload = {
                ...formData,
                storyId,
                id: event?.id,
            };

            const res = await fetch('/api/events', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const savedEvent = await res.json();

                // Manage Relations (Create or Edit)
                if (savedEvent.id) {
                    const promises = [];

                    // --- Processing Card Links ---
                    // 1. Delete removed links (present in initial but not in pending)
                    const cardLinksToDelete = initialCardLinks.filter(init => !pendingCardLinks.find(p => p.id === init.id));
                    for (const link of cardLinksToDelete) {
                        promises.push(
                            fetch(`/api/events/relations?id=${link.id}&type=card`, { method: 'DELETE' })
                        );
                    }

                    // 2. Create new links (present in pending but have no id)
                    const cardLinksToAdd = pendingCardLinks.filter(p => !p.id);
                    for (const link of cardLinksToAdd) {
                        promises.push(
                            fetch('/api/events/relations', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'card',
                                    storyId,
                                    eventId: savedEvent.id,
                                    cardId: link.cardId,
                                    roleId: link.roleId
                                })
                            })
                        );
                    }

                    // --- Processing Event Links ---
                    // 1. Delete removed
                    const eventLinksToDelete = initialEventLinks.filter(init => !pendingEventLinks.find(p => p.id === init.id));
                    for (const link of eventLinksToDelete) {
                        promises.push(
                            fetch(`/api/events/relations?id=${link.id}&type=event`, { method: 'DELETE' })
                        );
                    }

                    // 2. Create new
                    const eventLinksToAdd = pendingEventLinks.filter(p => !p.id);
                    for (const link of eventLinksToAdd) {
                        promises.push(
                            fetch('/api/events/relations', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'event',
                                    storyId,
                                    eventId: savedEvent.id,
                                    linkId: link.linkId,
                                    relationshipType: link.relationshipType
                                })
                            })
                        );
                    }

                    await Promise.all(promises);

                    // Track what we just did for Inverse Manager
                    // We need to pass the Source ID (this event) and Target ID (linked event)
                    // The 'added' objects currently look like { linkId, relationshipType, ... }
                    // The 'deleted' objects look like { id, linkId, relationshipType, ... } (from initialEventLinks)

                    const addedForManager = eventLinksToAdd.map(link => ({
                        sourceId: savedEvent.id, // This event
                        targetId: link.linkId,
                        relationshipType: link.relationshipType
                    }));

                    const deletedForManager = eventLinksToDelete.map(link => ({
                        sourceId: savedEvent.id, // This event
                        targetId: link.linkId,
                        relationshipType: link.relationshipType
                    }));

                    if (addedForManager.length > 0 || deletedForManager.length > 0) {
                        setExecutedRelations({
                            added: addedForManager,
                            deleted: deletedForManager
                        });
                        setShowInverseManager(true);
                        // Do NOT onClose() here, wait for Inverse Manager
                    } else {
                        toast.success(event ? 'Event updated' : 'Event created');
                        onClose();
                    }
                } else {
                    // If for some reason we created an event but didn't get an ID? Should not happen if res.ok
                    toast.success(event ? 'Event updated' : 'Event created');
                    onClose();
                }

            } else {
                const errData = await res.json().catch(() => ({}));
                if (res.status === 403 || res.status === 400) {
                    setError(errData.error || errData.message || 'Error occurred. Please check your plan limits.');
                    return;
                }
                setError(errData.error || 'Failed to save event');
                toast.error(errData.error || 'Failed to save event');
            }
        } catch {
            setError('Network error');
            toast.error('Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!event?.id || !confirm('Are you sure you want to delete this event?')) return;

        try {
            const res = await fetch(`/api/events?id=${event.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Event deleted');
                if (onDelete) onDelete();
                onClose();
            } else {
                toast.error('Failed to delete event');
            }
        } catch {
            toast.error('Network error');
        }
    }

    const content = (
        <div className={inline ? "h-full w-full flex flex-1 flex-col pt-5 pl-5" : ""}>
            {!inline && (
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {event ? 'Edit Event' : 'Create New Event'}
                    </DialogTitle>
                </DialogHeader>
            )}

            <form onSubmit={handleSubmit} className={inline ? "space-y-6 py-4 flex-1 overflow-y-auto px-1" : "space-y-6 py-4"}>
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg flex flex-col gap-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                        {(error.toLowerCase().includes('limit') || error.toLowerCase().includes('plan')) && (
                            <Button
                                type="button"
                                onClick={() => window.location.href = '/pricing'}
                                variant="outline"
                                className="border-red-500/50 text-red-500 hover:bg-red-500/10 self-start text-sm h-8 px-3 mt-1"
                            >
                                View Pricing Plans
                            </Button>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Event Title"
                            required
                            className="bg-surface border-border focus-within:ring-accent"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Event Type</Label>
                        <Select
                            value={formData.eventTypeId}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, eventTypeId: val }))}
                        >
                            <SelectTrigger className="bg-surface border-border">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-border border-accent z-[150]">
                                {eventTypes.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Intensity</Label>
                        <Select
                            value={formData.intensity}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, intensity: val as EventIntensity }))}
                        >
                            <SelectTrigger className="bg-surface border-border">
                                <SelectValue placeholder="Select intensity" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-border border-accent z-[150]">
                                {INTENSITIES.map(i => (
                                    <SelectItem key={i} value={i}>{i}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Visibility</Label>
                        <Select
                            value={formData.visibility}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, visibility: val as EventVisibility }))}
                        >
                            <SelectTrigger className="bg-surface border-border">
                                <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-border border-accent z-[150]">
                                {VISIBILITIES.map(v => (
                                    <SelectItem key={v} value={v}>{v}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe the event..."
                        className="bg-surface min-h-[100px] border-border focus-within:ring-accent"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="outcome">Outcome</Label>
                    <Textarea
                        id="outcome"
                        name="outcome"
                        value={formData.outcome}
                        onChange={handleChange}
                        placeholder="What happened as a result?"
                        className="bg-surface border-border focus-within:ring-accent"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Tags</Label>
                    <TagInput
                        value={formData.tags}
                        onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                        storyId={storyId}
                        placeholder="Add tags..."
                    />
                </div>

                <div className="pt-4 border-t border-border space-y-6">
                    <LinkedCardsEditor
                        storyId={storyId}
                        eventId={event?.id}
                        pendingLinks={pendingCardLinks}
                        onChangePending={setPendingCardLinks}
                    />
                    <LinkedEventsEditor
                        storyId={storyId}
                        eventId={event?.id}
                        pendingLinks={pendingEventLinks}
                        onChangePending={setPendingEventLinks}
                    />
                </div>
            </form>

            <div className="flex w-full p-4 border-t border-border mt-4 shrink-0 bg-surface">
                <div className="flex w-full items-center justify-between">
                    <div className="flex gap-2">
                        {event ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleDelete}
                                className="text-red-500 hover:text-text-primary hover:bg-red-500"
                                title="Delete Event"
                            >
                                <Trash className="w-5 h-5" />
                            </Button>
                        ) : <div />}
                    </div>

                    <div className="flex gap-2">
                        {!inline && <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>}
                        {event && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={async () => {
                                    setIsSubmitting(true);
                                    try {
                                        await duplicateEvent(event.id, storyId);
                                        toast.success('Event duplicated successfully');
                                        onClose();
                                    } catch (e: any) {
                                        toast.error(e.message || 'Failed to duplicate event');
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                disabled={isSubmitting}
                            >
                                Duplicate
                            </Button>
                        )}
                        <Button type="button" onClick={() => handleSubmit()} disabled={isSubmitting || !formData.title || !formData.eventTypeId} className="bg-accent text-accent-foreground">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {event ? 'Save Changes' : 'Create Event'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (inline) {
        return (
            <>
                {content}
                <InverseRelationManager
                    storyId={storyId}
                    isOpen={showInverseManager}
                    onClose={() => {
                        setShowInverseManager(false);
                        onClose();
                    }}
                    addedRelations={executedRelations.added}
                    deletedRelations={executedRelations.deleted}
                    currentEventTitle={formData.title}
                />
            </>
        );
    }

    return (
        <>
            <Dialog open={!showInverseManager} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    {content}
                </DialogContent>
            </Dialog>
            <InverseRelationManager
                storyId={storyId}
                isOpen={showInverseManager}
                onClose={() => {
                    setShowInverseManager(false);
                    onClose();
                }}
                addedRelations={executedRelations.added}
                deletedRelations={executedRelations.deleted}
                currentEventTitle={formData.title}
            />
        </>
    );

}
