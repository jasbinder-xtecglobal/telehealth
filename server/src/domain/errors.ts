/**
 * Domain errors.
 *
 * The domain and service layers throw these; the tRPC layer is the only place
 * that knows how to turn them into HTTP/tRPC codes. Keeps transport concerns
 * out of business logic.
 */

export type DomainErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  | "PRECONDITION_FAILED"
  | "INVALID";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what: string) =>
  new DomainError("NOT_FOUND", `${what} not found`);

export const conflict = (message: string) => new DomainError("CONFLICT", message);

export const forbidden = (message: string) => new DomainError("FORBIDDEN", message);

export const precondition = (message: string, details?: Record<string, unknown>) =>
  new DomainError("PRECONDITION_FAILED", message, details);

export const invalid = (message: string) => new DomainError("INVALID", message);
