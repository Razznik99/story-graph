import { z } from 'zod';

export const TagSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    name: z.string().min(1).max(50),
    usageCount: z.number().int(),
});

export const GlobalTagSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    usageCount: z.number().int(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
