import { z } from 'zod';
import { COLLABORATION_ROLES } from '../constants';

export const CollaborationRoleSchema = z.enum(COLLABORATION_ROLES);

export const CollaborationSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    userId: z.string().uuid(),
    role: CollaborationRoleSchema,
    accepted: z.boolean(),
    invitedAt: z.date(),
    acceptedAt: z.date().nullable(),
});

export const InviteCollaboratorSchema = z.object({
    email: z.string().email(),
    role: CollaborationRoleSchema,
});
