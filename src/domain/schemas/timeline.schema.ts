import { z } from 'zod';

export const TimelineConfigSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    timelineType: z.string().default("single"),
    level1Name: z.string().default("Book"),
    level2Name: z.string().nullable(),
    level3Name: z.string().nullable(),
    level3Persist: z.boolean().default(false),
    level4Name: z.string().nullable(),
    level4Persist: z.boolean().default(false),
    level5Name: z.string().default("Chapter"),
    level5Persist: z.boolean().default(false),
    confirmed: z.boolean().default(false),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const TimelineSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    parentId: z.string().uuid().nullable(),
    position: z.array(z.number().int()),
    name: z.string().default(""),
    title: z.string().nullable(),
    level: z.number().int(),
    pathId: z.string().uuid().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const TimelinePathSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    createdAt: z.date(),
});
