
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';
import { CreateCardTypeSchema } from '@/domain/schemas/card.schema';

// GET /api/card-types?storyId=...
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const storyId = searchParams.get('storyId');
        if (!storyId)
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.View);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        const cardTypes = await prisma.cardType.findMany({
            where: { storyId },
            include: { attributes: true },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(cardTypes);
    } catch (error) {
        console.error('CardTypes GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch card types' }, { status: 500 });
    }
}

// POST /api/card-types
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { storyId, ...data } = body;
        if (!storyId)
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        const parsed = CreateCardTypeSchema.safeParse(data);
        if (!parsed.success)
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

        const typeCount = await prisma.cardType.count({ where: { storyId } });
        if (typeCount >= 25)
            return NextResponse.json({ error: 'Maximum 25 card types allowed' }, { status: 400 });

        // Initialize Card Type with Default Layout
        const defaultLayout = {
            items: [
                {
                    id: crypto.randomUUID(),
                    type: 'heading',
                    text: 'Attributes',
                    removable: false
                }
            ]
        };

        const cardType = await prisma.cardType.create({
            data: {
                name: parsed.data.name,
                description: parsed.data.description ?? null,
                storyId,
                layout: defaultLayout
            },
        });

        return NextResponse.json(cardType, { status: 201 });
    } catch (error) {
        console.error('CardTypes POST error:', error);
        return NextResponse.json({ error: 'Failed to create card type' }, { status: 500 });
    }
}
