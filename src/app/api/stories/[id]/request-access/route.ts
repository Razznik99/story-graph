import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CollaborationRequestSchema } from '@/domain/schemas/collaboration.schema';
import { z } from 'zod';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const storyId = params.id;
        const body = await req.json();
        const { role, message } = CollaborationRequestSchema.parse(body);

        let userId = session.user.id;
        if (!userId && session.user.email) {
            const user = await prisma.user.findUnique({ where: { email: session.user.email } });
            userId = user?.id;
        }

        if (!userId) {
            return new NextResponse('User not found', { status: 401 });
        }

        // Check if story exists
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { ownerId: true }
        });

        if (!story) {
            return new NextResponse('Story not found', { status: 404 });
        }

        if (story.ownerId === userId) {
            return new NextResponse('You are the owner', { status: 400 });
        }

        // Check for existing collaboration
        const existingCollab = await prisma.collaboration.findUnique({
            where: { storyId_userId: { storyId, userId } }
        });

        // Check for existing PENDING request
        const existingRequest = await prisma.collaborationRequest.findUnique({
            where: { storyId_userId: { storyId, userId } }
        });

        if (existingRequest && existingRequest.status === 'PENDING') {
            return new NextResponse('Request already pending', { status: 409 });
        }

        // Create or Update Request
        // Using upsert to handle if there was a previous rejected/approved one we want to overwrite
        await prisma.collaborationRequest.upsert({
            where: { storyId_userId: { storyId, userId } },
            create: {
                storyId,
                userId,
                role,
                message,
                status: 'PENDING'
            },
            update: {
                role,
                message,
                status: 'PENDING'
            }
        });

        return new NextResponse('Request sent', { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid data', { status: 422 });
        }
        console.error('[REQUEST_ACCESS]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
