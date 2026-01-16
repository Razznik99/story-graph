import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;
        const storyId = params.id;

        // Check if collaboration request already exists
        const existing = await prisma.collaboration.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId,
                }
            }
        });

        if (existing) {
            if (existing.accepted) {
                return new NextResponse('Already a member', { status: 409 });
            }
            return new NextResponse('Request already pending', { status: 409 });
        }

        // Create pending collaboration
        await prisma.collaboration.create({
            data: {
                storyId,
                userId,
                role: 'View', // Default to View for requests
                accepted: false,
            }
        });

        return new NextResponse('Request sent', { status: 200 });

    } catch (error) {
        console.error('[STORY_REQUEST_ACCESS]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
