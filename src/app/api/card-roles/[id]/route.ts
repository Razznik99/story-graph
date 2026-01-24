
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UpdateCardRoleSchema } from '@/domain/schemas/card.schema';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const parsed = UpdateCardRoleSchema.safeParse({ ...body, id });

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const { name, description, cardTypeId } = parsed.data;

        const role = await prisma.cardRole.findUnique({ where: { id } });
        if (!role) {
            return NextResponse.json({ error: 'Card role not found' }, { status: 404 });
        }

        const userId = (session.user as any).id;
        const permission = await checkStoryPermission(role.storyId, userId, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        if (name && name !== role.name) {
            const existing = await prisma.cardRole.findFirst({
                where: { storyId: role.storyId, name, NOT: { id } }
            });
            if (existing) {
                return NextResponse.json({ error: 'Role name must be unique in the story' }, { status: 400 });
            }
        }

        const updated = await prisma.cardRole.update({
            where: { id },
            data: {
                name: name ?? undefined,
                description: description ?? undefined,
                cardTypeId: cardTypeId === null ? null : (cardTypeId ?? undefined), // Handle null explicit removal
            } as any,
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        if (error.code === 'P2025' || error.message === 'Permission denied') {
            return NextResponse.json({ error: error.message || 'Access denied' }, { status: 403 });
        }
        console.error('CardRole PUT error:', error);
        return NextResponse.json({ error: 'Failed to update card role' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const role = await prisma.cardRole.findUnique({ where: { id } });

        if (!role) {
            return NextResponse.json({ error: 'Card role not found' }, { status: 404 });
        }

        const userId = (session.user as any).id;
        const permission = await checkStoryPermission(role.storyId, userId, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        await prisma.cardRole.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        if (error.code === 'P2025' || error.message === 'Permission denied') {
            return NextResponse.json({ error: error.message || 'Access denied' }, { status: 403 });
        }
        // Foreign key constraint failed
        if (error.code === 'P2003') {
            return NextResponse.json({ error: "Cannot delete Role because it is being used by links." }, { status: 400 });
        }
        console.error('CardRole DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete card role' }, { status: 500 });
    }
}
