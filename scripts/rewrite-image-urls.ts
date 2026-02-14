/**
 * Rewrites Supabase image URLs to R2 URLs in the Neon database.
 * Run with: npx tsx scripts/rewrite-image-urls.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const SUPABASE_PREFIX =
  "https://lmijvbjidzipccamxhdw.supabase.co/storage/v1/object/public/recipe-images/";
const R2_PREFIX = "https://images.meal-maestro.com/";

async function main() {
  // Check how many URLs need rewriting
  const before =
    await sql`SELECT count(*) as count FROM recipes WHERE image_url LIKE '%supabase.co%'`;
  console.log(`URLs to rewrite: ${before[0].count}`);

  // Rewrite URLs
  await sql`
    UPDATE recipes
    SET image_url = REPLACE(
      image_url,
      ${SUPABASE_PREFIX},
      ${R2_PREFIX}
    )
    WHERE image_url IS NOT NULL
      AND image_url LIKE '%supabase.co%'
  `;

  console.log("URL rewrite complete.");

  // Verify no Supabase URLs remain
  const after =
    await sql`SELECT count(*) as count FROM recipes WHERE image_url LIKE '%supabase%'`;
  const remaining = parseInt(after[0].count as string, 10);

  if (remaining === 0) {
    console.log("Verification passed: No Supabase URLs remain in recipes.");
  } else {
    console.error(`WARNING: ${remaining} Supabase URLs still remain!`);
    const stale = await sql`
      SELECT id, image_url FROM recipes WHERE image_url LIKE '%supabase%' LIMIT 5
    `;
    console.error("Examples:", stale);
  }

  // Show some rewritten URLs
  const samples = await sql`
    SELECT id, image_url FROM recipes WHERE image_url IS NOT NULL LIMIT 3
  `;
  console.log("\nSample rewritten URLs:");
  for (const row of samples) {
    console.log(`  ${row.id}: ${row.image_url}`);
  }
}

main().catch((err) => {
  console.error("URL rewrite failed:", err);
  process.exit(1);
});
