import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  const counts = await sql`SELECT
    COUNT(*) FILTER (WHERE image_url LIKE 'https://images.meal-maestro.com/%')::int AS old_custom,
    COUNT(*) FILTER (WHERE image_url LIKE 'https://pub-%')::int AS r2_dev,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL)::int AS total_with_image
    FROM recipes`;
  console.log("DEV DB counts:", JSON.stringify(counts[0], null, 2));
}
main().catch(console.error);
