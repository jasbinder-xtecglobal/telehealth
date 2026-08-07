import type { ClockPort, ScribePort, ScribeResult } from "../ports.ts";

const MODEL_ID = "mock-scribe-v1";

/**
 * Deterministic stand-in for the AI scribe.
 *
 * Maps a transcript onto the doctor's own template rather than imposing a fixed
 * structure. Deterministic on purpose: the prototype demonstrates the workflow
 * and its provenance guarantees without an API key or non-reproducible output.
 *
 * Replacing this with a language model means implementing `ScribePort` and
 * changing one line in the composition root. Whatever replaces it must still
 * return a `model` identifier — the note revision records it.
 */
export class MockScribeAdapter implements ScribePort {
  constructor(private readonly clock: ClockPort) {}

  async draftNote(input: {
    template: string;
    transcript: string;
    doctorName: string;
    personalisation: string | null;
    preference: "phone" | "video";
  }): Promise<ScribeResult> {
    const t = input.transcript.toLowerCase();
    const has = (...words: string[]) => words.some((w) => t.includes(w));

    /* -------- history of presenting complaint -------- */
    const findings: string[] = [];
    if (has("diarrhoea", "diarrhea", "loose stool")) findings.push("- Diarrhoea");
    if (has("vomit", "nausea")) findings.push("- Nausea and vomiting");

    // Negations are tested first — "no fevers" also matches "fever".
    if (has("no fever", "afebrile", "no temperature")) findings.push("- No fevers");
    else if (has("fever", "temperature")) findings.push("- Febrile");

    if (has("cough")) findings.push("- Cough");
    if (has("rash")) findings.push("- Rash");

    if (has("no blood")) findings.push("- No blood in stool");
    else if (has("blood")) findings.push("- Blood reported");

    if (has("pain")) findings.push("- Pain reported");
    if (has("fluid", "hydrat")) findings.push("- Tolerating fluids");
    if (findings.length === 0) findings.push("- See transcript");

    /* -------- impression -------- */
    let impression = "For clinical correlation";
    if (has("diarrhoea", "diarrhea")) impression = "Diarrhoea, likely viral gastroenteritis";
    else if (has("urin", "dysuria", "burning")) impression = "Lower urinary tract infection";
    else if (has("cough", "cold", "throat")) impression = "Viral upper respiratory tract infection";
    else if (has("rash")) impression = "Dermatological presentation, see examination";

    /* -------- plan -------- */
    const plan = [
      "Plan -",
      "- Monitor symptoms",
      "- Maintain hydration",
      "- Seek medical attention if symptoms persist or worsen",
      "- Offer medical certificate for work if needed",
    ].join("\n");

    const now = this.clock.now();
    const channelLine =
      input.preference === "video" ? "Video consultation" : "Phone consultation";

    const filled = input.template
      .replace(/^PC\s*-.*$/m, `PC - ${impression}`)
      .replace(/^HPC\s*-.*$/m, `HPC -\n${findings.join("\n")}`)
      .replace(/^PMH\s*-.*$/m, "PMH - As per patient summary")
      .replace(/^DH\s*-.*$/m, "DH - As per patient summary")
      .replace(/^SH\s*-.*$/m, "SH - Not a smoker")
      .replace(/^Examination\s*-.*$/m, "Examination - Speaking in full sentences")
      .replace(/^Impression\s*-.*$/m, `Impression - ${impression}`)
      .replace(/^Plan\s*-.*$/m, plan)
      .replace(/^Date of call:.*$/m, `Date of call: ${now.toLocaleDateString("en-AU")}`)
      .replace(
        /^Time:.*$/m,
        `Time: ${now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`,
      );

    const body = filled.includes(channelLine)
      ? filled
      : filled.replace(/^(3 points of ID checked)$/m, `$1\n${channelLine}`);

    return { body, model: MODEL_ID };
  }
}
