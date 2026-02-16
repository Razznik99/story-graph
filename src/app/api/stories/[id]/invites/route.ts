import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CollaborationRole } from '@prisma/client';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: storyId } = await params;

    try {
        const body = await req.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const currentUserId = (session.user as any).id;

        // Verify Owner
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { ownerId: true }
        });

        if (!story) {
            return new NextResponse('Story not found', { status: 404 });
        }

        if (story.ownerId !== currentUserId) {
            return new NextResponse('Forbidden: Only owner can invite', { status: 403 });
        }

        // Check if user is already a collaborator
        const existingCollab = await prisma.collaboration.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId
                }
            }
        });

        if (existingCollab) {
            return new NextResponse('User is already a collaborator', { status: 400 });
        }

        // Check availability/pending invites
        const existingInvite = await prisma.collaborationInvite.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId
                }
            }
        });

        if (existingInvite) {
            return new NextResponse('Invite already pending', { status: 400 });
        }

        const invite = await prisma.collaborationInvite.create({
            data: {
                storyId,
                userId,
                role: role as CollaborationRole,
                status: 'PENDING'
            }
        });

        return NextResponse.json(invite);

    } catch (error) {
        console.error('[INVITES_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
