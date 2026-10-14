export type Platform = "google_meet" | "zoom" | "teams" | "demo";

export type TwinLook = "realistic" | "stylized";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface OwnerVerification {
  status: VerificationStatus;
  /** Provider that performed the ID + liveness check (e.g. "demo", "stripe_identity", "persona"). */
  provider: string;
  /** Opaque reference to the provider's verification session. */
  reference?: string;
  verifiedAt?: string;
  /** Liveness challenges that were completed during the scan (turn head, smile, read digits...). */
  livenessChallenges?: string[];
}

export type ConsentScope =
  | "likeness_video"
  | "voice_clone"
  | "meeting_join"
  | "recording"
  | "knowledge_use";

export interface ConsentRecord {
  id: string;
  twinId: string;
  ownerId: string;
  /** Full legal name as typed by the signer. */
  signerName: string;
  scopes: ConsentScope[];
  /** Hash of the consent text the user agreed to, so we can prove what was shown. */
  textHash: string;
  signedAt: string;
  revokedAt?: string;
  revocationReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TwinProfile {
  id: string;
  ownerId: string;
  displayName: string;
  look: TwinLook;
  /** Public URL or data URL of the reference frame used for the realistic look. */
  referenceImageUrl?: string;
  /** Reference to the stored selfie video / scan. */
  scanAssetId?: string;
  /** Reference to the stored voice sample. */
  voiceSampleAssetId?: string;
  voiceModelReady: boolean;
  avatarModelReady: boolean;
  backgroundId: string;
  persona: Persona;
  installedSkillIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Persona {
  tone: string;
  role: string;
  /** Short facts the twin may share freely. */
  facts: string[];
  /** Topics the twin must decline and escalate to the owner. */
  restrictedTopics: string[];
  /** Phrase used when the twin does not know or is not allowed to answer. */
  deferralPhrase: string;
}

export interface KnowledgeDoc {
  id: string;
  twinId: string;
  title: string;
  content: string;
  source: "upload" | "note" | "connection";
  createdAt: string;
}

export type JoinMode = "join" | "listen" | "skip";

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  platform: Platform;
  joinUrl?: string;
  organizerEmail?: string;
  attendeeEmails: string[];
  /** Per-event override set by the owner in the UI. */
  modeOverride?: JoinMode;
}

export interface JoinRule {
  id: string;
  name: string;
  mode: JoinMode;
  /** Match any of these keywords in the title (case-insensitive). */
  titleKeywords?: string[];
  /** Match the organizer's email domain (e.g. "acme.com"). */
  organizerDomains?: string[];
  /** Only match when attendee count is at least this many. */
  minAttendees?: number;
  /** Only match when attendee count is at most this many. */
  maxAttendees?: number;
  platforms?: Platform[];
  priority: number;
}

export type SessionState =
  | "preflight"
  | "blocked"
  | "joining"
  | "waiting_for_media"
  | "live"
  | "voice_only"
  | "listen_only"
  | "ended"
  | "failed"
  | "refunded";

export interface SessionLogEntry {
  at: string;
  level: "info" | "warn" | "error";
  event: string;
  detail?: Record<string, unknown>;
}

export interface TranscriptLine {
  at: string;
  speaker: string;
  text: string;
  isTwin: boolean;
}

export interface MeetingSummary {
  transcript: TranscriptLine[];
  notes: string[];
  actionItems: ActionItem[];
  decisions: string[];
  flaggedForOwner: string[];
}

export interface ActionItem {
  owner: string;
  text: string;
  due?: string;
}

export interface ConnectionDef {
  id: "google" | "slack" | "sms" | "telegram" | "x" | "instagram";
  name: string;
  description: string;
  /** Environment variable names required for a real OAuth connection. */
  requiredEnv: string[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: "meetings" | "communication" | "knowledge" | "accessibility";
  permissions: string[];
  /** Skills that would let a twin bind the owner are never installable. */
  forbidden?: boolean;
}

export interface BackgroundOption {
  id: string;
  name: string;
  kind: "builtin" | "upload";
  /** CSS value (gradient or url()). */
  css: string;
}
