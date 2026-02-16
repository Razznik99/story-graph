import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2, R2_BUCKET_NAME } from '@/lib/r2';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string }> }
) {
    const { key } = await params;

    if (!key) {
        return new NextResponse('Missing key', { status: 400 });
    }

    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        const file = await r2.send(command);

        if (!file.Body) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Convert the stream to a Web Response body
        // @ts-ignore - AWS SDK stream type mismatch with Web Response, but it works in Next.js environment
        return new NextResponse(file.Body.transformToWebStream(), {
            headers: {
                'Content-Type': file.ContentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Length': file.ContentLength?.toString() || '',
            },
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        return new NextResponse('Image not found', { status: 404 });
    }
}
