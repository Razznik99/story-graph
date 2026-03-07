import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';

// GET /api/timeline?storyId=...
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const storyId = searchParams.get('storyId');

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        const permission = await checkStoryPermission(
            storyId,
            session.user.id,
            CollaborationRole.View
        );

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        const timelines = await prisma.timeline.findMany({
            where: { storyId },
            include: {
                branches: {
                    include: {
                        leaves: {
                            include: {
                                nodes: {
                                    include: {
                                        outgoingEdges: true,
                                        incomingEdges: true,
                                        event: true,
                                    }
                                }
                            },
                            orderBy: { orderKey: 'asc' }
                        }
                    },
                    orderBy: { orderKey: 'asc' }
                }
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(timelines);
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
        const { storyId, title } = body;

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }
        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

        // Get default names from last created timeline or use defaults
        const existingTimelines = await prisma.timeline.findMany({
            where: { storyId },
            orderBy: { createdAt: 'desc' },
        });

        const latest = existingTimelines[0];

        // Find a unique name
        let name = title || story.title;
        let suffix = 1;
        while (existingTimelines.some(t => t.name === name)) {
            name = `${title || story.title} (${suffix})`;
            suffix++;
        }

        const timelineEntry = await prisma.timeline.create({
            data: {
                storyId,
                name,
                branch1Name: latest?.branch1Name || 'Volume',
                branch2Name: latest?.branch2Name || null,
                branch3Name: latest?.branch3Name || null,
                leafName: latest?.leafName || 'Chapter',
                branch2Persist: latest?.branch2Persist || false,
                branch3Persist: latest?.branch3Persist || false,
                leafPersist: latest?.leafPersist || false,
            },
        });

        // Auto-create a Note for the Timeline itself
        await prisma.note.create({
            data: {
                storyId,
                timelineId: timelineEntry.id,
                title: timelineEntry.name,
                content: { type: "doc", content: [{ type: "paragraph" }] },
                tags: []
            }
        });

        return NextResponse.json(timelineEntry, { status: 201 });
    } catch (error) {
        console.error('Timeline POST error:', error);
        return NextResponse.json({ error: 'Failed to create timeline entry' }, { status: 500 });
    }
}
