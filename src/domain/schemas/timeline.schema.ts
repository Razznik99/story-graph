import { z } from 'zod';

export const TimelineSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    name: z.string().default("Timeline"),
    branch1Name: z.string().default("Branch"),
    branch2Name: z.string().nullable().optional(),
    branch3Name: z.string().nullable().optional(),
    leafName: z.string().default("Leaf"),
    branch2Persist: z.boolean().default(false),
    branch3Persist: z.boolean().default(false),
    leafPersist: z.boolean().default(false),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const TimelineInputSchema = z.object({
    storyId: z.string().uuid(),
    name: z.string().default(""),
    branch1Name: z.string().default("Branch"),
    branch2Name: z.string().nullable().optional(),
    branch3Name: z.string().nullable().optional(),
    leafName: z.string().default("Leaf"),
    branch2Persist: z.boolean().default(false),
    branch3Persist: z.boolean().default(false),
    leafPersist: z.boolean().default(false),
});

export const BranchSchema = z.object({
    id: z.string().uuid(),
    timelineId: z.string().uuid(),
    parentBranchId: z.string().uuid().nullable(),
    name: z.string().default(""),
    title: z.string().nullable(),
    level: z.number().int().default(1),
    orderKey: z.string().or(z.number()),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const LeafSchema = z.object({
    id: z.string().uuid(),
    branchId: z.string().uuid(),
    name: z.string().default(""),
    title: z.string().nullable(),
    orderKey: z.string().or(z.number()),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const TimelineNodeSchema = z.object({
    id: z.string().uuid(),
    leafId: z.string().uuid(),
    eventId: z.string().uuid().nullable(),
    type: z.enum(['START', 'END', 'EVENT', 'CONNECTOR']),
    isLocked: z.boolean().default(false).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const TimelineEdgeSchema = z.object({
    id: z.string().uuid(),
    fromNodeId: z.string().uuid(),
    toNodeId: z.string().uuid(),
    type: z.enum(['CHRONOLOGICAL', 'RELATIONSHIP']),
    createdAt: z.date(),
    updatedAt: z.date(),
});
