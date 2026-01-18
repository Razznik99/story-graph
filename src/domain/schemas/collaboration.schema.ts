import { z } from 'zod';
import { COLLABORATION_ROLES, COLLABORATION_STATUS } from '../constants';

export const CollaborationRoleSchema = z.enum(COLLABORATION_ROLES);
export const CollaborationStatusSchema = z.enum(COLLABORATION_STATUS);

export const CollaborationSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    userId: z.string().uuid(),
    role: CollaborationRoleSchema,
    accepted: z.boolean(),
    invitedAt: z.date(),
    acceptedAt: z.date(),
});

export const CollaborationRequestSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    userId: z.string().uuid(),
    role: CollaborationRoleSchema,
    message: z.string().max(500).optional(),
    status: CollaborationStatusSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const CollaborationInviteSchema = z.object({
    id: z.string().uuid(),
    storyId: z.string().uuid(),
    userId: z.string().uuid(), // User being invited
    role: CollaborationRoleSchema,
    status: CollaborationStatusSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const InviteCollaboratorSchema = z.object({
    email: z.string().email(),
    role: CollaborationRoleSchema,
});