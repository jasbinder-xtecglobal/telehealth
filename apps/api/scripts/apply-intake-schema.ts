/**
 * Applies the public-intake schema directly.
 *
 * `drizzle-kit push` is not transactional and has previously left tables on
 * this database created but without their foreign keys — which fails silently,
 * because cascades never fire and orphans accumulate unnoticed. This script is
 * idempotent and verifies the result, which push does not.
 *
 *   node --experimental-transform-types scripts/apply-intake-schema.ts
 */
import { sql } from "drizzle-orm";
import { closeDatabase, db } from "../src/db/client.ts";

await db.execute(
  sql.raw(`
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM ('submitted', 'reviewing', 'accepted', 'declined');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_preference') THEN
    CREATE TYPE employment_preference AS ENUM ('part_time', 'full_time');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_method') THEN
    CREATE TYPE contact_method AS ENUM ('phone', 'email', 'sms');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS consult_intake (
  consult_id uuid PRIMARY KEY REFERENCES consults(id) ON DELETE CASCADE,
  email text,
  preferred_contact contact_method NOT NULL DEFAULT 'phone',
  reason_label text NOT NULL,
  symptoms_started_on date,
  pain_level integer,
  reported_medications text,
  reported_allergies text,
  reported_conditions text,
  preferred_doctor text,
  preferred_time text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  ahpra_number text NOT NULL,
  years_experience text NOT NULL,
  specialty text NOT NULL,
  employment employment_preference NOT NULL,
  cover_letter text,
  status application_status NOT NULL DEFAULT 'submitted',
  reviewed_at timestamptz,
  reviewed_by_doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doctor_applications_status_idx ON doctor_applications(status);

-- A table left behind by a half-applied push already exists, so CREATE TABLE
-- IF NOT EXISTS is a no-op and the foreign keys must be added separately.
-- Clear orphans first or the ALTER will refuse.
DELETE FROM consult_intake i WHERE NOT EXISTS (SELECT 1 FROM consults c WHERE c.id = i.consult_id);

-- Remove the duplicate an earlier version of this script added under an
-- explicit name. Must run before the block below, which re-adds it only if
-- the column ends up with no foreign key at all.
ALTER TABLE consult_intake DROP CONSTRAINT IF EXISTS consult_intake_consult_id_consults_id_fk;
ALTER TABLE doctor_applications DROP CONSTRAINT IF EXISTS doctor_applications_reviewed_by_doctor_id_doctors_id_fk;

-- Guard on the column, not the constraint name. CREATE TABLE's inline
-- REFERENCES already made a foreign key under a server-generated name, so a
-- name-based guard adds a second one enforcing the same rule.
DO $$
DECLARE
  col_attnum smallint;
BEGIN
  SELECT attnum INTO col_attnum FROM pg_attribute
    WHERE attrelid = 'consult_intake'::regclass AND attname = 'consult_id';
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'consult_intake'::regclass AND contype = 'f'
      AND conkey = ARRAY[col_attnum]
  ) THEN
    ALTER TABLE consult_intake ADD CONSTRAINT consult_intake_consult_id_consults_id_fk
      FOREIGN KEY (consult_id) REFERENCES consults(id) ON DELETE CASCADE;
  END IF;

  SELECT attnum INTO col_attnum FROM pg_attribute
    WHERE attrelid = 'doctor_applications'::regclass AND attname = 'reviewed_by_doctor_id';
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'doctor_applications'::regclass AND contype = 'f'
      AND conkey = ARRAY[col_attnum]
  ) THEN
    ALTER TABLE doctor_applications ADD CONSTRAINT doctor_applications_reviewed_by_doctor_id_doctors_id_fk
      FOREIGN KEY (reviewed_by_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;
  END IF;
END $$;
`),
);

const rows = async (q: string) =>
  (await db.execute(sql.raw(q))).rows as Record<string, unknown>[];

let ok = true;

for (const [table, expectedFks] of [
  ["consult_intake", 1],
  ["doctor_applications", 1],
] as const) {
  const cols = Number(
    (
      await rows(
        `select count(*) c from information_schema.columns where table_name = '${table}'`,
      )
    )[0]!.c,
  );
  const fks = (
    await rows(
      `select conname from pg_constraint where conrelid = '${table}'::regclass and contype = 'f'`,
    )
  ).length;
  const pks = (
    await rows(
      `select conname from pg_constraint where conrelid = '${table}'::regclass and contype = 'p'`,
    )
  ).length;

  const pass = cols > 0 && fks === expectedFks && pks === 1;
  if (!pass) ok = false;
  console.log(
    `${pass ? "OK  " : "FAIL"} ${table}: ${cols} columns, ${fks}/${expectedFks} foreign key(s), ${pks} primary key`,
  );
}

await closeDatabase();
if (!ok) process.exit(1);
