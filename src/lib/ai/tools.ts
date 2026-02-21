import { prisma } from "@/lib/prisma";

export const tools = [
    {
        name: "getCardTypes",
        description: "Retrieve all available card types",
        parameters: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "getAttributes",
        description: "Retrieve attributes, optionally filtered by cardTypeId",
        parameters: {
            type: "object",
            properties: {
                cardTypeId: {
                    type: "string",
                    description: "Optional card type ID"
                }
            }
        }
    },
    {
        name: "getCards",
        description: "Retrieve cards",
        parameters: {
            type: "object",
            properties: {
                cardTypeId: { type: "string" },
                search: { type: "string" }
            }
        }
    },
    {
        name: "getEventTypes",
        description: "Retrieve event types",
        parameters: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "getCardRoles",
        description: "Retrieve card roles",
        parameters: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "getTimelines",
        description: "Retrieve timelines",
        parameters: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "getEvents",
        description: "Retrieve events",
        parameters: {
            type: "object",
            properties: {
                timelineId: { type: "string" }
            }
        }
    },
    {
        name: "getTimelineEvents",
        description: "Retrieve all events for a specific timeline",
        parameters: {
            type: "object",
            properties: {
                timelineId: { type: "string", description: "The ID of the timeline" }
            },
            required: ["timelineId"]
        }
    },
    {
        name: "getCard",
        description: "Retrieve a specific card by ID",
        parameters: {
            type: "object",
            properties: {
                cardId: { type: "string" }
            },
            required: ["cardId"]
        }
    },
    {
        name: "getEvent",
        description: "Retrieve a specific event by ID",
        parameters: {
            type: "object",
            properties: {
                eventId: { type: "string" }
            },
            required: ["eventId"]
        }
    },
    {
        name: "getStoryGraphSummary",
        description: "Retrieve high-level story graph summary",
        parameters: {
            type: "object",
            properties: {}
        }
    }
];

export async function runTool(name: string, args: any, context?: any): Promise<any> {
    const storyId = context?.storyId;

    if (!storyId) {
        return { error: "Context missing storyId. Cannot execute tool." };
    }

    console.log(`Executing tool: ${name} with args:`, args);

    try {
        switch (name) {
            case "getCardTypes":
                return await prisma.cardType.findMany({
                    where: { storyId },
                    select: { id: true, name: true, description: true }
                });

            case "getAttributes":
                return await prisma.attributeDefinition.findMany({
                    where: {
                        storyId,
                        ...(args.cardTypeId ? { cardTypeId: args.cardTypeId } : {})
                    },
                    select: { id: true, name: true, attrType: true, cardTypeId: true }
                });

            case "getCards":
                const cardWhere: any = { storyId };
                if (args.cardTypeId) cardWhere.cardTypeId = args.cardTypeId;
                if (args.search) cardWhere.name = { contains: args.search, mode: 'insensitive' };

                return await prisma.card.findMany({
                    where: cardWhere,
                    select: { id: true, name: true, cardTypeId: true, tags: true },
                    take: 50
                });

            case "getEventTypes":
                return await prisma.eventType.findMany({
                    where: { storyId },
                    select: { id: true, name: true }
                });

            case "getCardRoles":
                return await prisma.cardRole.findMany({
                    where: { storyId },
                    select: { id: true, name: true, description: true }
                });

            case "getTimelines":
                return await prisma.timeline.findMany({
                    where: { storyId },
                    select: { id: true, name: true, title: true, level: true, parentId: true },
                    orderBy: { level: 'asc' }
                });

            case "getEvents":
                const eventWhere: any = { storyId };
                if (args.timelineId) eventWhere.timelineId = args.timelineId;

                return await prisma.event.findMany({
                    where: eventWhere,
                    select: { id: true, title: true, eventTypeId: true, timelineId: true, order: true },
                    orderBy: { order: 'asc' },
                    take: 100
                });

            case "getTimelineEvents":
                if (!args.timelineId) return { error: "timelineId is required" };
                return await prisma.event.findMany({
                    where: { storyId, timelineId: args.timelineId },
                    select: { id: true, title: true, eventTypeId: true, order: true },
                    orderBy: { order: 'asc' }
                });

            case "getCard":
                if (!args.cardId) return { error: "cardId is required" };
                return await prisma.card.findFirst({
                    where: { id: args.cardId, storyId },
                    include: { cardType: true, identity: true }
                });

            case "getEvent":
                if (!args.eventId) return { error: "eventId is required" };
                return await prisma.event.findFirst({
                    where: { id: args.eventId, storyId },
                    include: { eventType: true, timeline: true, linkedCards: { include: { card: true, role: true } } }
                });
            case "getStoryGraphSummary":
                return {
                    cardTypes: await prisma.cardType.count({ where: { storyId } }),
                    cards: await prisma.card.count({ where: { storyId } }),
                    timelines: await prisma.timeline.count({ where: { storyId } }),
                    events: await prisma.event.count({ where: { storyId } })
                };

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error: any) {
        console.error(`Error executing tool ${name}:`, error);
        return { error: `Tool execution failed: ${error.message}` };
    }
}
