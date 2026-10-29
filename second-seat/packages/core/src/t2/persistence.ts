/**
 * Synchronous key-value persistence for the T2 twin meeting room (T10,
 * local only).
 *
 * A twin room can be given a `RoomStore` so a page reload mid-flow resumes
 * without ever double-sending. Per owner + meeting title (stable across
 * reloads, unlike the connector's per-room random meeting ids) the room
 * persists the draft body, its sha256, the approval state (approved body +
 * hash), the send state, the evidence record, and a DURABLE SEND INTENT.
 *
 * `send()` writes `{ meetingId, packageHash, status: "pending" }` to the
 * store BEFORE calling the transport, then marks it `sent`, `failed`, or
 * `cancelled` (takeover aborted the in-flight transport) after. A `pending`
 * intent found at load time means the previous room died
 * between the intent write and the transport result: the reloaded room must
 * NEVER auto-resend and must refuse a manual send ("unconfirmed").
 *
 * No backend, no network. The `localStorage` adapter below is guarded so it
 * is a no-op during server-side rendering.
 */

import { packageHash } from "./connector";
import type { EvidenceRecord } from "./evidence";
import type { CategoryRedactions } from "./redaction";

/** Minimal synchronous key-value surface the twin room persists through. */
export interface RoomStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** In-memory store: the default for tests and for reload simulation. */
export function createInMemoryRoomStore(): RoomStore {
  const data = new Map<string, string>();
  return {
    get: (key: string) => (data.has(key) ? (data.get(key) as string) : null),
    set: (key: string, value: string) => {
      data.set(key, value);
    },
    remove: (key: string) => {
      data.delete(key);
    },
  };
}

/**
 * `localStorage`-backed store for the web UI. When `localStorage` is
 * unavailable (server-side rendering, disabled storage) every operation is
 * a silent no-op so construction never throws.
 */
export function createLocalStorageRoomStore(
  prefix = "second-seat.t2.room.",
): RoomStore {
  const available = (() => {
    try {
      return typeof localStorage !== "undefined" && localStorage !== null;
    } catch {
      return false;
    }
  })();
  return {
    get: (key: string) => {
      if (!available) return null;
      try {
        return localStorage.getItem(prefix + key);
      } catch {
        return null;
      }
    },
    set: (key: string, value: string) => {
      if (!available) return;
      try {
        localStorage.setItem(prefix + key, value);
      } catch {
        // Storage full or blocked: persistence is best-effort.
      }
    },
    remove: (key: string) => {
      if (!available) return;
      try {
        localStorage.removeItem(prefix + key);
      } catch {
        // Best-effort only.
      }
    },
  };
}

export type SendIntentStatus = "pending" | "sent" | "failed" | "cancelled";

/** Durable send intent: written BEFORE the transport is called. */
export interface SendIntent {
  readonly meetingId: string;
  readonly packageHash: string;
  readonly status: SendIntentStatus;
}

export type PersistedSendState = "unsent" | "sent" | "failed" | "cancelled";

/** An owner-included plugin section (redacted snapshot text). */
export interface PersistedPluginSection {
  readonly id: string;
  readonly text: string;
}

/** Everything the room persists per owner + meeting. */
export interface PersistedDraft {
  readonly version: 1;
  readonly ownerId: string;
  readonly meetingTitle: string;
  readonly body: string;
  readonly bodyHash: string;
  readonly redactions: readonly CategoryRedactions[];
  readonly approvedBody: string | null;
  readonly approvedHash: string | null;
  readonly approved: boolean;
  /** Editable package base (redacted); included sections append after it. */
  readonly pluginBase: string;
  /** Owner-included plugin sections, in display order. */
  readonly pluginSections: readonly PersistedPluginSection[];
  /** Owner-excluded plugin ids. */
  readonly pluginRejected: readonly string[];
  readonly sendState: PersistedSendState;
  readonly intent: SendIntent | null;
  readonly evidence: EvidenceRecord | null;
}

