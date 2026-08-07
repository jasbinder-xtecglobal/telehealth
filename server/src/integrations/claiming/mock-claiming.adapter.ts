import { randomBytes } from "node:crypto";
import type { ClaimingPort, EligibilityResult } from "../ports.ts";

/**
 * Stand-in for Medicare Web Services.
 *
 * A real adapter registers through PRODA, activates a device, and handles the
 * rejection/resubmission cycle — the absence of which is a revenue leak, not
 * an edge case.
 */
export class MockClaimingAdapter implements ClaimingPort {
  async checkEligibility(cardNumber: string | null): Promise<EligibilityResult> {
    if (!cardNumber) {
      return { valid: false, reason: "No Medicare number recorded" };
    }
    return /^\d{10}$/.test(cardNumber)
      ? { valid: true, reason: null }
      : { valid: false, reason: "Card number failed format check" };
  }

  async submitClaim(): Promise<{ accepted: boolean; reference: string }> {
    return {
      accepted: true,
      reference: `CLM-${randomBytes(4).toString("hex").toUpperCase()}`,
    };
  }
}
