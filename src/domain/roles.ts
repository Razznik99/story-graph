export const CollaborationRole = {
    View: 'View',
    Comment: 'Comment',
    Edit: 'Edit',
    Owner: 'Owner'
} as const;

export type PermissionResult = {
    authorized: boolean;
    role?: CollaborationRole | 'Owner';
    error?: string;
    status?: number;
};

export type CollaborationRole = typeof CollaborationRole[keyof typeof CollaborationRole];

export function hasSufficientRole(userRole: CollaborationRole, requiredRole: CollaborationRole): boolean {
    const levels: Record<string, number> = {
        [CollaborationRole.View]: 1,
        [CollaborationRole.Comment]: 2,
        [CollaborationRole.Edit]: 3,
    };

    const userLevel = levels[userRole] || 0;
    const requiredLevel = levels[requiredRole] || 0;

    return userLevel >= requiredLevel;
}
