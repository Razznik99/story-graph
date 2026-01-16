import { z } from 'zod';
import {
    STORY_STATUSES,
    STORY_VISIBILITIES,
    STORY_MEDIUM,
    STORY_GENRES,
    LANGUAGES
} from '../constants';

export const StoryStatusSchema = z.enum(STORY_STATUSES);
export const StoryVisibilitySchema = z.enum(STORY_VISIBILITIES);
export const StoryMediumSchema = z.enum(STORY_MEDIUM);
export const StoryGenreSchema = z.enum(STORY_GENRES);
export const languages = z.enum(LANGUAGES)

export const StorySchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(100),
    abbreviation: z.string().min(1).max(10),
    language: languages,
    medium: StoryMediumSchema,
    genres: z.array(StoryGenreSchema),
    synopsis: z.string().max(2000).nullable(),
    tags: z.array(z.string()),
    status: StoryStatusSchema,
    visibility: StoryVisibilitySchema,
    coverUrl: z.string().url().nullable(),
    ownerId: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const CreateStorySchema = z.object({
    title: z.string().min(1).max(100),
    abbreviation: z.string().min(1).max(10),
    language: languages.optional(),
    medium: StoryMediumSchema.optional(),
    genres: z.array(StoryGenreSchema).optional(),
    status: StoryStatusSchema.optional(),
    synopsis: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional(),
    visibility: StoryVisibilitySchema.optional(),
    coverUrl: z.string().url().optional().or(z.literal('')),
});

export const UpdateStorySchema = StorySchema.partial().omit({
    id: true,
    ownerId: true,
    createdAt: true,
    updatedAt: true,
});
