import type { ConsentRecord, ConsentScope, OwnerVerification, TwinProfile } from "../types";

/**
 * Anti-impersonation (feature map 4.5 and function #16): only the verified owner may create, edit
 * or run their twin, and only while a consent record covering the needed scopes is active.
 */

export const REQUIRED_LIVENESS_CHALLENGES = 2;

export const REQUIRED_SCOPES_TO_CREATE: ConsentScope[] = ["likeness_video", "voice_clone"];

export type TwinAction = "create" | "edit" | "run" | "view";

export interface AuthorizeInput {
  actorId: string | null | undefined;
  action: TwinAction;
  /** Required for every action except "create". */
  twin?: Pick<TwinProfile, "id" | "ownerId">;
  verification?: OwnerVerification;
  consent?: ConsentRecord | null;
  /** The identity the verification belongs to. Must equal the actor. */
  verifiedUserId?: string;
}

export interface AuthorizeResult {
  ok: boolean;
  reason?: string;
}

export function isVerified(v: OwnerVerification | undefined): boolean {
  return !!v && v.status === "verified" && (v.livenessChallenges?.length ?? 0) >= REQUIRED_LIVENESS_CHALLENGES;
}

export function isConsentActive(c: ConsentRecord | null | undefined, scopes: ConsentScope[] = []): boolean {
  if (!c || c.revokedAt) return false;
  return scopes.every((s) => c.scopes.includes(s));
}

export function authorizeTwinAction(input: AuthorizeInput): AuthorizeResult {
  const { actorId, action, twin, verification, consent } = input;
  if (!actorId) return { ok: false, reason: "Not signed in." };

  if (action !== "create") {
    if (!twin) return { ok: false, reason: "Twin not found." };
    if (twin.ownerId !== actorId) return { ok: false, reason: "Only the twin's verified owner can do this." };
  }
  if (action === "view") return { ok: true };

  if (input.verifiedUserId !== undefined && input.verifiedUserId !== actorId) {
    return { ok: false, reason: "Identity verification belongs to a different person." };
  }
  if (!isVerified(verification)) return { ok: false, reason: "Complete the ID and liveness check first." };

  if (action === "create" || action === "run") {
    if (!isConsentActive(consent, REQUIRED_SCOPES_TO_CREATE)) {
      return { ok: false, reason: "An active likeness and voice consent must be on file in the consent vault." };
    }
    if (consent && consent.ownerId !== actorId) return { ok: false, reason: "Consent must be signed by the owner." };
  }
  if (action === "run" && !isConsentActive(consent, ["meeting_join"])) {
    return { ok: false, reason: "Consent does not cover joining meetings." };
  }
  return { ok: true };
}

export function revokeConsent(c: ConsentRecord, reason: string, now = new Date()): ConsentRecord {
  if (c.revokedAt) return c;
  return { ...c, revokedAt: now.toISOString(), revocationReason: reason };
}

export const CONSENT_TEXT_VERSION = "2026-10-14";

export function consentText(name: string): string {
  return [
    `I, ${name}, am the person shown in the uploaded scan and heard in the uploaded voice sample.`,
    "I authorize Loving Grace to create an AI twin from my likeness and voice for use only by me, in meetings I authorize.",
    "The twin will always identify itself as an AI twin, announce transcription, and carry content credentials.",
    "The twin may not agree to contracts, payments or other binding commitments on my behalf.",
    "My scan, voice model and notes are encrypted, never used to train shared models, never exported, and deleted on request.",
    "I can revoke this consent at any time; revocation immediately stops all twin sessions.",
    `Consent text version ${CONSENT_TEXT_VERSION}.`,
  ].join("\n");
}
