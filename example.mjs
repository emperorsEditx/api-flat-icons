import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";

async function main() {
    // Make sure environment variables are loaded
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        throw new Error("R2 credentials missing! Check your .env file.");
    }

    const s3 = new S3Client({
        region: "auto",
        endpoint: "https://f326b9e1185a23b661e7862a4b46b7b1.r2.cloudflarestorage.com",
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
        forcePathStyle: true, // Important for R2
    });

    const bucketName = "icons";

    // Upload a file
    await s3.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: "myfile.txt",
            Body: "Hello, R2!",
        })
    );
    console.log("Uploaded myfile.txt");

    // Download a file
    const response = await s3.send(
        new GetObjectCommand({
            Bucket: bucketName,
            Key: "myfile.txt",
        })
    );
    const content = await response.Body.transformToString();
    console.log("Downloaded:", content);

    // List objects
    const list = await s3.send(
        new ListObjectsV2Command({
            Bucket: bucketName,
        })
    );
    console.log("Objects:", list.Contents?.map((obj) => obj.Key));
}

main().catch((err) => console.error("R2 Error:", err));
