import type { ReferenceRepository } from "../repositories/ports.ts";

/**
 * Read-only reference data lookups.
 *
 * Thin by design — the interesting rules about *which* MBS items a doctor may
 * select live in BillingService and the MBS policy, not here.
 */
export class ReferenceService {
  constructor(private readonly reference: ReferenceRepository) {}

  async searchDrugs(term: string) {
    return this.reference.searchDrugs(term);
  }
}
