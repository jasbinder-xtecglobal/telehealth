/**
 * The booking form's reason list.
 *
 * Imported from the API's domain layer rather than retyped here, so the
 * options a patient sees and the categories a doctor filters on cannot drift
 * apart. `intake.policy.ts` has no runtime imports of its own — its only
 * dependency is a type — so bundling it into the browser pulls in nothing else.
 *
 * Everything the site needs from the domain comes through this file, so if it
 * ever has to become a copy, it is one file to change.
 */
export {
  BOOKING_REASONS,
  type BookingReason,
} from "@telehealth/domain/intake/intake.policy.ts";
