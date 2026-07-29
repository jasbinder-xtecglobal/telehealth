# After-Hours Telehealth — Clinician Console (Prototype)

A working prototype of the doctor-facing workstation for a bulk-billed
after-hours medical service. Real database, real state machine, real queue
behaviour. Every external system — drug database, eScript exchange, Medicare
claiming, SMS, prescription monitoring, the AI scribe — sits behind a port with
a mock adapter.

- [CLAUDE.md](CLAUDE.md) — architecture rules and the ten safety invariants
- [docs/FEATURES.md](docs/FEATURES.md) — full feature inventory and gap analysis
- [docs/system-flow.html](docs/system-flow.html) — system flow and delivery plan

---

## Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| Web | Vite 6 · React 19 · TypeScript · Tailwind v4 · React Router 7 |
| Data fetching | TanStack Query v5 · tRPC v11 — typed end to end, no codegen |
| API | Node 24 · Fastify 5 · tRPC v11 · Zod |
| Database | **Neon** serverless Postgres · Drizzle ORM |
| Live updates | tRPC subscriptions over server-sent events |
| Tests | `node --test` with native TypeScript stripping |

No Docker. No local database install.

---

## Setup

**1. Create a Neon database** — free tier is enough.

- Sign up at <https://console.neon.tech> and create a project
- Open **Connection Details** and copy the **pooled** connection string
  (the host contains `-pooler`)

**2. Configure**

```bash
cp .env.example .env
```

Paste your connection string into `DATABASE_URL`. It should look like:

```
DATABASE_URL=postgresql://user:pass@ep-xxxx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require
```

**3. Install and load the schema**

```bash
pnpm install
pnpm db:push     # creates the tables
pnpm db:seed     # loads the demo queue
```

**4. Run**

```bash
pnpm dev
```

API on `:4000`, web on `:5173`. Open <http://localhost:5173>.

### Signing in

The seed creates four pre-verified accounts:

```
david.szekely@example.test      (GP Fellow)
bowen.zhao@example.test         (VR)
carter.snowden@example.test     (non-VR — different MBS items)
jonathan.brown@example.test     (GP Fellow)

Password: Nightshift2026Rounds
```

To exercise the full registration flow, use **Register as a clinician**. No mail
server is configured, so the verification link is printed to the API console and
also listed at <http://localhost:5173/verify>.

> The API validates `DATABASE_URL` at startup and exits with a readable message
> if it is missing or malformed — it will not start against a half-configured
> environment.

| Command | Purpose |
|---|---|
| `pnpm dev` | Both apps |
| `pnpm test` | Domain unit tests — **no database required** |
| `pnpm typecheck` | Both apps |
| `pnpm db:reset` | Push schema and reseed |
| `pnpm db:studio` | Drizzle Studio against Neon |

---

## Architecture

Layered with inward-only dependencies.

```
routers/        transport — validate, delegate, return
   ↓
services/       use-case orchestration
   ↓         ↘
domain/      repositories/ + integrations/
(pure)       (interfaces; implementations injected)
   ↑
container.ts    composition root — the only file naming concrete classes
```

```
apps/api/src/
  config/env.ts           validated configuration; the only reader of process.env
  db/schema/              Drizzle tables split by domain + relations
  db/transaction-runner   transaction boundary abstraction
  domain/                 pure business rules — no I/O, fully unit-tested
    consult/              lifecycle state machine, close gates
    prescribing/          allergy, interaction and duplicate-therapy rules
    billing/              MBS item eligibility and duration validation
    queue/                visibility, acuity ordering, family grouping
  repositories/           ports.ts (interfaces) + drizzle/ (implementations)
  integrations/           ports.ts (interfaces) + mock adapters per system
  services/               orchestration — the only layer that coordinates
  routers/                thin tRPC procedures
  container.ts            dependency injection

apps/web/src/
  app/                    routing composition
  features/               queue · consult · account · collaboration · admin
  shared/                 ui · lib · layout
```

The payoff is measurable: **43 domain tests run in ~150 ms with no database**,
because the rules that matter most were extracted from the transport and data
layers.

