
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { TimelineConfigInputSchema } from '@/domain/schemas/timeline.schema';
import { z } from 'zod';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.email) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) {
        return new NextResponse('storyId is required', { status: 400 });
    }

    try {
        const userId = session.user.id || (await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }))?.id;

        if (!userId) {
            return new NextResponse('User not found', { status: 401 });
        }

        // Check Permissions (View is enough to read config)
        const permission = await checkStoryPermission(storyId, userId, CollaborationRole.View);
        if (!permission.authorized) {
            return new NextResponse(permission.error || 'Forbidden', { status: permission.status || 403 });
        }

        const config = await prisma.timelineConfig.findUnique({
            where: { storyId },
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error('[TIMELINE_CONFIG_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.email) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validatedData = TimelineConfigInputSchema.parse(body);
        const { storyId } = validatedData;

        const userId = session.user.id || (await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }))?.id;

        if (!userId) {
            return new NextResponse('User not found', { status: 401 });
        }

        // Check Permissions (Edit required to create/modify config)
        const permission = await checkStoryPermission(storyId, userId, CollaborationRole.Edit);
        if (!permission.authorized) {
            return new NextResponse(permission.error || 'Forbidden', { status: permission.status || 403 });
        }

        // Verify config doesn't already exist
        const existingConfig = await prisma.timelineConfig.findUnique({
            where: { storyId },
        });

        if (existingConfig) {
            return new NextResponse('Timeline config already exists for this story', { status: 400 });
        }

        const config = await prisma.timelineConfig.create({
            data: {
                storyId,
                timelineType: validatedData.timelineType,
                level1Name: validatedData.level1Name,
                level2Name: validatedData.level2Name ?? null,
                level3Name: validatedData.level3Name ?? null,
                level3Persist: validatedData.level3Persist,
                level4Name: validatedData.level4Name ?? null,
                level4Persist: validatedData.level4Persist,
                level5Name: validatedData.level5Name,
                level5Persist: validatedData.level5Persist,
            },
        });

        return NextResponse.json(config, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 422 });
        }
        console.error('[TIMELINE_CONFIG_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.email) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const validatedData = TimelineConfigInputSchema.parse(body);
        const { storyId } = validatedData;

        const userId = session.user.id || (await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }))?.id;

        if (!userId) {
            return new NextResponse('User not found', { status: 401 });
        }

        // Check Permissions (Edit required to update config)
        const permission = await checkStoryPermission(storyId, userId, CollaborationRole.Edit);
        if (!permission.authorized) {
            return new NextResponse(permission.error || 'Forbidden', { status: permission.status || 403 });
        }

        const config = await prisma.timelineConfig.findUnique({
            where: { storyId },
        });

        if (!config) {
            return new NextResponse('Timeline config not found', { status: 404 });
        }

        const wasConfirmed = config.confirmed;

        // Transaction handling for Reset logic
        await prisma.$transaction(async (tx) => {
            // If the config was already confirmed, this is a destructive action.
            if (wasConfirmed) {
                // Find all timeline entries for the story
                const timelines = await tx.timeline.findMany({
                    where: { storyId },
                    select: { id: true },
                });
                const timelineIds = timelines.map(t => t.id);

                if (timelineIds.length > 0) {
                    // Unlink all events from the timeline entries
                    await tx.event.updateMany({
                        where: { timelineId: { in: timelineIds } },
                        data: { timelineId: null, order: 0 },
                    });
                }

                // Delete the old timeline structure
                await tx.timeline.deleteMany({
                    where: { storyId },
                });
            }

            // Update Config
            const updatedConfig = await tx.timelineConfig.update({
                where: { storyId },
                data: {
                    timelineType: validatedData.timelineType,
                    level1Name: validatedData.level1Name,
                    level2Name: validatedData.level2Name ?? null,
                    level3Name: validatedData.level3Name ?? null,
                    level3Persist: validatedData.level3Persist,
                    level4Name: validatedData.level4Name ?? null,
                    level4Persist: validatedData.level4Persist,
                    level5Name: validatedData.level5Name,
                    level5Persist: validatedData.level5Persist,
                    confirmed: validatedData.confirmed,
                },
            });

            // --- NEW LOGIC FOR INITIAL TIMELINE SETUP ---
            if ((!wasConfirmed && updatedConfig.confirmed) || wasConfirmed) {
                // Create the root "Story" timeline node
                const rootTimelineNode = await tx.timeline.create({
                    data: {
                        storyId: storyId,
                        title: '', // User title defaults to empty
                        name: updatedConfig.level1Name || 'Story',
                        level: 1,
                        position: [0, 0, 0, 0, 0], // Initial position for the root
                    },
                });

                // Fetch all events for this story
                const allEvents = await tx.event.findMany({
                    where: { storyId: storyId },
                    orderBy: { createdAt: 'asc' },
                });

                // Link all events to the root timeline node
                for (const [i, event] of allEvents.entries()) {
                    await tx.event.update({
                        where: { id: event.id },
                        data: {
                            timelineId: rootTimelineNode.id,
                            order: i,
                        },
                    });
                }
            }
        });

        // Fetch updated config to return
        const finalConfig = await prisma.timelineConfig.findUnique({ where: { storyId } });
        return NextResponse.json(finalConfig);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 422 });
        }
        console.error('[TIMELINE_CONFIG_PUT]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
