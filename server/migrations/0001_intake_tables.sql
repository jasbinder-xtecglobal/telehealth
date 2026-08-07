-- Public intake: patient bookings and doctor applications from the website.
--
-- These tables arrived with the website feature but were never applied to every
-- database, which made `consult.get` fail with `relation "consult_intake" does
-- not exist` — the patient detail page 500s for every consult.
--
-- Written idempotently so it is a no-op where the tables were created by hand.

DO $$ BEGIN
  CREATE TYPE "application_status" AS ENUM ('submitted','reviewing','accepted','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "employment_preference" AS ENUM ('part_time','full_time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "contact_method" AS ENUM ('phone','email','sms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "consult_intake" (
  "consult_id"           uuid PRIMARY KEY REFERENCES "consults"("id") ON DELETE CASCADE,
  "email"                text,
  "preferred_contact"    "contact_method" NOT NULL DEFAULT 'phone',
  "reason_label"         text NOT NULL,
  "symptoms_started_on"  date,
  "pain_level"           integer,
  "reported_medications" text,
  "reported_allergies"   text,
  "reported_conditions"  text,
  "preferred_doctor"     text,
  "preferred_time"       text,
  "created_at"           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "doctor_applications" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "first_name"            text NOT NULL,
  "last_name"             text NOT NULL,
  "email"                 text NOT NULL,
  "phone"                 text NOT NULL,
  "ahpra_number"          text NOT NULL,
  "years_experience"      text NOT NULL,
  "specialty"             text NOT NULL,
  "employment"            "employment_preference" NOT NULL,
  "cover_letter"          text,
  "status"                "application_status" NOT NULL DEFAULT 'submitted',
  "reviewed_at"           timestamptz,
  "reviewed_by_doctor_id" uuid REFERENCES "doctors"("id") ON DELETE SET NULL,
  "review_note"           text,
  "created_at"            timestamptz NOT NULL DEFAULT now()
);
