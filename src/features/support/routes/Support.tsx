import { useState } from "react";
import { Alert } from "@/shared/ui/index.tsx";

/**
 * Support.
 *
 * In the reference console this menu item opens the service's own support
 * site in an iframe. That site is behind a shared password circulated over
 * WhatsApp, which is a problem worth naming rather than reproducing — so the
 * content lives here, behind the same session as the rest of the console.
 */

type SectionKey =
  | "home"
  | "bbi"
  | "learning"
  | "screening"
  | "feedback"
  | "training"
  | "contact";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "bbi", label: "Bulk Billing Incentive (BBI)" },
  { key: "learning", label: "Learning" },
  { key: "screening", label: "Medication Screening" },
  { key: "feedback", label: "Feedback / Complaints" },
  { key: "training", label: "Support / Training" },
  { key: "contact", label: "Contact" },
];

export function Support() {
  const [section, setSection] = useState<SectionKey>("home");

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <div className="mx-auto max-w-5xl pb-12">
        <div className="flex items-center justify-center gap-4 py-4">
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="text-[#2f9e5f]">13</span>
            <span className="text-[#1c2f6b]">SICK</span>
          </span>
          <span className="text-3xl font-extrabold tracking-tight text-[#1c2f6b]">
            DR<sup className="text-[#2f9e5f]">2</sup>
          </span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 rounded bg-slate-50 px-6 py-4">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`text-sm font-semibold tracking-wide uppercase transition-colors ${
                section === s.key
                  ? "text-[#2f9e5f]"
                  : "text-slate-600 hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {section === "home" && <Home />}
          {section === "bbi" && <Bbi />}
          {section === "learning" && <Learning />}
          {section === "screening" && <Screening />}
          {section === "feedback" && <Feedback />}
          {section === "training" && <Training />}
          {section === "contact" && <Contact />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const GENERAL_FAQ = [
  "Do I need an app to use 13SICK software?",
  "How to call Dispatch and Telehealth teams whilst on shift",
  "Who do I contact if I need help and support?",
  "What times are defined as the 'After Hours' period",
  "How do I apply for Realtime Prescription Monitoring (SafeScript / QScript)?",
  "Medications with misuse potential",
  "What is DR2?",
  "How do I order PBS stationery?",
];

const TOP_LEVEL_FAQ = [
  "How do I use 13SICK software on my mobile phone?",
  "How to add 13SICK software to your iPhone / Android home screen",
  "Can I request pathology and radiology? How do I get results?",
  "How do patients access their documents and scripts after a consultation",
  "How do I bill a 10990 / 75870?",
  "How do I change my bank details in PRODA?",
];

function Home() {
  return (
    <>
      <h1 className="text-center text-2xl font-bold">13SICK Support</h1>
      <p className="mt-3 text-center text-sm">
        Before you start your first shift please watch our training videos to
        get yourself up to speed.
      </p>

      <div className="mt-6 rounded-lg border border-line px-8 py-6">
        <div className="text-sm font-semibold">13SICK Support</div>
        <div className="mt-1 text-sm">Telehealth</div>

        <ul className="mt-3 ml-5 list-disc space-y-1.5 text-sm">
          <li>
            General FAQ
            <ul className="mt-1.5 ml-5 list-disc space-y-1.5">
              {GENERAL_FAQ.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </li>
          {TOP_LEVEL_FAQ.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>

      <Alert tone="warn" title="Answers are not written into this prototype">
        The topic list mirrors the reference support site. The answers are
        service policy, not software behaviour, and would be wrong to invent —
        they come from the operator's own onboarding material.
      </Alert>
    </>
  );
}

function Bbi() {
  return (
    <>
      <h1 className="text-2xl font-bold">
        Bulk Billing Incentive (BBI) from November 1st 2025
      </h1>
      <p className="mt-3 text-sm leading-relaxed">
        From <strong>1 November 2025</strong>,{" "}
        <strong>
          Bulk Billing Incentive (BBI) eligibility expands to all
          Medicare-eligible patients
        </strong>{" "}
        — not just children under 16 or concession card holders.
      </p>

      <div className="mt-5 rounded-lg border border-line p-5 text-sm">
        <div className="font-semibold">What this changes in the console</div>
        <ul className="mt-2 ml-5 list-disc space-y-1.5 text-muted">
          <li>
            The concession-card indicator on a queue entry no longer determines
            incentive eligibility.
          </li>
          <li>
            The incentive item is offered alongside the attendance item in the
            billing window rather than being gated on the patient's card status.
          </li>
        </ul>
      </div>

      <Alert tone="warn" title="Not yet reflected in the billing rules">
        This prototype still models the pre-November eligibility test. Changing
        it is a change to <code className="font-mono">mbs.policy.ts</code> and
        its tests, not to this page.
      </Alert>
    </>
  );
}

function Learning() {
  return (
    <>
      <h1 className="text-2xl font-bold">Learning</h1>
      <p className="mt-3 text-sm">
        Training videos, shift induction and refresher modules are hosted by the
        operator. They are not part of the clinician console.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Medication screening
 * ------------------------------------------------------------------ */

const BENZODIAZEPINES: [string, string][] = [
  ["Alprazolam", "Xanax, Kalma, Alprax"],
  ["Clonazepam", "Rivotril, Paxam"],
  ["Diazepam", "Valium, Antenex, Valpam"],
  ["Lorazepam", "Ativan"],
  ["Midazolam", "Hypnovel, Midazolam Accord"],
  ["Nitrazepam", "Mogadon, Alodorm"],
  ["Oxazepam", "Serepax, Alepam"],
  ["Temazepam", "Normison, Temaze, Temtabs"],
];

const SLEEPING_TABLETS: [string, string][] = [
  ["Zolpidem", "Stilnox, Zolpibel, Zolpidem Sandoz"],
  ["Zopiclone", "Imovane, Zopiclone Sandoz, Zopivane"],
];

const PERMIT_ONLY =
  "Our doctors are unable to provide this medication. You need to see a doctor with a permit to prescribe this.";

const STIMULANTS: [string, string, string][] = [
  ["Dexamphetamine", "Dexamphetamine Sulfate (various brands)", PERMIT_ONLY],
  ["Lisdexamfetamine", "Vyvanse", PERMIT_ONLY],
  ["Methylphenidate", "Ritalin, Concerta", PERMIT_ONLY],
];

function Screening() {
  return (
    <>
      <h1 className="text-2xl font-bold">Medication Screening</h1>
      <p className="mt-3 text-sm">
        Medicines with misuse potential that come up on an after-hours shift.
        Where a real-time prescription monitoring service covers the medicine,
        the console shows its indicator in the prescribing window before you
        choose a dose.
      </p>

      <TwoColumnTable title="Benzodiazepines" rows={BENZODIAZEPINES} />
      <TwoColumnTable title="Other Strong Sleeping Tablets" rows={SLEEPING_TABLETS} />

      <h2 className="mt-8 mb-2 text-xl font-bold">
        Stimulants (ADHD or Narcolepsy)
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr>
              <Th>Active Ingredient</Th>
              <Th>Common Brand Names</Th>
              <Th>Comment</Th>
            </tr>
          </thead>
          <tbody>
            {STIMULANTS.map(([ingredient, brands, comment]) => (
              <tr key={ingredient}>
                <Td>{ingredient}</Td>
                <Td className="font-semibold">{brands}</Td>
                <Td className="text-center italic">“{comment}”</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Alert tone="warn" title="This list is guidance, not enforcement">
        The hard stop in this console is the contraindication check in{" "}
        <code className="font-mono">safety.policy.ts</code>. A permit-only
        restriction is a separate rule and is not yet enforced in code — a
        doctor can still draft one of these, which a production build must
        prevent.
      </Alert>
    </>
  );
}

function TwoColumnTable({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <>
      <h2 className="mt-8 mb-2 text-xl font-bold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr>
              <Th>Active Ingredient</Th>
              <Th>Common Brand Names</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([ingredient, brands]) => (
              <tr key={ingredient}>
                <Td>{ingredient}</Td>
                <Td>{brands}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-line px-4 py-2.5 text-center font-semibold">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`border border-line px-4 py-2.5 ${className}`}>{children}</td>
  );
}

/* ------------------------------------------------------------------ */

function Feedback() {
  return (
    <>
      <h1 className="text-2xl font-bold">Feedback / Complaints</h1>
      <p className="mt-3 text-sm">
        Clinical incidents and patient complaints go to the responsible medical
        officer, not to the software support desk.
      </p>
      <Alert tone="warn" title="Not implemented">
        There is no incident form in this prototype. A deputising service needs
        one that records the reporter, the consult, the category and the
        outcome, and that clinical governance can audit.
      </Alert>
    </>
  );
}

function Training() {
  return (
    <>
      <h1 className="text-2xl font-bold">Support / Training</h1>
      <div className="mt-4 rounded-lg border border-line p-5 text-sm">
        <ul className="ml-5 list-disc space-y-1.5 text-muted">
          <li>
            <strong className="text-ink">Clinical escalation</strong> — the
            clinical chat in the waiting room, which reaches the doctors on
            shift and the medical director.
          </li>
          <li>
            <strong className="text-ink">Operational and dispatch</strong> — the
            dispatcher chat, in the same panel.
          </li>
          <li>
            <strong className="text-ink">Technical faults</strong> — the support
            desk.
          </li>
          <li>
            <strong className="text-ink">Credentialing and onboarding</strong> —
            practice administration.
          </li>
        </ul>
      </div>
      <Alert tone="warn" title="Reference behaviour flagged for change">
        The reference software gates its support site behind a single shared
        password distributed over WhatsApp. This page uses the same
        authenticated session as the rest of the console instead.
      </Alert>
    </>
  );
}

function Contact() {
  return (
    <>
      <h1 className="text-2xl font-bold">Contact</h1>
      <p className="mt-3 text-sm">
        Contact numbers and the on-call roster are operator-specific and are not
        stored in this prototype.
      </p>
    </>
  );
}
