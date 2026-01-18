import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAttributes } from '@/lib/cards/validateAttributes';
import { z } from 'zod';
import { CreateCard, UpdateCard, AttributeDefinition, AttributeWithValue } from '@/domain/types';
import { CreateCardSchema, UpdateCardSchema, AttributeDefinitionSchema as ADS } from '@/domain/schemas/card.schema';
import { prisma } from '@/lib/prisma';
import { checkStoryPermission, CollaborationRole } from '@/lib/permissions';
import { updateStoryTags } from '@/lib/tagUtils';



async function processAttributes(
    rawAttributes: { attrId: string; value: unknown }[] | null,
    cardTypeId: string,
    storyId: string
): Promise<{ valid: boolean; errors: string[]; data: AttributeWithValue[] }> {
    if (!rawAttributes || rawAttributes.length === 0) {
        return { valid: true, errors: [], data: [] };
    }

    const definitions = await prisma.attributeDefinition.findMany({
        where: { cardTypeId, storyId },
    });

    const parsedDefs = z.array(ADS).parse(definitions);
    const defMap = new Map(parsedDefs.map(def => [def.id, def]));

    const { valid, errors } = validateAttributes(rawAttributes, parsedDefs);
    if (!valid) {
        return { valid: false, errors, data: [] };
    }

    const attributesWithValue: AttributeWithValue[] = rawAttributes
        .map((attr): AttributeWithValue | null => {
            const definition = defMap.get(attr.attrId);
            if (!definition) return null;
            // We know validation passed, so value is safe-ish, but ideally we cast strictly
            return {
                ...definition,
                value: attr.value as any,
            };
        })
        .filter((a): a is AttributeWithValue => a !== null);

    return { valid: true, errors: [], data: attributesWithValue };
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = CreateCardSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { storyId, cardTypeId, attributes, ...rest } = parsed.data;

        // Handle empty string imageUrl as null
        const imageUrl = rest.imageUrl === '' ? null : rest.imageUrl;

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        const validType = await prisma.cardType.findFirst({
            where: { id: cardTypeId, storyId },
            // Note: prisma schema has 'id' for CardType, not 'cardTypeId' as input field might imply if it was foreign reference only
            // but findFirst where id=cardTypeId is correct
        });
        if (!validType) {
            return NextResponse.json({ error: 'Invalid card type for this story' }, { status: 400 });
        }

        // Process attributes if present
        // Schema defines attributes as 'any', so we treat it as array of object here manually or rely on processAttributes handling it safely.
        // Ideally we'd validate the structure of attributes with Zod too before processing.
        const rawAttrs = Array.isArray(attributes) ? attributes : [];

        // Validate raw structure locally to ensure it matches what processAttributes expects
        const AttrInputSchema = z.array(z.object({ attrId: z.string(), value: z.unknown() }));
        const parsedAttrs = AttrInputSchema.safeParse(rawAttrs);

        if (!parsedAttrs.success) {
            return NextResponse.json({ error: 'Invalid attributes format' }, { status: 400 });
        }

        const attributeProcessingResult = await processAttributes(parsedAttrs.data, cardTypeId, storyId);
        if (!attributeProcessingResult.valid) {
            return NextResponse.json(
                { error: 'Invalid attributes', details: attributeProcessingResult.errors },
                { status: 400 }
            );
        }

        const card = await prisma.card.create({
            data: {
                ...rest,
                imageUrl: imageUrl ?? null,
                hidden: rest.hidden ?? false,
                version: 1,
                storyId,
                cardTypeId,
                // @ts-ignore: Prisma JSON types are tricky with generic objects
                attributes: attributeProcessingResult.data.length > 0
                    ? (attributeProcessingResult.data as any)
                    : Prisma.JsonNull,
            },
            include: { cardType: true },
        });

        if (card.tags.length > 0) {
            await updateStoryTags(storyId, [], card.tags);
        }

        return NextResponse.json(card, { status: 201 });
    } catch (error) {
        console.error('Cards POST error:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Zod validation error', details: error.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const storyId = searchParams.get('storyId');
        const hiddenFilter = searchParams.get('hidden');
        const id = searchParams.get('id');

        let targetStoryId = storyId;

        if (!targetStoryId && id) {
            const card = await prisma.card.findUnique({ where: { id }, select: { storyId: true } });
            if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
            targetStoryId = card.storyId;
        }

        if (!targetStoryId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        const permission = await checkStoryPermission(targetStoryId, session.user.id, CollaborationRole.View);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        const where: any = { storyId: targetStoryId };

        if (id) {
            where.id = id;
        }

        if (hiddenFilter === 'true') where.hidden = true;
        if (hiddenFilter === 'false') where.hidden = false;

        const cards = await prisma.card.findMany({
            where,
            include: { cardType: true },
            orderBy: { createdAt: 'desc' },
        });

        if (id && cards.length > 0) {
            return NextResponse.json(cards[0]);
        }

        // If ID requested but not found (filter vs findUnique)
        if (id && cards.length === 0) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        return NextResponse.json(cards);
    } catch (error) {
        console.error('Cards GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const id = body.id;
        if (!id) {
            return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
        }

        const parsed = UpdateCardSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        // ExtendedUpdateCardSchema: id, storyId, name?, description?, cardTypeId?, attributes?, tags?, imageUrl?, hidden?
        const { storyId, cardTypeId, attributes, ...rest } = parsed.data;

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        const existing = await prisma.card.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        // If card type changed, valid new type
        let targetCardTypeId = existing.cardTypeId;
        if (cardTypeId) {
            const validType = await prisma.cardType.findFirst({ where: { id: cardTypeId, storyId } });
            if (!validType) return NextResponse.json({ error: 'Invalid card type' }, { status: 400 });
            targetCardTypeId = cardTypeId;
        }

        // Attributes processing
        let processedAttributes = existing.attributes;
        if (attributes !== undefined) {
            const rawAttrs = Array.isArray(attributes) ? attributes : [];
            const AttrInputSchema = z.array(z.object({ attrId: z.string(), value: z.unknown() }));
            const parsedAttrs = AttrInputSchema.safeParse(rawAttrs);

            if (parsedAttrs.success) {
                const res = await processAttributes(parsedAttrs.data, targetCardTypeId, storyId);
                if (!res.valid) {
                    return NextResponse.json({ error: 'Invalid attributes', details: res.errors }, { status: 400 });
                }
                processedAttributes = res.data.length > 0 ? (res.data as any) : Prisma.JsonNull;
            }
        }

        // Handle empty string imageUrl as null explicitly if it was passed in update
        let imageUrl = rest.imageUrl;
        // If explicitly empty string literal
        if (imageUrl === '') imageUrl = null;

        // Update data construction using explicitly checked fields or undefined to skip update
        const updateData: Prisma.CardUpdateInput = {
            name: rest.name,
            description: rest.description,
            hidden: rest.hidden,
            tags: rest.tags,
            imageUrl: imageUrl, // if undefined, prisma ignores? No, it updates to null if explicit. We need to check if key existed in payload.
            // But parsed.data will have it as optional (undefined) if missing.
            cardType: cardTypeId ? { connect: { id: cardTypeId } } : undefined,
            attributes: processedAttributes as any,
        };

        // Clean up undefined values from updateData so we don't accidentally unset things or crash
        Object.keys(updateData).forEach(key => (updateData as any)[key] === undefined && delete (updateData as any)[key]);

        const updated = await prisma.card.update({
            where: { id },
            data: updateData,
            include: { cardType: true },
        });

        if (existing.tags.length > 0 || updated.tags.length > 0) {
            await updateStoryTags(storyId, existing.tags, updated.tags);
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Cards PUT error:', error);
        return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const card = await prisma.card.findUnique({ where: { id } });
        if (!card) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        const permission = await checkStoryPermission(card.storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        await prisma.card.delete({ where: { id } });

        if (card.tags.length > 0) {
            await updateStoryTags(card.storyId, card.tags, []);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Cards DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
    }
}
