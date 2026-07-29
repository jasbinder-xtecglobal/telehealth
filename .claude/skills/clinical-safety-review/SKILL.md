---
name: clinical-safety-review
description: Audit changes in the telehealth codebase against the ten clinical-safety and governance invariants — artefact escrow, close gates, append-only notes, attestation, AI provenance, recording consent, coded allergies, contraindication blocking, audit trail, and reasoned queue actions. Use before merging anything that touches consults, prescribing, notes, the AI scribe, billing, or the audit trail; when reviewing a PR in this repo; or whenever asked whether a change is safe to ship.
---

# Clinical safety review

This is a medical record system. A defect here does not produce a bad user
experience — it produces a wrong prescription, an unactioned abnormal result, or
a clinical note nobody can defend in a complaint.

Review against the ten invariants in [CLAUDE.md](../../../CLAUDE.md). For each,
the check below tells you what to grep for and what a violation looks like.

Report findings **most severe first**. Do not soften a finding because the fix
is inconvenient.

---

## 1. Artefact escrow

**Rule:** nothing reaches the patient before the consult closes.

- Search for `issuePrescription`, `issueReferral`, `issueDocument`,
  `escriptToken`. Every call site must be inside `ConsultService.close`.
- Search for `sms.send`. Only two legitimate callers exist: `nudge` (a join
  link, not an artefact) and `close` (the release).
- New artefact tables must default to `draft` and be added to the release loop.

**Violation looks like:** a token minted at creation time; an artefact sent from
a `create*` method; a new artefact type that never appears in `close()`.

## 2. Close gates

**Rule:** notes exist, notes saved, notes attested, billing decided.

- `evaluateCloseGates` must remain the single definition. The UI checklist and
  the service must both derive from it.
- `assertClosable` must be called on every path that sets `status: "closed"`.

**Violation looks like:** a second list of gate conditions in the client; a
status update to `closed` that bypasses the assertion.

## 3. Append-only notes

**Rule:** every note change writes a revision.

- Grep `notes:` in update calls. Each must be paired with `appendRevision`.
- `note_revisions` must never be updated or deleted.

**Violation looks like:** `consults.update(id, { notes })` with no adjacent
revision write.

## 4. Attestation invalidated by edits

**Rule:** changing the words clears the sign-off.

- Every write to `notes` must also set `notesAttestedAt: null` — including the
  scribe path, which is the one most often missed.

**Violation looks like:** a note update that preserves an existing attestation.

## 5. AI provenance

**Rule:** AI output is flagged, versioned, and traceable to its transcript.

- Scribe output must be stored with `aiGenerated: true` and a non-null
  `aiModel`.
- The transcript must be retained, not discarded after generation.
- Any new `ScribePort` implementation must return a `model` identifier.

**Violation looks like:** an AI note saved through the plain `saveNotes` path; a
model id hardcoded as `"ai"` or omitted.

## 6. Recording consent

**Rule:** no consent, no scribe.

- `runScribe` must check `transcript.consentGiven` and refuse without it.
- Consent must be recorded per consult, never inferred, defaulted to true, or
  carried over from a previous consult.

**Violation looks like:** a `consentGiven: true` default anywhere; a scribe path
that skips the transcript lookup.

## 7. Coded allergies

**Rule:** allergies are structured data, never prose.

- No free-text allergy column on `patients`.
- Allergy matching compares `patient_allergies.substance` against
  `drugs.contraindicatedWith`.
- `isNkda` rows are markers and must never be matched as substances.

**Violation looks like:** an allergy string parsed at prescribe time; NKDA
treated as an ingredient.

## 8. Contraindication blocking

**Rule:** a contraindication is a hard stop unless deliberately overridden.

- `PrescribingService.prescribe` must call `assess` and refuse when
  `blocking.length > 0` without an acceptable override reason.
- The override must be audited with the blocking reasons attached.
- `isOverrideAcceptable` must not be weakened.

**Violation looks like:** blocking alerts downgraded to warnings; a prescribe
path that skips assessment; an override accepted with an empty string.

## 9. Audit trail

**Rule:** every state change is recorded, immutably.

- Claim, reject, hide, attest, scribe, prescribe, override, close, acknowledge,
  filter change — all must call `audit.record`.
- `AuditRepository` must expose no update or delete method.
- Audit writes inside a transaction must receive the `tx`.

**Violation looks like:** a new state-changing service method with no audit
call; an `update` added to the audit repository.

## 10. Reasoned queue actions

**Rule:** rejecting a consult or hiding a patient requires a stated reason.

- `reasonSchema` enforces a minimum length; do not relax it.
- Both actions must be audited and reversible or reviewable.

**Violation looks like:** an optional reason; a hide with no governance visibility.

---

## Also check

- **Layering.** A router containing an `if`; a service importing `drizzle-orm`;
  a domain file importing anything with I/O. See CLAUDE.md.
- **Transactions.** Multi-write operations must go through `tx.run`, and every
  repository call inside must receive `tx`. A missed `tx` is invisible until a
  partial failure leaves half the artefacts issued.
- **Synthetic data only.** No real provider numbers, Medicare numbers, patient
  names or live connection strings in seeds, tests or fixtures.
- **Acuity ordering.** Queue changes must not silently revert to FIFO.

## Verify, do not assume

Run `pnpm test` — the domain policy tests cover invariants 2, 7, 8 and the
queue rules directly. A change that weakens a rule usually breaks a test; a
change that adds a bypass usually does not, so read the diff as well as the
test output.

For anything touching the consult lifecycle, drive a full consult through the
running app: claim → transcript with consent → scribe → prescribe against a
patient with a documented allergy → bill → attest → close, and confirm the
eScript token appears only after close.
