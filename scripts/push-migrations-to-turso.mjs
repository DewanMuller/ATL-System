// Applies any not-yet-applied prisma/migrations/* to a remote Turso/libSQL
// database. Needed because `prisma migrate deploy`/`db push` only understand
// "file:" datasource URLs, not "libsql://" — Prisma's schema engine has no
// driver-adapter support, unlike the Prisma Client used at runtime (see
// lib/prisma.ts). Run this after every `prisma migrate dev` that you want
// reflected in production.
//
// Usage:
//   TURSO_URL="libsql://<db>.turso.io" TURSO_TOKEN="<token>" node scripts/push-migrations-to-turso.mjs
import { createClient } from "@libsql/client";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_TOKEN;
if (!url || !authToken) throw new Error("Set TURSO_URL and TURSO_TOKEN env vars");

const client = createClient({ url, authToken });

const migrationsDir = "prisma/migrations";
const folders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

console.log(`Found ${folders.length} migrations.`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
  )
`);

for (const folder of folders) {
  const sqlPath = join(migrationsDir, folder, "migration.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");

  const existing = await client.execute({
    sql: `SELECT id FROM "_prisma_migrations" WHERE migration_name = ?`,
    args: [folder],
  });
  if (existing.rows.length > 0) {
    console.log(`skip (already applied): ${folder}`);
    continue;
  }

  const statements = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`applying: ${folder} (${statements.length} statements)`);
  await client.migrate(statements);

  const id = createHash("sha256").update(folder + Date.now()).digest("hex").slice(0, 32);
  await client.execute({
    sql: `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, datetime('now'), ?, 1)`,
    args: [id, checksum, folder],
  });
}

const tables = await client.execute(
  `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
);
console.log("\nTables on remote:");
for (const row of tables.rows) console.log(" -", row.name);

client.close();
