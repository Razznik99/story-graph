
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyStoryAccess, PermissionError } from '@/lib/permissions';
import { UpdateStorySchema } from '@/domain/schemas/story.schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions) as any;
    const storyId = (await params).id;

    if (!session || !session.user) {
        // Quick check without userId for public access
        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (story && story.visibility === 'public') {
            return NextResponse.json(story);
        }
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const userId = (session.user as any).id;
        const story = await verifyStoryAccess(storyId, userId, 'VIEW');
        return NextResponse.json(story);
    } catch (error) {
        if (error instanceof PermissionError) {
            return new NextResponse(error.message, { status: 403 });
        }
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(
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
        await verifyStoryAccess(storyId, userId, 'EDIT');

        const body = await req.json();
        const validatedData = UpdateStorySchema.parse(body);

        const updatedStory = await prisma.story.update({
            where: { id: storyId },
            data: validatedData,
        });

        return NextResponse.json(updatedStory);
    } catch (error) {
        if (error instanceof PermissionError) {
            return new NextResponse(error.message, { status: 403 });
        }
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 422 });
        }
        console.error('[STORY_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(
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
        await verifyStoryAccess(storyId, userId, 'OWNER');

        await prisma.story.delete({
            where: { id: storyId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        if (error instanceof PermissionError) {
            return new NextResponse(error.message, { status: 403 });
        }
        console.error('[STORY_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
