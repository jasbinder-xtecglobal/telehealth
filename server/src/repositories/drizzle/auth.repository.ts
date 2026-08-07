import { and, eq, isNull } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import type { Doctor } from "../../db/schema/doctors.ts";
import type { Session } from "../../db/schema/auth.ts";
import { emailVerificationTokens, sessions } from "../../db/schema/index.ts";
import type { AuthRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

export class DrizzleAuthRepository
  extends DrizzleRepository
  implements AuthRepository
{
  /* ---------------- sessions ---------------- */

  async createSession(
    input: {
      doctorId: string;
      tokenHash: string;
      expiresAt: Date;
      userAgent?: string | null;
      ipAddress?: string | null;
    },
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx).insert(sessions).values(input).returning();
    return row!;
  }

  /** Lookup is by fingerprint — the raw token never reaches the database. */
  async findSessionByHash(tokenHash: string, tx?: Executor) {
    const row = await this.exec(tx).query.sessions.findFirst({
      where: eq(sessions.tokenHash, tokenHash),
      with: { doctor: true },
    });
    return (row as (Session & { doctor: Doctor }) | undefined) ?? null;
  }

  async touchSession(id: string, at: Date, tx?: Executor) {
    await this.exec(tx)
      .update(sessions)
      .set({ lastUsedAt: at })
      .where(eq(sessions.id, id));
  }

  /** Revoked, not deleted — the row remains for audit. */
  async revokeSession(id: string, at: Date, tx?: Executor) {
    await this.exec(tx)
      .update(sessions)
      .set({ revokedAt: at })
      .where(eq(sessions.id, id));
  }

  async revokeAllForDoctor(doctorId: string, at: Date, tx?: Executor) {
    const rows = await this.exec(tx)
      .update(sessions)
      .set({ revokedAt: at })
      .where(and(eq(sessions.doctorId, doctorId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    return rows.length;
  }

  /* ---------------- email verification ---------------- */

  async createVerificationToken(
    input: { doctorId: string; tokenHash: string; expiresAt: Date },
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx)
      .insert(emailVerificationTokens)
      .values(input)
      .returning();
    return row!;
  }

  async findVerificationToken(tokenHash: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.emailVerificationTokens.findFirst({
        where: eq(emailVerificationTokens.tokenHash, tokenHash),
      })) ?? null
    );
  }

  async consumeVerificationToken(id: string, at: Date, tx?: Executor) {
    await this.exec(tx)
      .update(emailVerificationTokens)
      .set({ consumedAt: at })
      .where(eq(emailVerificationTokens.id, id));
  }

  /** Issuing a fresh link invalidates any still outstanding. */
  async consumeAllVerificationTokens(doctorId: string, at: Date, tx?: Executor) {
    await this.exec(tx)
      .update(emailVerificationTokens)
      .set({ consumedAt: at })
      .where(
        and(
          eq(emailVerificationTokens.doctorId, doctorId),
          isNull(emailVerificationTokens.consumedAt),
        ),
      );
  }
}
