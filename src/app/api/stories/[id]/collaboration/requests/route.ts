
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRequestSchema } from '@/domain/schemas/collaboration.schema';
import { z } from 'zod';

// Schema for creating a request
const CreateRequestSchema = z.object({
    role: CollaborationRequestSchema.shape.role,
    message: CollaborationRequestSchema.shape.message,
});

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions) as any;
    const storyId = (await params).id;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;
        // Only owner can view requests to join
        const permission = await checkStoryPermission(storyId, userId, 'Owner');
        if (!permission.authorized) {
            return new NextResponse(permission.error || 'Forbidden', { status: permission.status || 403 });
        }

        const requests = await prisma.collaborationRequest.findMany({
            where: { storyId },
            include: {
                user: { select: { id: true, name: true, image: true, email: true } },
            },
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error('[REQUESTS_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions) as any;
    const storyId = (await params).id;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;

        // Check if story exists and is public (or if user has link? logic simplified to: exists)
        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story) {
            return new NextResponse('Story not found', { status: 404 });
        }

        if (story.ownerId === userId) {
            return new NextResponse('Owner cannot request to join own story', { status: 400 });
        }

        const body = await req.json();
        const { role, message } = CreateRequestSchema.parse(body);

        // Check if already collaborating
        const existingCollab = await prisma.collaboration.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId
                }
            }
        });

        if (existingCollab) {
            return new NextResponse('You are already a collaborator', { status: 409 });
        }

        // Check if already requested
        const existingRequest = await prisma.collaborationRequest.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId
                }
            }
        });

        if (existingRequest) {
            return new NextResponse('You have already requested to join', { status: 409 });
        }

        const request = await prisma.collaborationRequest.create({
            data: {
                storyId,
                userId,
                role,
                message: message ?? null,
                status: 'PENDING',
            },
        });

        return NextResponse.json(request);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 422 });
        }
        console.error('[REQUESTS_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
