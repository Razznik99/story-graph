
import { PrismaClient } from '../generated/prisma/client';
import prisma from './prisma';

export type RequiredRole = 'VIEW' | 'COMMENT' | 'EDIT' | 'OWNER';

const ROLE_HIERARCHY: Record<RequiredRole, number> = {
    VIEW: 0,
    COMMENT: 1,
    EDIT: 2,
    OWNER: 3,
};

const DB_ROLE_MAP: Record<string, number> = {
    View: 0,
    Comment: 1,
    Edit: 2,
};

export class PermissionError extends Error {
    constructor(message: string = 'Forbidden') {
        super(message);
        this.name = 'PermissionError';
    }
}

export async function verifyStoryAccess(
    storyId: string,
    userId: string,
    requiredRole: RequiredRole
) {
    const story = await prisma.story.findUnique({
        where: { id: storyId },
        include: {
            collaborators: {
                where: { userId },
                select: { role: true, accepted: true },
            },
            owner: { select: { id: true } },
        },
    });

    if (!story) {
        throw new Error('Story not found');
    }

    // 1. Owner Check
    if (story.ownerId === userId) {
        return story;
    }

    // 2. Public Access Check (View Only)
    if (story.visibility === 'public' && requiredRole === 'VIEW') {
        return story;
    }

    // 3. Collaborator Check
    const collaborator = story.collaborators[0];

    if (!collaborator || !collaborator.accepted) {
        throw new PermissionError('Access denied: User is not an active collaborator');
    }

    const userLevel = DB_ROLE_MAP[collaborator.role];
    const requiredLevel = ROLE_HIERARCHY[requiredRole];

    if (userLevel < requiredLevel) {
        throw new PermissionError(`Access denied: Insufficient permissions. Required ${requiredRole}, have ${collaborator.role}`);
    }

    return story;
}
