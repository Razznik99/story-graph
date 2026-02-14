
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';

// POST /api/timeline/manage
// Actions: 'reorderNode', 'insertSibling'
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, storyId } = body;

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        // Check Permissions (Edit required)
        const permission = await checkStoryPermission(
            storyId,
            session.user.id,
            CollaborationRole.Edit
        );

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        if (action === 'reorderNode') {
            const { nodeId, direction } = body; // direction: 'up' | 'down'
            if (!nodeId || !direction) {
                return NextResponse.json({ error: 'nodeId and direction required' }, { status: 400 });
            }
            // Implementation logic below
            return await handleReorderNode(storyId, nodeId, direction);
        }

        if (action === 'insertSibling') {
            const { targetNodeId, position, title } = body; // position: 'before' | 'after'
            if (!targetNodeId || !position) {
                return NextResponse.json({ error: 'targetNodeId and position required' }, { status: 400 });
            }
            return await handleInsertSibling(storyId, targetNodeId, position, title);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Timeline Manage API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function handleReorderNode(storyId: string, nodeId: string, direction: 'up' | 'down') {
    const node = await prisma.timeline.findUnique({
        where: { id: nodeId },
    });

    if (!node || node.storyId !== storyId) {
        return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const { parentId, level, orderKey } = node;

    // Find siblings
    const siblings = await prisma.timeline.findMany({
        where: {
            storyId,
            parentId: parentId, // strict parent scoping
            level: level,
        },
        orderBy: { orderKey: 'asc' },
    });

    const currentIndex = siblings.findIndex(s => s.id === nodeId);
    if (currentIndex === -1) return NextResponse.json({ error: 'Node not found in siblings' }, { status: 500 });

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= siblings.length) {
        return NextResponse.json({ message: 'Already at limit' });
    }

    const siblingToSwap = siblings[swapIndex];

    if (!siblingToSwap) {
        return NextResponse.json({ error: 'Sibling to swap not found' }, { status: 500 });
    }

    // Swap orderKeys
    const nodeKey = node.orderKey;
    const siblingKey = siblingToSwap.orderKey;

    await prisma.$transaction([
        prisma.timeline.update({
            where: { id: node.id },
            data: { orderKey: siblingKey },
        }),
        prisma.timeline.update({
            where: { id: siblingToSwap.id },
            data: { orderKey: nodeKey },
        }),
    ]);

    return NextResponse.json({ success: true });
}

async function handleInsertSibling(storyId: string, targetNodeId: string, position: 'before' | 'after', title?: string) {
    const targetNode = await prisma.timeline.findUnique({
        where: { id: targetNodeId },
    });

    if (!targetNode || targetNode.storyId !== storyId) {
        return NextResponse.json({ error: 'Target node not found' }, { status: 404 });
    }

    const { parentId, level, orderKey: targetOrderKey } = targetNode;

    // Find neighbor to calculate midpoint
    let neighborOrderKey: Prisma.Decimal | null = null;

    if (position === 'before') {
        // Find immediate predecessor
        const prev = await prisma.timeline.findFirst({
            where: {
                storyId,
                parentId,
                level,
                orderKey: { lt: targetOrderKey },
            },
            orderBy: { orderKey: 'desc' },
        });
        if (prev) neighborOrderKey = prev.orderKey;
    } else {
        // Find immediate successor
        const next = await prisma.timeline.findFirst({
            where: {
                storyId,
                parentId,
                level,
                orderKey: { gt: targetOrderKey },
            },
            orderBy: { orderKey: 'asc' },
        });
        if (next) neighborOrderKey = next.orderKey;
    }

    // Calculate new key
    let newOrderKey: Prisma.Decimal;
    const spacing = new Prisma.Decimal(1000);

    if (neighborOrderKey) {
        // Midpoint
        newOrderKey = targetOrderKey.add(neighborOrderKey).div(2);
    } else {
        // No neighbor in that direction (start or end)
        if (position === 'before') {
            newOrderKey = targetOrderKey.sub(spacing);
        } else {
            newOrderKey = targetOrderKey.add(spacing);
        }
    }

    // Get config for naming (simplified)
    const config = await prisma.timelineConfig.findUnique({ where: { storyId } });
    let levelName = 'Level ' + level;
    if (config) {
        if (level === 1) levelName = config.level1Name;
        else if (level === 2) levelName = config.level2Name || levelName;
        else if (level === 3) levelName = config.level3Name || levelName;
        else if (level === 4) levelName = config.level4Name || levelName;
        else if (level === 5) levelName = config.level5Name || levelName;
    }

    // No number in name
    const generatedName = levelName;

    const newNode = await prisma.timeline.create({
        data: {
            storyId,
            parentId,
            level,
            orderKey: newOrderKey,
            name: generatedName,
            title: title || '',
            notes: {
                create: {
                    storyId,
                    title: `${generatedName}: ${title || ''}`,
                    content: '',
                }
            }
        }
    });

    return NextResponse.json({ success: true, node: newNode });
}
