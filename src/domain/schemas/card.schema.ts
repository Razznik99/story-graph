import { z } from 'zod';

export const CardTypeSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    name: z.string().min(1).max(50),
    description: z.string().max(2000).nullable(),
    layout: z.any(), // Json
    createdAt: z.date(),
});

export const AttributeDefinitionSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    cardTypeId: z.string().uuid(),
    name: z.string().min(1).max(50),
    description: z.string().max(2000).nullable(),
    attrType: z.string(),
    config: z.any().nullable(), // Json
    createdAt: z.date(),
});

export const CardSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    name: z.string().min(1).max(100),
    cardTypeId: z.string().uuid(),
    description: z.string().max(2000).nullable(),
    attributes: z.any().nullable(), // Json
    tags: z.array(z.string()),
    imageUrl: z.string().url().nullable(),
    version: z.number().int(),
    hidden: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const CreateCardSchema = z.object({
    name: z.string().min(1).max(100),
    cardTypeId: z.string().uuid(),
    description: z.string().max(2000).optional(),
    attributes: z.any().optional(),
    tags: z.array(z.string()).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
});

export const CardRoleSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    name: z.string().min(1).max(50),
    description: z.string().max(200).nullable(),
    cardTypeId: z.string().uuid().nullable(),
    createdAt: z.date(),
});

export const CreateCardRoleSchema = z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(200).optional(),
    cardTypeId: z.string().uuid().optional(),
});

export const UpdateCardSchema = CardSchema.partial().omit({
    id: true,
    storyId: true,
    createdAt: true,
    updatedAt: true,
});
