import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { storyId, message } = body;

        if (!storyId || !message) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        let userId = (session.user as any).id;

        // Verify user exists
        if (!userId && session.user.email) {
            const user = await prisma.user.findUnique({ where: { email: session.user.email } });
            userId = user?.id;
        }

        if (!userId) {
            return new NextResponse('User not found', { status: 401 });
        }

        // Check Access (Owner or Collaborator)
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: {
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

        // Viewers CAN comment (per requirements)
        if (!isOwner && !isCollaborator) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const comment = await prisma.comment.create({
            data: {
                storyId,
                userId,
                message
            }
        });

        return NextResponse.json(comment);

    } catch (error) {
        console.error('[COMMENTS_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
