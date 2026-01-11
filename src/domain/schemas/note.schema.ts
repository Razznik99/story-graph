import { z } from 'zod';
import { NOTE_RELATION_TYPES } from '../constants';

export const NoteRelationTypeSchema = z.enum(NOTE_RELATION_TYPES);

export const NoteSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    title: z.string().min(1).max(200),
    content: z.string(), // markdown
    tags: z.array(z.string()),
    timelineId: z.string().uuid().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const CreateNoteSchema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().optional().default(""),
    tags: z.array(z.string()).optional(),
    timelineId: z.string().uuid().optional(),
});

export const UpdateNoteSchema = NoteSchema.partial().omit({
    id: true,
    storyId: true,
    createdAt: true,
    updatedAt: true,
});
