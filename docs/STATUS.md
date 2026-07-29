# Project status

Last updated: 28 July 2026

## Where things stand

The clinician console is working end to end against a live Neon database, with
authentication in front of it.

```bash
pnpm dev          # api :4000, web :5173
```

Sign in as `david.szekely@example.test` / `Nightshift2026Rounds`.

## Verified at last checkpoint

| Suite | Result |
|---|---|
| Domain unit tests (`pnpm test`) | 97 pass, no database needed |
| Auth end-to-end | 29 pass |
| Consult end-to-end | 24 pass |
| Dispatch end-to-end | 20 pass |
| Typecheck, both apps | clean |

The three end-to-end scripts live in the session scratchpad, not the repo. They
sign in with a seeded account and drive the real HTTP API. Worth moving into
`apps/api/test/` when this stops being a prototype.

## Built

- **Authentication** — signup, single-use email verification, login, logout,
  scrypt passwords, httpOnly session cookies, account lockout, no enumeration
- **Waiting room** — live queue, acuity ordering, category filters, family
  grouping, claim locking
- **Consult console** — notes, per-doctor templates, AI scribe with provenance,
  patient summary
- **Five clinical actions** — prescribe (with allergy, interaction and
  monitoring checks), refer, investigate, document, bill
- **Close transaction** — four gates, atomic artefact release
- **Home-visit dispatch** — map, acuity-banded routing, assignment, arrival
  check-in with automatic lone-worker escalation, panic button
- **Inbox** — investigation follow-up

## Not built

Video and telephony transport, patient booking app, dispatcher workstation,
aged-care facility portal, admin and clinical-governance consoles.

See [FEATURES.md](FEATURES.md) for the full gap analysis against the flow
document.

## Next, in priority order

1. **Rework doctor signup into an invitation flow.** Self-service account
   creation is wrong for this business — see the open decision below.
2. **GP report via secure messaging.** The biggest credibility gap: the service
   promises a report to the patient's usual GP and nothing implements it.
3. **Multi-factor authentication.** An account that can issue a PBS prescription
   should require a second factor.
4. **Claim submission and rejection handling.** Billing status flips to
   `submitted`; nothing actually submits or handles a rejection.
5. **Emergency escalation.** No one-click 000 pathway.

## Open decision — blocking item 1

13SICK's doctor-jobs page is an *expression of interest*, not account creation.
Doctors are recruited, credentialed and contracted before an account exists.
The current `/signup` lets anyone with a plausible provider number create a
prescribing account, which is worse than no control.

Awaiting answers to two questions before starting:

1. Should applicants self-serve anything after applying — a status page,
   document upload — or is it purely "we'll call you"?
2. Should an admin console ship with the rework, or should the recruitment
   pipeline be API-only until the admin surface exists?

## Known hazards

- **`drizzle-kit push` is not transactional and has failed twice on this
  database**, leaving tables created without their foreign keys or unique
  indexes. Symptoms are silent: `ON CONFLICT DO NOTHING` catches nothing and
  cascades never fire. Always verify constraints after a push, or move to
  generated migrations. `scripts/apply-auth-schema.ts` shows the safe pattern.
- Run TypeScript with `--experimental-transform-types`, never
  `--experimental-strip-types` — the codebase uses constructor parameter
  properties.
- Do not bulk-edit source with PowerShell `Get-Content`/`Set-Content` on
  Windows; it mangles UTF-8 punctuation.
