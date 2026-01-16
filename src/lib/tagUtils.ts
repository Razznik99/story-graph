import prisma from './prisma';

/**
 * Updates story-specific tags.
 * Increments usage for new tags, decrements/deletes for removed tags.
 */
export async function updateStoryTags(
    storyId: string,
    oldTags: string[],
    newTags: string[]
) {
    const oldSet = new Set(oldTags);
    const newSet = new Set(newTags);

    const added = newTags.filter(t => !oldSet.has(t));
    const removed = oldTags.filter(t => !newSet.has(t));

    if (added.length === 0 && removed.length === 0) return;

    await prisma.$transaction(async (tx) => {
        // Handle added tags
        for (const tag of added) {
            await tx.tag.upsert({
                where: { storyId_name: { storyId, name: tag } },
                create: { storyId, name: tag, usageCount: 1 },
                update: { usageCount: { increment: 1 } },
            });
        }

        // Handle removed tags
        for (const tag of removed) {
            const existing = await tx.tag.findUnique({
                where: { storyId_name: { storyId, name: tag } },
            });

            if (existing) {
                if (existing.usageCount <= 1) {
                    await tx.tag.delete({
                        where: { storyId_name: { storyId, name: tag } },
                    });
                } else {
                    await tx.tag.update({
                        where: { storyId_name: { storyId, name: tag } },
                        data: { usageCount: { decrement: 1 } },
                    });
                }
            }
        }
    });
}

/**
 * Updates global tags.
 * Increments usage for new tags, decrements/deletes for removed tags.
 */
export async function updateMultiTags(
    oldTags: string[],
    newTags: string[]
) {
    const oldSet = new Set(oldTags);
    const newSet = new Set(newTags);

    const added = newTags.filter(t => !oldSet.has(t));
    const removed = oldTags.filter(t => !newSet.has(t));

    if (added.length === 0 && removed.length === 0) return;

    await prisma.$transaction(async (tx) => {
        // Handle added tags
        for (const tag of added) {
            await tx.globalTag.upsert({
                where: { name: tag },
                create: { name: tag, usageCount: 1 },
                update: { usageCount: { increment: 1 } },
            });
        }

        // Handle removed tags
        for (const tag of removed) {
            const existing = await tx.globalTag.findUnique({
                where: { name: tag },
            });

            if (existing) {
                if (existing.usageCount <= 1) {
                    await tx.globalTag.delete({
                        where: { name: tag },
                    });
                } else {
                    await tx.globalTag.update({
                        where: { name: tag },
                        data: { usageCount: { decrement: 1 } },
                    });
                }
            }
        }
    });
}
