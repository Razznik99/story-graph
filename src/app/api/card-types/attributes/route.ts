
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';
import { CreateAttributeSchema } from '@/domain/schemas/card.schema';

// GET /api/card-types/attributes?cardTypeId=...
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const cardTypeId = searchParams.get('cardTypeId');
        if (!cardTypeId)
            return NextResponse.json({ error: 'cardTypeId is required' }, { status: 400 });

        const cardType = await prisma.cardType.findUnique({ where: { id: cardTypeId } });
        if (!cardType)
            return NextResponse.json({ error: 'Card type not found' }, { status: 404 });

        const permission = await checkStoryPermission(cardType.storyId, session.user.id, CollaborationRole.View);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        const attributes = await prisma.attributeDefinition.findMany({
            where: { cardTypeId },
        });

        return NextResponse.json(attributes);
    } catch (error) {
        console.error('Attributes GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch attributes' }, { status: 500 });
    }
}

// POST /api/card-types/attributes
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const parsed = CreateAttributeSchema.safeParse(body);
        if (!parsed.success)
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

        const { cardTypeId, ...attrData } = parsed.data;

        const cardType = await prisma.cardType.findUnique({ where: { id: cardTypeId } });
        if (!cardType)
            return NextResponse.json({ error: 'Card type not found' }, { status: 404 });

        const permission = await checkStoryPermission(cardType.storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error || 'Forbidden' }, { status: permission.status || 403 });
        }

        const existingAttr = await prisma.attributeDefinition.findFirst({
            where: { cardTypeId, name: attrData.name },
        });
        if (existingAttr)
            return NextResponse.json({ error: 'Attribute name must be unique per card type' }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {
            const attribute = await tx.attributeDefinition.create({
                data: {
                    storyId: cardType.storyId,
                    ...attrData,
                    description: attrData.description ?? null,
                    config: (attrData.config ?? undefined) as any,
                    cardTypeId,
                },
            });

            const currentLayout = cardType.layout as any || { items: [] };
            if (!currentLayout.items) currentLayout.items = [];

            // Ensure "Attributes" heading exists
            const hasAttrHeading = currentLayout.items.some((i: any) => i.type === 'heading' && i.text === 'Attributes');
            if (!hasAttrHeading) {
                // If missing, add it. Since it should be the catch-all, we might want it at the start or end?
                // User requirement: "default layout is { heading; 'Attribute', then list of attributes below it}"
                // If completely missing, we init it.
                currentLayout.items.push({ id: crypto.randomUUID(), type: 'heading', text: 'Attributes', removable: false });
            }

            // Append to layout
            currentLayout.items.push({
                id: attribute.id,
                type: 'attribute'
            });

            await tx.cardType.update({
                where: { id: cardTypeId },
                data: { layout: currentLayout }
            });

            return attribute;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Attributes POST error:', error);
        return NextResponse.json({ error: 'Failed to create attribute' }, { status: 500 });
    }
}
