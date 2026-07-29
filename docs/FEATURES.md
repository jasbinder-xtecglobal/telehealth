# Telehealth Platform — Feature Specification

Derived from the 13SICK / DR2 "Da Vinci" doctor onboarding walkthrough (Loom + screenshots).

**Legend**
- ✅ Observed in the reference software
- ➕ Gap — not present, should be added
- 🔴 Critical (safety, legal, or regulatory blocker)
- 🟡 Important (operational or commercial risk)
- ⚪ Nice to have

---

## 1. Authentication, Identity & Session

| | Feature |
|---|---|
| ✅ | Email/password login, logout |
| ✅ | Live presence — "Online users" list, green = active, grey = idle |
| ➕ 🔴 | **Multi-factor authentication.** The account holds a prescriber number and can issue PBS scripts. Password-only is indefensible. |
| ➕ 🔴 | **Role-based access control** — doctor, dispatcher, nurse, practice admin, clinical governance, billing, facility user. Only the doctor role exists in the reference. |
| ➕ 🟡 | Session timeout with consult-state preservation |
| ➕ 🟡 | Device registration / trusted device list |
| ➕ 🟡 | Concurrent-session policy (one doctor, one active console) |
| ➕ ⚪ | SSO for the support portal (currently a shared password distributed over WhatsApp) |

---

## 2. Application Shell

| | Feature |
|---|---|
| ✅ | Billings counter — today (midnight–midnight) / this week (Mon–Sun) |
| ✅ | Patients seen — mine today / whole business today |
| ✅ | Live queue depth counter |
| ✅ | Patient search by name |
| ✅ | Left nav: Home, Inbox, Consult History, Billing, Support, My Account, Panic Button, Logout |
| ➕ 🟡 | **Notification system** — nothing alerts a doctor to a new high-acuity patient. Needs toast + sound + browser notification. |
| ➕ 🟡 | Extended search: phone, DOB, address, Medicare number, consult ID |
| ➕ 🟡 | Reconnection handling — mid-consult browser crash must restore state, not orphan the consult |
| ➕ ⚪ | Command palette / keyboard shortcuts (high-volume shift work) |

---

## 3. Waiting Room

| | Feature |
|---|---|
| ✅ | Three queues: Telehealth, Home Visits, NH (Nursing Home) Telehealth |
| ✅ | Patient row: name, age, gender, AI category, verbatim complaint, wait timer |
| ✅ | "New Patient" badge |
| ✅ | Family-group badge — accepting one member assigns all |
| ✅ | Consult-preference icon (phone vs video) |
| ✅ | Concession-card indicator (green tint on icon) |
| ✅ | Blue row = private to you (family member you generated) |
| ✅ | **AI category filter** — "I do not wish to see": men's health, prescribed weight loss, opioids |
| ✅ | Add Consult (manual patient entry) |
| ➕ 🔴 | **Triage acuity scoring.** The queue is FIFO. A febrile 3-year-old ranks identically to a medical-certificate request. Needs an acuity model driving sort order. |
| ➕ 🔴 | **Consult locking** — two doctors opening the same patient simultaneously must not both claim it |
| ➕ 🟡 | **Wait-time SLA breach escalation** — 69 waiting at 12+ min with no visible alarm |
| ➕ 🟡 | **Anti-cherry-picking controls.** Free rejection + permanent hide + category filters + a visible earnings counter is a system that will strand low-value patients. Needs forced assignment above a wait threshold, or dispatcher override. |
| ➕ 🟡 | Reject Consult — capture reason, audit it (currently a bare button) |
| ➕ 🟡 | Hide Patient — require a reason, surface to clinical governance (permanent invisibility with no oversight is a risk) |
| ➕ 🟡 | Classifier confidence + "misclassified" feedback loop |
| ➕ ⚪ | Queue analytics strip: median wait, longest wait, doctors online vs demand |

---

## 4. Patient Detail (pre-consult)

| | Feature |
|---|---|
| ✅ | DOB, state, consult preference, request time + elapsed, symptom category, free-text detail |
| ✅ | AI Patient Summary preview |
| ✅ | Start Consult / Hide Patient / Reject Consult |
| ✅ | Family members stacked on one screen |
| ➕ 🔴 | **Medicare eligibility check** — real-time card validation before the consult starts |
| ➕ 🟡 | Prior consult count + last-seen date (repeat-attender signal) |
| ➕ 🟡 | Flags: care plan, known drug-seeking history, safety alert on address |

