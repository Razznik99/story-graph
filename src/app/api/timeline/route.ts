
import { NextRequest, NextResponse } from 'next/server';
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
            orderBy: { position: 'asc' }, // Order by position within parent
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

        let parentPosition = [0, 0, 0, 0, 0];
        let parentLevel = 0;

        if (parentId) {
            const parent = await prisma.timeline.findUnique({
                where: { id: parentId },
            });
            if (!parent || parent.storyId !== storyId) {
                return NextResponse.json({ error: 'Parent timeline entry not found' }, { status: 404 });
            }
            parentPosition = parent.position;
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

        // Calculate Position
        const levelIndex = level - 1;
        let nextNumber = 1;

        // Check Persist
        let persist = false;
        if (level === 3) persist = config.level3Persist;
        if (level === 4) persist = config.level4Persist;
        if (level === 5) persist = config.level5Persist;

        if (persist) {
            // Global max for this level
            const nodes = await prisma.timeline.findMany({
                where: { storyId, level },
                select: { position: true },
            });

            let maxVal = 0;
            for (const node of nodes) {
                const pos = node.position[levelIndex] ?? 0;
                if (pos > maxVal) {
                    maxVal = pos;
                }
            }
            nextNumber = maxVal + 1;
        } else {
            // Scoped to parent
            const nodes = await prisma.timeline.findMany({
                where: { storyId, parentId, level },
                select: { position: true },
            });

            let maxVal = 0;
            for (const node of nodes) {
                const pos = node.position[levelIndex] ?? 0;
                if (pos > maxVal) {
                    maxVal = pos;
                }
            }
            nextNumber = maxVal + 1;
        }

        // Construct new position
        const newPosition = [...parentPosition];
        // Reset levels below parent up to current level (if skipped)
        for (let i = parentLevel; i < levelIndex; i++) {
            newPosition[i] = 0;
        }
        // Set current level
        newPosition[levelIndex] = nextNumber;
        // Reset levels after current
        for (let i = levelIndex + 1; i < 5; i++) {
            newPosition[i] = 0;
        }

        // Generate Name (auto-generated)
        let levelName = '';
        if (level === 1) levelName = config.level1Name;
        if (level === 2) levelName = config.level2Name || 'Level 2';
        if (level === 3) levelName = config.level3Name || 'Level 3';
        if (level === 4) levelName = config.level4Name || 'Level 4';
        if (level === 5) levelName = config.level5Name;

        const generatedName = `${levelName} #${nextNumber}`;

        const timelineEntry = await prisma.timeline.create({
            data: {
                storyId,
                parentId,
                position: newPosition,
                name: generatedName,
                title: title || '', // User title defaults to empty string
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