const STORE_VERSION = 1;

function slugForTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "meeting";
}

/** Stable store key per owner + meeting (survives reloads by design). */
export function roomStoreKey(ownerId: string, meetingTitle: string): string {
  return `v1/${ownerId}/${slugForTitle(meetingTitle)}`;
}

/** Stable store key for the per-owner takeover flag. */
export function roomTakeoverKey(ownerId: string): string {
  return `v1/${ownerId}/takeover`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSendState(value: unknown): value is PersistedSendState {
  return (
    value === "unsent" ||
    value === "sent" ||
    value === "failed" ||
    value === "cancelled"
  );
}

function isIntentStatus(value: unknown): value is SendIntentStatus {
  return (
    value === "pending" ||
    value === "sent" ||
    value === "failed" ||
    value === "cancelled"
  );
}

function readIntent(value: unknown): SendIntent | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return null;
  if (
    typeof value["meetingId"] !== "string" ||
    typeof value["packageHash"] !== "string" ||
    !isIntentStatus(value["status"])
  ) {
    return null;
  }
  return {
    meetingId: value["meetingId"],
    packageHash: value["packageHash"],
    status: value["status"],
  };
}

function readEvidence(value: unknown): EvidenceRecord | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return null;
  if (
    typeof value["meetingId"] !== "string" ||
    typeof value["meetingTitle"] !== "string" ||
    typeof value["packageHash"] !== "string" ||
    typeof value["approvalPrincipal"] !== "string" ||
    typeof value["approvedAt"] !== "number" ||
    (value["sentAt"] !== null && typeof value["sentAt"] !== "number") ||
    (value["sendState"] !== "unsent" &&
      value["sendState"] !== "sent" &&
      value["sendState"] !== "failed" &&
      value["sendState"] !== "cancelled") ||
    !Array.isArray(value["redactions"]) ||
    !Array.isArray(value["takeoverEvents"])
  ) {
    return null;
  }
  return value as unknown as EvidenceRecord;
}

/**
 * Load and validate one meeting slot. Returns null when nothing was stored,
 * the JSON is corrupt, or the stored body was tampered with (hash
 * mismatch): callers must then treat the draft as unapproved and unsendable.
 */