---

## 5. Consult Console

| | Feature |
|---|---|
| ✅ | Header: name, age, gender, phone, address |
| ✅ | Add family / Requeue / End |
| ✅ | Allergies panel |
| ✅ | Action bar: Prescribe · Refer · Investigate · Document · Bill |
| ✅ | Tabs: Patient Summary / AI Management Plan |
| ✅ | Templates and Results accordions |
| ✅ | AI Patient Summary (beta) — conditions (long/short-term), medications, occupation & family history, each attributed to the recording doctor |
| ✅ | Notes editor with template dropdown; past notes below |
| ✅ | Patient chat panel with condition description card |
| ✅ | Nudge Patient (rings phone, prompts to join) |
| ➕ 🔴 | **Structured, coded allergies.** Free text (`Penicillin`, `NKDA`) cannot drive interaction checking. |
| ➕ 🔴 | **Sign-off gate** — cannot End until notes are attested by the doctor |
| ➕ 🔴 | **Append-only notes with amendment history.** Silently editable clinical notes are a medico-legal failure, doubly so when AI wrote them. |
| ➕ 🔴 | **One-click 000 escalation** with patient location |
| ➕ 🟡 | Consult timer (drives MBS item eligibility) |
| ➕ 🟡 | Vitals / observations capture |
| ➕ 🟡 | Photo upload from patient (rashes, wounds) — composer has an image icon but the flow wasn't shown |
| ➕ 🟡 | Red-flag prompts (sepsis, chest pain, stroke, paediatric fever) |
| ➕ ⚪ | Draft autosave + recovery |

---

## 6. Templates

| | Feature |
|---|---|
| ✅ | Named templates, reorderable, deletable |
| ✅ | Set default (`Is Default Template`) |
| ✅ | Edit modal: name + body |
| ✅ | Example structure: `PC / HPC / PMH / DH / SH / Examination / Impression / Plan` |
| ➕ 🟡 | Org-level shared template library (fall assessment, paediatric fever, COVID) |
| ➕ ⚪ | Condition-triggered template suggestion |
| ➕ ⚪ | Variable interpolation (`{{patient.name}}`, `{{date}}`) |

---

## 7. AI Scribe

| | Feature |
|---|---|
| ✅ | Ambient capture during phone and video consults |
| ✅ | Generates note into the doctor's own template structure |
| ✅ | Per-doctor personalisation prompt in My Account |
| ✅ | Doctor edits the output before saving |
| ➕ 🔴 | **Recording consent capture** — recording a patient requires consent, and the rules differ by state |
| ➕ 🔴 | **Transcript retention + playback** for dispute resolution |
| ➕ 🔴 | **AI provenance flag** — mark AI-generated content, store the model version, record doctor attestation |
| ➕ 🟡 | **Hallucination guard** — highlight note content not supported by the transcript |
| ➕ 🟡 | Speaker diarisation (doctor vs patient vs carer) |
| ➕ ⚪ | Live streaming transcript during the call rather than post-hoc |

---

## 8. Telephony & Video

| | Feature |
|---|---|
| ✅ | Outbound phone call to patient from within the app |
| ✅ | Video call (WebRTC) |
| ✅ | SMS join-link sent on consult start; doctor sees "patient has joined" |
| ✅ | Default doctor avatar (male/female) before video is enabled |
| ✅ | Doctor camera toggle |
| ✅ | Hang up |
| ➕ 🟡 | **Remove the phone→SMS→video dance.** The documented workaround (ring them, talk them through opening an SMS, hang up, video them) is a designed-in failure. |
| ➕ 🟡 | Pre-call device/permission check on the patient side |
| ➕ 🟡 | Network quality indicator + automatic downgrade to audio |
| ➕ 🟡 | Call recording policy + storage (tied to scribe consent) |
| ➕ 🟡 | Three-way call — interpreter or carer |
| ➕ 🔴 | **TIS National interpreter integration** — material for this patient population |
| ➕ ⚪ | Screen/photo share |

---

## 9. Prescribing

