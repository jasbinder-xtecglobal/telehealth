# Figma Prototype Prompt — Telehealth Operations Platform

Single source. Paste everything below the line into Figma AI.
Design only — no backend, no database, no APIs. This produces a clickable
prototype to demonstrate to a client.

If Figma AI degrades on a prompt this long, run it in four passes:
**(1)** Design system → **(2)** Public website → **(3)** Doctor (largest role) →
**(4)** Dispatcher, Staff, Governance, Admin, Billing.

---

You are a Senior Product Designer and Healthcare UX specialist who has designed
Australian telehealth, medical workforce and clinical operations platforms.

Design a complete, high-fidelity, **clickable Figma prototype** for a bulk-billed
**after-hours telehealth and home-visit service** in Australia. This is a visual
prototype for a client demonstration — realistic screens, realistic data, working
click-through flows. No backend behaviour is required; simulate state changes with
prototype interactions and variants.

Do not copy any existing product. Apply the best practices of modern healthcare
operations SaaS: dense but calm data tables, purpose-built role dashboards, an
unambiguous status system, timeline-driven records, and fast keyboard-friendly
workflows.

---

## 1. What the product is

An after-hours service. Patients request care from a public website. A dispatcher
routes them. A doctor consults by phone or video, then prescribes, refers, orders
tests, issues certificates, and bills Medicare. An AI scribe drafts the clinical note
afterwards; the doctor edits and signs it. Clinical governance audits the result.

**Patients never log in.** Everything patient-facing is a public form or a secure link
sent by SMS. All logged-in users are staff.

---

## 2. Clinical rules that shape the screens

These are not decoration — they determine what each screen must show. Design to them.

1. **Nothing reaches the patient until the doctor closes the consult.** Prescriptions,
   referrals, test request forms and certificates are all **drafts** until close, then
   released together in one action. Design "Close consult" as a real gate with a
   summary of everything about to be sent — not a plain button.
2. **A consult cannot close until four gates pass** — notes written, notes saved, notes
   signed by the doctor, billing decision recorded. Show a live checklist that ticks
   items off as the doctor works.
3. **Clinical notes are append-only.** Every edit creates a new version with visible
   history. **Editing a signed note removes the signature** and re-opens the checklist —
   show this state.
4. **AI never speaks to a patient and never saves to the record.** It drafts; the doctor
   edits and signs. All AI-generated content is visibly labelled with the model that
   produced it.
5. **Recording consent is captured before recording starts.** No consent, no AI scribe.
6. **Allergies are coded selections from a list, never free text.**
7. **A drug contraindication is a hard stop** — a blocking warning, overridable only by
   typing a clinical reason.
8. **Destructive actions require a typed reason** — reject, hide, cancel, reassign,
   override.
9. **Everything is audited, including record views.** Every record has an activity
   timeline: who did what, when, and why.
10. **A lapsed credential suspends the doctor automatically.** Expired AHPRA
    registration or indemnity insurance removes them from the roster without a human
    step — design the suspended state.

---

## 3. Roles

Seven roles. **Each gets its own purpose-built home screen** — not one shared dashboard
with rows hidden by permission. A dispatcher's job is spatial and time-critical; a
doctor's is a single-patient tunnel; a governance officer's is an exception queue.
Different jobs, different information shapes.

**Admin · Doctor · Dispatcher · Staff · Clinical Governance · Billing · Facility User**
(external aged-care portal, sees only their own residents)

---

## 4. Public website — no login

- **Home** — service hours, coverage area, bulk-billed messaging, phone or video.
- **Appointment request** (the primary conversion path) — multi-step with a progress
  indicator: medical concern → personal details → Medicare and concession card →
  consent (telehealth, privacy collection, and AI recording as three separate
  checkboxes) → phone or video preference → optional file upload → review → confirm.
  End on a confirmation screen with a reference number and an estimated wait.
