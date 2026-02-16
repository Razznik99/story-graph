import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { SuggestionAction, SuggestionTarget } from '@prisma/client';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { storyId, targetType, targetId, action, message, payload } = body;

        if (!storyId || !targetType || !action || !payload) {
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

        // Check Access
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
        const collaboratorPart = story.collaborators[0]; // Assuming one role per user/story
        const isCollaborator = !!collaboratorPart;

        if (!isOwner && !isCollaborator) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Check Permissions for Suggestions
        // View role CANNOT suggest
        if (!isOwner && collaboratorPart?.role === 'View') {
            return new NextResponse('Forbidden: Viewers cannot create suggestions', { status: 403 });
        }

        const suggestion = await prisma.suggestion.create({
            data: {
                storyId,
                userId,
                targetType: targetType as SuggestionTarget,
                targetId,
                action: action as SuggestionAction,
                message,
                payload
            }
        });

        return NextResponse.json(suggestion);

    } catch (error) {
        console.error('[SUGGESTIONS_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
