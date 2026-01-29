import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';
import { EventCardLinkSchema } from '@/domain/schemas/relations.schema';

const CreateEventCardLinkSchema = z.object({
    type: z.literal('card'),
    storyId: z.string().uuid(),
    eventId: z.string().uuid(),
    cardId: z.string().uuid(),
    roleId: z.string().uuid().nullable().optional(),
});

const CreateEventEventLinkSchema = z.object({
    type: z.literal('event'),
    storyId: z.string().uuid(),
    fromEventId: z.string().uuid(),
    toEventId: z.string().uuid(),
    relationshipType: z.enum([
        'CAUSES', 'CAUSED_BY', 'FORESHADOWS', 'RESOLVES',
        'ESCALATES', 'DEESCALATES', 'PARALLEL_TO', 'CONTRADICTS'
    ]),
});

const CreateRelationSchema = z.union([CreateEventCardLinkSchema, CreateEventEventLinkSchema]);

/* -------------------------------------------------------------------------- */
/*                                     GET                                    */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const fromEventId = searchParams.get('fromEventId');
        const toEventId = searchParams.get('toEventId');
        const storyId = searchParams.get('storyId');

        if (!storyId) {
            return NextResponse.json({ error: 'storyId required' }, { status: 400 });
        }

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.View);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        // Fetch Card Links
        if (eventId) {
            const links = await prisma.eventCardLink.findMany({
                where: { eventId, storyId },
                include: {
                    card: true,
                    role: true
                },
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json({ type: 'card', links });
        }

        // Fetch Event Links (Outgoing)
        if (fromEventId) {
            const links = await prisma.eventEventLink.findMany({
                where: { fromEventId, storyId },
                include: { toEvent: true },
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json({ type: 'event-outgoing', links });
        }

        // Fetch Event Links (Incoming)
        if (toEventId) {
            const links = await prisma.eventEventLink.findMany({
                where: { toEventId, storyId },
                include: { fromEvent: true },
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json({ type: 'event-incoming', links });
        }

        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

    } catch (err) {
        console.error('Relations GET error:', err);
        return NextResponse.json({ error: 'Failed to fetch relations' }, { status: 500 });
    }
}

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
        const parsed = CreateRelationSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const storyId = data.storyId;

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        if (data.type === 'card') {
            // Validate Card
            const card = await prisma.card.findUnique({
                where: { id: data.cardId },
                include: { cardType: true }
            });
            if (!card || card.storyId !== storyId) {
                return NextResponse.json({ error: 'Invalid card' }, { status: 400 });
            }

            // If roleId provided, validate it
            if (data.roleId) {
                const role = await prisma.cardRole.findUnique({ where: { id: data.roleId } });
                if (!role || role.storyId !== storyId) {
                    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
                }
                // Check if role allows this card type
                if (role.cardTypeId && role.cardTypeId !== card.cardTypeId) {
                    return NextResponse.json({ error: 'Role does not match card type' }, { status: 400 });
                }
            }

            const link = await prisma.eventCardLink.create({
                data: {
                    storyId,
                    eventId: data.eventId,
                    cardId: data.cardId,
                    roleId: data.roleId || null,
                },
                include: { card: true, role: true }
            });
            return NextResponse.json(link, { status: 201 });
        }

        if (data.type === 'event') {
            if (data.fromEventId === data.toEventId) {
                return NextResponse.json({ error: 'Cannot link event to itself' }, { status: 400 });
            }

            const link = await prisma.eventEventLink.create({
                data: {
                    storyId,
                    fromEventId: data.fromEventId,
                    toEventId: data.toEventId,
                    relationshipType: data.relationshipType,
                },
                include: { toEvent: true, fromEvent: true }
            });
            return NextResponse.json(link, { status: 201 });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (err) {
        console.error('Relations POST error:', err);
        return NextResponse.json({ error: 'Failed to create relation' }, { status: 500 });
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
        const type = searchParams.get('type'); // 'card' or 'event'

        if (!id || !type) {
            return NextResponse.json({ error: 'id and type required' }, { status: 400 });
        }

        // We need storyId to check permissions.
        let storyIdStr: string | null = null;

        if (type === 'card') {
            const link = await prisma.eventCardLink.findUnique({ where: { id } });
            if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
            storyIdStr = link.storyId;
        } else if (type === 'event') {
            const link = await prisma.eventEventLink.findUnique({ where: { id } });
            if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
            storyIdStr = link.storyId;
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        const permission = await checkStoryPermission(storyIdStr, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        if (type === 'card') {
            await prisma.eventCardLink.delete({ where: { id } });
        } else {
            await prisma.eventEventLink.delete({ where: { id } });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('Relations DELETE error:', err);
        return NextResponse.json({ error: 'Failed to delete relation' }, { status: 500 });
    }
}
