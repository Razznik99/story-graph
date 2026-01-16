import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission, CollaborationRole } from '@/lib/permissions';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const storyId = searchParams.get('storyId');

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        // We need the user ID. Since session.user might only have email depending on config,
        // we should better fetch the user or rely on adapter populating the id.
        let userId = (session.user as any).id;

        if (!userId && session.user.email) {
            const user = await prisma.user.findUnique({ where: { email: session.user.email } });
            userId = user?.id;
        }

        if (!userId) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 });
        }

        const permission = await checkStoryPermission(storyId, userId, CollaborationRole.View);

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        const tags = await prisma.tag.findMany({
            where: { storyId },
            orderBy: { usageCount: 'desc' },
            take: 50, // Limit to most popular
        });

        return NextResponse.json(tags);
    } catch (error: any) {
        console.error('Tags GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }
}
