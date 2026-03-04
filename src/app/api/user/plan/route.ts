import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getUserPlanLimits } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions) as any;

        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userId = session.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                plan: true,
                tokensRemaining: true,
                imgGenRemaining: true,
                currentPeriodEnd: true,
                paddleSubscriptionId: true,
                subscriptionStatus: true,
            }
        });

        if (!user) {
            return new NextResponse('User not found', { status: 404 });
        }

        const limits = getUserPlanLimits(user);

        return NextResponse.json({
            plan: user.plan,
            limits,
            usage: {
                tokensRemaining: user.tokensRemaining,
                imgGenRemaining: user.imgGenRemaining,
            },
            subscription: {
                currentPeriodEnd: user.currentPeriodEnd,
                isActive: !!user.paddleSubscriptionId,
            }
        });
    } catch (error) {
        console.error('[USER_PLAN_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
