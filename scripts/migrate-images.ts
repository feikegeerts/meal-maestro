/**
 * Migrates recipe images from Supabase Storage to Cloudflare R2.
 * Downloads images from Supabase public URLs and uploads to R2.
 *
 * Run with: npx tsx scripts/migrate-images.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const sql = neon(process.env.DATABASE_URL!);

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const SUPABASE_STORAGE_PREFIX =
  "https://lmijvbjidzipccamxhdw.supabase.co/storage/v1/object/public/recipe-images/";

async function main() {
  // Find all recipes with Supabase image URLs
  const recipes = await sql`
    SELECT id, image_url
    FROM recipes
    WHERE image_url IS NOT NULL
      AND image_url LIKE '%supabase.co%'
  `;

  console.log(`Found ${recipes.length} recipes with Supabase image URLs`);

  if (recipes.length === 0) {
    console.log("No images to migrate.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const recipe of recipes) {
    const imageUrl = recipe.image_url as string;
    const recipeId = recipe.id as string;

    // Extract the file path from the Supabase URL
    const filePath = imageUrl.replace(SUPABASE_STORAGE_PREFIX, "");

    try {
      // Download from Supabase
      console.log(`  Downloading: ${filePath}`);
      const response = await fetch(imageUrl);

      if (!response.ok) {
        console.error(
          `  Failed to download ${recipeId}: ${response.status} ${response.statusText}`,
        );
        failed++;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType =
        response.headers.get("content-type") || "image/webp";

      // Upload to R2
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: filePath,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      // Verify the R2 URL is accessible
      const r2Url = `${R2_PUBLIC_URL}/${filePath}`;
      const verifyResponse = await fetch(r2Url, { method: "HEAD" });

      if (verifyResponse.ok) {
        console.log(`  Uploaded: ${filePath} (${buffer.length} bytes)`);
        success++;
      } else {
        console.error(
          `  Uploaded but verification failed for ${recipeId}: ${verifyResponse.status}`,
        );
        failed++;
      }
    } catch (error) {
      console.error(`  Error migrating image for recipe ${recipeId}:`, error);
      failed++;
    }
  }

  console.log(`\nImage migration complete:`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${recipes.length}`);
}

main().catch((err) => {
  console.error("Image migration failed:", err);
  process.exit(1);
});