export function loadPersistedDraft(
  store: RoomStore,
  ownerId: string,
  meetingTitle: string,
): PersistedDraft | null {
  let raw: string | null;
  try {
    raw = store.get(roomStoreKey(ownerId, meetingTitle));
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed["version"] !== STORE_VERSION) return null;
  if (parsed["ownerId"] !== ownerId || parsed["meetingTitle"] !== meetingTitle) {
    return null;
  }
  if (typeof parsed["body"] !== "string") return null;
  if (typeof parsed["bodyHash"] !== "string") return null;
  // Tamper check: the stored body must hash to the stored hash.
  if (packageHash(parsed["body"]) !== parsed["bodyHash"]) return null;
  if (!Array.isArray(parsed["redactions"])) return null;
  if (typeof parsed["approved"] !== "boolean") return null;
  // Plugin approval state: absent means "no plugin choices yet" (records
  // written before plugins existed); present-but-malformed fails closed.
  const body = parsed["body"] as string;
  const pluginBase =
    parsed["pluginBase"] === undefined ? body : parsed["pluginBase"];
  if (typeof pluginBase !== "string") return null;
  let pluginSections: PersistedPluginSection[] = [];
  if (parsed["pluginSections"] !== undefined) {
    if (!Array.isArray(parsed["pluginSections"])) return null;
    for (const entry of parsed["pluginSections"]) {
      if (
        !isRecord(entry) ||
        typeof entry["id"] !== "string" ||
        typeof entry["text"] !== "string"
      ) {
        return null;
      }
      pluginSections.push({ id: entry["id"], text: entry["text"] });
    }
  }
  let pluginRejected: string[] = [];
  if (parsed["pluginRejected"] !== undefined) {
    if (
      !Array.isArray(parsed["pluginRejected"]) ||
      !parsed["pluginRejected"].every((id) => typeof id === "string")
    ) {
      return null;
    }
    pluginRejected = [...parsed["pluginRejected"]];
  }
  if (!isSendState(parsed["sendState"])) return null;
  const intent = readIntent(parsed["intent"]);
  // A present-but-malformed intent is treated like tampering: fail closed.
  if (parsed["intent"] !== null && parsed["intent"] !== undefined && intent === null) {
    return null;
  }
  const evidence = readEvidence(parsed["evidence"]);

  // The writer always keeps intent and send state in agreement; a mismatch
  // means the stored record was hand-edited: fail closed.
  if (intent !== null) {
    if (parsed["approved"] !== true) return null;
    if (intent.status === "pending" && parsed["sendState"] !== "unsent") return null;
    if (intent.status === "sent" && parsed["sendState"] !== "sent") return null;
    if (intent.status === "failed" && parsed["sendState"] !== "failed") return null;
    if (intent.status === "cancelled" && parsed["sendState"] !== "cancelled") {
      return null;
    }
  }

  if (parsed["approved"] === true) {
    if (typeof parsed["approvedBody"] !== "string") return null;
    if (typeof parsed["approvedHash"] !== "string") return null;
    // The approved body must still equal the current body and hash to the
    // approved hash; otherwise the package was edited after approval.
    if (parsed["approvedBody"] !== parsed["body"]) return null;
    if (packageHash(parsed["approvedBody"]) !== parsed["approvedHash"]) return null;
    if (parsed["approvedHash"] !== parsed["bodyHash"]) return null;
    if (intent !== null && intent.packageHash !== parsed["approvedHash"]) return null;
    // The approval must be bound to the evidence record written at approve
    // time: recomputing the stored hashes around a forged body cannot mint
    // a connector approval, so a record whose evidence still pins a
    // different package hash fails closed to unapproved/unsendable.
    if (evidence === null) return null;
    if (evidence.packageHash !== parsed["approvedHash"]) return null;
  }

  return {
    version: STORE_VERSION,
    ownerId,
    meetingTitle,
    body: parsed["body"],
    bodyHash: parsed["bodyHash"],
    redactions: parsed["redactions"] as CategoryRedactions[],
    approvedBody:
      parsed["approved"] === true ? (parsed["approvedBody"] as string) : null,
    approvedHash:
      parsed["approved"] === true ? (parsed["approvedHash"] as string) : null,
    approved: parsed["approved"],
    pluginBase,
    pluginSections,
    pluginRejected,
    sendState: parsed["sendState"],
    intent,
    evidence,
  };
}

/** Persist one meeting slot (best-effort: store failures never throw). */
export function savePersistedDraft(
  store: RoomStore,
  draft: PersistedDraft,
): void {
  try {
    store.set(roomStoreKey(draft.ownerId, draft.meetingTitle), JSON.stringify(draft));
  } catch {
    // Persistence is best-effort; the in-memory room keeps working.
  }
}

/** Load the persisted per-owner takeover flag (false when absent/corrupt). */
export function loadTakeover(store: RoomStore, ownerId: string): boolean {
  let raw: string | null;
  try {
    raw = store.get(roomTakeoverKey(ownerId));
  } catch {
    return false;
  }
  if (raw === null) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) && parsed["takenOver"] === true;
  } catch {
    return false;
  }
}

/** Persist the per-owner takeover flag (best-effort). */
export function saveTakeover(
  store: RoomStore,
  ownerId: string,
  takenOver: boolean,
): void {
  try {
    store.set(roomTakeoverKey(ownerId), JSON.stringify({ takenOver }));
  } catch {
    // Best-effort only.
  }
}
