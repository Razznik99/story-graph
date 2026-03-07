import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action } = body;

        // Routing actions
        try {
            switch (action) {
                // Timeline
                case 'deleteTimeline': {
                    await prisma.timeline.delete({ where: { id: body.id } });
                    return NextResponse.json({ success: true });
                }
                case 'renameTimeline': {
                    // Title renaming maps to name column
                    await prisma.timeline.update({
                        where: { id: body.id },
                        data: { name: body.title }
                    });
                    return NextResponse.json({ success: true });
                }
                case 'updateTimeline': {
                    await prisma.timeline.update({
                        where: { id: body.id },
                        data: {
                            name: body.name,
                            branch1Name: body.branch1Name,
                            branch2Name: body.branch2Name,
                            branch3Name: body.branch3Name,
                            leafName: body.leafName,
                            branch2Persist: body.branch2Persist,
                            branch3Persist: body.branch3Persist,
                            leafPersist: body.leafPersist,
                        }
                    });
                    return NextResponse.json({ success: true });
                }

                // Branch
                case 'createBranch': {
                    let orderKey = new Prisma.Decimal(1000);

                    if (body.position && body.referenceId) {
                        const refBranch = await prisma.branch.findUnique({ where: { id: body.referenceId } });
                        if (refBranch) {
                            const siblings = await prisma.branch.findMany({
                                where: { timelineId: body.timelineId, parentBranchId: refBranch.parentBranchId },
                                orderBy: { orderKey: 'asc' }
                            });
                            const idx = siblings.findIndex(s => s.id === refBranch.id);

                            if (idx !== -1) {
                                if (body.position === 'above') {
                                    const prev = siblings[idx - 1];
                                    if (prev) {
                                        orderKey = prev.orderKey.add(refBranch.orderKey).dividedBy(2);
                                    } else {
                                        orderKey = refBranch.orderKey.dividedBy(2);
                                    }
                                } else if (body.position === 'below') {
                                    const next = siblings[idx + 1];
                                    if (next) {
                                        orderKey = refBranch.orderKey.add(next.orderKey).dividedBy(2);
                                    } else {
                                        orderKey = refBranch.orderKey.add(1000);
                                    }
                                }
                            }
                        }
                    } else {
                        const lastBranch = await prisma.branch.findFirst({
                            where: { timelineId: body.timelineId, parentBranchId: body.parentBranchId || null },
                            orderBy: { orderKey: 'desc' }
                        });
                        orderKey = lastBranch ? lastBranch.orderKey.add(1000) : new Prisma.Decimal(1000);
                    }
                    const timeline = await prisma.timeline.findUnique({ where: { id: body.timelineId } });

                    let parentLevel = 1;
                    if (body.parentBranchId) {
                        const parent = await prisma.branch.findUnique({ where: { id: body.parentBranchId } });
                        parentLevel = parent?.level ?? 1;
                    }

                    const isB2Active = !!(timeline?.branch2Name && timeline.branch2Name.trim().length > 0);
                    const isB3Active = !!(timeline?.branch3Name && timeline.branch3Name.trim().length > 0);

                    let targetLevel = 1;

                    if (body.parentBranchId) {
                        if (parentLevel === 1) {
                            if (isB2Active) targetLevel = 2;
                            else if (isB3Active) targetLevel = 3;
                            else targetLevel = 4; // Should be leaf
                        } else if (parentLevel === 2) {
                            if (isB3Active) targetLevel = 3;
                            else targetLevel = 4;
                        } else {
                            targetLevel = 4;
                        }
                    }

                    // Validate if targetLevel is supported
                    if (targetLevel === 2 && !isB2Active) {
                        return NextResponse.json({ error: 'Level 2 branches are disabled.' }, { status: 400 });
                    }
                    if (targetLevel === 3 && !isB3Active) {
                        return NextResponse.json({ error: 'Level 3 branches are disabled.' }, { status: 400 });
                    }
                    if (targetLevel > 3) {
                        return NextResponse.json({ error: 'Maximum branch depth exceeded. Add a Leaf instead.' }, { status: 400 });
                    }

                    let branchName = timeline?.branch1Name || 'Branch';
                    if (targetLevel === 2) branchName = timeline?.branch2Name || 'Sub-Branch';
                    if (targetLevel === 3) branchName = timeline?.branch3Name || 'Sub-Branch 2';

                    const branch = await prisma.branch.create({
                        data: {
                            timelineId: body.timelineId,
                            parentBranchId: body.parentBranchId,
                            title: body.title || '',
                            name: branchName,
                            orderKey,
                            level: targetLevel
                        }
                    });

                    // Auto-create Note for Branch
                    let branchNumber = 1;
                    if (targetLevel === 1 || (targetLevel === 2 && timeline?.branch2Persist) || (targetLevel === 3 && timeline?.branch3Persist)) {
                        branchNumber = await prisma.branch.count({
                            where: { timelineId: body.timelineId, level: targetLevel, orderKey: { lte: orderKey } }
                        });
                    } else {
                        branchNumber = await prisma.branch.count({
                            where: { parentBranchId: body.parentBranchId, orderKey: { lte: orderKey } }
                        });
                    }
                    const branchNoteTitle = `${branch.name} ${branchNumber}${branch.title ? ': ' + branch.title : ''}`;

                    if (timeline?.storyId) {
                        await prisma.note.create({
                            data: {
                                storyId: timeline.storyId,
                                branchId: branch.id,
                                title: branchNoteTitle,
                                content: { type: "doc", content: [{ type: "paragraph" }] },
                                tags: []
                            }
                        });
                    }

                    return NextResponse.json(branch);
                }
                case 'renameBranch': {
                    await prisma.branch.update({
                        where: { id: body.id },
                        data: { title: body.title }
                    });
                    return NextResponse.json({ success: true });
                }
                case 'deleteBranch': {
                    await prisma.branch.delete({ where: { id: body.id } });
                    return NextResponse.json({ success: true });
                }
                case 'reorderBranch': {
                    const branch = await prisma.branch.findUnique({ where: { id: body.id } });
                    if (!branch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
                    const siblings = await prisma.branch.findMany({
                        where: { timelineId: branch.timelineId, parentBranchId: branch.parentBranchId },
                        orderBy: { orderKey: 'asc' }
                    });
                    const idx = siblings.findIndex(s => s.id === branch.id);
                    const swapIdx = body.direction === 'up' ? idx - 1 : idx + 1;
                    if (swapIdx >= 0 && swapIdx < siblings.length) {
                        const swap = siblings[swapIdx];
                        if (swap) {
                            await prisma.$transaction([
                                prisma.branch.update({ where: { id: branch.id }, data: { orderKey: swap.orderKey } }),
                                prisma.branch.update({ where: { id: swap.id }, data: { orderKey: branch.orderKey } })
                            ]);
                        }
                    }
                    return NextResponse.json({ success: true });
                }

                // Leaf
                case 'createLeaf': {
                    let orderKey = new Prisma.Decimal(1000);

                    if (body.position && body.referenceId) {
                        const refLeaf = await prisma.leaf.findUnique({ where: { id: body.referenceId } });
                        if (refLeaf) {
                            const siblings = await prisma.leaf.findMany({
                                where: { branchId: refLeaf.branchId },
                                orderBy: { orderKey: 'asc' }
                            });
                            const idx = siblings.findIndex(s => s.id === refLeaf.id);

                            if (idx !== -1) {
                                if (body.position === 'above') {
                                    const prev = siblings[idx - 1];
                                    if (prev) {
                                        orderKey = prev.orderKey.add(refLeaf.orderKey).dividedBy(2);
                                    } else {
                                        orderKey = refLeaf.orderKey.dividedBy(2);
                                    }
                                } else if (body.position === 'below') {
                                    const next = siblings[idx + 1];
                                    if (next) {
                                        orderKey = refLeaf.orderKey.add(next.orderKey).dividedBy(2);
                                    } else {
                                        orderKey = refLeaf.orderKey.add(1000);
                                    }
                                }
                            }
                        }
                    } else {
                        const lastLeaf = await prisma.leaf.findFirst({
                            where: { branchId: body.branchId },
                            orderBy: { orderKey: 'desc' }
                        });
                        orderKey = lastLeaf ? lastLeaf.orderKey.add(1000) : new Prisma.Decimal(1000);
                    }

                    const parentBranch = await prisma.branch.findUnique({
                        where: { id: body.branchId },
                        include: { timeline: true }
                    });

                    const leaf = await prisma.leaf.create({
                        data: {
                            branchId: body.branchId,
                            title: body.title || '',
                            name: parentBranch?.timeline?.leafName || 'Leaf',
                            orderKey
                        }
                    });

                    // Auto-create Note for Leaf
                    let leafNumber = 1;
                    if (parentBranch?.timeline?.leafPersist) {
                        leafNumber = await prisma.leaf.count({
                            where: { branch: { timelineId: parentBranch.timelineId }, orderKey: { lte: orderKey } }
                        });
                    } else {
                        leafNumber = await prisma.leaf.count({
                            where: { branchId: body.branchId, orderKey: { lte: orderKey } }
                        });
                    }
                    const leafNoteTitle = `${leaf.name} ${leafNumber}${leaf.title ? ': ' + leaf.title : ''}`;
                    if (parentBranch?.timeline?.storyId) {
                        await prisma.note.create({
                            data: {
                                storyId: parentBranch.timeline.storyId,
                                leafId: leaf.id,
                                title: leafNoteTitle,
                                content: { type: "doc", content: [{ type: "paragraph" }] },
                                tags: []
                            }
                        });
                    }

                    // START / END node logic
                    // Ensure the absolute first leaf across the TIMELINE has a START node.
                    // This leaf itself might just be the first. And the absolute last leaf has an END node.
                    // Instead of full timeline checks every create, if it's the very first leaf in the whole timeline, create both.
                    const branchInfo = await prisma.branch.findUnique({
                        where: { id: body.branchId },
                        select: { timelineId: true }
                    });

                    if (branchInfo) {
                        const allLeavesCount = await prisma.leaf.count({
                            where: { branch: { timelineId: branchInfo.timelineId } }
                        });

                        // If it's the first leaf ever made in this timeline
                        if (allLeavesCount === 1) {
                            await prisma.timelineNode.createMany({
                                data: [
                                    { leafId: leaf.id, type: 'START' },
                                    { leafId: leaf.id, type: 'END' }
                                ]
                            });
                        }
                    }

                    return NextResponse.json(leaf);
                }
                case 'renameLeaf': {
                    await prisma.leaf.update({
                        where: { id: body.id },
                        data: { title: body.title }
                    });
                    return NextResponse.json({ success: true });
                }
                case 'deleteLeaf': {
                    const leaf = await prisma.leaf.findUnique({
                        where: { id: body.id },
                        include: { branch: true }
                    });
                    if (!leaf) return NextResponse.json({ error: 'Not found' }, { status: 404 });

                    // Find if it has START or END node
                    const startEndNodes = await prisma.timelineNode.findMany({
                        where: { leafId: body.id, type: { in: ['START', 'END'] } }
                    });

                    // Delete the leaf (will cascade delete nodes and edges linked to it normally)
                    await prisma.leaf.delete({ where: { id: body.id } });

                    // Re-evaluate Edge Integrity for START / END
                    if (startEndNodes.length > 0) {
                        const allTimelineLeaves = await prisma.leaf.findMany({
                            where: { branch: { timelineId: leaf.branch.timelineId } },
                            include: { branch: true }
                        });
                        allTimelineLeaves.sort((a, b) => {
                            const bDiff = Number(a.branch.orderKey) - Number(b.branch.orderKey);
                            if (bDiff !== 0) return bDiff;
                            return Number(a.orderKey) - Number(b.orderKey);
                        });

                        const firstLeaf = allTimelineLeaves[0];
                        const lastLeaf = allTimelineLeaves[allTimelineLeaves.length - 1];

                        const newNodes = [];
                        if (startEndNodes.some(n => n.type === 'START') && firstLeaf) {
                            newNodes.push({ leafId: firstLeaf.id, type: 'START' as const });
                        }
                        if (startEndNodes.some(n => n.type === 'END') && lastLeaf) {
                            newNodes.push({ leafId: lastLeaf.id, type: 'END' as const });
                        }

                        if (newNodes.length > 0) {
                            await prisma.timelineNode.createMany({ data: newNodes });
                        }
                    }

                    return NextResponse.json({ success: true });
                }
                case 'reorderLeaf': {
                    const leaf = await prisma.leaf.findUnique({ where: { id: body.id }, include: { branch: true } });
                    if (!leaf) return NextResponse.json({ error: 'Not found' }, { status: 404 });
                    const siblings = await prisma.leaf.findMany({
                        where: { branchId: leaf.branchId },
                        orderBy: { orderKey: 'asc' }
                    });
                    const idx = siblings.findIndex(s => s.id === leaf.id);
                    const swapIdx = body.direction === 'up' ? idx - 1 : idx + 1;
                    if (swapIdx >= 0 && swapIdx < siblings.length) {
                        const swap = siblings[swapIdx];
                        if (swap) {
                            await prisma.$transaction([
                                prisma.leaf.update({ where: { id: leaf.id }, data: { orderKey: swap.orderKey } }),
                                prisma.leaf.update({ where: { id: swap.id }, data: { orderKey: leaf.orderKey } })
                            ]);

                            // Re-evaluate Edge Integrity
                            // In this simple implementation for reorder, if Start node or chronological edges
                            // are affected by the order change, the simplest clean-up is deleting broken chronological edges 
                            // (or we can let the UI trigger a separate full integrity check). 
                            // For now, if the first absolute leaf changes, we move the START node.
                            const allTimelineLeaves = await prisma.leaf.findMany({
                                where: { branch: { timelineId: leaf.branch.timelineId } },
                                include: { branch: true }
                            });
                            // Sort them globally (simplified approximation: by branch orderKey then leaf orderKey)
                            allTimelineLeaves.sort((a, b) => {
                                const bDiff = Number(a.branch.orderKey) - Number(b.branch.orderKey);
                                if (bDiff !== 0) return bDiff;
                                return Number(a.orderKey) - Number(b.orderKey);
                            });

                            const firstLeaf = allTimelineLeaves[0];
                            const lastLeaf = allTimelineLeaves[allTimelineLeaves.length - 1];

                            if (firstLeaf) {
                                // Find the START node
                                const startNode = await prisma.timelineNode.findFirst({
                                    where: { leaf: { branch: { timelineId: leaf.branch.timelineId } }, type: 'START' }
                                });

                                if (startNode && startNode.leafId !== firstLeaf.id) {
                                    // Move start node to the new first leaf. And break its edges.
                                    await prisma.$transaction([
                                        prisma.timelineNode.update({
                                            where: { id: startNode.id },
                                            data: { leafId: firstLeaf.id }
                                        }),
                                        prisma.timelineEdge.deleteMany({
                                            where: {
                                                OR: [
                                                    { fromNodeId: startNode.id },
                                                    { toNodeId: startNode.id }
                                                ]
                                            }
                                        })
                                    ]);
                                }
                            }

                            if (lastLeaf) {
                                // Find the END node
                                const endNode = await prisma.timelineNode.findFirst({
                                    where: { leaf: { branch: { timelineId: leaf.branch.timelineId } }, type: 'END' }
                                });

                                if (endNode && endNode.leafId !== lastLeaf.id) {
                                    // Move end node to the new last leaf. And break its edges.
                                    await prisma.$transaction([
                                        prisma.timelineNode.update({
                                            where: { id: endNode.id },
                                            data: { leafId: lastLeaf.id }
                                        }),
                                        prisma.timelineEdge.deleteMany({
                                            where: {
                                                OR: [
                                                    { fromNodeId: endNode.id },
                                                    { toNodeId: endNode.id }
                                                ]
                                            }
                                        })
                                    ]);
                                }
                            }
                        }
                    }
                    return NextResponse.json({ success: true });
                }

                // Node
                case 'createNode': {
                    const node = await prisma.timelineNode.create({
                        data: {
                            leafId: body.leafId,
                            eventId: body.eventId,
                            type: body.type
                        }
                    });
                    return NextResponse.json(node);
                }
                case 'deleteNode': {
                    await prisma.timelineNode.delete({ where: { id: body.id } });
                    return NextResponse.json({ success: true });
                }
                case 'updateNodeLeaf': {
                    await prisma.timelineNode.update({
                        where: { id: body.nodeId },
                        data: { leafId: body.leafId }
                    });
                    return NextResponse.json({ success: true });
                }
                case 'updateNodeLocked': {
                    await prisma.timelineNode.update({
                        where: { id: body.nodeId },
                        data: { isLocked: body.isLocked }
                    });
                    return NextResponse.json({ success: true });
                }

                // Edge
                case 'createEdge': {
                    const edge = await prisma.timelineEdge.create({
                        data: {
                            fromNodeId: body.fromNodeId,
                            toNodeId: body.toNodeId,
                            type: body.type
                        }
                    });
                    return NextResponse.json(edge);
                }
                case 'deleteEdge': {
                    await prisma.timelineEdge.delete({ where: { id: body.id } });
                    return NextResponse.json({ success: true });
                }

                default:
                    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
            }
        } catch (actionError) {
            console.error('Action error', actionError);
            return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
        }

    } catch (error) {
        console.error('Timeline Manage API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
