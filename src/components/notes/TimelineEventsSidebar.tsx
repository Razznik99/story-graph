'use client';

import { useQuery } from '@tanstack/react-query';
import { Event } from '@/domain/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import EventViewer from '@/components/events/EventViewer';
import { useState } from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INTENSITY_COLORS } from '@/domain/constants';

interface TimelineEventsSidebarProps {
    storyId: string;
    timelineId: string; // The specific timeline node ID
}

export default function TimelineEventsSidebar({ storyId, timelineId }: TimelineEventsSidebarProps) {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Fetch Events for this timeline node
    // We can filter the general events list by timelineId
    const { data: events = [], isLoading } = useQuery<Event[]>({
        queryKey: ['events', 'timeline', storyId, timelineId],
        queryFn: async () => {
            // We'll fetch ALL events for the story and filter client-side or use a more specific API if available.
            // Current listEvents API returns all.
            // Ideally we should have an API to get events by timelineId.
            // But for now, let's reuse the existing listEvents and filter.
            // Or use the one I saw in EventViewer? `api/events/relations`? No.
            // Let's assume fetching all and filtering is acceptable for now or check if API supports filtering.
            // The user's request doesn't specify creating a new event list API.
            // Wait, I can use `listEvents` from `lib/timeline-api` if it supports filtering?
            // Or just fetch `/api/events?storyId=...` and filter.
            const res = await fetch(`/api/events?storyId=${storyId}`);
            if (!res.ok) return [];
            const allEvents: Event[] = await res.json();
            return allEvents.filter(e => e.timelineId === timelineId).sort((a, b) => a.order - b.order);
        },
        enabled: !!storyId && !!timelineId
    });

    const selectedEvent = events.find(e => e.id === selectedEventId);

    if (selectedEvent) {
        return (
            <div className="h-full flex flex-col bg-surface border-l border-border w-full">
                <div className="p-4 border-b border-border flex items-center gap-2">
                    <button onClick={() => setSelectedEventId(null)} className="text-sm font-medium text-text-secondary hover:text-text-primary flex items-center gap-1">
                        <ArrowRight className="w-4 h-4 rotate-180" /> Back to list
                    </button>
                    <span className="text-sm text-text-tertiary">|</span>
                    <span className="text-sm font-semibold truncate">{selectedEvent.title}</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <EventViewer
                        event={selectedEvent}
                        onClose={() => setSelectedEventId(null)}
                        onEdit={() => { }} // Read only in this context? Or allow edit?
                        inline={true}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-surface border-l border-border w-full">
            <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-lg">Timeline Events</h3>
                <p className="text-xs text-text-tertiary">{events.length} events</p>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {isLoading && <p className="text-sm text-text-tertiary">Loading events...</p>}
                    {!isLoading && events.length === 0 && <p className="text-sm text-text-tertiary">No events in this timeline.</p>}
                    {events.map(event => (
                        <div
                            key={event.id}
                            onClick={() => setSelectedEventId(event.id)}
                            className="p-3 bg-background border border-border rounded-xl cursor-pointer hover:border-accent/50 transition-colors group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", INTENSITY_COLORS[event.intensity])}>
                                    {event.intensity}
                                </Badge>
                                <span className="text-xs text-text-tertiary">#{event.order}</span>
                            </div>
                            <h4 className="font-medium text-sm text-text-primary group-hover:text-accent transition-colors line-clamp-1">{event.title}</h4>
                            {event.description && <p className="text-xs text-text-secondary line-clamp-2 mt-1">{event.description}</p>}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
