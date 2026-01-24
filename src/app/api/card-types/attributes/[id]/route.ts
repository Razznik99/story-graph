
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';
import { UpdateAttributeSchema } from '@/domain/schemas/card.schema';

// PUT /api/card-types/attributes/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await req.json();

        // Include ID in body for schema validation
        const payload = { ...body, id };

        const parsed = UpdateAttributeSchema.safeParse(payload);
        if (!parsed.success)
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

        const { id: _, ...updateData } = parsed.data;

        const attribute = await prisma.attributeDefinition.findUnique({
            where: { id },
            include: { cardType: true }
        });

        if (!attribute)
            return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });

        const permission = await checkStoryPermission(attribute.storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        // Check for name uniqueness if name is changing
        if (updateData.name && updateData.name !== attribute.name) {
            const existing = await prisma.attributeDefinition.findFirst({
                where: {
                    cardTypeId: attribute.cardTypeId,
                    name: updateData.name,
                    id: { not: id }
                }
            });
            if (existing) {
                return NextResponse.json({ error: 'Attribute name must be unique' }, { status: 400 });
            }
        }

        const updated = await prisma.attributeDefinition.update({
            where: { id },
            data: {
                name: updateData.name ?? undefined,
                description: updateData.description ?? undefined,
                // attrType change is usually risky, but we allow it if validated
                // We shouldn't probably allow Type change easily if data exists, but adhering to schema
                // User schema ALLOWS optional attrType.
                attrType: updateData.attrType ?? undefined,
                config: updateData.config ?? undefined
            } as any
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Attribute PUT error:', error);
        return NextResponse.json({ error: 'Failed to update attribute' }, { status: 500 });
    }
}

// DELETE /api/card-types/attributes/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        const attribute = await prisma.attributeDefinition.findUnique({
            where: { id },
            include: { cardType: true }
        });

        if (!attribute)
            return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });

        const permission = await checkStoryPermission(attribute.storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        await prisma.$transaction(async (tx) => {
            // Delete the attribute definition
            await tx.attributeDefinition.delete({ where: { id } });

            // Remove from layout
            const currentLayout = attribute.cardType.layout as any;
            if (currentLayout && currentLayout.items) {
                currentLayout.items = currentLayout.items.filter((i: any) => i.id !== id);
                await tx.cardType.update({
                    where: { id: attribute.cardTypeId },
                    data: { layout: currentLayout }
                });
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Attribute DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete attribute' }, { status: 500 });
    }
}
