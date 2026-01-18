
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UpdateEventTypeSchema } from '@/domain/schemas/event.schema';
import { checkStoryPermission, CollaborationRole } from '@/lib/permissions';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const parsed = UpdateEventTypeSchema.safeParse({ ...body, id }); // Ensure ID matches

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const { name, description } = parsed.data;

        const eventType = await prisma.eventType.findUnique({ where: { id } });
        if (!eventType) {
            return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
        }

        const userId = (session.user as any).id;
        const permission = await checkStoryPermission(eventType.storyId, userId, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        // Check name uniqueness if name is changing
        if (name && name !== eventType.name) {
            const existing = await prisma.eventType.findFirst({
                where: { storyId: eventType.storyId, name, NOT: { id } },
            });
            if (existing) {
                return NextResponse.json({ error: 'Event type name already exists in this story' }, { status: 400 });
            }
        }

        const updated = await prisma.eventType.update({
            where: { id },
            data: {
                name: name ?? undefined, // Only update if provided
                description: description ?? undefined, // Allow setting to null or undefined
            },
        });

        return NextResponse.json(updated);
    } catch (error: any) {

        console.error('EventType PUT error:', error);
        return NextResponse.json({ error: 'Failed to update event type' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const eventType = await prisma.eventType.findUnique({ where: { id } });
        if (!eventType) {
            return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
        }

        const userId = (session.user as any).id;
        const permission = await checkStoryPermission(eventType.storyId, userId, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        // Check if in use? 
        // Prisma restrictions usually prevent this if foreign keys exist. 
        // We can let Prisma throw error P2003 (Foreign key constraint failed) if we want to block deletion.

        await prisma.eventType.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {

        // Foreign key constraint failed
        if (error.code === 'P2003') {
            return NextResponse.json({ error: "Cannot delete Event Type because it is being used by events." }, { status: 400 });
        }
        console.error('EventType DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete event type' }, { status: 500 });
    }
}
