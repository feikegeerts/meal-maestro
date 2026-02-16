/**
 * Re-keys R2 objects so the key prefix matches the current user_id.
 *
 * Problem: The initial image migration copied files to R2 preserving the old
 * Supabase path (oldSupabaseUserId/recipeId/file.webp). The URL prefix was
 * later rewritten to R2, but the path still contains the old Supabase user ID.
 * Meanwhile, migrateUserIdToNeonAuth() updated user_profiles.id and
 * recipes.user_id to the new Neon Auth UUID — but didn't touch R2 keys or
 * image_url. This breaks the auth check in deleteRecipeImage() which expects
 * the R2 key to start with the current userId.
 *
 * This script:
 * 1. Finds all recipes where the user ID in the image URL path doesn't match
 *    the recipe's current user_id
 * 2. Copies the R2 object to the correct key (currentUserId/recipeId/file.webp)
 * 3. Deletes the old R2 object
 * 4. Updates image_url in the database
 *
 * Run with: npx tsx scripts/migrate-image-urls.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

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

async function main() {
  console.log("Re-keying R2 objects to match current user IDs");
  console.log("=".repeat(50));

  // Find all recipes with image URLs
  const recipes = await sql`
    SELECT r.id, r.image_url, r.user_id
    FROM recipes r
    WHERE r.image_url IS NOT NULL
  `;

  console.log(`Found ${recipes.length} recipes with images\n`);

  let rekeyed = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipe of recipes) {
    const imageUrl = recipe.image_url as string;
    const recipeId = recipe.id as string;
    const currentUserId = recipe.user_id as string;

    // Extract the R2 key from the URL
    if (!imageUrl.startsWith(R2_PUBLIC_URL)) {
      console.error(`  [SKIP] Non-R2 URL for recipe ${recipeId}: ${imageUrl}`);
      failed++;
      continue;
    }

    const oldKey = imageUrl.slice(R2_PUBLIC_URL.length);
    const normalizedKey = oldKey.startsWith("/") ? oldKey.slice(1) : oldKey;

    // The key format is: userId/recipeId/timestamp.webp
    const firstSlash = normalizedKey.indexOf("/");
    if (firstSlash === -1) {
      console.error(`  [SKIP] Invalid key format for recipe ${recipeId}: ${normalizedKey}`);
      failed++;
      continue;
    }

    const userIdInKey = normalizedKey.substring(0, firstSlash);
    const restOfKey = normalizedKey.substring(firstSlash + 1);

    if (userIdInKey === currentUserId) {
      skipped++;
      continue;
    }

    // User ID mismatch — need to re-key
    const newKey = `${currentUserId}/${restOfKey}`;
    console.log(`  [REKEY] ${normalizedKey} → ${newKey}`);

    try {
      // Verify the old object exists
      try {
        await s3.send(
          new HeadObjectCommand({ Bucket: BUCKET, Key: normalizedKey }),
        );
      } catch {
        console.error(`  [MISS] R2 object not found: ${normalizedKey}`);
        failed++;
        continue;
      }

      // Copy to new key
      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `${BUCKET}/${normalizedKey}`,
          Key: newKey,
        }),
      );

      // Verify the copy
      await s3.send(
        new HeadObjectCommand({ Bucket: BUCKET, Key: newKey }),
      );

      // Delete old key
      await s3.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: normalizedKey }),
      );

      // Update the database
      const newUrl = `${R2_PUBLIC_URL}/${newKey}`;
      await sql`
        UPDATE recipes
        SET image_url = ${newUrl}, updated_at = NOW()
        WHERE id = ${recipeId}
      `;

      rekeyed++;
    } catch (error) {
      console.error(`  [FAIL] Recipe ${recipeId}:`, error);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("Migration complete:");
  console.log(`  Re-keyed:   ${rekeyed}`);
  console.log(`  Already OK: ${skipped}`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Total:      ${recipes.length}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