Why the WebSocket Neon driver rather than the HTTP one: the consult-close path
runs inside a transaction, and the HTTP driver does not support transactions.

---

## Try this walkthrough

1. **Waiting room.** Three queues. Ordering is **acuity first**, then wait time —
   switch to *Home Visits* and the four-year-old with a fever sorts above adults
   who have waited longer.

2. **Family groups.** David Szekely carries a badge of 2. Claiming him assigns
   Child Szekely at the same time.

3. **Filters.** *Filters* → tick "Men's Health". Those rows leave your queue and
   stay visible to everyone else. The change is audited.

4. **Claim locking.** Open a patient in two tabs, click *Start Consult* in both.
   The second gets a conflict, not a double booking.

5. **AI scribe.** *Transcript* → tick consent → capture → *AI Scribe*. The note is
   written into **your** template. Without consent recorded, the scribe refuses.

6. **Prescribing safety.** Claim **Carter Snowden** (documented penicillin
   allergy) → *Prescribe* → search "amox". The contraindication blocks submission
   until you supply an override reason, which is audited. Try "oxycodone" for the
   monitored-medicine alert, or "molnupiravir" for PBS streamlined criteria.

7. **The close transaction.** Draft a script, a certificate and a pathology
   request — the left panel shows them *pending release* with no eScript token.
   *End* enforces four gates. On close, everything is issued in one transaction
   and the token appears. **Billing** shows the patient delivery log.

8. **Follow-up loop.** The pathology request lands in **Inbox** awaiting
   acknowledgement.

9. **Switch doctors.** Click a name under *Online users*. Carter Snowden is
   non-VR, so his MBS item list differs.

---

## Real vs mocked

**Real:** authentication (scrypt passwords, httpOnly session cookies, single-use
email verification, account lockout, no enumeration), consult state machine,
claim locking, family grouping, acuity ordering, category filters, append-only
note revisions with AI provenance, coded allergies and interaction checking,
consent gating, MBS filtering and duration validation, the atomic close
transaction, immutable audit log.

**Mocked:** drug database (14 products), eScript tokens, SMS, Medicare claiming,
prescription monitoring, and the scribe — a deterministic transcript-to-template
mapper, not a language model. All swap points are in `integrations/`.

**Not built:** video/telephony transport, patient booking app, dispatcher
workstation, aged-care portal, admin and governance consoles.

### Home-visit dispatch

The **Home Visits** tab is a full dispatch board, not a queue list:

- **Map** (Leaflet + OpenStreetMap — needs network at runtime) with numbered,
  acuity-coloured pins, the doctor's position, and the route drawn through
  sequenced stops
- **Optimise Route** — acuity-banded nearest-neighbour. Urgent patients are
  never sequenced behind routine ones, even when the routine one is closer
- **Assignment** — self-assign off the board or accept a dispatcher offer;
  declining returns the visit to the pool with an audited reason
- **Lone-worker safety** — arrival check-in starts a timer; no check-out by 45
  minutes prompts, and by 60 minutes raises an alert **automatically**. That is
  the control a panic button cannot be, because it needs no free hand
- **Panic button**, and a duress banner visible to everyone on the board
- Patient is SMS'd an ETA when the doctor sets off

Tabs are deep-linkable: `/?tab=home_visit`.

---

## Deliberate departures from the reference software

Seven behaviours were changed because reproducing them faithfully would carry
real clinical or governance risk.

| Reference | This build |
|---|---|
| Allergies as free text | Coded allergies that drive interaction checking |
| No prescribing safety checks | Contraindication, duplicate-therapy and monitoring alerts, with audited override |
| Notes silently editable | Append-only revisions, AI-flagged, model version retained |
| Consult closes at will | Four gates: notes present, saved, attested, billing recorded |
| Hide patient in one click | Reason required, auditable, reversible |
| Reject with no record | Reason captured and audited |
| FIFO queue | Acuity-ranked, then wait time |

Each is enforced in `domain/`, covered by a test, and surfaced in the UI.
