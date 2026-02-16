/**
 * Fixes JSONB columns where empty arrays [] were imported as empty objects {}.
 * This happened because the migration script's formatValue() treated empty arrays
 * as Postgres array literals ('{}') instead of JSONB ('[]'::jsonb).
 *
 * Run with: npx tsx scripts/fix-jsonb-arrays.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Fix sections: {} → []
  const sectionsBefore = await sql`
    SELECT count(*) as count FROM recipes WHERE sections = '{}'::jsonb
  `;
  console.log(`Sections remaining as {}: ${sectionsBefore[0].count}`);

  // Check and fix ingredients if needed
  const badIngredients = await sql`
    SELECT count(*) as count FROM recipes WHERE ingredients = '{}'::jsonb
  `;
  if (parseInt(badIngredients[0].count as string) > 0) {
    await sql`UPDATE recipes SET ingredients = '[]'::jsonb WHERE ingredients = '{}'::jsonb`;
    console.log(`Fixed ${badIngredients[0].count} ingredients`);
  } else {
    console.log("Ingredients: OK (no empty objects)");
  }

  // Check and fix nutrition if needed (should be null or object, not array)
  // nutrition is a single object, not an array, so {} is correct for it

  // Verify
  const verify = await sql`
    SELECT
      (SELECT count(*) FROM recipes WHERE sections = '{}'::jsonb) as bad_sections,
      (SELECT count(*) FROM recipes WHERE sections = '[]'::jsonb) as empty_sections,
      (SELECT count(*) FROM recipes WHERE jsonb_typeof(sections) = 'array' AND jsonb_array_length(sections) > 0) as non_empty_sections
  `;
  console.log("\nVerification:", verify[0]);
}

main().catch(console.error);
