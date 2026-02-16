import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Check sections that are empty objects instead of empty arrays
  const badSections = await sql`
    SELECT count(*) as count FROM recipes WHERE sections = '{}'::jsonb
  `;
  console.log(`Sections as empty object {}: ${badSections[0].count}`);

  const goodSections = await sql`
    SELECT count(*) as count FROM recipes WHERE sections = '[]'::jsonb
  `;
  console.log(`Sections as empty array []: ${goodSections[0].count}`);

  const nonEmptySections = await sql`
    SELECT count(*) as count FROM recipes WHERE sections != '[]'::jsonb AND sections != '{}'::jsonb
  `;
  console.log(`Sections non-empty: ${nonEmptySections[0].count}`);

  // Check ingredients
  const badIngredients = await sql`
    SELECT count(*) as count FROM recipes WHERE ingredients = '{}'::jsonb
  `;
  console.log(`\nIngredients as empty object {}: ${badIngredients[0].count}`);

  // Check a recipe with non-empty sections
  const sample = await sql`
    SELECT id, sections FROM recipes WHERE sections != '[]'::jsonb AND sections != '{}'::jsonb LIMIT 2
  `;
  if (sample.length > 0) {
    console.log(`\nSample non-empty sections:`);
    for (const r of sample) {
      console.log(`  ${r.id}: ${JSON.stringify(r.sections).substring(0, 300)}`);
    }
  }
}

main().catch(console.error);
