/**
 * Migrates relational data from Supabase to Neon.
 * Reads via Supabase REST API (service role) and writes via Neon serverless driver.
 *
 * Run with: npx tsx scripts/migrate-data.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const sql = neon(process.env.DATABASE_URL!);

// Tables in FK-safe import order (parent first)
const TABLES_TO_MIGRATE = [
  "user_profiles",
  "recipes",
  "custom_units",
  "api_usage",
  "monthly_usage_summary",
  "usage_alert_events",
  "feedback",
  "deletion_requests",
] as const;

async function fetchAllRows(table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

// JSONB columns that store arrays — empty [] must not become Postgres '{}'
const JSONB_COLUMNS = new Set([
  "ingredients",
  "sections",
  "nutrition",
  "image_metadata",
  "details",
  "data_deleted",
]);

function formatValue(val: unknown, columnName?: string): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) {
    // JSONB array columns: always use JSON serialization
    if (columnName && JSONB_COLUMNS.has(columnName)) {
      return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    }
    // Arrays of objects → JSONB (e.g. ingredients, sections)
    if (val.length > 0 && typeof val[0] === "object") {
      return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    }
    // Postgres text/enum array (e.g. diet_types, utensils)
    if (val.length === 0) return "'{}'";
    const elements = val.map((v) =>
      `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
    );
    return `'{${elements.join(",")}}'`;
  }
  if (typeof val === "object") {
    // JSONB object
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  // String — escape single quotes and backslashes
  return `'${String(val).replace(/'/g, "''")}'`;
}

function buildInsertQuery(
  table: string,
  rows: Record<string, unknown>[],
): string {
  if (rows.length === 0) return "";

  const columns = Object.keys(rows[0]);
  const columnList = columns.map((c) => `"${c}"`).join(", ");

  const valueRows = rows.map((row) => {
    const values = columns.map((col) => formatValue(row[col], col));
    return `(${values.join(", ")})`;
  });

  return `INSERT INTO "${table}" (${columnList}) VALUES\n${valueRows.join(",\n")}\nON CONFLICT DO NOTHING;`;
}

async function migrateTable(table: string, validUserIds: Set<string>) {
  console.log(`\nMigrating ${table}...`);

  let rows = await fetchAllRows(table);
  console.log(`  Fetched ${rows.length} rows from Supabase`);

  // Handle schema mismatches for deletion_requests (added NOT NULL columns after original data)
  if (table === "deletion_requests") {
    rows = rows.map((r) => ({
      ...r,
      user_email: r.user_email ?? "unknown@deleted",
      confirmation_phrase: r.confirmation_phrase ?? "migrated",
    }));
  }

  // Filter out rows with orphaned user_ids (from deleted users)
  if (TABLES_WITH_USER_FK.has(table)) {
    const before = rows.length;
    rows = rows.filter((r) => {
      const userId = r.user_id as string | null;
      return !userId || validUserIds.has(userId);
    });
    const skipped = before - rows.length;
    if (skipped > 0) {
      console.log(`  Skipped ${skipped} rows with orphaned user_id`);
    }
  }

  if (rows.length === 0) {
    console.log(`  Skipping (no data)`);
    return 0;
  }

  // Insert in batches to avoid query size limits
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const query = buildInsertQuery(table, batch);

    try {
      await sql.query(query);
      inserted += batch.length;
      if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= rows.length) {
        console.log(`  Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
      }
    } catch (error) {
      console.error(
        `  Error inserting batch at offset ${i} into ${table}:`,
        error,
      );
      console.error("  First row in batch:", JSON.stringify(batch[0], null, 2));
      console.error("  Query preview:", query.substring(0, 500));
      throw error;
    }
  }

  console.log(`  Inserted ${inserted} rows into Neon`);
  return inserted;
}

// Tables that have a user_id FK to user_profiles — orphaned rows will be skipped
const TABLES_WITH_USER_FK = new Set([
  "recipes",
  "custom_units",
  "api_usage",
  "feedback",
]);

async function getValidUserIds(): Promise<Set<string>> {
  const rows = await sql`SELECT id FROM user_profiles`;
  return new Set(rows.map((r) => r.id as string));
}

async function main() {
  console.log("Starting data migration: Supabase → Neon");
  console.log("=".repeat(50));

  const results: Record<string, number> = {};

  // Import user_profiles first (root table, no FK dependencies)
  results["user_profiles"] = await migrateTable("user_profiles", new Set());

  // Now get valid user IDs for FK filtering
  const validUserIds = await getValidUserIds();
  console.log(`\nFound ${validUserIds.size} valid user IDs in Neon`);

  // Import remaining tables
  for (const table of TABLES_TO_MIGRATE) {
    if (table === "user_profiles") continue;
    results[table] = await migrateTable(table, validUserIds);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Migration complete! Summary:");
  for (const [table, count] of Object.entries(results)) {
    console.log(`  ${table}: ${count} rows`);
  }

  // Verify row counts
  console.log("\nVerifying row counts in Neon...");
  for (const table of TABLES_TO_MIGRATE) {
    const result = await sql.query(
      `SELECT count(*) as count FROM "${table}"`,
    );
    const neonCount = parseInt(result[0].count as string, 10);
    const match = neonCount === results[table] ? "✅" : "❌";
    console.log(`  ${table}: ${neonCount} rows ${match}`);
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
