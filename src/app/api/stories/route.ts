
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CreateStorySchema } from '@/domain/schemas/story.schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions) as any;
    const { searchParams } = new URL(req.url);
    const variant = searchParams.get('variant') ?? 'public';
    if (variant !== 'my-stories' && variant !== 'public') {
        return new NextResponse('Invalid variant', { status: 400 });
    }

    const q = searchParams.get('q') || '';

    const medium = searchParams.getAll('medium');
    const status = searchParams.get('status');
    const language = searchParams.get('language');

    const genres = searchParams.getAll('genre');
    const rawGenreMode = searchParams.get('genreMode');
    const genreMode = rawGenreMode === 'and' ? 'and' : 'or';
    const excludeGenres = searchParams.getAll('excludeGenre');


    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        let userId = (session.user as any).id;

        // Robust lookup
        if (!userId && session.user.email) {
            const user = await prisma.user.findUnique({ where: { email: session.user.email } });
            userId = user?.id;
        } else if (userId) {
            // Verify user exists to ensure consistency with POST
            const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
            if (!userExists) {
                // Fallback to email if stale ID
                if (session.user.email) {
                    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
                    userId = user?.id;
                } else {
                    userId = null;
                }
            }
        }

        if (!userId && session.user.email) {
            // Last ditch attempt if logic fell through above
            const user = await prisma.user.findUnique({ where: { email: session.user.email } });
            userId = user?.id;
        }

        if (!userId) {
            return new NextResponse('User not found', { status: 401 });
        }

        // 1. UUID Lookup (ignore visibility/type, just find the story if authorized)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
        if (isUuid) {
            const story = await prisma.story.findUnique({
                where: { id: q },
                include: {
                    owner: { select: { id: true, name: true, image: true, email: true, username: true } },
                    collaborators: {
                        where: { userId },
                        select: { role: true }
                    },
                    _count: {
                        select: { collaborators: true }
                    }
                }
            });

            // Check access: Owner OR Collaborator OR Public
            if (story) {
                const isOwner = story.ownerId === userId;
                const isCollaborator = story.collaborators.length > 0;
                const isPublic = story.visibility === 'public';

                if (isOwner || isCollaborator || isPublic) {
                    return NextResponse.json([story]);
                }
            }
            return NextResponse.json([]);
        }

        let stories: any[] = [];

        if (variant === 'my-stories') {
            const ownedStories = await prisma.story.findMany({
                where: { ownerId: userId },
                include: {
                    owner: { select: { id: true, name: true, image: true, email: true, username: true } },
                    collaborators: {
                        where: { userId },
                        select: { role: true, accepted: true }
                    },
                    _count: {
                        select: { collaborators: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            // Fetch Collaborated Stories
            const collaborations = await prisma.collaboration.findMany({
                where: {
                    userId: userId,
                    accepted: true,
                },
                include: {
                    story: {
                        include: {
                            owner: { select: { id: true, name: true, image: true, email: true, username: true } },
                            collaborators: {
                                where: { userId },
                                select: { role: true, accepted: true }
                            },
                            _count: {
                                select: { collaborators: true }
                            }
                        }
                    }
                }
            });

            const collaboratedStories = collaborations.map(c => c.story);

            // Merge
            stories = [...ownedStories, ...collaboratedStories];

            // Client-side Sort: Owner -> Edit -> Comment -> View
            const roleWeight = (story: any) => {
                if (story.ownerId === userId) return 0;
                const collab = story.collaborators[0];
                if (!collab) return 4;
                switch (collab.role) {
                    case 'Edit': return 1;
                    case 'Comment': return 2;
                    case 'View': return 3;
                    default: return 4;
                }
            };
            stories.sort((a: any, b: any) => roleWeight(a) - roleWeight(b));

        } else {
            const andFilters: any[] = [
                { visibility: 'public' },
            ];

            // MEDIUM (OR implied)
            if (medium.length > 0) {
                andFilters.push({
                    medium: { in: medium },
                });
            }

            // STATUS
            if (status) {
                andFilters.push({ status });
            }

            // LANGUAGE
            if (language) {
                andFilters.push({ language });
            }

            // GENRES
            if (genres.length > 0) {
                if (genreMode === 'and') {
                    andFilters.push({
                        genres: { hasEvery: genres },
                    });
                } else {
                    andFilters.push({
                        genres: { hasSome: genres },
                    });
                }
            }

            // EXCLUDE GENRES (always NOT)
            if (excludeGenres.length > 0) {
                andFilters.push({
                    NOT: {
                        genres: { hasSome: excludeGenres },
                    },
                });
            }

            // SEARCH (intersects)
            if (q) {
                if (q.startsWith('#')) {
                    andFilters.push({
                        tags: { has: q.toLowerCase() },
                    });
                } else {
                    andFilters.push({
                        OR: [
                            { title: { contains: q, mode: 'insensitive' } },
                            { synopsis: { contains: q, mode: 'insensitive' } },
                        ],
                    });
                }
            }

            const whereClause = { AND: andFilters };
            stories = await prisma.story.findMany({
                where: whereClause,
                include: {
                    owner: { select: { id: true, name: true, image: true, username: true } },
                    collaborators: {
                        where: { userId },
                        select: { role: true, accepted: true },
                    },
                    _count: { select: { collaborators: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });

        }
        return NextResponse.json(stories);
    } catch (error) {
        console.error('[STORIES_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        let userId = (session.user as any).id;

        // Robust lookup: if ID missing or we want to be safe, check DB by email
        if (!userId && session.user.email) {
            const user = await prisma.user.findUnique({ where: { email: session.user.email } });
            userId = user?.id;
        } else if (userId) {
            // Verify user exists to avoid FK error
            const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
            if (!userExists) {
                // Fallback to email if stale ID
                if (session.user.email) {
                    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
                    userId = user?.id;
                } else {
                    userId = null;
                }
            }
        }

        if (!userId) {
            return new NextResponse('Unauthorized: User not found', { status: 401 });
        }

        const body = await req.json();
        const validatedData = CreateStorySchema.parse(body);

        const story = await prisma.$transaction(async (tx) => {
            // 1. Create Story
            const newStory = await tx.story.create({
                data: {
                    title: validatedData.title,
                    abbreviation: validatedData.abbreviation,
                    language: validatedData.language || 'English',
                    medium: validatedData.medium || 'Story',
                    genres: validatedData.genres || [],
                    status: validatedData.status || 'Draft',
                    visibility: validatedData.visibility || 'private',
                    synopsis: validatedData.synopsis,
                    coverUrl: validatedData.coverUrl,
                    tags: validatedData.tags || [],
                    ownerId: userId,
                } as any,
            });

            // 2. Create Default Card Types
            const cardTypeDefinitions = [
                { name: 'Character', description: 'An actor with agency. If it can make choices, it’s a Character.' },
                { name: 'Location', description: 'Any physical or conceptual place where events can occur.' },
                { name: 'Faction', description: 'A group with shared goals or identity.' },
                { name: 'Item', description: 'Any object that can be owned, used, or contested.' },
                { name: 'Species', description: 'A biological or metaphysical classification.' },
            ];

            const cardTypeMap = new Map<string, string>(); // Name -> UUID

            for (const def of cardTypeDefinitions) {
                // Initialize default layout
                const defaultLayout = {
                    items: [
                        { id: 'default-attributes', type: 'heading', text: 'Attributes', removable: false }
                    ]
                };

                const ct = await tx.cardType.create({
                    data: {
                        ...def,
                        storyId: newStory.id,
                        layout: defaultLayout,
                    },
                });
                cardTypeMap.set(def.name, ct.id);
            }

            // 3. Create Default Event Types
            const eventTypeDefinitions = [
                { name: 'Meeting', description: 'Information exchange, negotiation, or decision-making moment.' },
                { name: 'Battle', description: 'Armed conflict with clear opposing sides and consequences.' },
                { name: 'Discovery', description: 'Revelation of hidden information, object, or truth.' },
                { name: 'Betrayal', description: 'A trust violation that alters relationships.' },
                { name: 'Journey', description: 'Movement from one location to another with narrative weight.' },
                { name: 'Death', description: 'Permanent removal or transformation of a character/card.' },
                { name: 'Transformation', description: 'Change of state, power, or identity.' },
            ];

            await tx.eventType.createMany({
                data: eventTypeDefinitions.map(def => ({ ...def, storyId: newStory.id })),
            });

            // 4. Create Default Attributes
            const attributeDefinitions = [
                // Character
                { name: 'Age', type: 'Character', attrType: 'UnitNumber', description: 'Biological or apparent age.', config: { unit: 'Years' } },
                { name: 'Archetype', type: 'Character', attrType: 'Option', description: 'Narrative function, not personality.', config: { options: ['Protagonist', 'Antagonist', 'Ally', 'Mentor', 'Neutral'] } },
                { name: 'Affiliation', type: 'Character', attrType: 'MultiLink', description: 'Group, faction, or organization the character belongs to.', targetType: 'Faction' },
                { name: 'Species', type: 'Character', attrType: 'Link', description: 'Biological or supernatural classification.', targetType: 'Species' },
                { name: 'Status', type: 'Character', attrType: 'Option', description: 'Current narrative state.', config: { options: ['Alive', 'Missing', 'Dead', 'Unknown'] } },
                { name: 'Gender', type: 'Character', attrType: 'Option', description: 'Character sexuality', config: { options: ['Male', 'Female', 'Other', 'Unknown'] } },

                // Location
                { name: 'Location Type', type: 'Location', attrType: 'Option', description: 'Scale and nature of the place.', config: { options: ['City', 'Building', 'Region', 'Realm', 'Planet', 'Abstract'] } },
                { name: 'Parent Location', type: 'Location', attrType: 'Link', description: 'Enables containment hierarchies.', targetType: 'Location' },

                // Faction
                { name: 'Faction Type', type: 'Faction', attrType: 'Option', description: 'Scale and nature of the Faction.', config: { options: ['Organization', 'Clan', 'Empire', 'Cult', 'Guild', 'Informal Group'] } },
                { name: 'Alignment', type: 'Faction', attrType: 'Option', description: 'Narrative alignment, not morality sermon.', config: { options: ['Good', 'Neutral', 'Evil', 'Unknown'] } },
                { name: 'Leader', type: 'Faction', attrType: 'Link', description: 'Primary authority figure.', targetType: 'Character' },

                // Item
                { name: 'Item Type', type: 'Item', attrType: 'Option', description: 'Nature and form of the Item.', config: { options: ['Weapon', 'Artifact', 'Tool', 'Currency', 'Document', 'Relic'] } },
                { name: 'Owner', type: 'Item', attrType: 'Link', description: 'Current holder.', targetType: 'Character' },
                { name: 'Rarity', type: 'Item', attrType: 'Option', description: 'Approximate value and uniqueness of the Item.', config: { options: ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'] } },

                // Species
                { name: 'Lifespan', type: 'Species', attrType: 'UnitNumber', description: 'Average lifespan in years.', config: { unit: 'Years' } },
            ];

            const characterAttrIds: Record<string, string> = {};
            const locationAttrIds: Record<string, string> = {};
            const factionAttrIds: Record<string, string> = {};
            const itemAttrIds: Record<string, string> = {};
            const speciesAttrIds: Record<string, string> = {};

            for (const attr of attributeDefinitions) {
                const cardTypeId = cardTypeMap.get(attr.type);
                if (!cardTypeId) continue;

                let config: any = attr.config || {};
                // Resolve targetType reference to actual UUID
                if ((attr as any).targetType) {
                    const targetId = cardTypeMap.get((attr as any).targetType);
                    if (targetId) {
                        config = { ...config, allowedCardTypeIds: [targetId] };
                    }
                }

                const createdAttr = await tx.attributeDefinition.create({
                    data: {
                        name: attr.name,
                        description: attr.description,
                        attrType: attr.attrType as any,
                        config,
                        cardTypeId,
                        storyId: newStory.id,
                    },
                });

                if (attr.type === 'Character') {
                    characterAttrIds[attr.name] = createdAttr.id;
                }
                if (attr.type === 'Location') {
                    locationAttrIds[attr.name] = createdAttr.id;
                }
                if (attr.type === 'Faction') {
                    factionAttrIds[attr.name] = createdAttr.id;
                }
                if (attr.type === 'Item') {
                    itemAttrIds[attr.name] = createdAttr.id;
                }
                if (attr.type === 'Species') {
                    speciesAttrIds[attr.name] = createdAttr.id;
                }
            }

            // 5. Update Layout with Default Attributes
            const typeConfigs = [
                {
                    type: 'Character',
                    ids: characterAttrIds,
                    order: ['Age', 'Archetype', 'Affiliation', 'Species', 'Status', 'Gender']
                },
                {
                    type: 'Location',
                    ids: locationAttrIds,
                    order: ['Location Type', 'Parent Location']
                },
                {
                    type: 'Faction',
                    ids: factionAttrIds,
                    order: ['Faction Type', 'Alignment', 'Leader']
                },
                {
                    type: 'Item',
                    ids: itemAttrIds,
                    order: ['Item Type', 'Owner', 'Rarity']
                },
                {
                    type: 'Species',
                    ids: speciesAttrIds,
                    order: ['Lifespan']
                }
            ];

            for (const config of typeConfigs) {
                const typeId = cardTypeMap.get(config.type);
                if (typeId) {
                    const layoutItems: any[] = [
                        {
                            id: "default-attributes",
                            text: "Attributes",
                            type: "heading",
                            removable: false
                        }
                    ];

                    for (const name of config.order) {
                        if (config.ids[name]) {
                            layoutItems.push({
                                id: config.ids[name],
                                type: "attribute"
                            });
                        }
                    }

                    await tx.cardType.update({
                        where: { id: typeId },
                        data: { layout: { items: layoutItems } }
                    });
                }
            }


            // 6. Create Default Timeline Config & Root Node
            await tx.timelineConfig.create({
                data: {
                    storyId: newStory.id,
                    timelineType: 'single',
                    level1Name: 'Story',
                    level5Name: 'Chapter',
                    confirmed: true,
                }
            });

            await tx.timeline.create({
                data: {
                    storyId: newStory.id,
                    title: '',
                    name: 'Story', // Root node name
                    level: 1,
                    position: [0, 0, 0, 0, 0],
                }
            });

            return newStory;
        });

        // Tag management - simplified without external utility if not present
        if (validatedData.tags && validatedData.tags.length > 0) {
            // Basic increment logic
            for (const tag of validatedData.tags) {
                // Story-specific tags
                await prisma.tag.upsert({
                    where: { storyId_name: { name: tag, storyId: story.id } },
                    create: { name: tag, storyId: story.id, usageCount: 1 },
                    update: { usageCount: { increment: 1 } }
                }).catch(e => console.error("Tag update failed", e));

                // Global tags
                await prisma.globalTag.upsert({
                    where: { name: tag },
                    create: { name: tag, usageCount: 1 },
                    update: { usageCount: { increment: 1 } }
                }).catch(e => console.error("Global Tag update failed", e));
            }
        }

        return NextResponse.json(story, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 422 });
        }
        console.error('[STORIES_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
