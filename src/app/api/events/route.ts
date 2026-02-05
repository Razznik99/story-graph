import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { CreateEventSchema, UpdateEventSchema } from '@/domain/schemas/event.schema';
import { prisma } from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';
import { updateStoryTags } from '@/lib/tagUtils';

/* -------------------------------------------------------------------------- */
/*                                    POST                                    */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = CreateEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
        }

        const { storyId, eventTypeId, tags, ...rest } = parsed.data;

        // Permission check
        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        // Validate Event Type
        const validType = await prisma.eventType.findFirst({ where: { id: eventTypeId, storyId } });
        if (!validType) {
            return NextResponse.json({ error: 'Invalid event type for this story' }, { status: 400 });
        }

        return await prisma.$transaction(async tx => {
            // Determine order: find max order for this story (and timeline if exists, but currently global list logic mainly)
            // If timelineId is present, maybe scope to timeline? For now, let's just use global order or specific logic if requested.
            // The prompt didn't specify strict ordering logic, so append to end is safe.
            const lastEvent = await tx.event.findFirst({
                where: { storyId },
                orderBy: { order: 'desc' },
                select: { order: true }
            });
            const newOrder = (lastEvent?.order ?? 0) + 1;

            const event = await tx.event.create({
                data: {
                    storyId,
                    eventTypeId,
                    title: rest.title,
                    description: rest.description ?? null,
                    intensity: rest.intensity ?? 'MEDIUM',
                    visibility: rest.visibility ?? 'PUBLIC',
                    outcome: rest.outcome ?? null,
                    timelineId: rest.timelineId ?? null,
                    order: rest.order ?? newOrder,
                    tags: tags ?? [],
                },
                include: { eventType: true }
            });

            if (event.tags.length > 0) {
                await updateStoryTags(storyId, [], event.tags);
            }

            return NextResponse.json(event, { status: 201 });
        });

    } catch (err) {
        console.error('Events POST error:', err);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}

/* -------------------------------------------------------------------------- */
/*                                    GET                                     */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const storyId = searchParams.get('storyId');
        const id = searchParams.get('id');

        if (!storyId && !id) {
            return NextResponse.json({ error: 'storyId or id required' }, { status: 400 });
        }

        // If fetching by ID, we need to find the storyId first to check permissions, or we check after fetching.
        let targetStoryId = storyId;

        if (id && !targetStoryId) {
            const evt = await prisma.event.findUnique({
                where: { id },
                select: { storyId: true }
            });
            if (!evt) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            targetStoryId = evt.storyId;
        }

        if (!targetStoryId) {
            return NextResponse.json({ error: 'Story ID could not be determined' }, { status: 400 });
        }

        const permission = await checkStoryPermission(
            targetStoryId,
            session.user.id,
            CollaborationRole.View
        );

        if (!permission.authorized) {
            return NextResponse.json(
                { error: permission.error },
                { status: permission.status || 403 }
            );
        }

        if (id) {
            const event = await prisma.event.findUnique({
                where: { id },
                include: { eventType: true }
            });
            if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
            return NextResponse.json(event);
        }

        const events = await prisma.event.findMany({
            where: { storyId: targetStoryId },
            include: {
                eventType: true,
                linkedEventsFrom: true // Include outgoing relations for TimelineCanvas
            },
            orderBy: { order: 'asc' }
        });

        return NextResponse.json(events);

    } catch (err) {
        console.error('Events GET error:', err);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

/* -------------------------------------------------------------------------- */
/*                                    PUT                                     */
/* -------------------------------------------------------------------------- */

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = UpdateEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
        }

        const { id, eventTypeId, tags, ...rest } = parsed.data;

        // Fetch existing
        const existing = await prisma.event.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Permission check
        const permission = await checkStoryPermission(existing.storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        // If changing type, validate new type
        if (eventTypeId && eventTypeId !== existing.eventTypeId) {
            const validType = await prisma.eventType.findFirst({ where: { id: eventTypeId, storyId: existing.storyId } });
            if (!validType) {
                return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
            }
        }

        return await prisma.$transaction(async tx => {
            const updateData: any = { ...rest };
            if (eventTypeId) updateData.eventTypeId = eventTypeId;
            if (tags) updateData.tags = tags;

            const updated = await tx.event.update({
                where: { id },
                data: updateData,
                include: { eventType: true }
            });

            if (tags) {
                await updateStoryTags(existing.storyId, existing.tags, tags);
            }

            return NextResponse.json(updated);
        });

    } catch (err) {
        console.error('Events PUT error:', err);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        const permission = await checkStoryPermission(event.storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        await prisma.event.delete({ where: { id } });

        // Update tags (decrement usage)
        if (event.tags.length > 0) {
            await updateStoryTags(event.storyId, event.tags, []);
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('Events DELETE error:', err);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
