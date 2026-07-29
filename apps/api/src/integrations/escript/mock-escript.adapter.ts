import { randomBytes } from "node:crypto";
import type { EscriptPort } from "../ports.ts";

/**
 * Stand-in for the electronic prescription exchange.
 *
 * A real adapter authenticates to eRx or MediSecure, submits a conformant
 * prescription payload, and returns the dispensing token. Production use also
 * requires ADHA conformance testing.
 */
export class MockEscriptAdapter implements EscriptPort {
  async issueToken(): Promise<string> {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `ESC-${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  }
}
