import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { eventId, storyId } = body;

        if (!eventId || !storyId) {
            return NextResponse.json({ error: 'eventId and storyId required' }, { status: 400 });
        }

        const permission = await checkStoryPermission(storyId, session.user.id, CollaborationRole.Edit);
        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        // Fetch the original event
        const originalEvent = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                incomingLinks: true,
                outgoingLinks: true,
                linkedCards: true,
            }
        });

        if (!originalEvent) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Determine new title (e.g. "Title (1)")
        let baseTitle = originalEvent.title;
        let suffixNum = 1;
        const match = baseTitle.match(/^(.*) \((\d+)\)$/);
        if (match && match[1] && match[2]) {
            baseTitle = match[1].trim();
            suffixNum = parseInt(match[2], 10) + 1;
        }

        // Keep incrementing title until unique in the story (optional but user requested windows style increment)
        let newTitle = `${baseTitle} (${suffixNum})`;
        let isUnique = false;
        while (!isUnique) {
            const exists = await prisma.event.findFirst({
                where: { storyId, title: newTitle }
            });
            if (exists) {
                suffixNum++;
                newTitle = `${baseTitle} (${suffixNum})`;
            } else {
                isUnique = true;
            }
        }

        // Create duplicate Deep copy
        const duplicate = await prisma.event.create({
            data: {
                storyId: originalEvent.storyId,
                eventTypeId: originalEvent.eventTypeId,
                title: newTitle,
                description: originalEvent.description,
                intensity: originalEvent.intensity,
                visibility: originalEvent.visibility,
                outcome: originalEvent.outcome,
                tags: [...originalEvent.tags],
                linkedCards: {
                    create: originalEvent.linkedCards.map(lc => ({
                        storyId: lc.storyId,
                        cardId: lc.cardId,
                        roleId: lc.roleId,
                    }))
                }
            },
            include: {
                eventType: true
            }
        });

        // Add PARALLEL_TO relation
        await prisma.eventEventLink.create({
            data: {
                storyId,
                eventId: originalEvent.id, // Original is source
                linkId: duplicate.id,      // Duplicate is target
                relationshipType: 'PARALLEL_TO'
            }
        });

        return NextResponse.json(duplicate, { status: 201 });

    } catch (err) {
        console.error('Events Duplicate POST error:', err);
        return NextResponse.json({ error: 'Failed to duplicate event' }, { status: 500 });
    }
}
