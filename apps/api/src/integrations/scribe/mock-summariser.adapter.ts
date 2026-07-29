import type { PriorNote, SummariserPort } from "../ports.ts";

/**
 * Cross-consult patient summary.
 *
 * Extracts structure from prior notes. Deduplicates on the bare clinical term
 * rather than the rendered line, so a condition recorded across three consults
 * appears once.
 */
export class MockSummariserAdapter implements SummariserPort {
  async summarise(notes: readonly PriorNote[]): Promise<string> {
    if (notes.length === 0) {
      return "No previous consult notes for this patient.";
    }

    const conditions: string[] = [];
    const shortTerm: string[] = [];
    const meds: string[] = [];
    const seenConditions = new Set<string>();
    const seenMeds = new Set<string>();

    const IGNORED = new Set([
      "no medical problems",
      "as per patient summary",
      "nil",
      "none",
    ]);

    for (const note of notes) {
      // Long-term conditions from past medical history.
      const pmh = /^PMH\s*-\s*(.+)$/m.exec(note.body)?.[1] ?? "";
      for (const raw of pmh.split(",").map((s) => s.trim()).filter(Boolean)) {
        const key = raw.toLowerCase();
        if (IGNORED.has(key) || seenConditions.has(key)) continue;
        seenConditions.add(key);
        conditions.push(`- ${raw} (Dr ${note.doctorName})`);
      }

      // Each consult's impression becomes a short-term entry.
      const impression = /^Impression\s*-\s*(.+)$/m.exec(note.body)?.[1];
      if (impression) {
        shortTerm.push(
          `- ${impression} (${note.date.toLocaleDateString("en-AU")}) [Dr ${note.doctorName}]`,
        );
      }

      // Regular medications from the drug history line.
      const dh = /^DH\s*-\s*(.+)$/m.exec(note.body)?.[1] ?? "";
      const dhKey = dh.toLowerCase();
      if (
        dh &&
        !/no regular medication/i.test(dh) &&
        !IGNORED.has(dhKey) &&
        !seenMeds.has(dhKey)
      ) {
        seenMeds.add(dhKey);
        meds.push(`- ${dh} [Dr ${note.doctorName}]`);
      }

      // Anything prescribed inside a plan.
      for (const line of note.body.split("\n")) {
        const m = /^-\s*([A-Z][a-z]+(?:oin|illin|olone|amol|azole|mycin))\s+(\d+\s*mg.*)$/.exec(
          line.trim(),
        );
        if (!m) continue;
        const key = `${m[1]} ${m[2]}`.toLowerCase();
        if (seenMeds.has(key)) continue;
        seenMeds.add(key);
        meds.push(`- ${m[1]} ${m[2]} [Dr ${note.doctorName}]`);
      }
    }

    return [
      "### Conditions:",
      "",
      "**Long-term:**",
      conditions.length ? conditions.join("\n") : "- None recorded",
      "",
      "**Short-term:**",
      shortTerm.length ? shortTerm.join("\n") : "- None recorded",
      "",
      "### Medications:",
      "",
      meds.length ? meds.join("\n") : "- None recorded",
    ].join("\n");
  }
}
