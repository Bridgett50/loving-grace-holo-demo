import type { BillingOutcome } from "./session-guard";

/**
 * Prepaid minutes wallet. A session reserves its full capped cost up front (so a runaway session can
 * never spend more than the user saw in the pre-session quote), then settles to the real charge.
 * Every refund is automatic, logged with a reason, and idempotent.
 */

export type LedgerEntryKind = "topup" | "reserve" | "charge" | "refund";

export interface LedgerEntry {
  id: string;
  at: string;
  kind: LedgerEntryKind;
  amountCents: number;
  sessionId?: string;
  reason: string;
}

export interface LedgerState {
  balanceCents: number;
  entries: LedgerEntry[];
  /** Open reservations by session id. */
  reservations: Record<string, number>;
  settled: string[];
}

export class InsufficientBalanceError extends Error {
  constructor(public readonly needed: number, public readonly available: number) {
    super(`Insufficient balance: need ${needed} cents, have ${available} cents`);
  }
}

export class Ledger {
  private s: LedgerState;
  private seq = 0;

  constructor(state?: Partial<LedgerState>) {
    this.s = { balanceCents: 0, entries: [], reservations: {}, settled: [], ...state };
    this.seq = this.s.entries.length;
  }

  get state(): LedgerState {
    return structuredClone(this.s);
  }

  get balanceCents(): number {
    return this.s.balanceCents;
  }

  /** Spendable balance excludes open reservations. */
  get availableCents(): number {
    return this.s.balanceCents - Object.values(this.s.reservations).reduce((a, b) => a + b, 0);
  }

  private push(kind: LedgerEntryKind, amountCents: number, reason: string, sessionId: string | undefined, now: Date) {
    this.seq += 1;
    const entry: LedgerEntry = { id: `le_${this.seq}`, at: now.toISOString(), kind, amountCents, reason, sessionId };
    this.s.entries.push(entry);
    return entry;
  }

  topUp(amountCents: number, reason = "top_up", now = new Date()): LedgerEntry {
    if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error("Top-up must be a positive integer amount of cents");
    this.s.balanceCents += amountCents;
    return this.push("topup", amountCents, reason, undefined, now);
  }

  reserve(sessionId: string, amountCents: number, now = new Date()): LedgerEntry {
    if (this.s.reservations[sessionId] !== undefined || this.s.settled.includes(sessionId)) {
      throw new Error(`Session ${sessionId} already has a reservation`);
    }
    if (this.availableCents < amountCents) throw new InsufficientBalanceError(amountCents, this.availableCents);
    this.s.reservations[sessionId] = amountCents;
    return this.push("reserve", amountCents, "session_cap_reserved", sessionId, now);
  }

  /** Settle a session from the guard's billing outcome. Safe to call more than once. */
  settle(sessionId: string, outcome: Pick<BillingOutcome, "chargedCents" | "reason">, now = new Date()): { chargedCents: number; refundedCents: number } {
    if (this.s.settled.includes(sessionId)) return { chargedCents: 0, refundedCents: 0 };
    const reserved = this.s.reservations[sessionId] ?? 0;
    const chargedCents = Math.max(0, Math.min(outcome.chargedCents, reserved));
    const refundedCents = reserved - chargedCents;
    if (chargedCents > 0) {
      this.s.balanceCents -= chargedCents;
      this.push("charge", chargedCents, outcome.reason, sessionId, now);
    }
    if (refundedCents > 0) this.push("refund", refundedCents, chargedCents === 0 ? `auto_refund:${outcome.reason}` : "unused_reservation_released", sessionId, now);
    delete this.s.reservations[sessionId];
    this.s.settled.push(sessionId);
    return { chargedCents, refundedCents };
  }

  /** Full automatic refund for a failed session. */
  refund(sessionId: string, reason: string, now = new Date()) {
    return this.settle(sessionId, { chargedCents: 0, reason }, now);
  }
}
