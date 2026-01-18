import { z } from 'zod';
import { AI_PROVIDERS } from '../constants';

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    username: z.string().min(1).max(20),
    createdAt: z.date(),
    aiProvider: z.enum(AI_PROVIDERS).nullable(),
    apiKey: z.string().nullable(),
});

export const CreateUserSchema = UserSchema.pick({
    email: true,
    username: true,
});

export const UpdateUserSchema = UserSchema.partial().pick({
    email: true,
    username: true,
    aiProvider: true,
    apiKey: true,
});
