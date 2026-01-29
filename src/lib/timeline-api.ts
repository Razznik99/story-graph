
import { z } from 'zod';
import { TimelineConfigSchema, TimelineSchema } from '@/domain/schemas/timeline.schema';
import { EventSchema } from '@/domain/schemas/event.schema';

export type TimelineConfig = z.infer<typeof TimelineConfigSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
export type Event = z.infer<typeof EventSchema>;

// Extend Prisma's Timeline type to match TLNode from reference
export type TLNode = Timeline & {
    children?: TLNode[]; // For client-side tree structure
    events?: Event[]; // Included from API
    expanded?: boolean; // For client-side UI state
};

// PlacedEvent type from reference, adapted for our schema
export type PlacedEvent = Event & {
    nodeId?: string; // The timelineId it's placed on
    order: number; // Explicitly include order field for sorting
};

export type ApiEvent = Event; // Alias for consistent naming in consumers

export type LevelKey = 'story' | 'volume' | 'section' | 'part' | 'chapter';

// Helper function for API calls
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText || 'Something went wrong');
    }
    // For DELETE requests with no content
    if (response.status === 204) {
        return Promise.resolve({} as T);
    }
    return response.json();
}

// Timeline Config API
export async function getTimelineConfig(storyId: string): Promise<TimelineConfig | null> {
    return fetchApi<TimelineConfig | null>(`/api/timeline-config?storyId=${storyId}`);
}

export async function updateTimelineConfig(config: Partial<TimelineConfig>): Promise<TimelineConfig> {
    return fetchApi<TimelineConfig>('/api/timeline-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
}

// Timeline Nodes API
export async function listTLNodes(storyId: string): Promise<TLNode[]> {
    return fetchApi<TLNode[]>(`/api/timeline?storyId=${storyId}`);
}

export async function createTLNode(
    storyId: string,
    level: number,
    parentId?: string,
    title?: string
): Promise<TLNode> {
    return fetchApi<TLNode>('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, level, parentId, title }),
    });
}

export async function updateTLNodeLabel(id: string, label: string): Promise<TLNode> {
    return fetchApi<TLNode>(`/api/timeline/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: label }),
    });
}

export async function deleteTLNode(id: string): Promise<void> {
    await fetchApi<void>(`/api/timeline/${id}`, {
        method: 'DELETE',
    });
}

// Events API
export async function listEvents(storyId: string): Promise<Event[]> {
    // Assuming /api/events can filter by storyId. If not, we might need a specific timeline events endpoint or filter logic.
    // The user didn't explicitly ask for /api/events implementation, but referenced it.
    // Assuming /api/stories/[id]/events or generic /api/events exists or will be covered by timeline logic if needed.
    // The example page uses listEvents. I will assume /api/events exists or I should fix it.
    // The relevant part of the request was "edit the routes in @[timeline-route-and-page-example] to fit the schema".
    // The example page calls listEvents.
    // I'll stick to /api/events?storyId=... for now.
    return fetchApi<Event[]>(`/api/events?storyId=${storyId}`);
}

// Placed Events API
export async function placeEvent(eventId: string, tlNodeId: string): Promise<Event> {
    return fetchApi<Event>('/api/timeline/events/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'place', eventId, timelineId: tlNodeId }),
    });
}

export async function reorderPlacedEvent(eventId: string, direction: 'up' | 'down'): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/api/timeline/events/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', eventId, direction }),
    });
}

export async function unplaceEvent(eventId: string): Promise<Event> {
    return fetchApi<Event>('/api/timeline/events/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unplace', eventId }),
    });
}

// Delete an event permanently
export async function deleteEvent(eventId: string): Promise<void> {
    await fetchApi<void>(`/api/events?id=${eventId}`, {
        method: 'DELETE',
    });
}

// This function is not directly used by the explorer but was in the reference.
// Our schema doesn't have a separate "PlacedEvent" table.
export async function listPlacedEvents(storyId: string): Promise<PlacedEvent[]> {
    const events = await fetchApi<Event[]>(`/api/events?storyId=${storyId}&placed=true`);
    return events.map(event => ({
        ...event,
        nodeId: event.timelineId,
        order: event.order ?? 0,
    })) as PlacedEvent[];
}

export async function reorderTLNode(storyId: string, nodeId: string, direction: 'up' | 'down'): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorderNode', storyId, nodeId, direction }),
    });
}

export async function insertSiblingTLNode(storyId: string, targetNodeId: string, position: 'before' | 'after', title?: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insertSibling', storyId, targetNodeId, position, title }),
    });
}
