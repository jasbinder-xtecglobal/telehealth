/**
 * Migration runner.
 *
 * `drizzle-kit push` applies statements one at a time and does not roll back, so
 * a failure part-way leaves tables created but their foreign keys and unique
 * indexes missing — silently. Every file here runs inside a transaction
 * instead: it lands completely or not at all.
 *
 * Files are applied in filename order, once each, recorded in
 * `schema_migrations`. Running it twice is a no-op, so it is safe on every
 * deploy and safe against a database somebody has already patched by hand.
 *
 *   pnpm db:migrate                      # the database in .env
 *   DATABASE_URL=<prod> pnpm db:migrate  # any other
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { closeDatabase, db } from "./client.ts";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

async function main() {
  await db.execute(sql`
    create table if not exists "schema_migrations" (
      "name"        text primary key,
      "applied_at"  timestamptz not null default now()
    );
  `);

  const applied = new Set(
    (await db.execute(sql`select name from "schema_migrations"`)).rows.map((r) =>
      String(r.name),
    ),
  );

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("no migrations found in", MIGRATIONS_DIR);
    return;
  }

  let ran = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip     ${file}`);
      continue;
    }

    const body = await readFile(join(MIGRATIONS_DIR, file), "utf8");

    // The whole file is one transaction. A migration that fails leaves the
    // database exactly as it was, which is the entire point of not using push.
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(body));
      await tx.execute(
        sql`insert into "schema_migrations" ("name") values (${file})`,
      );
    });

    console.log(`  applied  ${file}`);
    ran++;
  }

  console.log(ran === 0 ? "already up to date." : `${ran} migration(s) applied.`);
}

try {
  await main();
} catch (err) {
  console.error("\nmigration failed — the database is unchanged.\n");
  console.error(err);
  await closeDatabase();
  process.exit(1);
}

await closeDatabase();
