
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { z } from 'zod';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, requestId: string }> }
) {
    const session = await getServerSession(authOptions) as any;
    const { id: storyId, requestId } = await params;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;

        // Only owner can accept/reject requests
        const permission = await checkStoryPermission(storyId, userId, 'Owner');
        if (!permission.authorized) {
            return new NextResponse(permission.error || 'Forbidden', { status: permission.status || 403 });
        }

        const body = await req.json();
        const { status } = z.object({ status: z.enum(['ACCEPTED', 'REJECTED']) }).parse(body);

        const request = await prisma.collaborationRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            return new NextResponse('Request not found', { status: 404 });
        }

        if (status === 'REJECTED') {
            await prisma.collaborationRequest.delete({ where: { id: requestId } });
            return NextResponse.json({ message: 'Request rejected' });
        }

        // Accept Flow
        const result = await prisma.$transaction(async (tx) => {
            // Create Collaboration
            const collab = await tx.collaboration.create({
                data: {
                    storyId: request.storyId,
                    userId: request.userId,
                    role: request.role,
                    accepted: true,
                    acceptedAt: new Date(),
                }
            });

            // Delete Request
            await tx.collaborationRequest.delete({ where: { id: requestId } });

            return collab;
        });

        return NextResponse.json(result);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid status', { status: 400 });
        }
        console.error('[REQUEST_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, requestId: string }> }
) {
    const session = await getServerSession(authOptions) as any;
    const { requestId } = await params;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;

        const request = await prisma.collaborationRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            return new NextResponse('Request not found', { status: 404 });
        }

        // Only the requester (user) can cancel their own request
        // (Owner rejection is handled via PATCH 'REJECTED')
        if (request.userId !== userId) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        await prisma.collaborationRequest.delete({ where: { id: requestId } });
        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error('[REQUEST_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
