# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A clinician workstation for a bulk-billed **after-hours telehealth service**. A
doctor logs in at the start of a shift, claims patients from a live queue,
consults by phone or video, prescribes, refers, orders investigations, issues
certificates, and bills Medicare.

This is a **prototype**: the clinical logic and data model are real, every
external system is mocked. See [README.md](README.md) to run it and
[docs/FEATURES.md](docs/FEATURES.md) for the full feature inventory.

---

## Non-negotiable invariants

Break any of these and the product becomes clinically or legally indefensible.
They are enforced in code, not by convention. Do not weaken one to make a task
easier — raise it instead.

1. **Nothing reaches the patient before the consult closes.** Prescriptions,
   referrals, request forms and certificates are created as `draft` and released
   in a single transaction by `ConsultService.close`. No other code path may
   issue an artefact or send a patient artefact SMS.

2. **A consult cannot close until four gates pass** — notes exist, notes are
   saved, notes are attested, a billing decision is recorded. Defined once in
   `evaluateCloseGates` and used by both the service and the UI checklist.

3. **Clinical notes are append-only.** Every change writes a `note_revisions`
   row. Never `UPDATE consults.notes` without also appending a revision.

4. **Editing notes clears attestation.** The doctor signed off on specific
   words. If the words change, `notesAttestedAt` returns to `null`.

5. **AI output carries provenance.** Any AI-generated note stores
   `aiGenerated: true` and the model identifier, and the source transcript is
   retained. A `ScribePort` implementation that cannot report a model id is not
   acceptable.

6. **The scribe requires recorded consent.** No `consentGiven` transcript, no
   scribe. This is a legal requirement.

7. **Allergies are coded, never free text.** Interaction checking cannot run
   against prose.

8. **A contraindication is a hard stop.** It may only be bypassed with an
   override reason of substance, and the override is audited.

9. **Every state change is audited.** Claims, rejections, hides, attestations,
   overrides, closes. `AuditRepository` is append-only by design — it exposes no
   update or delete.

10. **Destructive queue actions need a reason.** Rejecting a consult or hiding a
    patient both require one, and both are auditable.

11. **Every clinical procedure requires a session.** `doctorProcedure` is the
    only way to reach patient data. Two unauthenticated procedure types exist
    and neither may read a patient record:
    - `publicProcedure` — signup, login and verification only.
    - `intakeProcedure` — public booking and doctor applications from the
      website. Write-only, rate limited, and it may never create an account, a
      session, a clinical artefact or a billing record. A patient booking has
      no account to authenticate with; that is the entire exemption.

    Anything that reads or changes an existing patient's record goes on
    `doctorProcedure`, without exception.

12. **Verification gates sign-in.** A correct password on an unverified account
    yields no session. Passwords are scrypt-hashed; session and verification
    tokens are stored as SHA-256 fingerprints, never in the clear.

### Still outstanding

**Multi-factor authentication is not implemented.** Invariant 11 above is
satisfied, but an account that can issue a PBS prescription should require a
second factor. This is the highest-priority gap in the auth work.

---

## Architecture

Layered, dependency-inverted. **Dependencies point inward only.**

```
routers/        transport — validate input, delegate, return
   ↓
services/       use-case orchestration; the only layer that coordinates
   ↓         ↘
domain/      repositories/ + integrations/
(pure)       (interfaces; implementations injected)
```

| Layer | Path | May import | Must never |
|---|---|---|---|
| **Domain** | `apps/api/src/domain/` | Only types and other domain code | Touch a database, network, clock or framework |
| **Repositories** | `apps/api/src/repositories/` | Drizzle, schema | Contain business rules |
| **Integrations** | `apps/api/src/integrations/` | External SDKs | Contain business rules |
| **Services** | `apps/api/src/services/` | Domain, repository ports, integration ports | Import Drizzle or tRPC |
| **Routers** | `apps/api/src/routers/` | Services, Zod schemas | Contain conditionals or business rules |
| **Composition** | `apps/api/src/container.ts` | Everything | — |

### Where does my code go?

- **A rule about when something is allowed** → `domain/*/**.policy.ts`, pure, with a test
- **A sequence of steps across several rules or tables** → `services/`
- **A query or write** → `repositories/drizzle/`
- **A call to something outside the process** → new port in `integrations/ports.ts` + adapter
- **A new endpoint** → `routers/*.router.ts`, one-line delegation
- **A new dependency** → wire it in `container.ts`, nowhere else

### Smells to fix, not follow

- A router with an `if` in it → the rule belongs in a policy or service
- A service importing `drizzle-orm` → add a repository method
- Business logic in a repository → move it to `domain/`
- `new SomeAdapter()` outside `container.ts` → inject it instead
- A domain file importing anything with I/O → it is no longer pure

---

