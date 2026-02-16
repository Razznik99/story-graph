import { S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
    // We don't throw here to allow build in environments without these vars, 
    // but usage will fail.
    console.warn("R2 credentials missing from environment");
}

export const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
    },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'story-graph';
export const PUBLIC_DEV_URL = process.env.PUBLIC_DEVELOPMENT_URL;
