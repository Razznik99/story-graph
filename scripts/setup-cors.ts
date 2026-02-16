import * as dotenv from "dotenv";
dotenv.config();

import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

async function main() {
    if (!accountId || !accessKeyId || !secretAccessKey || !R2_BUCKET_NAME) {
        console.error("Missing R2 environment variables (R2_ACCOUNT_ID, etc)");
        process.exit(1);
    }

    const r2 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    console.log(`Configuring CORS for bucket: ${R2_BUCKET_NAME}`);

    const command = new PutBucketCorsCommand({
        Bucket: R2_BUCKET_NAME,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    AllowedOrigins: [
                        "http://localhost:3000",
                        "http://localhost:3001",
                        "https://story-graph.vercel.app",
                        "https://*.vercel.app"
                    ],
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3600,
                },
            ],
        },
    });

    try {
        await r2.send(command);
        console.log("Successfully configured CORS!");
    } catch (err) {
        console.error("Error configuring CORS:", err);
    }
}

main();
