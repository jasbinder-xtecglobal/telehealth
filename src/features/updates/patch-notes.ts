/**
 * Release notes.
 *
 * These are product announcements, not clinical data — they have no patient
 * scope, no audit requirement and no server-side rule attached, so they ship
 * with the client rather than through a table and an endpoint.
 *
 * Ordering is newest first and is asserted by the page, not assumed here.
 */

export type PatchNoteSection = {
  heading: string;
  body: string;
  /** Rendered as a bulleted list under the body. */
  points?: string[];
};

export type PatchNote = {
  /** ISO date. Doubles as the identity used for the read marker. */
  date: string;
  title: string;
  intro?: string;
  sections: PatchNoteSection[];
};

export const PATCH_NOTES: PatchNote[] = [
  {
    date: "2026-07-10",
    title: "Billing history and a rebuilt inbox",
    intro:
      "Two screens you asked for at the last clinical governance meeting.",
    sections: [
      {
        heading: "Billing History",
        body: "Billing now opens on a date-ranged statement grouped by week and then by day. Each row shows the patient, the presenting category and the MBS items claimed, so a week can be reconciled without opening a single consult.",
        points: [
          "Step the range a week or a month at a time with the arrows",
          "Week and day subtotals are calculated server-side and rounded to cents",
          "A consult you deliberately did not bill is still counted, at zero",
        ],
      },
      {
        heading: "Inbox",
        body: "Results now show the patient, their address and the words they used when they booked, so you can recognise a case without opening it. Pathology and radiology requests are listed under each row in red.",
      },
      {
        heading: "Consult History",
        body: "The day's count is shown at the top, midnight to midnight. Rows with billing still outstanding are shaded so they are visible without filtering.",
      },
    ],
  },
  {
    date: "2026-06-18",
    title: "Software Updates menu",
    sections: [
      {
        heading: "Ability to view software updates",
        body: "Keeping track of software updates can be difficult, so every update now appears in this section. A dot appears next to 'Software Updates' in the menu until you have read the latest one.",
      },
    ],
  },
  {
    date: "2026-05-21",
    title: "Patient results section",
    sections: [
      {
        heading: "Results in the consult console",
        body: "Inside a patient's file you can now list results by type or by date. Pending results are shown as well — investigations that have been requested but have no result back yet.",
      },
      {
        heading: "Requesting doctor is shown",
        body: "Each result carries the doctor who ordered it and the date of the consultation it came from. Follow-up stays with the doctor who ordered the test; copying the usual GP does not transfer it.",
      },
    ],
  },
  {
    date: "2026-04-02",
    title: "Prescribing safety",
    sections: [
      {
        heading: "Contraindications are now a hard stop",
        body: "Where the drug database reports a contraindication against a coded allergy or an existing medication, the prescription cannot be issued without an override reason. The reason is recorded against your account and is visible to clinical governance.",
      },
      {
        heading: "Allergies must be coded",
        body: "Free-text allergies can no longer be entered. Interaction checking cannot run against prose, so an allergy that is not coded is an allergy that is not checked.",
      },
      {
        heading: "Prescription monitoring",
        body: "Where a medicine is monitored, the SafeScript indicator appears beside it in the prescribing window before you choose a dose.",
      },
    ],
  },
  {
    date: "2026-02-27",
    title: "Nothing reaches the patient until the consult closes",
    intro:
      "A change to how prescriptions, referrals, request forms and certificates are released.",
    sections: [
      {
        heading: "Artefacts are held until close",
        body: "Everything you create during a consultation is now created as a draft and held. When you end the consult, the whole set is released to the patient in one transaction, along with a single SMS. Nothing is sent piecemeal and nothing is sent for a consult you did not finish.",
      },
      {
        heading: "Four checks before a consult can close",
        body: "A consult will not close until notes exist, are saved, are attested by you, and a billing decision has been recorded. The checklist in the End Consult window is the same rule the server enforces — it is not a separate reminder.",
      },
      {
        heading: "Editing notes clears your attestation",
        body: "You attested to specific words. If the words change, the attestation is withdrawn and you are asked to review again. Every edit appends a revision; nothing is overwritten.",
      },
    ],
  },
  {
    date: "2025-11-20",
    title: "Queue filters and hidden patients",
    sections: [
      {
        heading: "Choose what you do not want to see",
        body: "You can opt out of presentation categories from the Filters control in the waiting room. Patients you filter stay in the queue for other doctors.",
        points: [
          "Opt-outs are recorded against your account and visible to clinical governance",
          "Hiding an individual patient requires a reason and is auditable",
          "Hidden patients can be restored from My Account",
        ],
      },
    ],
  },
];

const READ_KEY = "13sick.updates.lastReadDate";

/** Newest note's date, or null when there are none. */
export function latestUpdateDate(): string | null {
  return PATCH_NOTES[0]?.date ?? null;
}

/**
 * How many notes are newer than the last one this browser marked read.
 *
 * Deliberately local to the browser: the reference console tracks read state
 * per device, and there is no server-side notion of a doctor having read a
 * release note.
 */
export function unreadUpdateCount(): number {
  if (typeof window === "undefined") return 0;
  const last = window.localStorage.getItem(READ_KEY);
  if (!last) return PATCH_NOTES.length;
  return PATCH_NOTES.filter((n) => n.date > last).length;
}

export function markUpdatesRead(): void {
  const latest = latestUpdateDate();
  if (typeof window !== "undefined" && latest) {
    window.localStorage.setItem(READ_KEY, latest);
  }
}
