
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyStoryAccess, PermissionError } from '@/lib/permissions';
import { InviteCollaboratorSchema } from '@/domain/schemas/collaboration.schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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
        await verifyStoryAccess(storyId, userId, 'VIEW');

        const collaborators = await prisma.collaboration.findMany({
            where: { storyId },
            include: {
                user: { select: { id: true, name: true, image: true, email: true } },
            },
        });

        return NextResponse.json(collaborators);
    } catch (error) {
        if (error instanceof PermissionError) {
            return new NextResponse(error.message, { status: 403 });
        }
        console.error('[COLLABORATION_GET]', error);
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
        // Only owner can invite
        await verifyStoryAccess(storyId, userId, 'OWNER');

        const body = await req.json();
        const { email, role } = InviteCollaboratorSchema.parse(body);

        const userToInvite = await prisma.user.findUnique({
            where: { email },
        });

        if (!userToInvite) {
            return new NextResponse('User not found', { status: 404 });
        }

        if (userToInvite.id === userId) {
            return new NextResponse('Cannot invite self', { status: 400 });
        }

        // Check if already collaborating
        const existing = await prisma.collaboration.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId: userToInvite.id
                }
            }
        });

        if (existing) {
            return new NextResponse('User is already a collaborator', { status: 409 });
        }

        const collaboration = await prisma.collaboration.create({
            data: {
                storyId,
                userId: userToInvite.id,
                role,
                accepted: false, // Pending acceptance
            },
        });

        return NextResponse.json(collaboration);
    } catch (error) {
        if (error instanceof PermissionError) {
            return new NextResponse(error.message, { status: 403 });
        }
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 422 });
        }
        console.error('[COLLABORATION_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
