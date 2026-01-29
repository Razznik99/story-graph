
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
        const { title } = body;

        // We allow title updates. Maybe other fields later?
        if (title === undefined) {
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
            data: { title },
        });

        // Update associated Note title
        const noteTitle = `${updatedNode.name}: ${title || ''}`;
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

        // Find all descendant timeline nodes.
        const allNodesForStory = await prisma.timeline.findMany({
            where: { storyId: existingNode.storyId },
            select: { id: true, position: true },
        });

        const prefix = existingNode.position ?? [];
        const descendantIds = allNodesForStory
            .filter((n) => {
                const pos = n.position ?? [];
                if (pos.length < prefix.length) return false;
                for (let i = 0; i < prefix.length; i++) {
                    if (pos[i] !== prefix[i]) return false;
                }
                return true;
            })
            .map((n) => n.id);

        // Find the root node (level 1, no parent) for this story
        const rootNode = await prisma.timeline.findFirst({
            where: { storyId: existingNode.storyId, level: 1, parentId: null },
            select: { id: true },
        });

        // Move all events from descendant nodes to the root node
        if (rootNode) {
            // Avoid moving events if the root node itself is being deleted (conceptually root node is in descendantIds if id target is root)
            // If we are deleting the ROOT, we just unlink.
            const targetId = descendantIds.includes(rootNode.id) ? null : rootNode.id;

            await prisma.event.updateMany({
                where: { timelineId: { in: descendantIds } },
                data: { timelineId: targetId, order: 0 },
            });
        } else {
            // Fallback: if no root node exists, unlink the events
            await prisma.event.updateMany({
                where: { timelineId: { in: descendantIds } },
                data: { timelineId: null, order: 0 },
            });
        }

        // Delete notes associated with these timelines
        await prisma.note.deleteMany({
            where: { timelineId: { in: descendantIds } },
        });

        // Delete all descendant nodes (including the target node itself)
        await prisma.timeline.deleteMany({
            where: { id: { in: descendantIds } },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Timeline DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete timeline node' }, { status: 500 });
    }
}
