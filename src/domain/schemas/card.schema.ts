import { z } from 'zod';

const LayoutItemSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['heading', 'attribute']),
    text: z.string().optional(),
    removable: z.boolean().optional(),
});

const LayoutSchema = z.object({
    items: z.array(LayoutItemSchema).refine((items) => {
        const attributesHeaderIndex = items.findIndex(item => item.type === 'heading' && item.text === 'Attributes' && item.removable === false);
        if (attributesHeaderIndex === -1) return false;

        // Ensure no heading exists after the Attributes heading
        const hasHeadingAfter = items.slice(attributesHeaderIndex + 1).some(item => item.type === 'heading');
        return !hasHeadingAfter;
    }, { message: "The 'Attributes' heading must be the last heading in the layout." })
});

export const CardTypeSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    name: z.string().min(1).max(50),
    description: z.string().max(2000).nullable(),
    layout: LayoutSchema,
    createdAt: z.date(),
});

export const CreateCardTypeSchema = z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(2000).optional(),
});

export const UpdateCardTypeSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(2000).optional(),
    layout: LayoutSchema.optional(),
});

export const AttributeDefinitionSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    cardTypeId: z.string().uuid(),
    name: z.string().min(1).max(50),
    description: z.string().max(2000).nullable(),
    attrType: z.enum(['Text', 'Number', 'UnitNumber', 'Option', 'MultiOption', 'Link', 'MultiLink']),
    config: z.record(z.string(), z.any()).nullable(),
    createdAt: z.date(),
});

export const CreateAttributeSchema = z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(2000).optional(),
    cardTypeId: z.string().uuid(),
    attrType: z.enum(['Text', 'Number', 'UnitNumber', 'Option', 'MultiOption', 'Link', 'MultiLink']),
    config: z.record(z.string(), z.any()).nullable(),
});

export const UpdateAttributeSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(2000).optional(),
    attrType: z.enum(['Text', 'Number', 'UnitNumber', 'Option', 'MultiOption', 'Link', 'MultiLink']).optional(),
    config: z.record(z.string(), z.any()).nullable(),
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

export const UpdateCardRoleSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(200).optional(),
    cardTypeId: z.string().uuid().optional().nullable(),
});

export const UpdateCardSchema = CardSchema.partial().omit({
    id: true,
    storyId: true,
    createdAt: true,
    updatedAt: true,
});
