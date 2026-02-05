import { z } from 'zod';
import {
    EVENT_INTENSITIES,
    EVENT_VISIBILITIES
} from '../constants';

export const EventIntensitySchema = z.enum(EVENT_INTENSITIES);
export const EventVisibilitySchema = z.enum(EVENT_VISIBILITIES);

export const EventTypeSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    name: z.string().min(1).max(50),
    description: z.string().max(2000).nullable(),
    createdAt: z.date(),
});

export const CreateEventTypeSchema = z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(2000).optional(),
    storyId: z.string().uuid(),
});

export const UpdateEventTypeSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(2000).optional().nullable(),
});

export const EventSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    title: z.string().min(1).max(100),
    description: z.string().max(2000).nullable(),
    eventTypeId: z.string().uuid(),
    intensity: EventIntensitySchema,
    visibility: EventVisibilitySchema,
    outcome: z.string().max(1000).nullable(),
    timelineId: z.string().uuid().nullable(),
    order: z.number().int(),
    tags: z.array(z.string()),
    linkedEventsTo: z.array(z.object({
        toEventId: z.string().uuid(),
        relationshipType: z.string() // Using string for enum to avoid import cycles, or use EventRelationshipType enum if available
    })).optional(),
    linkedEventsFrom: z.array(z.object({
        fromEventId: z.string().uuid(),
        relationshipType: z.string()
    })).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const CreateEventSchema = z.object({
    storyId: z.string().uuid(),
    title: z.string().min(1).max(100),
    eventTypeId: z.string().uuid(),
    description: z.string().max(2000).optional(),
    intensity: EventIntensitySchema.optional(),
    visibility: EventVisibilitySchema.optional(),
    outcome: z.string().max(1000).optional(),
    timelineId: z.string().uuid().optional(),
    order: z.number().int().optional(),
    tags: z.array(z.string()).optional(),
});

export const UpdateEventSchema = EventSchema.partial().omit({
    createdAt: true,
    updatedAt: true,
}).extend({
    id: z.string().uuid(),
});
