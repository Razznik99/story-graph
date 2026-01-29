import { useState, useEffect } from 'react';
import { Event, EventType, EventIntensity, EventVisibility } from '@/domain/types';
import TimelineField from './TimelineField';
import LinkedCardsEditor from './LinkedCardsEditor';
import LinkedEventsEditor from './LinkedEventsEditor';
import TagInput from '../TagInput';
import { X, Loader2, Trash, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        timelineId: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [pendingCardLinks, setPendingCardLinks] = useState<{ cardId: string; roleId?: string | null }[]>([]);
    const [pendingEventLinks, setPendingEventLinks] = useState<{ toEventId: string; relationshipType: string }[]>([]);

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
                timelineId: event.timelineId || '',
            });
        }
    }, [storyId, event]);

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

                // If creating, process pending links
                if (!event && savedEvent.id) {
                    const promises = [];

                    // Card Links
                    if (pendingCardLinks.length > 0) {
                        for (const link of pendingCardLinks) {
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
                    }

                    // Event Links
                    if (pendingEventLinks.length > 0) {
                        for (const link of pendingEventLinks) {
                            promises.push(
                                fetch('/api/events/relations', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        type: 'event',
                                        storyId,
                                        fromEventId: savedEvent.id,
                                        toEventId: link.toEventId,
                                        relationshipType: link.relationshipType
                                    })
                                })
                            );
                        }
                    }

                    await Promise.all(promises);
                }

                toast.success(event ? 'Event updated' : 'Event created');
                onClose();
            } else {
                const errData = await res.json();
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
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
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

                <div className="space-y-2">
                    <Label>Timeline</Label>
                    <TimelineField
                        storyId={storyId}
                        value={formData.timelineId}
                        onChange={(timelineId) => setFormData(prev => ({ ...prev, timelineId: timelineId || '' }))}
                    />
                </div>

                <div className="pt-4 border-t border-border space-y-6">
                    <LinkedCardsEditor
                        storyId={storyId}
                        eventId={event?.id}
                        pendingLinks={event?.id ? undefined : pendingCardLinks}
                        onChangePending={event?.id ? undefined : setPendingCardLinks}
                    />
                    <LinkedEventsEditor
                        storyId={storyId}
                        eventId={event?.id}
                        pendingLinks={event?.id ? undefined : pendingEventLinks}
                        onChangePending={event?.id ? undefined : setPendingEventLinks}
                    />
                </div>
            </form>

            <DialogFooter className="flex justify-between sm:justify-between w-full p-4 border-t border-border mt-auto">
                {event ? (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDelete}
                        className="text-red-500 hover:text-text-primary hover:bg-red-500"
                    >
                        <Trash className="w-5 h-5" />
                    </Button>
                ) : <div />}

                <div className="flex gap-2">
                    {!inline && <Button variant="ghost" onClick={onClose}>Cancel</Button>}
                    <Button onClick={() => handleSubmit()} disabled={isSubmitting || !formData.title || !formData.eventTypeId} className="bg-accent text-accent-foreground">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {event ? 'Save Changes' : 'Create Event'}
                    </Button>
                </div>
            </DialogFooter>
        </div>
    );

    if (inline) {
        return content;
    }

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                {content}
            </DialogContent>
        </Dialog>
    );
}
