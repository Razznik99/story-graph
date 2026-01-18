import { z } from 'zod';
import { COLLABORATION_ROLES } from '../constants';

export const RequestAccessSchema = z.object({
    role: z.enum(COLLABORATION_ROLES),
    message: z.string().max(500).optional(),
});

export type RequestAccessInput = z.infer<typeof RequestAccessSchema>;
