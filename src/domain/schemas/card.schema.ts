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

export const AttributeWithValueSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    attrType: z.enum([
        'Text',
        'Number',
        'UnitNumber',
        'Option',
        'MultiOption',
        'Link',
        'MultiLink',
    ]),
    value: z.any(),
    config: z.record(z.string(), z.any()).nullable(),
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
    identityId: z.string().uuid(),
    storyId: z.string().uuid(),
    name: z.string().min(1).max(100),
    cardTypeId: z.string().uuid(),
    description: z.string().max(2000).nullable(),
    attributes: z.array(AttributeWithValueSchema).nullable(),
    tags: z.array(z.string()),
    imageUrl: z.string().url().nullable(),
    orderKey: z.any(), // Decimal from Prisma
    hidden: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const CreateCardSchema = z.object({
    storyId: z.string().uuid(),
    identityId: z.string().uuid().optional(), // If provided, creates a new version for this identity
    name: z.string().min(1).max(100),
    cardTypeId: z.string().uuid(),
    description: z.string().max(2000).optional(),
    attributes: z.any().optional(), // specific validation handled in API
    tags: z.array(z.string()).optional(),
    imageUrl: z.string().url().nullable().optional().or(z.literal('')),
    hidden: z.boolean().optional(),
    sourceCardId: z.string().uuid().optional(), // For deriving version order
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
    createdAt: true,
    updatedAt: true,
}).extend({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    attributes: z.any().optional(),
});
