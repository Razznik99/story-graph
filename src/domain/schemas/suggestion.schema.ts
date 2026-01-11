import { z } from 'zod';
import { SUGGESTION_ACTIONS, SUGGESTION_TARGETS } from '../constants';

export const SuggestionActionSchema = z.enum(SUGGESTION_ACTIONS);
export const SuggestionTargetSchema = z.enum(SUGGESTION_TARGETS);

export const SuggestionSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    userId: z.string().uuid(),
    targetType: SuggestionTargetSchema,
    targetId: z.string().nullable(),
    action: SuggestionActionSchema,
    message: z.string().nullable(),
    payload: z.any(), // Json
    accepted: z.boolean(),
    rejected: z.boolean(),
    reviewedAt: z.date().nullable(),
    createdAt: z.date(),
});

export const CreateSuggestionSchema = z.object({
    storyId: z.string().uuid(),
    targetType: SuggestionTargetSchema,
    targetId: z.string().optional(),
    action: SuggestionActionSchema,
    message: z.string().optional(),
    payload: z.any(),
});
