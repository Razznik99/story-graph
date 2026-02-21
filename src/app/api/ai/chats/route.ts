import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Assuming authOptions is exported from here
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "" });

// Helper to generate chat title
export async function generateChatTitle(firstMessage: string) {
    try {
        const prompt = `Generate a title for a chat that starts with: "${firstMessage}"`;

        const result = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            config: {
                systemInstruction: {
                    parts: [{ text: "You are a helpful assistant that creates short, 3-5 word titles for chat conversations based on the user's first message. Do not use quotes or periods. Return ONLY the title." }]
                }
            }
        });

        return result.text?.trim() || "New Chat";
    } catch (error) {
        console.error("Error generating chat title:", error);
        return "New Chat";
    }
}


export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("storyId");

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const whereClause: any = { userId: user.id };
        if (storyId) {
            whereClause.storyId = storyId;
        }

        const chats = await prisma.aIChat.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { messages: true }
                }
            }
        });

        return NextResponse.json(chats);
    } catch (error) {
        console.error("Error fetching chats:", error);
        return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { title, storyId } = await req.json();
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const chat = await prisma.aIChat.create({
            data: {
                userId: user.id,
                title: title || "New Chat",
                storyId: storyId || null,
            }
        });

        return NextResponse.json(chat);
    } catch (error) {
        console.error("Error creating chat:", error);
        return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
    }
}
