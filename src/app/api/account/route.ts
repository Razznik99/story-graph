
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const userId = (session.user as any).id;

        // Verify the user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Delete the user - key constraint cascading will handle related data
        await prisma.user.delete({
            where: { id: userId },
        });

        return new NextResponse("Account deleted successfully", { status: 200 });

    } catch (error) {
        console.error("[ACCOUNT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