| | Feature |
|---|---|
| ✅ | PBS scripts |
| ✅ | Streamlined authority with PBS restriction criteria shown inline (e.g. Lagevrio: ≥70yo + positive RAT) |
| ✅ | Private script fallback (strips streamline code) |
| ✅ | Search by active ingredient or product name; "all drugs" toggle |
| ✅ | MIMS database, default pack size, suggested dose |
| ✅ | eScript issued as QR code, delivered by SMS **after** consult ends |
| ✅ | Cancel script |
| ✅ | Explicit exclusions: no full authority scripts, no compounded |
| ➕ 🔴 | **Drug interaction, duplicate-therapy and allergy contraindication checking.** Absent. This is the single largest safety gap. |
| ➕ 🔴 | **RTPM integration** — SafeScript (VIC/NSW), QScript (QLD), ScriptCheckSA. Legally mandated for monitored medicines. |
| ➕ 🔴 | **Paediatric weight-based dose calculator.** After-hours means sick kids. |
| ➕ 🟡 | Renal/hepatic dose adjustment prompts |
| ➕ 🟡 | Pregnancy/breastfeeding category warnings |
| ➕ 🟡 | Active Script List (ASL) integration |
| ➕ 🟡 | Repeat handling and interval enforcement |
| ➕ 🟡 | Fix generic-name resolution (phenoxymethylpenicillin failing to resolve is a real usability defect) |
| ➕ ⚪ | Favourites / frequently-prescribed shortlist per doctor |

---

## 10. Referrals

| | Feature |
|---|---|
| ✅ | Specialist dropdown |
| ✅ | Free-text hospital referral (primary use — ED) |
| ✅ | Letter body → generated PDF, SMS link after consult ends |
| ➕ 🟡 | **Secure messaging to the receiving provider** (HealthLink / Argus / Medical Objects) — patient-carries-the-PDF is not a clinical handover |
| ➕ 🟡 | Ambulance/ED pre-notification for genuine emergencies |
| ➕ ⚪ | Referral templates, validity period, provider directory lookup |

---

## 11. Investigations

| | Feature |
|---|---|
| ✅ | Radiology / Pathology request forms |
| ✅ | Test selection, clinical notes, copy-to regular GP |
| ✅ | Generic form accepted by all providers |
| ✅ | Results return to the ordering doctor's Inbox |
| ✅ | Stated policy: follow-up is the ordering doctor's responsibility |
| ➕ 🔴 | **Results acknowledgement tracking with escalation.** "It's your responsibility" is a policy, not a control. Unacknowledged abnormal results must escalate to clinical governance. |
| ➕ 🔴 | **HL7 results ingestion** from pathology providers |
| ➕ 🟡 | Abnormal/critical result flagging |
| ➕ 🟡 | Handover of pending results at end of shift or contract |

---

## 12. Documents

| | Feature |
|---|---|
| ✅ | Medical certificates: work, school, university, carers, fit-to-return |
| ✅ | Date-range selection |
| ✅ | Blank document for free-text patient instructions |
| ✅ | Doctor's drawn digital signature applied |
| ✅ | SMS download link after consult ends |
| ➕ 🟡 | **Certificate verification endpoint** — a QR or reference an employer can check, to counter forgery |
| ➕ 🟡 | Document versioning and reissue |
| ➕ ⚪ | Patient-instruction library (condition-specific advice sheets) |

---

## 13. Billing

| | Feature |
|---|---|
| ✅ | MBS item numbers filtered by doctor type (VR fellow vs non-VR) |
| ✅ | No-billing option |
| ✅ | Daily batch submission at 11am |
| ✅ | "Consultations Waiting For Billing" |
| ✅ | Billing history with date range + pagination |
| ➕ 🔴 | **MBS rule validation** — after-hours eligibility, time-of-day windows, minimum duration, same-day duplicates. Items should be *suggested* from consult time and duration, not freely picked. |
| ➕ 🔴 | **Claim rejection handling** — no visible reject/resubmit workflow. Batch-and-hope is not a billing system. |
| ➕ 🟡 | Real-time Medicare Web Services claiming |
| ➕ 🟡 | DVA claiming |
| ➕ 🟡 | Private billing + card capture for ineligible patients |
| ➕ 🟡 | Bulk-billing incentive items |
| ➕ 🟡 | **Doctor earnings ledger** — gross billed, service fee, net, reconciled against the GoCardless debit |
| ➕ ⚪ | Export to accounting (Xero/MYOB) |

