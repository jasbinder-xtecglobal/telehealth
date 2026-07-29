import type { Doctor } from "../db/schema/doctors.ts";
import type { DoctorType } from "../db/schema/enums.ts";
import {
  assertPasswordAcceptable,
  checkPassword,
  clearFailures,
  isLockedOut,
  isValidEmail,
  isValidPrescriberNumber,
  isValidProviderNumber,
  minutesUntilUnlock,
  normaliseEmail,
  registerFailure,
} from "../domain/auth/credentials.policy.ts";
import {
  assertAccountCanSignIn,
  isSessionUsable,
  isTokenRedeemable,
  sessionExpiry,
  verificationExpiry,
} from "../domain/auth/session.policy.ts";
import { forbidden, invalid, notFound } from "../domain/errors.ts";
import type {
  ClockPort,
  EmailPort,
  PasswordHasherPort,
  TokenPort,
} from "../integrations/ports.ts";
import type {
  AuditRepository,
  AuthRepository,
  DoctorRepository,
} from "../repositories/ports.ts";

export type SignupInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  providerNumber: string;
  prescriberNumber: string;
  doctorType: DoctorType;
  qualifications?: string;
  mobile?: string;
};

export type SessionIssued = {
  token: string;
  expiresAt: Date;
  doctor: Doctor;
};

/**
 * Authentication.
 *
 * Two properties this class is built around:
 *
 *  - **No account enumeration.** Signup and login return the same shape whether
 *    or not the address exists, so the API cannot be used to discover which
 *    doctors are registered.
 *  - **Verification is load-bearing.** An unverified account can present a
 *    correct password and still receives no session — otherwise the email step
 *    is decorative.
 */
export class AuthService {
  constructor(
    private readonly auth: AuthRepository,
    private readonly doctors: DoctorRepository,
    private readonly hasher: PasswordHasherPort,
    private readonly tokens: TokenPort,
    private readonly email: EmailPort,
    private readonly audit: AuditRepository,
    private readonly clock: ClockPort,
    private readonly webOrigin: string,
  ) {}

  /* ---------------------------------------------------------------- *
   * Signup
   * ---------------------------------------------------------------- */

  async signup(input: SignupInput): Promise<{ ok: true }> {
    const email = normaliseEmail(input.email);

    if (!isValidEmail(email)) throw invalid("Enter a valid email address");
    assertPasswordAcceptable(input.password, email);

    if (!isValidProviderNumber(input.providerNumber)) {
      throw invalid("Provider number must be 5–7 digits followed by a location and check character");
    }
    if (!isValidPrescriberNumber(input.prescriberNumber)) {
      throw invalid("Prescriber number must be 5–8 digits");
    }

    const existing = await this.doctors.findByEmail(email);

    if (existing) {
      // Do not disclose that the address is taken. Nudge the real owner
      // instead: if they are unverified, resend; otherwise say nothing new.
      if (existing.status === "pending_verification") {
        await this.issueVerification(existing);
      } else {
        await this.email.send({
          to: email,
          subject: "Sign-in attempt for your existing account",
          body: "Someone tried to register with this address. If that was you, sign in instead or reset your password.",
        });
      }
      return { ok: true };
    }

    const doctor = await this.doctors.create({
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      mobile: input.mobile?.trim() || null,
      providerNumber: input.providerNumber.trim().toUpperCase(),
      prescriberNumber: input.prescriberNumber.trim(),
      doctorType: input.doctorType,
      qualifications: input.qualifications?.trim() || null,
      passwordHash: await this.hasher.hash(input.password),
      status: "pending_verification",
    });

    await this.issueVerification(doctor);

    await this.audit.record({
      actorId: doctor.id,
      actorName: `${doctor.firstName} ${doctor.lastName}`,
      eventType: "account.registered",
      entityType: "doctor",
      entityId: doctor.id,
      payload: { email },
    });

    return { ok: true };
  }

  /** Issues a single-use verification link, invalidating any outstanding ones. */
  private async issueVerification(doctor: Doctor): Promise<string> {
    const now = this.clock.now();
    await this.auth.consumeAllVerificationTokens(doctor.id, now);

    const { raw, hash } = this.tokens.issue();
    await this.auth.createVerificationToken({
      doctorId: doctor.id,
      tokenHash: hash,
      expiresAt: verificationExpiry(now),
    });

    const link = `${this.webOrigin}/verify?token=${raw}`;
    await this.email.send({
      to: doctor.email,
      subject: "Verify your email to activate your account",
      body: `Hello Dr ${doctor.lastName},\n\nConfirm your email address to activate your clinician account. This link is single use and expires in 24 hours.`,
      link,
    });

    return link;
  }

  async resendVerification(rawEmail: string): Promise<{ ok: true }> {
    const email = normaliseEmail(rawEmail);
    const doctor = await this.doctors.findByEmail(email);

    // Same response either way — no enumeration.
    if (doctor && doctor.status === "pending_verification") {
      await this.issueVerification(doctor);
    }
    return { ok: true };
  }

