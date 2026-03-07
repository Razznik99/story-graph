import { prisma } from "@/lib/prisma";
import {
    createCardSchema,
    createCardTypeSchema,
    createCardRoleSchema,
    createEventSchema,
    createEventTypeSchema,
    createAttributeSchema,
    createNoteSchema,
    createStorySchema
} from "./response-schema";

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
            properties: {}
        }
    },
    {
        name: "getTimelineEvents",
        description: "Retrieve all events for a specific timeline via branches and leaves",
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
    },
    {
        name: "propose_create_card",
        description: "Propose creating a new card (character, location, etc.). You must use this instead of outputting JSON when trying to create something.",
        parameters: createCardSchema
    },
    {
        name: "propose_create_card_type",
        description: "Propose creating a new card type.",
        parameters: createCardTypeSchema
    },
    {
        name: "propose_create_card_role",
        description: "Propose creating a new card role.",
        parameters: createCardRoleSchema
    },
    {
        name: "propose_create_event",
        description: "Propose creating a new event.",
        parameters: createEventSchema
    },
    {
        name: "propose_create_event_type",
        description: "Propose creating a new event type.",
        parameters: createEventTypeSchema
    },
    {
        name: "propose_create_attribute",
        description: "Propose creating a new attribute definition for a card type.",
        parameters: createAttributeSchema
    },
    {
        name: "propose_create_note",
        description: "Propose creating a new note.",
        parameters: createNoteSchema
    },
    {
        name: "getStory",
        description: "Retrieve details of the current story.",
        parameters: { type: "object", properties: {} }
    },
    {
        name: "propose_create_story",
        description: "Propose editing or setting up the story details.",
        parameters: createStorySchema
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
            case "getStory":
                return await prisma.story.findUnique({
                    where: { id: storyId }
                });

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
                    select: { id: true, name: true },
                    orderBy: { createdAt: 'asc' }
                });

            case "getEvents":
                return await prisma.event.findMany({
                    where: { storyId },
                    select: { id: true, title: true, eventTypeId: true, intensity: true },
                    orderBy: { createdAt: 'asc' },
                    take: 100
                });

            case "getTimelineEvents":
                if (!args.timelineId) return { error: "timelineId is required" };
                return await prisma.timeline.findUnique({
                    where: { id: args.timelineId },
                    include: {
                        branches: { include: { leaves: { include: { nodes: { include: { event: true } } } } } }
                    }
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
                    include: { eventType: true, linkedCards: { include: { card: true, role: true } } }
                });
            case "getStoryGraphSummary":
                return {
                    cardTypes: await prisma.cardType.count({ where: { storyId } }),
                    cards: await prisma.card.count({ where: { storyId } }),
                    timelines: await prisma.timeline.count({ where: { storyId } }),
                    events: await prisma.event.count({ where: { storyId } })
                };

            default:
                if (name.startsWith("propose_create_")) {
                    return { success: true, message: `Proposal sent to user for review.` };
                }
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error: any) {
        console.error(`Error executing tool ${name}:`, error);
        return { error: `Tool execution failed: ${error.message}` };
    }
}
