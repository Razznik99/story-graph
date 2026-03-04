import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET_NAME, PUBLIC_DEV_URL } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPlanLimits } from '@/lib/pricing';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('filename');
    const contentType = searchParams.get('contentType');

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { plan: true, subscriptionStatus: true }
    });

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limits = getUserPlanLimits(user);
    if (limits.img_upload <= 0) {
        return NextResponse.json({ error: 'Upload limit reached. Please upgrade.' }, { status: 403 });
    }

    if (!filename || !contentType) {
        return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    // Generate a unique key
    // We can use a folder structure if needed, e.g. "uploads/..."
    const ext = filename.split('.').pop();
    const key = `${uuidv4()}.${ext}`;

    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
            // ACL: 'public-read', // R2 doesn't support ACLs the same way, usually bucket setting controls public access
        });

        const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

        // Determine public URL based on environment
        let publicUrl = '';

        // Check for dev mode or if explicit public URL is provided
        if (process.env.NODE_ENV === 'development' || PUBLIC_DEV_URL) {
            // Use direct public R2 URL if available
            if (PUBLIC_DEV_URL) {
                publicUrl = `${PUBLIC_DEV_URL}/${key}`;
            } else {
                // Fallback to proxy even in dev if no public URL configured, 
                // OR warn user. But we'll try to use proxy if public url is missing.
                publicUrl = `/api/image/${key}`;
            }
        } else {
            // Production: use proxy
            publicUrl = `/api/image/${key}`;
        }

        return NextResponse.json({
            uploadUrl,
            publicUrl,
            key
        });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');
    // Or URL
    const url = searchParams.get('url');

    let keyToDelete = key;

    if (!keyToDelete && url) {
        // Extract key from URL
        // Format 1: /api/image/KEY
        // Format 2: https://pub-xxx.r2.dev/KEY
        try {
            if (url.includes('/api/image/')) {
                const parts = url.split('/api/image/');
                keyToDelete = parts[1] || null;
            } else if (PUBLIC_DEV_URL && url.startsWith(PUBLIC_DEV_URL)) {
                keyToDelete = url.replace(`${PUBLIC_DEV_URL}/`, '');
            } else if (url.startsWith('http')) {
                // Fallback: assume last part is key
                const parts = url.split('/');
                keyToDelete = parts[parts.length - 1] || null;
            }
        } catch (e) {
            console.error("Error parsing URL for delete", e);
        }
    }

    if (!keyToDelete) {
        return NextResponse.json({ error: 'Missing key or url' }, { status: 400 });
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: keyToDelete,
        });

        await r2.send(command);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }
}
