import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';

// GET /api/timeline?storyId=...&level=...&parentId=...
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const storyId = searchParams.get('storyId');
        const level = searchParams.get('level'); // Optional: filter by level (1-5)
        const parentId = searchParams.get('parentId'); // Optional: filter by parent

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        // Use shared permission check
        const permission = await checkStoryPermission(
            storyId,
            session.user.id,
            CollaborationRole.View
        );

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        const whereClause: any = { storyId };
        if (level) {
            whereClause.level = parseInt(level, 10);
        }
        if (parentId !== null && parentId !== undefined) {
            whereClause.parentId = parentId;
        }
        // If no parentId parameter provided, fetch ALL nodes for this storyId

        const timelineEntries = await prisma.timeline.findMany({
            where: whereClause,
            include: {
                parent: true, // Include parent for breadcrumb/path calculation
                children: true, // Include children for drill-down
                events: true, // Include events in this timeline level
            },
            orderBy: { orderKey: 'asc' }, // Order by orderKey
        });

        return NextResponse.json(timelineEntries);
    } catch (error) {
        console.error('Timeline GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
    }
}

// POST /api/timeline
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        let { storyId, parentId, title, level } = body;

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        // Use shared permission check (Edit required for changes)
        const permission = await checkStoryPermission(
            storyId,
            session.user.id,
            CollaborationRole.Edit
        );

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        // Fetch config
        const config = await prisma.timelineConfig.findUnique({
            where: { storyId },
        });
        if (!config) {
            return NextResponse.json({ error: 'Timeline config not found' }, { status: 400 });
        }

        // let parentPosition = [0, 0, 0, 0, 0]; // Unused
        let parentLevel = 0;

        if (parentId) {
            const parent = await prisma.timeline.findUnique({
                where: { id: parentId },
            });
            if (!parent || parent.storyId !== storyId) {
                return NextResponse.json({ error: 'Parent timeline entry not found' }, { status: 404 });
            }
            // parentPosition not needed
            parentLevel = parent.level;
        }

        // Determine level if not provided
        if (!level) {
            // Find next active level
            for (let i = parentLevel + 1; i <= 5; i++) {
                let enabled = true;
                if (i === 2 && !config.level2Name) enabled = false;
                if (i === 3 && !config.level3Name) enabled = false;
                if (i === 4 && !config.level4Name) enabled = false;

                if (enabled) {
                    level = i;
                    break;
                }
            }
        }

        if (!level) {
            // Fallback or error if no valid level found (e.g. at max depth)
            return NextResponse.json({ error: 'Could not determine next level' }, { status: 400 });
        }

        // Calculate OrderKey
        // We find the last node in this level (filtered by parent if exists, or global level if persist is true?
        // Wait, 'persist' logic means "numbering continues".
        // If numbering continues (persist=true), we should look at ALL nodes in this level for max orderKey.
        // If persist=false, we look at siblings (same parent).
        // BUT 'orderKey' defines order among siblings usually.
        // If we want "global numbering" but "local ordering", that's tricky.
        // Actually, orderKey should probably just be for sorting within the filtered view.
        // The user said: "(note if level persist, then orderkey and numbering continues accross parent levels)"
        // This implies orderKey should be global for that level?
        // If orderKey is global, then all nodes in Level 3 are ordered relative to each other regardless of parent?
        // That would make the tree view strict?
        // Let's assume orderKey is scoped to Parent for valid tree structure, BUT 'numbering' (the displayed #) might be global.
        // However, the user said "use orderKey so that numbering is derived".
        // If numbering is derived from orderKey, and numbering is global, then orderKey must be global?
        // "currentlly, position stores an int array... let us change that and use an orderKey"
        // If I make orderKey global for the level, then `findMany({ where: { storyId, level } })` works.
        // But if I have multiple parents, and I mix their children in one big list?
        // Usually, a Timeline is a Tree. Children are owned by a Parent.
        // If I enforce global orderKey at Level X, it means I can sort ALL Level X nodes.
        // If I do that, are they still strictly children of their parents? Yes.
        // So, let's implement based on 'persist' flag.

        // Check Persist Config
        let persist = false;
        if (level === 3) persist = config.level3Persist;
        if (level === 4) persist = config.level4Persist;
        if (level === 5) persist = config.level5Persist;

        const whereClause: any = { storyId, level };
        // If NOT persist, we scope to parent for ordering (standard tree behavior)
        // If persist, we sort globally?
        // Actually, if 'numbering continues', it usually just means the INDEX.
        // But if we want to insert 'between' across parents?
        // Let's stick to:
        // - If persist=false: orderKey is relative to parent. (Scope: parentId)
        // - If persist=true: orderKey is global for level? (Scope: level)
        // Wait, if I have Parent A and Parent B.
        // A has child A1. B has child B1.
        // If persist=true, maybe A1 is #1, B1 is #2.
        // If I insert A2, is it #3?
        // And if I reorder, do I reorder globally?
        // The request says "use orderKey so that numbering is derived".
        // And "if level persist, then orderkey and numbering continues accross parent levels".
        // This strongly suggests a GLOBAL orderKey for that level.
        // But `parentId` is still strict.
        // So I will calculate `orderKey` based on the Last Node of the Scope.

        if (!persist) {
            whereClause.parentId = parentId;
        }

        const lastNode = await prisma.timeline.findFirst({
            where: whereClause,
            orderBy: { orderKey: 'desc' },
        });

        const lastOrderKey = lastNode ? lastNode.orderKey : new Prisma.Decimal(0);
        const newOrderKey = lastOrderKey.add(1000); // Spacing of 1000

        // Generate Name (no number)
        let levelName = '';
        if (level === 1) levelName = config.level1Name;
        if (level === 2) levelName = config.level2Name || 'Level 2';
        if (level === 3) levelName = config.level3Name || 'Level 3';
        if (level === 4) levelName = config.level4Name || 'Level 4';
        if (level === 5) levelName = config.level5Name;

        const generatedName = levelName; // No number

        const timelineEntry = await prisma.timeline.create({
            data: {
                storyId,
                parentId,
                orderKey: newOrderKey,
                name: generatedName,
                title: title || '',
                level,
            },
        });

        // Create associated Note
        const noteTitle = `${generatedName}: ${title || ''}`;
        await prisma.note.create({
            data: {
                storyId,
                title: noteTitle,
                content: '', // Empty initial content
                timelineId: timelineEntry.id,
            },
        });

        return NextResponse.json(timelineEntry, { status: 201 });
    } catch (error) {
        console.error('Timeline POST error:', error);
        return NextResponse.json({ error: 'Failed to create timeline entry' }, { status: 500 });
    }
}
