import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPlanLimits, canConsumeImageGen } from '@/lib/pricing';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompts, cfg_scale = 7, style_preset, width = 1024, height = 1024 } = body;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, plan: true, subscriptionStatus: true, imgGenRemaining: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limits = getUserPlanLimits(user);
        if (limits.img_gen === 0) {
            return NextResponse.json({ error: 'Image generation requires a paid plan. Please upgrade.' }, { status: 403 });
        }
        if (!canConsumeImageGen(user.imgGenRemaining, 1)) {
            return NextResponse.json({ error: 'Image generation limit reached for your current billing period.' }, { status: 403 });
        }

        const engineId = 'stable-diffusion-xl-1024-v1-0';
        const apiHost = process.env.IMG_API_HOST ?? 'https://api.stability.ai';
        const apiKey = process.env.STABILITY_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing Stability API key.' }, { status: 500 });
        }

        if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
            return NextResponse.json({ error: 'Missing or invalid prompts.' }, { status: 400 });
        }

        const payload: any = {
            text_prompts: prompts,
            cfg_scale,
            height,
            width,
            steps: 30,
            samples: 1,
        };

        if (style_preset) {
            payload.style_preset = style_preset;
        }

        const response = await fetch(
            `${apiHost}/v1/generation/${engineId}/text-to-image`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(payload),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Stability API error:', errorText);
            return NextResponse.json({ error: `Non-200 response: ${errorText}` }, { status: response.status });
        }

        const responseJSON = await response.json();

        if (!responseJSON.artifacts || responseJSON.artifacts.length === 0) {
            return NextResponse.json({ error: 'No image generated.' }, { status: 500 });
        }

        // Return the best/first base64 artifact
        const base64Image = responseJSON.artifacts[0].base64;

        // Deduct image generation limit
        await prisma.user.update({
            where: { id: user.id },
            data: { imgGenRemaining: Math.max(0, user.imgGenRemaining - 1) }
        });

        return NextResponse.json({ base64: base64Image });
    } catch (error) {
        console.error('Image generation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
