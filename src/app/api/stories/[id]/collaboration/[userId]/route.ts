
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyStoryAccess, PermissionError } from '@/lib/permissions';
import { CollaborationRoleSchema } from '@/domain/schemas/collaboration.schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const session = await getServerSession(authOptions) as any;
    const { id: storyId, userId: targetUserId } = await params;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;
        await verifyStoryAccess(storyId, userId, 'OWNER');

        const body = await req.json();
        const { role } = z.object({ role: CollaborationRoleSchema }).parse(body);

        const updatedCollaboration = await prisma.collaboration.update({
            where: {
                storyId_userId: {
                    storyId,
                    userId: targetUserId,
                },
            },
            data: { role },
            include: {
                user: { select: { id: true, name: true, image: true, email: true } },
            },
        });

        return NextResponse.json(updatedCollaboration);
    } catch (error) {
        if (error instanceof PermissionError) {
            return new NextResponse(error.message, { status: 403 });
        }
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 422 });
        }
        // Handle "Record to update not found."
        if ((error as any).code === 'P2025') {
            return new NextResponse('Collaborator not found', { status: 404 });
        }
        console.error('[COLLABORATION_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const session = await getServerSession(authOptions) as any;
    const { id: storyId, userId: targetUserId } = await params;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;
        await verifyStoryAccess(storyId, userId, 'OWNER');

        await prisma.collaboration.delete({
            where: {
                storyId_userId: {
                    storyId,
                    userId: targetUserId,
                },
            },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        if (error instanceof PermissionError) {
            return new NextResponse(error.message, { status: 403 });
        }
        if ((error as any).code === 'P2025') {
            return new NextResponse('Collaborator not found', { status: 404 });
        }
        console.error('[COLLABORATION_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
