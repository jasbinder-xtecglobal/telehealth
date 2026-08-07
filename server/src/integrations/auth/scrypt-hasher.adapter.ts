import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PasswordHasherPort } from "../ports.ts";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt password hashing using Node's built-in crypto — no dependency.
 *
 * Parameters are stored alongside the digest so they can be raised later
 * without invalidating existing passwords: an old hash still verifies against
 * its own recorded cost, and can be re-hashed on next successful sign-in.
 */
export class ScryptPasswordHasher implements PasswordHasherPort {
  private readonly N = 2 ** 15; // ~32 MB, ~100 ms
  private readonly r = 8;
  private readonly p = 1;
  private readonly keyLength = 64;
  private readonly maxmem = 64 * 1024 * 1024;

  async hash(plaintext: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = await scryptAsync(plaintext, salt, this.keyLength, {
      N: this.N,
      r: this.r,
      p: this.p,
      maxmem: this.maxmem,
    });

    return [
      "scrypt",
      this.N,
      this.r,
      this.p,
      salt.toString("base64"),
      derived.toString("base64"),
    ].join("$");
  }

  async verify(plaintext: string, digest: string): Promise<boolean> {
    try {
      const [scheme, n, r, p, saltB64, hashB64] = digest.split("$");
      if (scheme !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false;

      const expected = Buffer.from(hashB64, "base64");
      const derived = await scryptAsync(
        plaintext,
        Buffer.from(saltB64, "base64"),
        expected.length,
        { N: Number(n), r: Number(r), p: Number(p), maxmem: this.maxmem },
      );

      // Length check first — timingSafeEqual throws on a mismatch.
      return (
        derived.length === expected.length && timingSafeEqual(derived, expected)
      );
    } catch {
      // A malformed or truncated digest is a failed verification, not a crash.
      return false;
    }
  }
}
