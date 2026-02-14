/**
 * Cleans all objects from the R2 bucket.
 * Run with: npx tsx scripts/clean-r2.ts
 */
import { config } from "dotenv";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

config({ path: ".env.local" });

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

async function main() {
  console.log(`Listing objects in R2 bucket: ${BUCKET}...`);

  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listResult = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = listResult.Contents;
    if (!objects || objects.length === 0) {
      console.log("No objects found.");
      break;
    }

    console.log(`Found ${objects.length} objects, deleting...`);

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key })),
        },
      }),
    );

    totalDeleted += objects.length;
    continuationToken = listResult.NextContinuationToken;
  } while (continuationToken);

  console.log(`Done. Deleted ${totalDeleted} objects from R2.`);
}

main().catch(console.error);