  /* ---------------------------------------------------------------- *
   * Verification
   * ---------------------------------------------------------------- */

  async verifyEmail(rawToken: string): Promise<{ email: string }> {
    const now = this.clock.now();
    const record = await this.auth.findVerificationToken(
      this.tokens.fingerprint(rawToken),
    );

    if (!record || !isTokenRedeemable(record, now)) {
      throw invalid("This verification link is invalid, expired, or already used");
    }

    await this.auth.consumeVerificationToken(record.id, now);

    const doctor = await this.doctors.update(record.doctorId, {
      status: "active",
      emailVerifiedAt: now,
    });
    if (!doctor) throw notFound("Account");

    await this.audit.record({
      actorId: doctor.id,
      actorName: `${doctor.firstName} ${doctor.lastName}`,
      eventType: "account.email_verified",
      entityType: "doctor",
      entityId: doctor.id,
    });

    return { email: doctor.email };
  }

  /* ---------------------------------------------------------------- *
   * Login
   * ---------------------------------------------------------------- */

  async login(input: {
    email: string;
    password: string;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<SessionIssued> {
    const now = this.clock.now();
    const email = normaliseEmail(input.email);
    const doctor = await this.doctors.findByEmail(email);

    // Hash anyway when the account is absent, so response time does not reveal
    // whether the address exists.
    if (!doctor?.passwordHash) {
      await this.hasher.verify(input.password, "scrypt$1$1$1$AA==$AA==");
      throw invalid("Email or password is incorrect");
    }

    if (isLockedOut(doctor, now)) {
      throw forbidden(
        `Too many failed attempts. Try again in ${minutesUntilUnlock(doctor, now)} minutes.`,
      );
    }

    const correct = await this.hasher.verify(input.password, doctor.passwordHash);

    if (!correct) {
      const next = registerFailure(doctor, now);
      await this.doctors.update(doctor.id, next);

      await this.audit.record({
        actorId: doctor.id,
        actorName: `${doctor.firstName} ${doctor.lastName}`,
        eventType: "auth.login_failed",
        entityType: "doctor",
        entityId: doctor.id,
        payload: { attempts: next.failedLoginAttempts, ipAddress: input.ipAddress },
      });

      throw invalid("Email or password is incorrect");
    }

    // Correct password, but the account still has to be allowed to sign in.
    assertAccountCanSignIn(doctor.status);

    const { raw, hash } = this.tokens.issue();
    const expiresAt = sessionExpiry(now);

    await this.auth.createSession({
      doctorId: doctor.id,
      tokenHash: hash,
      expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    });

    const updated = await this.doctors.update(doctor.id, {
      ...clearFailures(),
      lastLoginAt: now,
      isOnline: true,
      lastSeenAt: now,
    });

    await this.audit.record({
      actorId: doctor.id,
      actorName: `${doctor.firstName} ${doctor.lastName}`,
      eventType: "auth.login",
      entityType: "doctor",
      entityId: doctor.id,
      payload: { ipAddress: input.ipAddress },
    });

    return { token: raw, expiresAt, doctor: updated ?? doctor };
  }

  /* ---------------------------------------------------------------- *
   * Session resolution
   * ---------------------------------------------------------------- */

  /** Called on every request. Returns null rather than throwing. */
  async resolveSession(rawToken: string | undefined): Promise<Doctor | null> {
    if (!rawToken) return null;

    const now = this.clock.now();
    const session = await this.auth.findSessionByHash(
      this.tokens.fingerprint(rawToken),
    );

    if (!session || !isSessionUsable(session, now)) return null;
    if (session.doctor.status !== "active") return null;

    await this.auth.touchSession(session.id, now);
    return session.doctor;
  }

  async logout(rawToken: string | undefined): Promise<{ ok: true }> {
    if (!rawToken) return { ok: true };

    const now = this.clock.now();
    const session = await this.auth.findSessionByHash(
      this.tokens.fingerprint(rawToken),
    );

    if (session) {
      await this.auth.revokeSession(session.id, now);
      await this.doctors.update(session.doctorId, { isOnline: false });

      await this.audit.record({
        actorId: session.doctorId,
        actorName: `${session.doctor.firstName} ${session.doctor.lastName}`,
        eventType: "auth.logout",
        entityType: "doctor",
        entityId: session.doctorId,
      });
    }

    return { ok: true };
  }

  /* ---------------------------------------------------------------- *
   * Helpers for the UI
   * ---------------------------------------------------------------- */

  /** Live password feedback, from the same rules the server enforces. */
  passwordFeedback(password: string, email?: string) {
    return checkPassword(password, email);
  }

  /** Prototype affordance: read the verification link without a mailbox. */
  async recentEmails(limit = 10) {
    return this.email.recent(limit);
  }
}
