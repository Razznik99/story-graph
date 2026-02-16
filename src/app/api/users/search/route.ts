import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { id: query }, // Exact ID match
                    { email: { contains: query, mode: 'insensitive' } },
                    { username: { contains: query, mode: 'insensitive' } },
                    { name: { contains: query, mode: 'insensitive' } },
                ]
            },
            take: 10,
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                image: true
            }
        });

        return NextResponse.json(users);

    } catch (error) {
        console.error('[USERS_SEARCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