- **Request status lookup** — reference number plus date of birth. No account.
- **Careers** — full-time, part-time and casual shift listings with filters.
- **Doctor application** — multi-step, save-and-resume: personal details · AHPRA
  registration number and expiry · qualifications · specialties · experience · resume
  upload · availability grid · references · supporting documents · declarations.
- **Applicant tracking portal** (secure link, no password) — current stage, outstanding
  document checklist, upload, and messaging with the recruiter.
- **Certificate verification** — an employer enters a code and sees validity only, never
  clinical content.
- **Secure artefact retrieval** — the patient opens an SMS link, confirms date of birth,
  and downloads their eScript QR code, certificate or referral.
- **Complaints intake** and **aged-care facility enquiry**.

---

## 5. Doctor

**Shift home** — my assigned patients, billings today and this week, patients seen, live
queue depth, alerts, shift status.

**Live queue** — sorted by **clinical acuity, not arrival time**. Each row shows: name,
age, gender, AI symptom category, the patient's own words, wait timer, phone-or-video
icon, concession-card indicator, new-patient badge, family-group badge. Include filters
and a **wait-time breach alarm state**.

**Pre-consult patient detail** — demographics, wait elapsed, complaint, AI patient
summary, coded allergies, prior consult count and last seen date, safety flags, Medicare
eligibility result. Actions: Start Consult · Reject (reason required) · Hide (reason
required).

**Consult console — the flagship screen.** Design this first; it sets the visual language
for the whole product.
- Header: patient identity, age, phone, address, consult timer.
- Call controls: phone, video, mute, camera, "nudge patient", interpreter, and a
  **one-click 000 escalation** showing the patient's location.
- Coded allergies panel, always visible, never collapsible.
- Action bar: **Prescribe · Refer · Investigate · Document · Bill**.
- Notes editor with a template dropdown; previous notes below.
- Side tabs: patient summary, AI management plan.
- Patient chat panel.

**Prescribe** — search by active ingredient or product name; PBS vs private script;
streamlined authority with the PBS restriction criteria shown inline; default pack size
and suggested dose; paediatric weight-based dosing; and a **blocking interaction /
allergy / duplicate-therapy warning** that cannot be passed without a typed clinical
reason. Show the eScript QR that will be sent after close.

**Refer** — specialist directory plus free-text hospital/ED referral, generated letter
preview.

**Investigate** — pathology and radiology request forms, test selection, clinical notes,
copy-to the patient's usual GP.

**Document** — work, school, university, carer and fit-to-return certificates; date
range picker; the doctor's drawn digital signature applied; blank free-text instruction
document.

**Bill** — MBS item numbers filtered to what this doctor is entitled to claim, suggested
from the consult time and duration, with an ineligibility warning state and a
"no billing" option with reason.

**Close consult** — the four-gate checklist, then a release summary listing every
artefact about to be sent to the patient and the report going to their usual GP.

**AI note review** — split view. Transcript on the left, generated note on the right,
with content **not supported by the transcript highlighted** as a possible
hallucination. Sections: summary, SOAP, chief complaint, history, assessment, plan,
diagnoses, medications, allergies, follow-up tasks, clinical action items, referral
suggestions. Suggested medications and allergies appear as **candidates awaiting
confirmation**, never applied automatically. Doctor edits, then signs.

**Also**: results inbox with acknowledgement · consult history · availability and roster
· earnings · note templates · account and credentials.

---

## 6. Dispatcher

A live operational board combining the queue, doctor availability, capacity and the
clock in a single view. Plus: request triage · assign and reassign drawer (reason
required) · urgent escalation · doctor status board · **home-visit map with route
optimisation** · workload and utilisation · **SLA breach panel with an alarm state**.

---

## 7. Staff

Request worklist · verification screen (identity, Medicare, contact details) · patient
search with duplicate merge · booking calendar · reschedule and cancel with reason ·
document intake · communications log · reminder scheduling.

---

## 8. Clinical Governance

