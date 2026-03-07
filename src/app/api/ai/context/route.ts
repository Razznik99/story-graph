import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { query, storyId } = await req.json();

        if (!query || query.length < 2) {
            return NextResponse.json([]);
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Build where clause ensuring user has access (via story owner or collaboration - simplifying to owner/collaborator check if storyId is provided)
        // For now, let's assume if they have access to storyId, they can search its content.
        // If storyId is not provided, we might search all their stories, but context usually implies a specific story.
        // Let's enforce storyId for context search to keep it relevant.

        if (!storyId) {
            return NextResponse.json({ error: "Story ID is required for context search" }, { status: 400 });
        }

        // Simple check if user has access to story
        const story = await prisma.story.findFirst({
            where: {
                id: storyId,
                OR: [
                    { ownerId: user.id },
                    { collaborators: { some: { userId: user.id } } }
                ]
            }
        });

        if (!story) {
            return NextResponse.json({ error: "Story not found or unauthorized" }, { status: 403 });
        }

        // Parallel search
        const [cards, events, notes, timelines] = await Promise.all([
            prisma.card.findMany({
                where: {
                    storyId,
                    name: { contains: query, mode: 'insensitive' }
                },
                take: 5,
                select: { id: true, name: true, cardType: { select: { name: true } } }
            }),
            prisma.event.findMany({
                where: {
                    storyId,
                    title: { contains: query, mode: 'insensitive' }
                },
                take: 5,
                select: { id: true, title: true, eventType: { select: { name: true } } }
            }),
            prisma.note.findMany({
                where: {
                    storyId,
                    title: { contains: query, mode: 'insensitive' }
                },
                take: 5,
                select: { id: true, title: true, timelineId: true }
            }),
            prisma.timeline.findMany({
                where: {
                    storyId,
                    name: { contains: query, mode: 'insensitive' }
                },
                take: 5,
                select: { id: true, name: true }
            })
        ]);

        const results = [
            ...cards.map(c => ({ id: c.id, type: 'card', name: c.name, subtitle: c.cardType.name })),
            ...events.map(e => ({ id: e.id, type: 'event', name: e.title, subtitle: e.eventType.name })),
            ...notes.map(n => ({ id: n.id, type: 'note', name: n.title, subtitle: n.timelineId ? 'Story' : 'Note' })),
            ...timelines.map(t => ({ id: t.id, type: 'timeline', name: t.name, subtitle: `Timeline` })),
        ];

        return NextResponse.json(results);

    } catch (error) {
        console.error("Error searching context:", error);
        return NextResponse.json({ error: "Failed to search context" }, { status: 500 });
    }
}