## SOLID in this codebase

- **SRP** — `consult.policy.ts` decides *whether*; `ConsultService` decides
  *in what order*; `DrizzleConsultRepository` decides *how to persist*.
- **OCP** — a new artefact type extends `ArtefactRepository` and the close loop
  without editing existing artefact logic.
- **LSP** — every mock adapter is substitutable for its real counterpart; the
  container swaps them freely.
- **ISP** — ports are narrow. `ChatService` takes `EventBusPort`, not a bundle.
- **DIP** — services name interfaces only; `container.ts` is the sole place
  concretes appear.

---

## Stack

| | |
|---|---|
| Monorepo | pnpm workspaces — `apps/api`, `apps/web` |
| API | Node 24, Fastify 5, tRPC v11, Zod, Drizzle ORM |
| Database | **Neon** serverless Postgres over WebSocket (`drizzle-orm/neon-serverless`) |
| Web | Vite 6, React 19, TypeScript, Tailwind v4, React Router 7, TanStack Query |
| Tests | `node --test` with native TypeScript support — no test runner dependency |

**Run TypeScript with `--experimental-transform-types`, never
`--experimental-strip-types`.** The codebase uses constructor parameter
properties (`constructor(private readonly db: Database) {}`) throughout the
repository and service layers. Strip-only mode cannot handle them and fails at
load with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. All package scripts already use
the correct flag — match it in any new script.

**No Docker.** The database is Neon. `DATABASE_URL` in the repo-root `.env` is
the only configuration required; `apps/api/src/config/env.ts` validates it at
startup and is the only file permitted to read `process.env`.

The **WebSocket** Neon driver is deliberate — the HTTP driver cannot do
transactions, and the consult-close path needs one.

---

## Schema changes — `push` is not transactional

`drizzle-kit push` applies statements one at a time and does **not** roll back on
failure. A push that errors part-way leaves tables created but their foreign
keys and unique indexes missing, which fails silently: `ON CONFLICT DO NOTHING`
catches nothing, cascades never fire, and orphan rows accumulate.

After any `db:push`, verify the constraints actually landed:

```sql
select conname from pg_constraint where conrelid = '<table>'::regclass and contype = 'f';
select indexname from pg_indexes where tablename = '<table>';
```

For anything beyond a prototype, switch to `drizzle-kit generate` plus a
migration runner so each change applies inside a transaction.

## Commands

```bash
pnpm dev            # api :4000 + web :5173
pnpm test           # domain unit tests — no database required
pnpm typecheck      # both apps
pnpm db:push        # push schema to Neon
pnpm db:seed        # load the demo queue
pnpm db:reset       # push + seed
```

Always run `pnpm typecheck` and `pnpm test` before reporting work complete.

---

## Web conventions

```
apps/web/src/
  app/                    routing composition
  features/<feature>/     components/ and routes/ owned by that feature
  shared/ui/              presentational primitives, no data fetching
  shared/lib/             formatting, tRPC client
  shared/layout/          app shell
```

- Import across features via the `@/` alias, never `../../..`
- `shared/ui` must stay free of tRPC and business logic
- Server state is TanStack Query only — do not mirror it into `useState`
- Where a UI rule mirrors a domain rule (the close checklist), render the
  server's answer; do not re-implement it in the client

---

## Working with mocks

Everything in `integrations/*/mock-*.adapter.ts` stands in for a system needing
a commercial agreement or conformance testing: drug database, eScript exchange,
Medicare claiming, prescription monitoring, SMS, and the scribe.

When replacing one:
1. Implement the existing port — do not change its shape to suit a vendor SDK
2. Register it in `container.ts`
3. Leave the mock in place; tests depend on it

The scribe mock is deterministic on purpose. Keep it that way so tests stay
reproducible.

---

## Editing files on Windows

Do not bulk-rewrite source files with PowerShell `Get-Content` / `Set-Content`.
PS 5.1 reads as ANSI and writes UTF-8, which double-encodes every em dash,
ellipsis and curly quote into mojibake (`—` becomes `â€"`). Use the Edit tool,
or `[System.IO.File]::ReadAllText/WriteAllText` with an explicit
`UTF8Encoding($false)`.

## Data and safety

Seed data is entirely synthetic — provider numbers, Medicare numbers, phone
numbers and addresses are invented. **Never commit real patient data, real
provider numbers, or a live `DATABASE_URL`.** `.env` is gitignored; keep it so.

---

## What is deliberately not built

Video and telephony transport, the patient booking app, the dispatcher
workstation, the aged-care facility portal, admin and clinical-governance
consoles, and home-visit routing. The Home Visits tab shows a real acuity-ranked
queue but no map or dispatch.

Do not stub these into existence without being asked — their absence is a scope
decision, recorded in `docs/FEATURES.md`.
