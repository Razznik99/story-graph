
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission, CollaborationRole } from '@/lib/permissions';

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
        const permission = await checkStoryPermission(storyId, userId, CollaborationRole.View);
        if (!permission.authorized) {
            return new NextResponse(permission.error || 'Forbidden', { status: permission.status || 403 });
        }

        const collaborators = await prisma.collaboration.findMany({
            where: {
                storyId,
                accepted: true
            },
            include: {
                user: { select: { id: true, name: true, image: true, email: true } },
            },
        });

        return NextResponse.json(collaborators);
    } catch (error) {

        console.error('[COLLABORATION_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
