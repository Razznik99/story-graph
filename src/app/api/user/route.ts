
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
