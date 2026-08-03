# Client Demo — Video Script

596 spoken words — ~4½ minutes with click pauses. Record against `telehealth-seven-gamma.vercel.app`.

**Before recording:** reseed (timers currently read 18 hr), and replace the joke seed data — the "sock cult" chat thread sits beside the queue in every shot, and complaints like *"my thumb might be haunted"* are on screen. Run a consult first; Inbox and Billing are empty otherwise.

---

**1 · Login page**

> This is the clinician workstation we've built for the after-hours service — a working prototype of a doctor's full shift.
>
> The clinical logic is real and tested. The systems that need a commercial agreement — drug database, eScript, Medicare claiming, SMS — are stood in behind proper interfaces.

**2 · Sign in → waiting room**

> Accounts lock after five failed attempts and every sign-in is audited. Passwords are hashed, tokens stored as fingerprints, and an unverified account gets no session.
>
> One gap named up front: no multi-factor authentication yet. This account can issue a PBS script, so that's the top item outstanding.
>
> Across the top, billings and live queue depth. On the right, clinical chat and a direct line to dispatch.

**3 · Queue → switch to Home Visits**

> Three queues. Each row shows the patient's own words, phone or video, concession status, and waiting time.
>
> The reference software runs first-in, first-out. Ours doesn't.
>
> *(switch tabs)*
>
> Urgent, high, moderate — acuity first, then wait time. Severe abdominal pain doesn't sit behind a routine call that arrived earlier.
>
> A family badge assigns the household together. Rejecting or hiding a patient requires a reason, and both are audited — in the reference system, hiding is one click and leaves no record.

**4 · Consult console → prescribe**

> Inside a consult: prescribe, refer, investigate, document, bill.
>
> Allergies are coded rather than free text, so they can actually be checked. This patient is penicillin-allergic — I'll prescribe amoxicillin anyway.
>
> *(submit)*
>
> Hard stop. Overriding it takes a written reason and is audited against the prescriber. The reference software has no interaction checking at all.
>
> Notes are append-only. The AI scribe won't run without recorded consent, anything it writes is flagged with the model version, and editing it clears the doctor's sign-off.

**5 · Close the consult**

> Script, certificate and pathology request all drafted — and all pending release. The patient has received nothing.
>
> Nothing reaches the patient before the consult closes. And closing is gated on four things: notes exist, notes are saved, notes are attested, and a billing decision is recorded.
>
> *(close)*
>
> Then it all issues in a single transaction. All of it, or none of it.
>
> The pathology request lands in the ordering doctor's inbox awaiting acknowledgement — follow-up as a tracked item, not a policy in a handbook.

**6 · Home visit board**

> Home visits are a dispatch board. Acuity-coloured pins, a sequenced route, ETA and distance for each stop.
>
> The optimiser is acuity-banded — urgent patients are never routed behind routine ones, even when the routine one is closer.
>
> Arrival check-in starts a timer: the doctor is prompted at 45 minutes, and it escalates to dispatch automatically at 60. That works when a doctor hasn't got a free hand. A panic button doesn't.

**7 · Close**

> Real and tested: authentication, the consult lifecycle, claim locking, acuity ordering, append-only notes, interaction checking, the atomic close, home-visit safety, and an audit log with no way to edit or delete a record.
>
> Mocked: drug database, eScript, SMS, Medicare claiming, and the scribe. Each sits behind an interface, so replacing one is a contained change.
>
> Not built, by decision: the patient booking app, dispatcher console, video transport, aged-care portal.
>
> The thing worth starting now is the paperwork — MIMS licence, eScript conformance, Approved Medical Deputising Service status, Medicare Web Services, prescription monitoring access. Lead times in months, and without AMDS the after-hours items aren't billable at all.
>
> Happy to take this wherever is most useful next.

---

Pace ~140 wpm. Pause a beat after the prescribing block and after the close — let the screen carry it.
