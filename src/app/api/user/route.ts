
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions) as any

    if (session) {
        return NextResponse.json(session.user)
    }

    return new NextResponse('Unauthorized', { status: 401 })
}

import { UpdateUserSchema } from "@/domain/schemas/user.schema";
import prisma from "@/lib/prisma";

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();
        const validatedData = UpdateUserSchema.parse(body);

        const userId = session.user.id;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: validatedData as any,
        });

        return NextResponse.json(updatedUser);

    } catch (error) {
        console.error("[USER_UPDATE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
