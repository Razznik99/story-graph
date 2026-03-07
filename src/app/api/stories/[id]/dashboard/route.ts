import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: storyId } = await params;
    if (!storyId) {
        return new NextResponse('Story ID required', { status: 400 });
    }

    try {
        let userId = (session.user as any).id;

        // Verify user exists and get ID if needed (similar logic to other routes for robustness)
        if (!userId && session.user.email) {
            const user = await prisma.user.findUnique({ where: { email: session.user.email } });
            userId = user?.id;
        }

        if (!userId) {
            return new NextResponse('User not found', { status: 401 });
        }

        // Check Access
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: {
                id: true,
                ownerId: true,
                collaborators: {
                    where: { userId },
                    select: { role: true }
                }
            }
        });

        if (!story) {
            return new NextResponse('Story not found', { status: 404 });
        }

        const isOwner = story.ownerId === userId;
        const isCollaborator = story.collaborators.length > 0;

        if (!isOwner && !isCollaborator) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Fetch Dashboard Data
        const [
            storyDetails,
            cardCount,
            eventCount,
            level5Count,
            collaboratorCount,
            recentComments,
            pendingSuggestions,
            collaborationRequests,
            collaborationInvites,
            timelineConfig
        ] = await prisma.$transaction([
            // 1. Story Details
            prisma.story.findUnique({
                where: { id: storyId },
                select: {
                    title: true,
                    abbreviation: true,
                    synopsis: true,
                    coverUrl: true,
                    updatedAt: true,
                    owner: {
                        select: {
                            name: true,
                            email: true,
                            username: true
                        }
                    }
                }
            }),
            // 2. Card Count
            prisma.card.count({ where: { storyId } }),
            // 3. Event Count
            prisma.event.count({ where: { storyId } }),
            // 4. Leaf Count
            prisma.leaf.count({
                where: {
                    branch: { timeline: { storyId } }
                }
            }),
            // 5. Collaborator Count (Accepted)
            prisma.collaboration.count({
                where: {
                    storyId,
                    accepted: true
                }
            }),
            // 6. Recent Comments (Last 5)
            prisma.comment.findMany({
                where: { storyId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    user: {
                        select: { name: true, image: true, username: true }
                    }
                }
            }),
            // 7. Pending Suggestions
            prisma.suggestion.findMany({
                where: {
                    storyId,
                    accepted: false,
                    rejected: false
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    user: {
                        select: { name: true, image: true, username: true }
                    }
                }
            }),
            // 8. Pending Collaboration Requests (Incoming from users wanting to join)
            prisma.collaborationRequest.findMany({
                where: {
                    storyId,
                    status: 'PENDING'
                },
                include: {
                    user: {
                        select: { name: true, image: true, username: true, email: true }
                    }
                }
            }),
            // 9. Pending Collaboration Invites (Outgoing to users)
            prisma.collaborationInvite.findMany({
                where: {
                    storyId,
                    status: 'PENDING'
                },
                include: {
                    user: {
                        select: { name: true, image: true, username: true, email: true }
                    }
                }
            }),
            // 10. Timeline for Leaf Name
            prisma.timeline.findFirst({
                where: { storyId },
                select: { leafName: true },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return NextResponse.json({
            story: storyDetails,
            stats: {
                cards: cardCount,
                events: eventCount,
                level5: level5Count,
                collaborators: collaboratorCount,
                level5Name: timelineConfig?.leafName ?? 'Leaf'
            },
            comments: recentComments,
            suggestions: pendingSuggestions,
            requests: collaborationRequests,
            invites: collaborationInvites,
            isOwner // Useful for frontend permission gating (e.g. only owner can manage invites)
        });

    } catch (error) {
        console.error('[DASHBOARD_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
