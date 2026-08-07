-- Real-time call sessions.
--
-- One row per attempt to put a doctor and a patient on a call, whichever vendor
-- carried it. Vendor-neutral by design: `provider` and `room_name` are the only
-- vendor-shaped columns, so adding or removing a transport needs no schema
-- change. This is the record that answers "which vendor did we use, how often,
-- and for how long" while the four candidates are compared.
--
-- Holds no clinical content. Media is never recorded here.

DO $$ BEGIN
  CREATE TYPE "call_provider" AS ENUM ('livekit','agora','twilio','zoom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "call_mode" AS ENUM ('audio','video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "call_sessions" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "consult_id"           uuid NOT NULL REFERENCES "consults"("id") ON DELETE CASCADE,
  "provider"             "call_provider" NOT NULL,
  "mode"                 "call_mode" NOT NULL,
  "room_name"            text NOT NULL,
  "started_by_doctor_id" uuid REFERENCES "doctors"("id") ON DELETE SET NULL,
  "started_at"           timestamptz NOT NULL DEFAULT now(),
  "ended_at"             timestamptz,
  "ended_reason"         text,
  "created_at"           timestamptz NOT NULL DEFAULT now()
);

-- Finding the live session for a consult is the hot path.
CREATE INDEX IF NOT EXISTS "call_sessions_consult_active_idx"
  ON "call_sessions" ("consult_id", "started_at" DESC);
