import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as path from "path";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import * as https from "https";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function verifyR2() {
    console.log("Verifying R2 Credentials...");

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        throw new Error("Missing environment variables");
    }

    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: true,
        requestHandler: new NodeHttpHandler({
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        }),
    });

    try {
        const testKey = "test-verification-file.txt";

        // 1. Upload
        console.log("1. Uploading test file...");
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: testKey,
            Body: "R2 Verification Successful!",
            ContentType: "text/plain",
        }));
        console.log("   Success!");

        // 2. List
        console.log("2. Listing objects...");
        const list = await s3.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: testKey }));
        const found = list.Contents?.find(o => o.Key === testKey);
        if (found) {
            console.log("   File found!");
        } else {
            console.error("   File NOT found!");
        }

        // 3. Delete
        console.log("3. Deleting test file...");
        await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: testKey }));
        console.log("   Success!");

        console.log("\n✅ R2 Integration Verification: PASSED");

    } catch (err) {
        console.error("\n❌ R2 Integration Verification: FAILED");
        console.error(err);
    }
}

verifyR2();
