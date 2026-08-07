/**
 * Prescribing safety rules.
 *
 * The highest-consequence logic in the system, and therefore the code most
 * worth keeping pure: no database, no network, no framework. Given a drug, the
 * patient's coded allergies and their current scripts, decide what blocks and
 * what warns.
 *
 * Callers must treat `blocking` as a hard stop unless an override reason is
 * supplied and recorded.
 */

export type AllergyRecord = {
  substance: string;
  reaction: string | null;
  isNkda: boolean;
};

export type PrescribedItem = {
  activeIngredient: string;
};

export type DrugFacts = {
  productName: string;
  activeIngredient: string;
  contraindicatedWith: string[] | null;
  interactsWith: string[] | null;
  isMonitored: boolean;
};

export type SafetyAssessment = {
  /** Hard stops. Require an explicit, audited override to proceed. */
  blocking: string[];
  /** Advisory. Shown to the prescriber but do not gate submission. */
  warnings: string[];
};

const eq = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Contraindication against documented allergies.
 * NKDA rows are markers, never matched as substances.
 */
export function checkAllergies(
  drug: DrugFacts,
  allergies: readonly AllergyRecord[],
): string[] {
  const contra = drug.contraindicatedWith ?? [];

  return allergies
    .filter((a) => !a.isNkda)
    .filter((a) => contra.some((c) => eq(c, a.substance)))
    .map(
      (a) =>
        `Documented allergy to ${a.substance}${a.reaction ? ` (${a.reaction})` : ""} — ${drug.productName} is contraindicated.`,
    );
}

/** Interaction against what has already been prescribed this consult. */
export function checkInteractions(
  drug: DrugFacts,
  current: readonly PrescribedItem[],
): string[] {
  const interacts = drug.interactsWith ?? [];

  return current
    .filter((p) => interacts.some((i) => eq(i, p.activeIngredient)))
    .map(
      (p) =>
        `Interaction: ${drug.activeIngredient} with ${p.activeIngredient} already prescribed this consult.`,
    );
}

/** Same active ingredient prescribed twice in one consult. */
export function checkDuplicateTherapy(
  drug: DrugFacts,
  current: readonly PrescribedItem[],
): string[] {
  return current.some((p) => eq(p.activeIngredient, drug.activeIngredient))
    ? [`Duplicate therapy: ${drug.activeIngredient} already prescribed this consult.`]
    : [];
}

/**
 * Full assessment. `monitoringAlerts` come from the RTPM port — passed in
 * rather than fetched, so this function stays pure.
 */
export function assessPrescription(input: {
  drug: DrugFacts;
  allergies: readonly AllergyRecord[];
  currentPrescriptions: readonly PrescribedItem[];
  monitoringAlerts?: readonly string[];
}): SafetyAssessment {
  const { drug, allergies, currentPrescriptions, monitoringAlerts = [] } = input;

  return {
    blocking: checkAllergies(drug, allergies),
    warnings: [
      ...checkInteractions(drug, currentPrescriptions),
      ...checkDuplicateTherapy(drug, currentPrescriptions),
      ...monitoringAlerts,
    ],
  };
}

/** An override must carry a substantive reason — it is audited. */
export function isOverrideAcceptable(reason: string | null | undefined): boolean {
  return Boolean(reason && reason.trim().length >= 5);
}
