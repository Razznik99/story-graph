import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;

    try {
        const chat = await prisma.aIChat.findUnique({
            where: { id: chatId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

        // Verify ownership
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (chat.userId !== user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        return NextResponse.json(chat);
    } catch (error) {
        console.error("Error fetching chat:", error);
        return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ chatId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;

    try {
        const chat = await prisma.aIChat.findUnique({ where: { id: chatId } });
        if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (chat.userId !== user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await prisma.aIChat.delete({ where: { id: chatId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting chat:", error);
        return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
    }
}
