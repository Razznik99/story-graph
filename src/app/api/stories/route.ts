
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CreateStorySchema } from '@/domain/schemas/story.schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;
        const stories = await prisma.story.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    {
                        collaborators: {
                            some: {
                                userId: userId,
                                accepted: true,
                            },
                        },
                    },
                ],
            },
            include: {
                owner: { select: { name: true, image: true, email: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json(stories);
    } catch (error) {
        console.error('[STORIES_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;
        const body = await req.json();
        const validatedData = CreateStorySchema.parse(body);

        const story = await prisma.story.create({
            data: {
                ...validatedData,
                ownerId: userId,
            },
        });

        return NextResponse.json(story);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 422 });
        }
        console.error('[STORIES_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
