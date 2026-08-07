---
name: vertical-slice
description: Add or extend a feature across every layer of the telehealth codebase in the correct order — schema, domain policy, repository, port, service, router, container, UI, tests. Use whenever the task adds a new clinical action, artefact type, queue behaviour, endpoint, external integration, or any change that touches more than one layer. Also use when a change "feels like it belongs in the router" — that is the signal the layering is about to be violated.
---

# Adding a vertical slice

This codebase is layered with inward-only dependencies. Work outside-in when
designing, but build **inside-out** — the domain first, the UI last. Skipping to
the router is how business rules leak into transport, which is the exact problem
this architecture exists to prevent.

Read [CLAUDE.md](../../../CLAUDE.md) first if you have not already; the ten
invariants there override anything in this skill.

## Decide the shape before writing code

Answer these three, in order:

1. **Is there a new rule about whether something is allowed?**
   → a pure function in `server/src/domain/<area>/*.policy.ts`, plus a test.
2. **Does it read or write the database?**
   → a method on a repository interface, then a Drizzle implementation.
3. **Does it call anything outside this process?**
   → a new port in `integrations/ports.ts` and an adapter beside it.

If all three are "no", you are probably editing an existing service and nothing
else. Do that and stop.

## Build order

### 1. Schema — only if new tables or columns are needed

Add to the right domain module under `server/src/db/schema/`:
`patients` · `doctors` · `consults` · `reference` · `artefacts` · `billing` ·
`collaboration` · `audit`.

- Export the table **and** its inferred types from that module.
- Add both sides of any relation to `relations.ts` — Drizzle cannot infer a
  `with: { … }` join unless the `one()` side exists. This is the single most
  common cause of a runtime "not enough information to infer relation" error.
- Re-export from `schema/index.ts` if you created a new module.
- Run `pnpm db:push` then `pnpm db:seed`.

### 2. Domain policy — the rules, pure

```
server/src/domain/<area>/<name>.policy.ts
server/src/domain/<area>/<name>.policy.test.ts
```

- Plain functions over plain data. No Drizzle, no `fetch`, no `new Date()` —
  take `now: Date` as a parameter if you need time.
- Throw the helpers from `domain/errors.ts` (`notFound`, `conflict`,
  `forbidden`, `precondition`, `invalid`), never `TRPCError`.
- Where a rule must also be shown in the UI, return it as **data** the way
  `evaluateCloseGates` does, so the service enforces and the client renders from
  one definition.
- Write the test now, not later. It runs without a database in milliseconds —
  there is no excuse to defer it.

### 3. Repository — the data access

- Add the method to the interface in `repositories/ports.ts` first.
- Implement in `repositories/drizzle/<name>.repository.ts`.
- Accept `tx?: Executor` as the last parameter and resolve it with
  `this.exec(tx)`. Without this the method cannot join a transaction, and the
  consult-close path will silently fall outside its atomicity guarantee.
- Return domain-shaped data. Ordering and filtering that expresses a *rule*
  belongs in the policy, not the query — see how `listQueued` returns unordered
  rows and `buildQueue` sorts them.

### 4. Integration port — only for external systems

- Add a **narrow** interface to `integrations/ports.ts`. One capability per
  port; do not extend an existing port with unrelated methods.
- Write the mock adapter in `integrations/<area>/mock-*.adapter.ts`.
- Keep mocks deterministic so tests stay reproducible.

### 5. Service — the orchestration

`server/src/services/<name>.service.ts`

- Constructor takes **interfaces only**. Never import `drizzle-orm` or `@trpc/*`.
- Ask the domain whether it is allowed, ask repositories to read and write, ask
  ports to reach the outside world.
- Audit any state change: `this.audit.record({ … })`.
- Publish an event if the UI needs to react: `this.events.publish({ … })`.
- Wrap multi-write operations in `this.tx.run(async (tx) => …)` and pass `tx`
  through to every repository call inside it.

### 6. Container — the wiring

Register new repositories, ports and services in `server/src/container.ts`.
This is the **only** file allowed to contain `new SomeAdapter()`. Add the type
to `Ports`, `Repositories` or `Services` so overrides stay typed.

### 7. Router — transport only

`server/src/routers/<area>.router.ts`

- Put the Zod schema in `routers/schemas.ts` if it is reused.
- Each procedure is a **one-line delegation** to a service.
- If you find yourself writing an `if`, stop: that logic belongs in a policy or
  a service. Domain errors are already translated to tRPC codes by the
  middleware in `trpc.ts` — do not catch them here.

### 8. Web

- Feature code lives in `src/features/<feature>/`.
- Shared presentational pieces go in `shared/ui`, which must stay free of tRPC.
- Import across features with the `@/` alias.
- Server state is TanStack Query — do not copy it into `useState`.
- After a mutation, invalidate with `trpc.<router>.<proc>.queryKey(...)`.

## Before reporting done

```bash
pnpm typecheck
pnpm test
```

Both must pass. If the change touches the consult lifecycle, also drive it end
to end through the running app — a green typecheck does not prove the artefact
release path still works.

## Worked example — adding a new artefact type

A "sick certificate for a carer" already exists as a `documentType`. Adding a
genuinely new artefact — say a care plan — looks like this:

1. `schema/artefacts.ts` — new table with `status: artefactStatus` defaulting to
   `draft`, plus `issuedAt`
2. `schema/relations.ts` — `one(consults)` side, and add to `consultsRelations`
3. `repositories/ports.ts` — `createCarePlan`, `issueCarePlan` on
   `ArtefactRepository`
4. `repositories/drizzle/artefact.repository.ts` — implement both
5. `services/consult.service.ts` — a `createCarePlan` method, and **add it to
   the release loop inside `close()`** so it is issued with everything else
6. `routers/consult.router.ts` — one procedure
7. `features/consult/components/ActionModals.tsx` — a modal
8. Confirm the close transaction issues it, and that nothing reaches the patient
   before then

Step 5 is the one people forget. An artefact that is never released is worse
than one that was never built.
