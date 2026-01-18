
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkStoryPermission, CollaborationRole } from '@/lib/permissions';
import { UpdateCardTypeSchema } from '@/domain/schemas/card.schema';

// PUT /api/card-types/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await req.json();

        const payload = { ...body, id };

        const parsed = UpdateCardTypeSchema.safeParse(payload);
        if (!parsed.success)
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

        const { id: _, ...updateData } = parsed.data;

        const cardType = await prisma.cardType.findUnique({ where: { id } });
        if (!cardType)
            return NextResponse.json({ error: 'Card type not found' }, { status: 404 });

        const permission = await checkStoryPermission(cardType.storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        const updated = await prisma.cardType.update({
            where: { id },
            data: {
                name: updateData.name ?? undefined,
                description: updateData.description ?? undefined,
                layout: updateData.layout ?? undefined,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('CardTypes PUT error:', error);
        return NextResponse.json({ error: 'Failed to update card type' }, { status: 500 });
    }
}

// DELETE /api/card-types/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        const cardType = await prisma.cardType.findUnique({ where: { id } });
        if (!cardType)
            return NextResponse.json({ error: 'Card type not found' }, { status: 404 });

        const permission = await checkStoryPermission(cardType.storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        await prisma.cardType.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('CardTypes DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete card type' }, { status: 500 });
    }
}
