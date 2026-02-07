import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';
import { CreateRelationSchema } from '@/domain/schemas/relations.schema';

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
        const linkId = searchParams.get('linkId'); // Was toEventId
        const storyId = searchParams.get('storyId');
        const type = searchParams.get('type'); // optional explicit type filter if needed

        if (!storyId) {
            return NextResponse.json({ error: 'storyId required' }, { status: 400 });
        }

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.View);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        // Fetch Specific Event Links
        if (eventId) {
            // Card Links
            if (type === 'card') {
                const links = await prisma.eventCardLink.findMany({
                    where: { eventId, storyId },
                    include: { card: true, role: true },
                    orderBy: { createdAt: 'desc' }
                });
                return NextResponse.json({ type: 'card', links });
            }

            // Event Links (Outgoing) - Default if type is 'event' or undefined
            const links = await prisma.eventEventLink.findMany({
                where: { eventId, storyId },
                include: { link: true },
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json({ type: 'event-outgoing', links });
        }

        // Fetch All Story Event Links (if no eventId provided)
        if (storyId && (!type || type === 'event')) {
            const links = await prisma.eventEventLink.findMany({
                where: { storyId },
                include: { link: true },
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json({ type: 'event-outgoing', links });
        }

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
            if (data.eventId === data.linkId) {
                return NextResponse.json({ error: 'Cannot link event to itself' }, { status: 400 });
            }

            const link = await prisma.eventEventLink.create({
                data: {
                    storyId,
                    eventId: data.eventId,
                    linkId: data.linkId,
                    relationshipType: data.relationshipType,
                },
                include: { link: true, event: true }
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