---

## 14. Consult Lifecycle

| | Feature |
|---|---|
| ✅ | Start → (act) → End |
| ✅ | Requeue (return to pool if patient unreachable) |
| ✅ | Add family mid-consult; generated consult becomes private to you |
| ✅ | **End as transaction boundary** — flushes script, referral, request form, certificate as SMS links |
| ➕ 🟡 | Failed-delivery handling for the SMS flush (bounced number = patient gets nothing) |
| ➕ 🟡 | Abandoned-consult recovery and callback queue |
| ➕ 🟡 | Requeue reason + attempt count before auto-discharge |
| ➕ ⚪ | Consult pause/resume |

---

## 15. Inbox, History & Governance

| | Feature |
|---|---|
| ✅ | Inbox for investigations needing action |
| ✅ | Consult History — filter by incomplete billing, last 7 days / all |
| ✅ | Yellow row = notes not written |
| ➕ 🔴 | **Immutable audit log** — every record view, edit, print, export: who, when, what, from where |
| ➕ 🔴 | **Clinical governance dashboard** — unacknowledged results, missing notes, high rejection rates, prescribing outliers |
| ➕ 🟡 | Peer review / random note audit sampling |
| ➕ 🟡 | Clinical incident reporting |
| ➕ 🟡 | Complaints workflow (the public site routes these to a compliance mailbox) |
| ➕ 🟡 | Break-glass access with mandatory justification |

---

## 16. Doctor Profile

| | Feature |
|---|---|
| ✅ | Read-only: mobile, email, name, provider number, prescriber number, gender |
| ✅ | Chosen name (appears on certificates and scripts) |
| ✅ | Doctor type (GP Fellow / VR / non-VR) |
| ✅ | AI Scribe personalisation prompt |
| ✅ | Qualifications |
| ✅ | Work preferences: Telehealth / HomeVisits |
| ✅ | "Make font better" accessibility toggle |
| ✅ | Drawn digital signature |
| ✅ | Hidden Patients list |
| ➕ 🔴 | **Credentialing** — AHPRA registration with expiry + automated verification, indemnity insurance expiry, police check, provider-number-per-location |
| ➕ 🟡 | Automatic suspension on lapsed registration or insurance |
| ➕ 🟡 | Proper WCAG 2.1 AA compliance (a font-size checkbox is a symptom, not accessibility) |
| ➕ ⚪ | Availability / roster preferences |

---

## 17. Communications

| | Feature |
|---|---|
| ✅ | Clinical chat — all doctors, group |
| ✅ | Dispatcher chat — direct to phone operators |
| ✅ | Timestamps, sender attribution, own messages right-aligned |
| ✅ | Image attachment in composer |
| ➕ 🟡 | Chat retention policy — clinical discussion of patients is a health record |
| ➕ 🟡 | Direct doctor-to-doctor DM |
| ➕ 🟡 | Broadcast/announcement channel |
| ➕ ⚪ | Patient-context deep-link in chat ("re: this consult") |

---

## 18. Home Visits

| | Feature |
|---|---|
| ✅ | Map view with patient pins and doctor location |
| ✅ | Optimise Route |
| ✅ | List / Map / Both toggle |
| ✅ | Panic Button — shares GPS with call centre |
| ➕ 🔴 | **Proactive duress timer** — check-in/check-out at each address. The panic button is reactive and requires a free hand. |
| ➕ 🔴 | **Offline resilience.** The console is fully online; mobile coverage isn't. |
| ➕ 🔴 | **Mobile-first UI.** The reference is desktop-only, used from a car. |
| ➕ 🟡 | Live ETA to patient + automatic patient notification |
| ➕ 🟡 | Doctor bag inventory + S4/S8 controlled drug register |
| ➕ 🟡 | Dispatch job offer/accept flow |
| ➕ 🟡 | Address safety flags and no-go geofencing |
| ➕ ⚪ | Km/vehicle logging for expenses |

---

## 19. Interoperability (largely absent)

