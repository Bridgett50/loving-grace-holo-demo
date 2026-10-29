/**
 * Local evidence record for approved/sent packages (T9, local only).
 *
 * When the owner approves a package in the twin meeting room, an
 * `EvidenceRecord` is saved: which meeting, the approved package hash, when
 * it was approved/sent, who approved it, what was redacted (categories,
 * counts, placeholders, positions -- never plaintext), and owner takeover
 * events. There is no backend; the in-memory store below is the whole
 * persistence layer (the web UI may wrap it with `localStorage`).
 */

import type { CategoryRedactions } from "./redaction";

export type EvidenceSendState = "unsent" | "sent" | "failed";

export type TakeoverEventKind = "takeover";

export interface TakeoverEvent {
  /** Milliseconds since the Unix epoch, from the injected clock. */
  readonly at: number;
  readonly kind: TakeoverEventKind;
}

export interface EvidenceRedaction {
  readonly category: string;
  readonly count: number;
  readonly placeholders: readonly string[];
  /** Start offsets of each placeholder in the approved (redacted) package. */
  readonly positions: readonly number[];
}

export interface EvidenceRecord {
  readonly meetingId: string;
  readonly meetingTitle: string;
  readonly packageHash: string;
  readonly approvedAt: number;
  /** Null until the package is sent. */
  readonly sentAt: number | null;
  readonly sendState: EvidenceSendState;
  /** Owner id that approved the package. */
  readonly approvalPrincipal: string;
  readonly redactions: readonly EvidenceRedaction[];
  readonly takeoverEvents: readonly TakeoverEvent[];
}

function copyRedactions(
  redactions: readonly CategoryRedactions[],
): EvidenceRedaction[] {
  return [...redactions]
    .sort((a, b) => a.category.localeCompare(b.category))
    .map((r) => ({
      category: r.category,
      count: r.count,
      placeholders: [...r.placeholders],
      positions: [...r.positions],
    }));
}

function copyRecord(record: EvidenceRecord): EvidenceRecord {
  return {
    ...record,
    redactions: record.redactions.map((r) => ({
      ...r,
      placeholders: [...r.placeholders],
      positions: [...r.positions],
    })),
    takeoverEvents: record.takeoverEvents.map((e) => ({ ...e })),
  };
}

/** Stable, pretty JSON export of a record (fixed key order, 2-space indent). */
export function exportEvidenceJson(record: EvidenceRecord): string {
  const ordered = {
    meetingId: record.meetingId,
    meetingTitle: record.meetingTitle,
    packageHash: record.packageHash,
    approvedAt: record.approvedAt,
    sentAt: record.sentAt,
    sendState: record.sendState,
    approvalPrincipal: record.approvalPrincipal,
    redactions: record.redactions.map((r) => ({
      category: r.category,
      count: r.count,
      placeholders: [...r.placeholders],
      positions: [...r.positions],
    })),
    takeoverEvents: record.takeoverEvents.map((e) => ({ at: e.at, kind: e.kind })),
  };
  return JSON.stringify(ordered, null, 2);
}

export interface EvidenceStore {
  get(meetingId: string): EvidenceRecord | null;
  saveApproved(input: {
    readonly meetingId: string;
    readonly meetingTitle: string;
    readonly packageHash: string;
    readonly approvalPrincipal: string;
    readonly redactions: readonly CategoryRedactions[];
  }): EvidenceRecord;
  markSent(meetingId: string, sendState: EvidenceSendState): EvidenceRecord | null;
  logTakeover(meetingId: string): TakeoverEvent;
  clear(): void;
}

/**
 * In-memory evidence store. `now` is injectable so tests are deterministic;
 * it defaults to `Date.now()`.
 */
export function createInMemoryEvidenceStore(opts?: {
  now?: () => number;
}): EvidenceStore {
  const now = opts?.now ?? (() => Date.now());
  const records = new Map<string, EvidenceRecord>();
  const pendingTakeovers = new Map<string, TakeoverEvent[]>();

  return {
    get(meetingId: string): EvidenceRecord | null {
      const found = records.get(meetingId);
      return found ? copyRecord(found) : null;
    },

    saveApproved(input): EvidenceRecord {
      const record: EvidenceRecord = {
        meetingId: input.meetingId,
        meetingTitle: input.meetingTitle,
        packageHash: input.packageHash,
        approvedAt: now(),
        sentAt: null,
        sendState: "unsent",
        approvalPrincipal: input.approvalPrincipal,
        redactions: copyRedactions(input.redactions),
        takeoverEvents: [...(pendingTakeovers.get(input.meetingId) ?? [])],
      };
      records.set(input.meetingId, record);
      return copyRecord(record);
    },

    markSent(meetingId: string, sendState: EvidenceSendState): EvidenceRecord | null {
      const found = records.get(meetingId);
      if (!found) return null;
      const updated: EvidenceRecord = {
        ...copyRecord(found),
        sentAt: sendState === "sent" ? now() : null,
        sendState,
      };
      records.set(meetingId, updated);
      return copyRecord(updated);
    },

    logTakeover(meetingId: string): TakeoverEvent {
      const event: TakeoverEvent = { at: now(), kind: "takeover" };
      const pending = pendingTakeovers.get(meetingId) ?? [];
      pending.push(event);
      pendingTakeovers.set(meetingId, pending);
      const found = records.get(meetingId);
      if (found) {
        records.set(meetingId, {
          ...copyRecord(found),
          takeoverEvents: [...found.takeoverEvents, { ...event }],
        });
      }
      return { ...event };
    },

    clear(): void {
      records.clear();
      pendingTakeovers.clear();
    },
  };
}
