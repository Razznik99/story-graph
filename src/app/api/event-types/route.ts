import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateEventTypeSchema } from '@/domain/schemas/event.schema';
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
        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        // Use centralized permission check
        const userId = (session.user as any).id;
        const permission = await checkStoryPermission(storyId, userId, CollaborationRole.View);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        const eventTypes = await prisma.eventType.findMany({
            where: { storyId },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(eventTypes);
    } catch (error: any) {

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
        const permission = await checkStoryPermission(storyId, userId, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

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

        console.error('EventType POST error:', error);
        return NextResponse.json({ error: 'Failed to create event type' }, { status: 500 });
    }
}
