import { createHash, randomBytes } from "node:crypto";
import type { IssuedToken, TokenPort } from "../ports.ts";

/**
 * Opaque bearer tokens for sessions and verification links.
 *
 * 256 bits of entropy, URL-safe. Only the SHA-256 fingerprint is persisted, so
 * a database disclosure cannot be replayed — an attacker would have to invert
 * the hash to obtain a usable token.
 *
 * SHA-256 without a work factor is correct here: unlike a password, the token
 * is already high-entropy, so brute force is infeasible regardless.
 */
export class CryptoTokenAdapter implements TokenPort {
  issue(): IssuedToken {
    const raw = randomBytes(32).toString("base64url");
    return { raw, hash: this.fingerprint(raw) };
  }

  fingerprint(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }
}
