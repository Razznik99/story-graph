
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

    const { parentId, level, position } = node;
    const levelIndex = level - 1;
    const currentPosValue = position[levelIndex] ?? 0;

    // Find siblings
    // We need to compare based on the position value at levelIndex
    // And ensure parentId matches
    const siblings = await prisma.timeline.findMany({
        where: {
            storyId,
            parentId: parentId, // can be null
            level: level,
        },
    });

    // Sort siblings by position
    siblings.sort((a, b) => {
        const pA = a.position[levelIndex] ?? 0;
        const pB = b.position[levelIndex] ?? 0;
        return pA - pB;
    });

    const currentIndex = siblings.findIndex(s => s.id === nodeId);
    if (currentIndex === -1) return NextResponse.json({ error: 'Node not found in siblings' }, { status: 500 });

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= siblings.length) {
        // Cannot move further
        return NextResponse.json({ message: 'Already at limit' });
    }

    const siblingToSwap = siblings[swapIndex];

    if (!siblingToSwap) {
        return NextResponse.json({ error: 'Sibling to swap not found' }, { status: 500 });
    }

    // Swap position values at levelIndex
    const nodePosVal = node.position[levelIndex] ?? 0;
    const siblingPosVal = siblingToSwap.position[levelIndex] ?? 0;

    const newNodePos = [...node.position];
    newNodePos[levelIndex] = siblingPosVal;

    const newSiblingPos = [...siblingToSwap.position];
    newSiblingPos[levelIndex] = nodePosVal;


    // Transaction
    await prisma.$transaction([
        prisma.timeline.update({
            where: { id: node.id },
            data: { position: newNodePos },
        }),
        prisma.timeline.update({
            where: { id: siblingToSwap.id },
            data: { position: newSiblingPos },
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

    const { parentId, level } = targetNode;
    // We typically can't insert a sibling for the Root (Level 1) if it's unique, but the logic allows multiple Level 1s?
    // The schema says @@unique([storyId, position]).
    // Usually a story has one root, but let's assume we can insert if multiple are allowed or we are shifting.
    // Actually, usually Level 1 is unique per story in many models, but here it seems we are just shifting 'position'.

    const levelIndex = level - 1;

    // Get all siblings to shift them
    const siblings = await prisma.timeline.findMany({
        where: {
            storyId,
            parentId: parentId,
            level: level,
        },
    });

    // Sort
    siblings.sort((a, b) => (a.position[levelIndex] ?? 0) - (b.position[levelIndex] ?? 0));

    const targetIndex = siblings.findIndex(s => s.id === targetNodeId);
    let insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

    // We need to create a gap or just renumber everything from insertIndex onwards.
    // Simplest is to Max+1 and append? No, we want specific position.
    // Renumbering is safer to ensure consistency.

    // Let's re-assign positions for all siblings + new one
    // New node object placeholder
    const newNodeTemp = { id: 'NEW_NODE' };
    const newOrderList = [...siblings];
    newOrderList.splice(insertIndex, 0, newNodeTemp as any);

    // We need to calculate the actual position vector for the new node.
    // It should inherit parent position parts.
    let parentPos = [0, 0, 0, 0, 0];
    if (parentId) {
        const parent = await prisma.timeline.findUnique({ where: { id: parentId } });
        if (parent) parentPos = parent.position;
    } else {
        // If Root, basic position is 0s
    }

    // We also need config to get the name
    const config = await prisma.timelineConfig.findUnique({ where: { storyId } });
    let levelName = 'Level ' + level;
    if (config) {
        if (level === 1) levelName = config.level1Name;
        else if (level === 2) levelName = config.level2Name || levelName;
        else if (level === 3) levelName = config.level3Name || levelName;
        else if (level === 4) levelName = config.level4Name || levelName;
        else if (level === 5) levelName = config.level5Name || levelName;
    }

    const updates = [];
    let newNodeResult = null;

    // We can't easily renumber ALL in one go without potential unique constraint violations on [storyId, position].
    // Strategy: 
    // 1. Move everything that needs moving to a temporary negative or high space? 
    // OR: just update assuming we can avoid collision.
    // Better: Update from end to start to avoid collision if shifting UP?
    // Actually, if we just inserting ONE, we can find the max and append, but the user wants "Insert Above/Below".

    // Let's try: Update positions loop.
    // Uniqueness is on `position` (Int[]).
    // Prisma doesn't support deferred constraints easily.

    // Workaround:
    // We will update the `position` of the new node to be correct.
    // But we first need to shift the existing ones.
    // Query all siblings that are >= insertIndex and shift them +1.
    // To avoid collision, we should do it from highest to lowest.

    const siblingsToShift = siblings.slice(insertIndex).reverse(); // process from end

    // Transactional op
    /*
        Problem: We need to shift index `i` to `i+1`. 
        If we have 1, 2, 3. Insert at 2.
        3 -> 4. 2 -> 3. New -> 2.
        If we do 3->4, that spot 4 is free. 
        So reverse order IS safe.
    */

    // 1. Shift existing
    for (const sib of siblingsToShift) {
        const oldPos = sib.position;
        const newPos = [...oldPos];
        newPos[levelIndex] = (newPos[levelIndex] ?? 0) + 1; // Increment this level's index

        updates.push(
            prisma.timeline.update({
                where: { id: sib.id },
                data: { position: newPos },
            })
        );
    }

    // 2. Create new node
    // It will take the position calculated from the insertIndex + (start offset?)
    // Actually, we should not just rely on array index, we should look at the values.
    // But normalized, typical 1,2,3...
    // Let's assume the siblings list was contiguous or we simply want to place it at `siblings[targetIndex].position + (after?1:0)`.
    // But if we shift, we make space.

    // Let's define the new position value.
    // If inserting before: value = targetNode.position[levelIndex].
    // If inserting after: value = targetNode.position[levelIndex] + 1.

    const targetPosValue = targetNode.position[levelIndex] ?? 0;
    const newPosValue = position === 'before' ? targetPosValue : targetPosValue + 1;

    const newNodePosition = [...targetNode.position]; // Inherit parent path (which is same as sibling)
    // but ensure children levels are 0
    for (let i = levelIndex + 1; i < 5; i++) newNodePosition[i] = 0;

    newNodePosition[levelIndex] = newPosValue;

    // Prepare creation
    const generatedName = `${levelName} #${newPosValue}`; // This might be duplicate if we don't fix names, but name is not unique. 
    // Ideally we re-generate names too? The user prompt didn't strictly ask to re-name everything.

    const createOp = prisma.timeline.create({
        data: {
            storyId,
            parentId,
            level,
            position: newNodePosition,
            name: generatedName,
            title: title || '',
            // Create implicitly empty note too?
            notes: {
                create: {
                    storyId,
                    title: `${generatedName}: ${title || ''}`,
                    content: '',
                }
            }
        }
    });

    // Execute
    // Note: We might still hit collision if we don't shift first.
    // Prisma transaction processes sequentially? Yes.

    await prisma.$transaction([
        ...updates,
        createOp
    ]);

    return NextResponse.json({ success: true });
}
