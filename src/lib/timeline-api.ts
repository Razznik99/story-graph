import { z } from 'zod';
import {
    TimelineSchema,
    TimelineInputSchema,
    BranchSchema,
    LeafSchema,
    TimelineNodeSchema,
    TimelineEdgeSchema
} from '@/domain/schemas/timeline.schema';
import { EventSchema } from '@/domain/schemas/event.schema';

export type Timeline = z.infer<typeof TimelineSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type Leaf = z.infer<typeof LeafSchema>;
export type TimelineNode = z.infer<typeof TimelineNodeSchema>;
export type TimelineEdge = z.infer<typeof TimelineEdgeSchema>;
export type Event = z.infer<typeof EventSchema>;

export type TimelineGraph = Timeline & {
    branches: (Branch & {
        leaves: (Leaf & {
            nodes: (TimelineNode & {
                event: Event | null;
                outgoingEdges: TimelineEdge[];
                incomingEdges: TimelineEdge[];
            })[];
        })[];
    })[];
};

export type ApiEvent = Event;

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText || 'Something went wrong');
    }
    if (response.status === 204) {
        return Promise.resolve({} as T);
    }
    return response.json();
}

export async function updateTimeline(id: string, config: Partial<Timeline>): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateTimeline', id, ...config }),
    });
}

// Fetch unified graph
export async function getTimelineGraphs(storyId: string): Promise<TimelineGraph[]> {
    return fetchApi<TimelineGraph[]>(`/api/timeline?storyId=${storyId}`);
}

// Timeline Create/Delete
export async function createTimeline(storyId: string, title?: string): Promise<Timeline> {
    return fetchApi<Timeline>('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, title }),
    });
}
export async function deleteTimeline(id: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteTimeline', id }),
    });
}

export async function renameTimeline(id: string, title: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renameTimeline', id, title }),
    });
}

// Branch
export async function createBranch(timelineId: string, parentBranchId?: string, title?: string, position?: 'above' | 'below', referenceId?: string): Promise<Branch> {
    return fetchApi<Branch>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createBranch', timelineId, parentBranchId, title, position, referenceId }),
    });
}
export async function renameBranch(id: string, title: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renameBranch', id, title }),
    });
}
export async function reorderBranch(id: string, direction: 'up' | 'down'): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorderBranch', id, direction }),
    });
}
export async function deleteBranch(id: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteBranch', id }),
    });
}

// Leaf
export async function createLeaf(branchId: string, title?: string, position?: 'above' | 'below', referenceId?: string): Promise<Leaf> {
    return fetchApi<Leaf>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createLeaf', branchId, title, position, referenceId }),
    });
}
export async function renameLeaf(id: string, title: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renameLeaf', id, title }),
    });
}
export async function reorderLeaf(id: string, direction: 'up' | 'down'): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorderLeaf', id, direction }),
    });
}
export async function deleteLeaf(id: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteLeaf', id }),
    });
}

// Node
export async function createNode(leafId: string, type: 'START' | 'END' | 'EVENT' | 'CONNECTOR', eventId?: string): Promise<TimelineNode> {
    return fetchApi<TimelineNode>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createNode', leafId, type, eventId }),
    });
}
export async function deleteNode(id: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteNode', id }),
    });
}
export async function updateNodeLeaf(nodeId: string, leafId: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateNodeLeaf', nodeId, leafId }),
    });
}
export async function updateNodeLocked(nodeId: string, isLocked: boolean): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateNodeLocked', nodeId, isLocked }),
    });
}

// Edge
export async function createEdge(fromNodeId: string, toNodeId: string, type: 'CHRONOLOGICAL' | 'RELATIONSHIP'): Promise<TimelineEdge> {
    return fetchApi<TimelineEdge>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createEdge', fromNodeId, toNodeId, type }),
    });
}
export async function deleteEdge(id: string): Promise<void> {
    await fetchApi<void>('/api/timeline/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteEdge', id }),
    });
}

export async function listEvents(storyId: string): Promise<Event[]> {
    return fetchApi<Event[]>(`/api/events?storyId=${storyId}`);
}

export async function duplicateEvent(eventId: string, storyId: string): Promise<Event> {
    return fetchApi<Event>('/api/events/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, storyId }),
    });
}
