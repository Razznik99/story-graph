import { z } from 'zod';
import { EVENT_RELATIONSHIP_TYPES, NOTE_RELATION_TYPES } from '../constants';

export const EventRelationshipTypeSchema = z.enum(EVENT_RELATIONSHIP_TYPES);

export const EventCardLinkSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    eventId: z.string().uuid(),
    cardId: z.string().uuid(),
    roleId: z.string().uuid().nullable(),
    createdAt: z.date(),
});

export const EventEventLinkSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    fromEventId: z.string().uuid(),
    toEventId: z.string().uuid(),
    relationshipType: EventRelationshipTypeSchema,
    createdAt: z.date(),
});

export const NoteNoteLinkSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    fromNoteId: z.string().uuid(),
    toNoteId: z.string().uuid(),
    relationType: z.enum(NOTE_RELATION_TYPES),
    createdAt: z.date(),
});
