/**
 * Ports for external systems.
 *
 * Each port is deliberately narrow (interface segregation) — a service that
 * only sends SMS depends on `SmsPort` alone, not on a bundled "ExternalServices"
 * object. Services depend on these interfaces; concrete adapters are supplied
 * by the composition root (dependency inversion).
 *
 * Every port below stands in for a system requiring a commercial agreement or
 * conformance testing in production. Swapping a mock for the real thing means
 * writing one adapter and changing one line in `container.ts`.
 */

/* ------------------------------------------------------------------ *
 * Clock — injected so time-dependent rules are testable
 * ------------------------------------------------------------------ */
export interface ClockPort {
  now(): Date;
}

/* ------------------------------------------------------------------ *
 * Password hashing
 * ------------------------------------------------------------------ */
export interface PasswordHasherPort {
  hash(plaintext: string): Promise<string>;
  /** Must be constant-time and must not throw on a malformed digest. */
  verify(plaintext: string, digest: string): Promise<boolean>;
}

/* ------------------------------------------------------------------ *
 * Opaque tokens (sessions, email verification)
 * ------------------------------------------------------------------ */
export type IssuedToken = {
  /** Sent to the user. Never stored. */
  raw: string;
  /** Stored. Cannot be reversed into `raw`. */
  hash: string;
};

export interface TokenPort {
  issue(): IssuedToken;
  /** Hashes a presented token so it can be looked up. */
  fingerprint(raw: string): string;
}

/* ------------------------------------------------------------------ *
 * Transactional email
 * ------------------------------------------------------------------ */
export type SentEmail = {
  to: string;
  subject: string;
  body: string;
  link?: string;
  sentAt: Date;
};

export interface EmailPort {
  send(input: {
    to: string;
    subject: string;
    body: string;
    link?: string;
  }): Promise<SentEmail>;
  /** Prototype affordance — lets the verification link be retrieved without a mailbox. */
  recent(limit?: number): Promise<SentEmail[]>;
}

/* ------------------------------------------------------------------ *
 * eScript exchange (production: eRx / MediSecure)
 * ------------------------------------------------------------------ */
export interface EscriptPort {
  /** Mints a dispensing token. Called only inside the consult-close transaction. */
  issueToken(input: {
    prescriptionId: string;
    productName: string;
  }): Promise<string>;
}

/* ------------------------------------------------------------------ *
 * SMS gateway
 * ------------------------------------------------------------------ */
export type SentMessage = {
  to: string;
  body: string;
  links: string[];
  sentAt: Date;
};

export interface SmsPort {
  send(input: { to: string; body: string; links?: string[] }): Promise<SentMessage>;
  /** Prototype affordance: what a patient would have received. */
  recent(limit?: number): Promise<SentMessage[]>;
}

/* ------------------------------------------------------------------ *
 * Medicare claiming
 * ------------------------------------------------------------------ */
export type EligibilityResult = { valid: boolean; reason: string | null };

export interface ClaimingPort {
  checkEligibility(cardNumber: string | null): Promise<EligibilityResult>;
  submitClaim(input: {
    consultId: string;
    itemNumber: string;
    providerNumber: string;
  }): Promise<{ accepted: boolean; reference: string; reason?: string }>;
}

/* ------------------------------------------------------------------ *
 * Real-time prescription monitoring (SafeScript / QScript / ScriptCheckSA)
 * ------------------------------------------------------------------ */
export interface PrescriptionMonitoringPort {
  check(input: {
    isMonitored: boolean;
    patientName: string;
  }): Promise<{ checked: boolean; alerts: string[] }>;
}

/* ------------------------------------------------------------------ *
 * AI scribe and summarisation
 * ------------------------------------------------------------------ */
export type ScribeResult = {
  body: string;
  /** Retained against the note revision so an AI-drafted note stays reproducible. */
  model: string;
};

export type PriorNote = {
  body: string;
  doctorName: string;
  date: Date;
};

export interface ScribePort {
  /** Writes a note into the doctor's own template structure. */
  draftNote(input: {
    template: string;
    transcript: string;
    doctorName: string;
    personalisation: string | null;
    preference: "phone" | "video";
  }): Promise<ScribeResult>;
}

export interface SummariserPort {
  /** Cross-consult patient summary built from prior notes. */
  summarise(notes: readonly PriorNote[]): Promise<string>;
}

/* ------------------------------------------------------------------ *
 * Routing (production: Google Directions / Mapbox / HERE)
 * ------------------------------------------------------------------ */
export type RoutePoint = { latitude: number; longitude: number };

export type RouteLeg = {
  id: string;
  order: number;
  distanceKm: number;
  etaMinutes: number;
};

export interface RoutingPort {
  /**
   * Sequences stops and returns per-leg distance and ETA.
   *
   * The mock uses straight-line distance, which under-reads real driving
   * distance — a production adapter returns road geometry and live traffic.
   * The *ordering rule* stays in the domain either way.
   */
  optimise(input: {
    origin: RoutePoint;
    stops: (RoutePoint & { id: string; label: string; acuity: number })[];
  }): Promise<RouteLeg[]>;
}

/* ------------------------------------------------------------------ *
 * Real-time fan-out
 * ------------------------------------------------------------------ */
export type DomainEvent =
  | { type: "queue.changed"; channel: string }
  | { type: "chat.message"; channel: "clinical" | "dispatcher" }
  | { type: "presence.changed"; doctorId: string }
  | { type: "consult.changed"; consultId: string }
  | { type: "dispatch.changed"; doctorId: string | null }
  | { type: "duress.raised"; doctorId: string; alertId: string };

export interface EventBusPort {
  publish(event: DomainEvent): void;
  subscribe<T extends DomainEvent["type"]>(
    type: T,
    signal: AbortSignal,
  ): AsyncIterable<Extract<DomainEvent, { type: T }>>;
}
