
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission, CollaborationRole } from '@/lib/permissions';
import { InviteCollaboratorSchema } from '@/domain/schemas/collaboration.schema';
import { z } from 'zod';

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
        // Only owner can view pending invites
        const permission = await checkStoryPermission(storyId, userId, 'Owner');
        if (!permission.authorized) {
            return new NextResponse(permission.error || 'Forbidden', { status: permission.status || 403 });
        }

        const invites = await prisma.collaborationInvite.findMany({
            where: { storyId },
            include: {
                user: { select: { id: true, name: true, image: true, email: true } },
            },
        });

        return NextResponse.json(invites);
    } catch (error) {
        console.error('[INVITES_GET]', error);
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
        const permission = await checkStoryPermission(storyId, userId, 'Owner');
        if (!permission.authorized) {
            return new NextResponse(permission.error || 'Forbidden', { status: permission.status || 403 });
        }

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
        const existingCollab = await prisma.collaboration.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId: userToInvite.id
                }
            }
        });

        if (existingCollab) {
            return new NextResponse('User is already a collaborator', { status: 409 });
        }

        // Check if already invited
        const existingInvite = await prisma.collaborationInvite.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId: userToInvite.id
                }
            }
        });

        if (existingInvite) {
            return new NextResponse('User is already invited', { status: 409 });
        }

        const invite = await prisma.collaborationInvite.create({
            data: {
                storyId,
                userId: userToInvite.id,
                role,
                status: 'PENDING',
            },
        });

        return NextResponse.json(invite);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 422 });
        }
        console.error('[INVITES_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
