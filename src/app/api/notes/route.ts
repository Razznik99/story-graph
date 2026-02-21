
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkStoryPermission } from '@/lib/permissions';
import { CollaborationRole } from '@/domain/roles';
import { CreateNoteSchema } from '@/domain/schemas/note.schema';

// GET /api/notes
// Query Params: storyId (required), timelineId, isTimelineNote (boolean), search (string), tags (comma separated)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const storyId = searchParams.get('storyId');
        const timelineId = searchParams.get('timelineId');
        const isTimelineNote = searchParams.get('isTimelineNote') === 'true';
        const search = searchParams.get('search');
        const tags = searchParams.get('tags');

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        // Check Permissions (View required)
        const permission = await checkStoryPermission(
            storyId,
            session.user.id,
            CollaborationRole.View
        );

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        // Build Query
        const where: any = {
            storyId,
        };

        if (timelineId) {
            where.timelineId = timelineId;
        } else if (isTimelineNote) {
            where.timelineId = { not: null };
        } else {
            // General notes (not associated with timeline)
            // Or if user wants ALL notes, they wouldn't pass isTimelineNote=false/true specifically?
            // Requirement: "normally notes would have the timelineId field as null"
            // So if we are fetching "Notes" tab, we want timelineId: null
            // If we are fetching "Story" tab, we want timelineId: { not: null }

            // Let's assume if isTimelineNote is explicitly 'false', we filter for null.
            // If undefined, maybe return all? But the tabs are distinct. 
            // The prompt says "Note tab would show all the notes... normally notes would have timelineId field as null"
            // "Story tab would show all the timeline notes"

            // So default behavior if no specific timelineId is requested:
            if (searchParams.has('isTimelineNote')) {
                if (isTimelineNote) {
                    where.timelineId = { not: null };
                } else {
                    where.timelineId = null;
                }
            }
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                // { content: { contains: search, mode: 'insensitive' } } // JSON search not supported with simple contains
            ];
        }

        if (tags) {
            const tagList = tags.split(',').map(t => t.trim());
            // Filter notes that have at least one of the tags? Or all?
            // "search notes by title and tags" usually means "contains these tags"
            // Postgres array containment
            if (tagList.length > 0) {
                where.tags = { hasSome: tagList };
            }
        }

        const notes = await prisma.note.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                timeline: {
                    select: {
                        id: true,
                        level: true,
                        name: true,
                        title: true, // Needed for display format
                    }
                }
            }
        });

        return NextResponse.json(notes);

    } catch (error) {
        console.error('List Notes API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/notes
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Zod Validation
        const result = CreateNoteSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid data', details: result.error.flatten() }, { status: 400 });
        }

        const { title, content, tags, timelineId } = result.data;
        // We need storyId from body? The schema in `note.schema.ts` for CreateNoteSchema doesn't include storyId, 
        // but `NoteSchema` does. The user typically sends storyId in body or query.
        // Let's check `CreateNoteSchema` definition again from the previous view_file.
        // It did NOT have storyId. So we must get it from the request body manually, 
        // even if not validated by that specific partial schema, OR strict validation fails if we pass extra fields.
        // Actually, often storyId is passed key.

        const storyId = body.storyId;

        if (!storyId) {
            return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
        }

        // Check Permissions (Edit required)
        const permission = await checkStoryPermission(
            storyId,
            session.user.id,
            CollaborationRole.Edit
        );

        if (!permission.authorized) {
            return NextResponse.json({ error: permission.error }, { status: permission.status || 403 });
        }

        const newNote = await prisma.note.create({
            data: {
                storyId,
                title,
                content: content || "",
                tags: tags || [],
                timelineId: timelineId || null,
            }
        });

        return NextResponse.json(newNote);

    } catch (error) {
        console.error('Create Note API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
