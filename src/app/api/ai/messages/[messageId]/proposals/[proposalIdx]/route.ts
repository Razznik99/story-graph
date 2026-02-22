import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
    req: Request,
    { params }: { params: { messageId: string, proposalIdx: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const message = await prisma.aIMessage.findUnique({
            where: { id: params.messageId },
            include: { chat: true }
        });

        if (!message) {
            return new NextResponse('Message not found', { status: 404 });
        }

        // Verify ownership
        const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
        if (!user || message.chat.userId !== user.id) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const currentProposals = message.proposals ? (message.proposals as any[]) : [];
        const index = parseInt(params.proposalIdx, 10);

        if (isNaN(index) || index < 0 || index >= currentProposals.length) {
            return new NextResponse('Invalid proposal index', { status: 400 });
        }

        // Remove the proposal at the given index
        currentProposals.splice(index, 1);

        // Update the message
        await prisma.aIMessage.update({
            where: { id: params.messageId },
            data: {
                proposals: currentProposals.length > 0 ? currentProposals : Prisma.JsonNull
            }
        });

        return new NextResponse('Proposal removed', { status: 200 });
    } catch (error) {
        console.error('Error deleting proposal:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
