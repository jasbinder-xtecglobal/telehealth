# Telehealth project — progress update

**28 July 2026**

## The short version

We now have a **working prototype** of the software an after-hours doctor would
use during a shift. It runs on a real database, and you can click through a
complete patient consultation from start to finish.

This is a demo, not a product. It is far enough along to show people and to make
decisions from.

---

## What we did today

### 1. Worked out what we're actually building

We went through the 13SICK public site and the software walkthrough video and
wrote two documents:

- **A system flow document** — the whole business on paper: how a patient goes
  from "I feel unwell" to "my prescription is on my phone", who does what, and
  what has to be connected to make it legal. This is the one to put in front of
  the client.
- **A feature list** — everything the existing software does, plus a list of
  what it's missing and why that matters.

### 2. Built the doctor's screen

The part a doctor actually works in:

- A **live waiting room** of patients, ordered by how urgent they are
- Claiming a patient, which locks them so two doctors can't take the same person
- The **consultation screen** — notes, prescriptions, referrals, test requests,
  medical certificates, and billing
- **Home visits** — a map with an optimised driving route, and a safety timer
  that raises an alarm if a doctor doesn't check out of a house

### 3. Added login and registration

Doctors now sign in with an email and password. New accounts have to confirm
their email address before they can be used, and accounts lock temporarily after
repeated failed sign-in attempts.

---

## Things we deliberately did differently to the existing software

The reference software has some habits we chose not to copy, because they carry
real risk. Each of these is now a rule the software enforces:

| What the existing system does | What ours does |
|---|---|
| Allergies typed as free text | Recorded properly, so the system can actually check them |
| No safety check when prescribing | Blocks a drug the patient is allergic to, and records it if the doctor overrides |
| Notes can be quietly edited | Every version is kept, with who changed it and when |
| A consult can be closed at any time | Can't close until notes are written, signed off, and billing recorded |
| Patients can be permanently hidden with one click | Requires a reason, and it's reversible and reviewable |
| Patients seen in the order they arrived | Sickest first — a feverish child doesn't wait behind a routine request |

That last one is visible in the demo: a four-year-old with a fever sorts above
adults who have been waiting longer.

---

## How we know it works

Rather than saying "it works", we wrote tests that prove it:

- **97 automated checks** on the rules themselves — these run in under a second
- **73 further checks** that drive the real software the way a doctor would

All of them currently pass. If someone breaks a safety rule later, a test fails.

---

## What is *not* built

Worth being clear, because the flow document describes the whole business and we
have built roughly the doctor's share of it:

- **Video and phone calls** are simulated, not real
- **The patient's own app** — booking, checking status — doesn't exist
- **The call-centre / dispatcher screen** doesn't exist
- **Aged care** isn't built at all
- **Connections to Medicare, the pharmacy network and the drug database** are
  stand-ins. They behave correctly but aren't connected to the real systems —
  those need commercial agreements that take months to arrange

None of this is a surprise; it was the agreed scope. It matters for planning.

---

## The one thing that needs a decision

We built a "register as a doctor" screen where someone signs up themselves.
Having checked 13SICK's careers page, **that's the wrong model.** In reality a
doctor registers *interest*, then gets contacted, checked and contracted, and the
operator creates their account at the end.

The difference matters: as it stands, anyone could create an account capable of
issuing prescriptions. We need to change it so accounts are issued by the
business, not claimed by applicants.

**Two questions before we start:**

1. After a doctor applies, should they be able to see anything themselves — an
   application status, uploading their certificates — or is it simply "we'll
   call you"?
2. Do we build the admin screen for reviewing applicants now, or leave that
   until we build the wider admin area?

---

## Suggested next steps

1. Fix the doctor registration model *(needs the two answers above)*
2. **Send the consultation report to the patient's regular GP.** The service
   promises this and nothing currently does it — it's the biggest gap
3. Add a second security step for doctors who can prescribe
4. Actually submit the Medicare claims and handle rejections

---

## Bottom line

There is something real to demonstrate. The clinical core is solid and tested.
The remaining work is mostly *breadth* — the other people who use the system, and
the outside connections — rather than fixing what's there.
