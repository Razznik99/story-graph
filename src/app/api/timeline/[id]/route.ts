
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

        // Find all descendant timeline nodes iteratively
        // Level is at most 5, so this loop is shallow.
        let descendantIds = [id];
        let currentLevelIds = [id];

        while (currentLevelIds.length > 0) {
            const children = await prisma.timeline.findMany({
                where: { parentId: { in: currentLevelIds } },
                select: { id: true },
            });

            if (children.length === 0) break;

            const childIds = children.map(c => c.id);
            descendantIds = [...descendantIds, ...childIds];
            currentLevelIds = childIds;
        }

        // Find the root node (level 1, no parent) for this story
        const rootNode = await prisma.timeline.findFirst({
            where: { storyId: existingNode.storyId, level: 1, parentId: null },
            select: { id: true },
        });

        // Move all events from descendant nodes to the root node (or unlink if root is being deleted)
        if (rootNode) {
            // Avoid moving events if the root node itself is being deleted
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
        // Order doesn't matter for deleteMany?
        // Actually, foreign keys might complain if we delete parent before child?
        // prisma handles cascade if configured?
        // Schema: parent   Timeline?  @relation("TimelineTree", fields: [parentId], references: [id])
        // It doesn't say "onDelete: Cascade" in the schema for `parent`.
        // So we must delete children first (reverse order of discovery? or specific level order?)
        // Or just `deleteMany`? Prisma `deleteMany` doesn't guarantee order.
        // If no Cascade, we MUST delete from bottom up.
        // We have `descendantIds`. We should delete in reverse level order?
        // Constructing layers was useful.
        // Let's re-do the loop to keep layers.

        // Actually, let's just use `deleteMany` but we might hit constraint errors?
        // If I delete a parent, and child references it...
        // Schema says: `parentId String?` ... `references: [id])` -> SetNull? No, default is NoAction?
        // If it's restrictive, we must delete children first.

        // Let's assume we need to delete children first.
        // Filter `descendantIds` by level? We didn't fetch level.
        // Let's fetch level too.

        const nodesToDelete = await prisma.timeline.findMany({
            where: { id: { in: descendantIds } },
            select: { id: true, level: true },
            orderBy: { level: 'desc' }, // Delete from deepest level up
        });

        const deleteIds = nodesToDelete.map(n => n.id);

        if (deleteIds.length > 0) {
            await prisma.timeline.deleteMany({
                where: { id: { in: deleteIds } },
            });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Timeline DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete timeline node' }, { status: 500 });
    }
}
