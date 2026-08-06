/**
 * Schema barrel.
 *
 * Drizzle needs every table and relation in one object to build its query API,
 * so this file re-exports the domain modules rather than defining anything.
 */
export * from "./enums.ts";
export * from "./patients.ts";
export * from "./doctors.ts";
export * from "./auth.ts";
export * from "./consults.ts";
export * from "./calls.ts";
export * from "./intake.ts";
export * from "./dispatch.ts";
export * from "./reference.ts";
export * from "./artefacts.ts";
export * from "./billing.ts";
export * from "./collaboration.ts";
export * from "./audit.ts";
export * from "./relations.ts";
