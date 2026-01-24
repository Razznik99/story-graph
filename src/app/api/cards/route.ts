import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateAttributes } from '@/lib/cards/validateAttributes'
import { z } from 'zod'
import { CreateCardSchema, UpdateCardSchema, AttributeDefinitionSchema as ADS } from '@/domain/schemas/card.schema'
import { prisma } from '@/lib/prisma'
import { checkStoryPermission } from '@/lib/permissions'
import { CollaborationRole } from '@/domain/roles'
import { updateStoryTags } from '@/lib/tagUtils'

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

async function processAttributes(
    rawAttributes: { attrId: string; value: unknown }[] | null,
    cardTypeId: string,
    storyId: string
) {
    if (!rawAttributes || rawAttributes.length === 0) {
        return { valid: true, errors: [], data: [] }
    }

    const definitions = await prisma.attributeDefinition.findMany({
        where: { cardTypeId, storyId },
    })

    const parsedDefs = z.array(ADS).parse(definitions)
    const defMap = new Map(parsedDefs.map(d => [d.id, d]))

    const { valid, errors } = validateAttributes(rawAttributes, parsedDefs)
    if (!valid) return { valid: false, errors, data: [] }

    const data = rawAttributes
        .map(attr => {
            const def = defMap.get(attr.attrId)
            if (!def) return null
            return {
                id: def.id,
                name: def.name,
                attrType: def.attrType,
                config: def.config,
                value: attr.value,
            }
        })
        .filter(Boolean)

    return { valid: true, errors: [], data }
}

async function deriveVersions<T extends { orderKey: Prisma.Decimal }>(cards: T[]) {
    if (cards.length === 0) return cards;

    return [...cards]
        .sort((a, b) => a.orderKey.comparedTo(b.orderKey))
        .map((c, i) => ({ ...c, version: i + 1 }))
}


/* -------------------------------------------------------------------------- */
/*                                   POST                                     */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const parsed = CreateCardSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
        }

        const { storyId, cardTypeId, attributes, identityId, sourceCardId, ...rest } = parsed.data

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.Edit)
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 })
        }

        const validType = await prisma.cardType.findFirst({ where: { id: cardTypeId, storyId } })
        if (!validType) {
            return NextResponse.json({ error: 'Invalid card type for this story' }, { status: 400 })
        }

        const attrRes = await processAttributes(Array.isArray(attributes) ? attributes : [], cardTypeId, storyId)
        if (!attrRes.valid) {
            return NextResponse.json({ error: 'Invalid attributes', details: attrRes.errors }, { status: 400 })
        }

        const finalAttributes =
            attrRes.data.length > 0 ? (attrRes.data as any) : Prisma.JsonNull

        return await prisma.$transaction(async tx => {
            let finalIdentityId = identityId
            let orderKey = new Prisma.Decimal(1000)

            /* --------------------------- Identity Handling -------------------------- */

            if (!finalIdentityId) {
                const identity = await tx.identity.create({
                    data: { storyId, cardTypeId },
                })
                finalIdentityId = identity.id
            }

            /* --------------------------- OrderKey Logic ----------------------------- */

            if (sourceCardId) {
                const source = await tx.card.findUnique({
                    where: { id: sourceCardId },
                    select: { identityId: true, orderKey: true },
                })

                if (!source || source.identityId !== finalIdentityId) {
                    throw new Error('Invalid sourceCardId for identity')
                }

                const next = await tx.card.findFirst({
                    where: {
                        identityId: finalIdentityId,
                        orderKey: { gt: source.orderKey },
                    },
                    orderBy: { orderKey: 'asc' },
                    select: { orderKey: true },
                })

                orderKey = next
                    ? source.orderKey.add(next.orderKey).div(2)
                    : source.orderKey.add(1000)
            } else {
                const last = await tx.card.findFirst({
                    where: { identityId: finalIdentityId },
                    orderBy: { orderKey: 'desc' },
                    select: { orderKey: true },
                })
                if (last) orderKey = last.orderKey.add(1000)
            }

            /* ----------------------------- Hide Others ------------------------------ */

            if (!rest.hidden) {
                await tx.card.updateMany({
                    where: { identityId: finalIdentityId },
                    data: { hidden: true },
                })
            }

            /* ------------------------------ Create Card ----------------------------- */

            const card = await tx.card.create({
                data: {
                    name: rest.name,
                    description: rest.description ?? null,
                    tags: rest.tags ?? [],
                    imageUrl: rest.imageUrl === '' ? null : (rest.imageUrl ?? null),
                    hidden: rest.hidden ?? false,
                    orderKey,
                    storyId,
                    cardTypeId,
                    identityId: finalIdentityId,
                    attributes: finalAttributes,
                },
                include: { cardType: true, identity: true },
            })

            if (card.tags.length > 0) {
                await updateStoryTags(storyId, [], card.tags)
            }

            return NextResponse.json(card, { status: 201 })
        })
    } catch (err) {
        console.error('Cards POST error:', err)
        return NextResponse.json({ error: 'Failed to create card' }, { status: 500 })
    }
}

