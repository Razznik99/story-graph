
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { name } = body;

        // We allow name updates. Maybe other fields later?
        if (name === undefined) {
            return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
        }

        // Fetch node to verify existence and get storyId
        const existingNode = await prisma.timeline.findUnique({
            where: { id },
            include: { story: true },
        });

        if (!existingNode) {
            return NextResponse.json({ error: 'Timeline node not found' }, { status: 404 });
        }

        // Verify permission
        const permission = await checkStoryPermission(
            existingNode.storyId,
            session.user.id,
            CollaborationRole.Edit
        );

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        const updatedNode = await prisma.timeline.update({
            where: { id },
            data: { name },
        });

        // Update associated Note title
        const noteTitle = `${updatedNode.name} Note`;
        await prisma.note.updateMany({
            where: { timelineId: id },
            data: { title: noteTitle },
        });

        return NextResponse.json(updatedNode);
    } catch (error) {
        console.error('Timeline PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update timeline node' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership/permission by fetching node
        const existingNode = await prisma.timeline.findUnique({
            where: { id },
            include: { story: true },
        });

        if (!existingNode) {
            return NextResponse.json({ error: 'Timeline node not found' }, { status: 404 });
        }

        // Verify permission
        const permission = await checkStoryPermission(
            existingNode.storyId,
            session.user.id,
            CollaborationRole.Edit
        );

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        await prisma.timeline.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Timeline DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete timeline node' }, { status: 500 });
    }
}
