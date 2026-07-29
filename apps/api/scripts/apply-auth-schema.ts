/**
 * Applies the authentication schema directly.
 *
 * `drizzle-kit push` fails on this database with a spurious
 * `ALTER COLUMN "id" DROP NOT NULL`, and because push is not transactional it
 * leaves the schema half-applied when it does. This script is idempotent and
 * verifies the result, which push does not.
 *
 *   node --experimental-transform-types scripts/apply-auth-schema.ts
 */
import { sql } from "drizzle-orm";
import { closeDatabase, db } from "../src/db/client.ts";

await db.execute(
  sql.raw(`
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('pending_verification', 'active', 'suspended');
  END IF;
END $$;

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS status account_status NOT NULL DEFAULT 'pending_verification';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS locked_until timestamptz;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text,
  ip_address text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_doctor_idx ON sessions(doctor_id);
CREATE INDEX IF NOT EXISTS email_verification_tokens_doctor_idx ON email_verification_tokens(doctor_id);

-- The tables may already exist without constraints, left behind by a failed
-- push. CREATE TABLE IF NOT EXISTS is a no-op in that case, so the foreign
-- keys have to be added separately.
DELETE FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM doctors d WHERE d.id = s.doctor_id);
DELETE FROM email_verification_tokens t WHERE NOT EXISTS (SELECT 1 FROM doctors d WHERE d.id = t.doctor_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_doctor_id_doctors_id_fk') THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_doctor_id_doctors_id_fk
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_tokens_doctor_id_doctors_id_fk') THEN
    ALTER TABLE email_verification_tokens ADD CONSTRAINT email_verification_tokens_doctor_id_doctors_id_fk
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
  END IF;
END $$;
`),
);

const rows = async (q: string) => (await db.execute(sql.raw(q))).rows as Record<string, unknown>[];

const doctorCols = (
  await rows(`select column_name from information_schema.columns where table_name = 'doctors'`)
).map((c) => c.column_name);

const required = [
  "password_hash",
  "status",
  "email_verified_at",
  "failed_login_attempts",
  "locked_until",
  "last_login_at",
];

console.log("doctors auth columns:", required.every((c) => doctorCols.includes(c)) ? "OK" : "MISSING");

for (const table of ["sessions", "email_verification_tokens"]) {
  const cols = (await rows(`select count(*) c from information_schema.columns where table_name = '${table}'`))[0]!.c;
  const fks = (await rows(`select conname from pg_constraint where conrelid = '${table}'::regclass and contype = 'f'`)).length;
  const uniques = (await rows(`select conname from pg_constraint where conrelid = '${table}'::regclass and contype = 'u'`)).length;
  console.log(`${table}: ${cols} columns, ${fks} foreign key(s), ${uniques} unique constraint(s)`);
}

await closeDatabase();
