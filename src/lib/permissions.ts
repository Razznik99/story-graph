import prisma from './prisma';
import { CollaborationRole, hasSufficientRole, PermissionResult } from '@/domain/roles';



/**
 * Checks if a user has permission to access a story with a specific required role.
 * Hierarchy: Owner > Edit > Comment > View
 */
export async function checkStoryPermission(
    storyId: string,
    userId: string,
    requiredRole: CollaborationRole | 'Owner' = CollaborationRole.View
): Promise<PermissionResult> {
    if (!storyId || !userId) {
        return { authorized: false, error: 'Missing storyId or userId', status: 400 };
    }

    const story = await prisma.story.findUnique({
        where: { id: storyId },
        select: { ownerId: true },
    });

    if (!story) {
        return { authorized: false, error: 'Story not found', status: 404 };
    }

    // 1. Owner Check
    if (story.ownerId === userId) {
        return { authorized: true, role: 'Owner' };
    }

    // If 'Owner' is explicitly required and user is not owner, fail early
    if (requiredRole === 'Owner') {
        return { authorized: false, error: 'Forbidden', status: 403 };
    }

    // 2. Collaborator Check
    const collaboration = await prisma.collaboration.findUnique({
        where: {
            storyId_userId: {
                storyId,
                userId,
            },
        },
        select: { role: true, accepted: true },
    });

    if (!collaboration || !collaboration.accepted) {
        // Double check for public visibility if strictly viewing? 
        // The original logic had a public check. Let's add it back if the role is View.

        const storyVisibility = await prisma.story.findUnique({
            where: { id: storyId },
            select: { visibility: true }
        });

        if (storyVisibility?.visibility === 'public' && requiredRole === CollaborationRole.View) {
            return { authorized: true, role: CollaborationRole.View }; // Treated as Viewer
        }

        return { authorized: false, error: 'Forbidden', status: 403 };
    }

    const userRole = collaboration.role as CollaborationRole;

    // 3. Role Hierarchy Check
    if (hasSufficientRole(userRole, requiredRole as CollaborationRole)) {
        return { authorized: true, role: userRole };
    }

    return { authorized: false, error: 'Insufficient permissions', status: 403 };
}
