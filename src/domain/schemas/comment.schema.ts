import { z } from 'zod';

export const CommentSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    userId: z.string().uuid(),
    message: z.string().min(1),
    createdAt: z.date(),
});

export const CreateCommentSchema = z.object({
    storyId: z.string().uuid(),
    message: z.string().min(1),
});
