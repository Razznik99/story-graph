
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, inviteId: string }> }
) {
    const session = await getServerSession(authOptions) as any;
    const { id: storyId, inviteId } = await params;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;
        const body = await req.json();
        const { status } = z.object({ status: z.enum(['ACCEPTED', 'REJECTED']) }).parse(body);

        const invite = await prisma.collaborationInvite.findUnique({
            where: { id: inviteId },
        });

        if (!invite) {
            return new NextResponse('Invite not found', { status: 404 });
        }

        // Only the invited user can accept/reject
        if (invite.userId !== userId) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (status === 'REJECTED') {
            await prisma.collaborationInvite.delete({ where: { id: inviteId } });
            return NextResponse.json({ message: 'Invite rejected' });
        }

        // Accept Flow
        const result = await prisma.$transaction(async (tx) => {
            // Create Collaboration
            const collab = await tx.collaboration.create({
                data: {
                    storyId: invite.storyId,
                    userId: invite.userId,
                    role: invite.role,
                    accepted: true,
                    acceptedAt: new Date(),
                }
            });

            // Delete Invite
            await tx.collaborationInvite.delete({ where: { id: inviteId } });

            return collab;
        });

        return NextResponse.json(result);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid status', { status: 400 });
        }
        console.error('[INVITE_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