| | Feature |
|---|---|
| ➕ 🔴 | **My Health Record** — upload event summaries, read shared health summary |
| ➕ 🔴 | **IHI lookup** (prerequisite for MHR) |
| ➕ 🔴 | **Secure messaging to the patient's usual GP.** The public site promises "a report to your GP the next day" — that pipeline is invisible in the software and is the core clinical obligation of a deputising service. |
| ➕ 🟡 | HL7 v2 inbound (results), FHIR API outbound |
| ➕ 🟡 | Prior-records import |
| ➕ ⚪ | Public API for aged-care facility systems |

---

## 20. Patient-Facing (the missing half)

| | Feature |
|---|---|
| ➕ 🔴 | Booking flow with symptom capture and consult preference |
| ➕ 🔴 | Medicare/DVA/concession capture and validation |
| ➕ 🔴 | Consent: telehealth, AI recording, privacy collection statement |
| ➕ 🔴 | Identity verification |
| ➕ 🟡 | Document/eScript retrieval portal (not SMS-link-only) |
| ➕ 🟡 | Live queue position and wait estimate |
| ➕ 🟡 | Consult history |
| ➕ 🟡 | Private payment capture |
| ➕ 🟡 | Post-consult feedback / NPS |
| ➕ ⚪ | Native app with push notifications |

---

## 21. Dispatcher & Admin Consoles (not shown at all)

| | Feature |
|---|---|
| ➕ 🔴 | **Dispatcher workstation** — queue oversight, manual allocation, phone triage, doctor tracking |
| ➕ 🟡 | CTI / phone system integration |
| ➕ 🟡 | Doctor onboarding and credentialing admin |
| ➕ 🟡 | Roster and shift management |
| ➕ 🟡 | **Aged-care facility portal** (referenced on the public site) |
| ➕ 🟡 | Business analytics — demand curves, wait times, utilisation, cost per consult, doctor scorecards |
| ➕ ⚪ | Service-fee configuration and invoicing automation |

---

## 22. Platform & Compliance

| | Feature |
|---|---|
| ✅ | GoCardless direct debit for doctor service fees; weekly PDF invoice |
| ➕ 🔴 | **Australian data residency** |
| ➕ 🔴 | **Encryption at rest and in transit; key management** |
| ➕ 🔴 | **Retention policy** — 7 years for adults, until age 25 for minors |
| ➕ 🔴 | Privacy Act / APP compliance, breach notification process |
| ➕ 🟡 | Backup and disaster recovery with tested RTO/RPO |
| ➕ 🟡 | Penetration testing and vulnerability management |
| ➕ 🟡 | Status page and degraded-mode operation |
| ➕ 🟡 | Rate limiting and anti-abuse on public booking |
| ➕ ⚪ | ISO 27001 / Essential Eight alignment |

---

## Commercial Regulatory Gates (not code — start these first)

These have lead times measured in months and cost money. Nothing in the prescribing module is real without them.

1. **MIMS or AMT licence** — drug database
2. **eScript exchange conformance** — eRx or MediSecure, including ADHA conformance testing
3. **AMDS approval** — Approved Medical Deputising Service status; without it the after-hours MBS items aren't billable
4. **Medicare Web Services / HPOS** — PRODA org registration, device activation
5. **RTPM access** — per-state (SafeScript, QScript, ScriptCheckSA)
6. **My Health Record conformance** — CSP registration + conformance assessment
7. **Secure messaging vendor** — HealthLink, Argus or Medical Objects

---

## Suggested Build Order

**Phase 1 — Core loop**
Auth + RBAC · patient + consult data model · waiting room with locking · consult console · notes with templates · manual billing capture · audit log from day one

**Phase 2 — Communications**
Telephony · WebRTC video · SMS · patient join flow · chat

**Phase 3 — Clinical actions**
Documents and certificates first (no external dependency) · investigations · referrals · then prescribing once MIMS and eScript contracts land

**Phase 4 — AI**
Transcription · scribe with template mapping · patient summary · triage classifier — every one behind provenance capture and doctor attestation

**Phase 5 — The other consoles**
Patient booking app · dispatcher workstation · admin and governance · home visit dispatch

Audit logging, consent capture and append-only notes belong in Phase 1. They are not features you retrofit into a health record.
