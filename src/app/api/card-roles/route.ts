
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateCardRoleSchema } from '@/domain/schemas/card.schema';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const storyId = searchParams.get('storyId');
        const cardTypeId = searchParams.get('cardTypeId'); // Optional filter

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const permission = await checkStoryPermission(storyId, userId, CollaborationRole.View);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        const where: any = { storyId };
        if (cardTypeId) {
            where.cardTypeId = cardTypeId;
        }

        const cardRoles = await prisma.cardRole.findMany({
            where,
            orderBy: { name: 'asc' },
            include: { cardType: { select: { name: true } } }
        });

        return NextResponse.json(cardRoles);
    } catch (error: any) {

        console.error('CardRoles GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch card roles' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { storyId, ...body } = await req.json(); // Expect storyId in body alongside role data
        const parsed = CreateCardRoleSchema.safeParse(body);

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const permission = await checkStoryPermission(storyId, userId, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        const { name, description, cardTypeId } = parsed.data;

        const existing = await prisma.cardRole.findFirst({
            where: { storyId, name }
        });

        if (existing) {
            return NextResponse.json({ error: 'Role name must be unique in the story' }, { status: 400 });
        }

        const cardRole = await prisma.cardRole.create({
            data: {
                storyId,
                name,
                description,
                cardTypeId: cardTypeId || null,
            },
        });

        return NextResponse.json(cardRole, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2025' || error.message === 'Permission denied') {
            return NextResponse.json({ error: error.message || 'Access denied' }, { status: 403 });
        }
        console.error('CardRoles POST error:', error);
        return NextResponse.json({ error: 'Failed to create card role' }, { status: 500 });
    }
}
