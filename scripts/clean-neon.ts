/**
 * Cleans all test data from Neon database.
 * Run with: npx tsx scripts/clean-neon.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Truncating all tables in Neon...");

  await sql`
    TRUNCATE TABLE
      rate_limit_violations, rate_limit_user, rate_limit_ip,
      feedback, custom_units, api_usage, monthly_usage_summary,
      usage_alert_events, deletion_requests, recipes, user_profiles
    CASCADE
  `;

  console.log("All tables truncated.");

  // Verify
  const counts = await sql`
    SELECT
      (SELECT count(*) FROM user_profiles) AS user_profiles,
      (SELECT count(*) FROM recipes) AS recipes,
      (SELECT count(*) FROM api_usage) AS api_usage,
      (SELECT count(*) FROM feedback) AS feedback,
      (SELECT count(*) FROM custom_units) AS custom_units
  `;
  console.log("Row counts after truncation:", counts[0]);
}

main().catch(console.error);