**Exception dashboard** — missing notes, unacknowledged test results, contraindication
overrides, break-glass record access, prescribing outliers, doctors with unusually high
rejection rates. Plus: audit sampling worklist · note quality review with a scoring
rubric · AI documentation review · complaints workflow · incident reporting · template
approval · clinical KPI dashboard · compliance report builder · audit log explorer.

---

## 9. Admin

Overview · **doctor application review queue** (approve / reject / request more
documents / suspend / activate) · doctor register · **credentialing expiry board** —
AHPRA registration, indemnity insurance, police check, provider number per location,
VR vs non-VR status — with 60/30/7-day warning states and an auto-suspended state ·
staff, dispatcher and governance user management · roles and permissions matrix ·
appointment oversight · analytics · AI configuration · system settings · audit log.

---

## 10. Billing

Pending claims · batch submission · **claim rejection worklist with reason codes and a
correction path** · doctor earnings ledger · reconciliation · invoicing.

---

## 11. Design system

- **Light and dark themes.** Calm, clinical, high contrast. Not playful, not startup-y.
- Full token set: colour, type scale, spacing scale, radius, elevation.
- **Status system — colour + icon + text together, never colour alone.** Cover: waiting,
  claimed, in consult, closed, urgent, breached, rejected, cancelled, draft, released,
  suspended, expired, pending review, needs signature.
- Components: data table with sort / filter / bulk actions · queue row · patient card ·
  status pill · acuity badge · wait timer · activity timeline · notification centre ·
  toast · **confirmation dialog with a mandatory reason field** · multi-step form with
  progress · file upload with preview · empty state · error state ·
  permission-denied state · split-pane review · blocking clinical warning.
- Global shell: role-specific sidebar, global search, notification centre, presence
  indicator, shift status, user menu.

---

## 12. Realistic demo content

Use **synthetic Australian data** throughout — no real patient details, no real provider
numbers. Australian names, states and postcodes, mobile numbers in `04XX XXX XXX`
format, dates as `DD/MM/YYYY`, and after-hours timestamps (18:00–08:00). Invented
Medicare numbers and AHPRA registration numbers of the correct shape.

Make the queue look like a real shift: 15–25 waiting patients across a spread of
acuities — a febrile toddler, chest pain, a UTI, a repeat script, a medical certificate
request, a nursing-home resident — with wait timers from 2 to 40 minutes and at least
one breached SLA visible.

---

## 13. Deliverables

1. A complete screen inventory grouped by role.
2. High-fidelity frames for every screen above.
3. **Five states for each key screen: loading, empty, populated, error, and
   permission-denied**, plus alarm states for the queue and SLA breach.
4. **Mobile frames** for the doctor's queue, consult console and home-visit views —
   these are used from a car, not at a desk.
5. The design system published as a component library with named tokens.
6. **Clickable prototype flows**, wired end to end:
   - Patient submits a request → confirmation with reference number
   - Doctor applies → applicant tracking portal → admin approves → credentialing
   - Dispatcher triages and assigns an urgent patient
   - **Claim → consult → prescribe → close** (the primary journey — make this the
     smoothest path in the prototype)
   - AI note review → edit → sign
   - Governance opens an exception and completes an audit

---

## 14. Client demonstration path

Wire one continuous narrative the client can click through in about five minutes:

> A patient submits a request at 9:40pm → the dispatcher sees it arrive and assigns it
> on acuity → the doctor claims the patient, reviews their history, consults by video,
> prescribes a medication and hits an allergy warning, overrides it with a reason, issues
> a medical certificate, records the MBS item, and closes the consult → the release
> summary shows the eScript and certificate going out by SMS → the AI drafts the note,
> the doctor edits and signs it → clinical governance opens that consult in an audit and
> sees the full activity timeline including the override.

Everything in that path must be clickable. The rest of the prototype can be static
frames.

---

Meet **WCAG 2.1 AA** throughout. Optimise the claim → consult → close path for the
fewest possible clicks — it is the highest-frequency journey in the product and the one
the client will judge it by.
