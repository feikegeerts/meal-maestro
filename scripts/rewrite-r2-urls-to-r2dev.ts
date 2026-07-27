/**
 * Rewrites recipes.image_url from the old R2 custom hostname
 * (https://images.meal-maestro.com/) to the new R2.dev public URL.
 *
 * The R2 bucket is unchanged — only the public URL prefix needs to be
 * rewritten in the database. The objects themselves stay where they are.
 *
 * Usage:
 *   npx tsx scripts/rewrite-r2-urls-to-r2dev.ts                    # uses .env.production.local
 *   npx tsx scripts/rewrite-r2-urls-to-r2dev.ts .env.local         # uses .env.local
 *   npx tsx scripts/rewrite-r2-urls-to-r2dev.ts .env.production.local
 *
 * Idempotent: re-running is a no-op once all rows have been rewritten.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

const envFile = process.argv[2] ?? ".env.production.local";
config({ path: envFile });

const sql = neon(process.env.DATABASE_URL!);

// Production R2.dev URL (meal-maestro-images bucket).
// For dev DB, also handle the dev bucket's R2.dev URL.
const MIGRATIONS: Array<{ oldPrefix: string; newPrefix: string; label: string }> = [
  {
    oldPrefix: "https://images.meal-maestro.com/",
    newPrefix: "https://pub-6a0a35408b4d4d78b7811b23455badc0.r2.dev/",
    label: "production bucket (meal-maestro-images)",
  },
  {
    oldPrefix: "https://pub-6a0a35408b4d4d78b7811b23455badc0.r2.dev/",
    newPrefix: "https://pub-7f9814476c33430aa2f0baa6638d7a0b.r2.dev/",
    label: "dev bucket (meal-maestro-images-dev)",
  },
];

async function main() {
  console.log("Rewriting recipes.image_url to new R2.dev prefix");
  console.log("=".repeat(60));
  console.log(`OLD: ${OLD_PREFIX}`);
  console.log(`NEW: ${NEW_PREFIX}`);
  console.log();

  const before = await sql`
    SELECT COUNT(*)::int AS count FROM recipes WHERE image_url LIKE ${OLD_PREFIX + "%"}
  `;
  const toRewrite = Number(before[0]?.count ?? 0);
  console.log(`Rows matching OLD prefix: ${toRewrite}`);

  if (toRewrite === 0) {
    console.log("Nothing to do.");
    return;
  }

  const result = await sql`
    UPDATE recipes
    SET image_url = REPLACE(image_url, ${OLD_PREFIX}, ${NEW_PREFIX}),
        updated_at = NOW()
    WHERE image_url LIKE ${OLD_PREFIX + "%"}
    RETURNING id
  `;

  console.log(`Updated ${result.length} rows.`);

  const after = await sql`
    SELECT COUNT(*)::int AS count FROM recipes WHERE image_url LIKE ${OLD_PREFIX + "%"}
  `;
  const remaining = Number(after[0]?.count ?? 0);
  console.log(`Rows still matching OLD prefix: ${remaining}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
