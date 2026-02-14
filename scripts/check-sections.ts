import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const rows = await sql`
    SELECT id, pg_typeof(sections) as type, sections
    FROM recipes
    WHERE sections IS NOT NULL
    LIMIT 5
  `;
  for (const row of rows) {
    console.log(`ID: ${row.id}`);
    console.log(`  pg_typeof: ${row.type}`);
    console.log(`  JS type: ${typeof row.sections}`);
    console.log(`  Value: ${JSON.stringify(row.sections).substring(0, 200)}`);
    console.log();
  }
}

main().catch(console.error);