/* -------------------------------------------------------------------------- */
/*                                    GET                                     */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const storyId = searchParams.get('storyId')
        const identityId = searchParams.get('identityId')
        const id = searchParams.get('id')
        const hidden = searchParams.get('hidden')

        let targetStoryId = storyId

        if (!targetStoryId && identityId) {
            const identity = await prisma.identity.findUnique({
                where: { id: identityId },
                select: { storyId: true },
            })
            if (!identity) {
                return NextResponse.json({ error: 'Identity not found' }, { status: 404 })
            }
            targetStoryId = identity.storyId
        }

        if (!targetStoryId) {
            return NextResponse.json({ error: 'storyId required' }, { status: 400 })
        }

        const permission = await checkStoryPermission(
            targetStoryId,
            session.user.id,
            CollaborationRole.View
        )

        if (!permission.authorized) {
            return NextResponse.json(
                { error: permission.error },
                { status: permission.status || 403 }
            )
        }

        const where: any = { storyId: targetStoryId }
        if (id) where.id = id
        if (identityId) where.identityId = identityId
        if (hidden === 'true') where.hidden = true
        if (hidden === 'false') where.hidden = false

        const cards = await prisma.card.findMany(
            {
                where,
                include: { cardType: true },
                orderBy: { orderKey: 'asc' },
            }
        )

        if (id && cards.length > 0) {
            return NextResponse.json(cards[0]);
        }

        if (id && cards.length === 0) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 })
        }

        return NextResponse.json(cards)
    } catch (err) {
        console.error('Cards GET error:', err)
        return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
    }
}


/* -------------------------------------------------------------------------- */
/*                                    PUT                                     */
/* -------------------------------------------------------------------------- */

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const parsed = UpdateCardSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
        }

        const { id, storyId, attributes, ...rest } = parsed.data

        const existing = await prisma.card.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 })
        }

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.Edit)
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 })
        }

        let processedAttributes = existing.attributes
        if (attributes !== undefined) {
            const res = await processAttributes(attributes, existing.cardTypeId, storyId)
            if (!res.valid) {
                return NextResponse.json({ error: 'Invalid attributes', details: res.errors }, { status: 400 })
            }
            processedAttributes = res.data.length > 0 ? (res.data as any) : Prisma.JsonNull
        }

        if (rest.hidden === false && existing.hidden === true) {
            await prisma.card.updateMany({
                where: { identityId: existing.identityId, id: { not: id } },
                data: { hidden: true },
            })
        }

        const updated = await prisma.card.update({
            where: { id },
            data: {
                ...(rest as any),
                imageUrl: rest.imageUrl === '' ? null : rest.imageUrl,
                attributes: processedAttributes as any,
            },
            include: { cardType: true },
        })

        return NextResponse.json(updated)
    } catch (err) {
        console.error('Cards PUT error:', err)
        return NextResponse.json({ error: 'Failed to update card' }, { status: 500 })
    }
}

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const mode = searchParams.get('mode') || 'version'

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const card = await prisma.card.findUnique({ where: { id } })
        if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

        const permission = await checkStoryPermission(card.storyId, session.user.id, CollaborationRole.Edit)
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 })
        }

        if (mode === 'identity') {
            await prisma.identity.delete({ where: { id: card.identityId } })
        } else {
            await prisma.card.delete({ where: { id } })

            const remaining = await prisma.card.count({ where: { identityId: card.identityId } })
            if (remaining > 0 && !card.hidden) {
                const promote = await prisma.card.findFirst({
                    where: { identityId: card.identityId },
                    orderBy: { orderKey: 'desc' },
                })
                if (promote) {
                    await prisma.card.update({
                        where: { id: promote.id },
                        data: { hidden: false },
                    })
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Cards DELETE error:', err)
        return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 })
    }
}
