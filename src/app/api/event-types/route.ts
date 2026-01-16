import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateEventTypeSchema } from '@/domain/schemas/event.schema';
import { verifyStoryAccess } from '@/lib/permissions';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const storyId = searchParams.get('storyId');
        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        // Use centralized permission check
        const userId = (session.user as any).id;
        await verifyStoryAccess(storyId, userId, 'VIEW');

        const eventTypes = await prisma.eventType.findMany({
            where: { storyId },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(eventTypes);
    } catch (error: any) {
        if (error.code === 'P2025' || error.message === 'Permission denied') {
            return NextResponse.json({ error: error.message || 'Access denied' }, { status: 403 });
        }
        console.error('EventType GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch event types' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = CreateEventTypeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const { storyId, name } = parsed.data;

        const userId = (session.user as any).id;
        await verifyStoryAccess(storyId, userId, 'EDIT');

        // Check name uniqueness in this story
        const existing = await prisma.eventType.findFirst({
            where: { storyId, name },
        });
        if (existing) {
            return NextResponse.json({ error: 'Event type name already exists in this story' }, { status: 400 });
        }

        const eventType = await prisma.eventType.create({
            data: {
                name,
                description: parsed.data.description,
                storyId,
            },
        });

        return NextResponse.json(eventType, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2025' || error.message === 'Permission denied') {
            return NextResponse.json({ error: error.message || 'Access denied' }, { status: 403 });
        }
        console.error('EventType POST error:', error);
        return NextResponse.json({ error: 'Failed to create event type' }, { status: 500 });
    }
}
