
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        console.log('[API] /api/timeline/events/manage body:', body);
        const { action, eventId, timelineId, direction } = body;

        if (!action || !eventId) {
            return NextResponse.json({ error: 'Action and eventId are required' }, { status: 400 });
        }

        // Verify event exists and get storyId
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { story: true },
        });

        if (!event) {
            console.log('[API] Event not found:', eventId);
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Check permission (Edit required for managing events on timeline)
        const permission = await checkStoryPermission(
            event.storyId,
            session.user.id,
            CollaborationRole.Edit
        );

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        switch (action) {
            case 'place': {
                if (!timelineId) {
                    return NextResponse.json({ error: 'timelineId is required for placing an event' }, { status: 400 });
                }

                // Verify target timeline node exists and belongs to the same story
                const targetTimelineNode = await prisma.timeline.findUnique({
                    where: { id: timelineId },
                });
                if (!targetTimelineNode || targetTimelineNode.storyId !== event.storyId) {
                    console.log('[API] Target node issue. Found:', !!targetTimelineNode, 'StoryMatch:', targetTimelineNode?.storyId === event.storyId);
                    return NextResponse.json({ error: 'Target timeline node not found or invalid' }, { status: 404 });
                }

                // Find the maximum order for events in the target timeline node
                const maxOrderEvent = await prisma.event.findFirst({
                    where: { timelineId },
                    orderBy: { order: 'desc' },
                    select: { order: true },
                });
                const nextOrder = (maxOrderEvent?.order ?? 0) + 1;

                const updatedEvent = await prisma.event.update({
                    where: { id: eventId },
                    data: { timelineId, order: nextOrder },
                });
                return NextResponse.json(updatedEvent);
            }

            case 'unplace': {
                // Find the root node (Level 1) for this story
                const rootNode = await prisma.timeline.findFirst({
                    where: {
                        storyId: event.storyId,
                        level: 1,
                        parentId: null
                    }
                });

                if (!rootNode) {
                    return NextResponse.json({ error: 'Root timeline node not found' }, { status: 404 });
                }

                // Calculate next order in root
                const maxOrderEvent = await prisma.event.findFirst({
                    where: { timelineId: rootNode.id },
                    orderBy: { order: 'desc' },
                    select: { order: true },
                });
                const nextOrder = (maxOrderEvent?.order ?? 0) + 1;

                const updatedEvent = await prisma.event.update({
                    where: { id: eventId },
                    data: { timelineId: rootNode.id, order: nextOrder },
                });
                return NextResponse.json(updatedEvent);
            }

            case 'reorder': {
                if (!direction || (direction !== 'up' && direction !== 'down')) {
                    return NextResponse.json({ error: 'Direction must be "up" or "down" for reordering' }, { status: 400 });
                }
                if (!event.timelineId) {
                    return NextResponse.json({ error: 'Event is not placed on a timeline to be reordered' }, { status: 400 });
                }

                const eventsInTimeline = await prisma.event.findMany({
                    where: { timelineId: event.timelineId },
                    orderBy: [
                        { order: 'asc' },
                        { updatedAt: 'asc' }
                    ],
                });

                const currentIndex = eventsInTimeline.findIndex(e => e.id === eventId);
                if (currentIndex === -1) {
                    return NextResponse.json({ error: 'Event not found in its timeline' }, { status: 404 });
                }

                const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

                if (targetIndex < 0 || targetIndex >= eventsInTimeline.length) {
                    return NextResponse.json({ error: 'Cannot reorder event further in this direction' }, { status: 400 });
                }

                const currentEvent = eventsInTimeline[currentIndex];
                const targetEvent = eventsInTimeline[targetIndex];

                if (!currentEvent || !targetEvent) {
                    return NextResponse.json({ error: 'Event retrieval failed' }, { status: 500 });
                }

                // Handle order collisions (e.g. both are 0) by normalizing the entire list logic
                if (currentEvent.order === targetEvent.order) {
                    const updates = eventsInTimeline.map((ev, index) => {
                        let newOrder = index + 1;
                        if (index === currentIndex) newOrder = targetIndex + 1;
                        else if (index === targetIndex) newOrder = currentIndex + 1;

                        return prisma.event.update({
                            where: { id: ev.id },
                            data: { order: newOrder }
                        });
                    });
                    await prisma.$transaction(updates);
                } else {
                    // Standard swap
                    await prisma.$transaction([
                        prisma.event.update({
                            where: { id: currentEvent.id },
                            data: { order: targetEvent.order },
                        }),
                        prisma.event.update({
                            where: { id: targetEvent.id },
                            data: { order: currentEvent.order },
                        }),
                    ]);
                }

                return NextResponse.json({ message: 'Event reordered successfully' });
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Timeline Event Manage POST error:', error);
        return NextResponse.json({ error: 'Failed to manage timeline event' }, { status: 500 });
    }
}
