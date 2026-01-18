import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tags = await prisma.globalTag.findMany({
            orderBy: { usageCount: 'desc' },
            take: 50,
        });

        const sanitizedTags = tags.map(tag => ({
            ...tag,
            name: tag.name.replace(/^#/, '')
        }));

        return NextResponse.json(sanitizedTags);
    } catch (error) {
        console.error('Global Tags GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }
}
