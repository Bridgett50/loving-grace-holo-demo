import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Ledger, type LedgerState } from "@second-seat/core";
import { config } from "./config";
import { SessionRunner, type SessionView, type StartSessionRequest } from "./session";

/**
 * Sessions live in memory while running; finished session views and wallets are persisted to
 * BOT_DATA_DIR as JSON so history and balances survive restarts. Swap for Postgres in production.
 */
export class BotStore {
  private readonly live = new Map<string, SessionRunner>();
  private finished: Record<string, SessionView> = {};
  private wallets: Record<string, LedgerState> = {};
  /** Payment references already credited, so a re-delivered payment notice never credits twice. */
  private creditedRefs: Record<string, string> = {};
  private readonly ledgers = new Map<string, Ledger>();
  private readonly file: string;

  constructor(private readonly dir = config.dataDir, private readonly persist = true) {
    this.file = join(dir, "bot-store.json");
    if (persist) {
      try {
        const raw = JSON.parse(readFileSync(this.file, "utf8")) as { finished: Record<string, SessionView>; wallets: Record<string, LedgerState>; creditedRefs?: Record<string, string> };
        this.finished = raw.finished ?? {};
        this.wallets = raw.wallets ?? {};
        this.creditedRefs = raw.creditedRefs ?? {};
      } catch {
        /* first run */
      }
    }
  }

  private save() {
    if (!this.persist) return;
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.file, JSON.stringify({ finished: this.finished, wallets: this.wallets, creditedRefs: this.creditedRefs }, null, 2));
  }

  ledger(ownerId: string): Ledger {
    const cached = this.ledgers.get(ownerId);
    if (cached) return cached;
    if (!this.wallets[ownerId]) {
      const l = new Ledger();
      if (config.demoMode && config.demoStartingBalanceCents > 0) l.topUp(config.demoStartingBalanceCents, "demo_starting_credit");
      this.wallets[ownerId] = l.state;
      this.save();
    }
    const ledger = new PersistedLedger(this.wallets[ownerId], (s) => {
      this.wallets[ownerId] = s;
      this.save();
    });
    this.ledgers.set(ownerId, ledger);
    return ledger;
  }

  wallet(ownerId: string) {
    const l = this.ledger(ownerId);
    return { balanceCents: l.balanceCents, availableCents: l.availableCents, entries: l.state.entries.slice(-50).reverse(), ratePerMinuteCents: config.ratePerMinuteCents };
  }

  topUp(ownerId: string, amountCents: number) {
    this.ledger(ownerId).topUp(amountCents, config.demoMode ? "demo_top_up" : "top_up");
    return this.wallet(ownerId);
  }

  /** Credit a completed card payment. Idempotent per payment reference. */
  credit(ownerId: string, amountCents: number, ref: string): { credited: boolean; wallet: ReturnType<BotStore["wallet"]> } {
    if (this.creditedRefs[ref]) return { credited: false, wallet: this.wallet(ownerId) };
    this.creditedRefs[ref] = ownerId;
    this.ledger(ownerId).topUp(amountCents, "card_payment");
    return { credited: true, wallet: this.wallet(ownerId) };
  }

  async start(req: StartSessionRequest, deps: Partial<ConstructorParameters<typeof SessionRunner>[1]> = {}): Promise<SessionRunner> {
    const runner = new SessionRunner(req, {
      ledger: this.ledger(req.twin.ownerId),
      ...deps,
      onFinalized: (s) => {
        this.finished[s.id] = s.view();
        this.live.delete(s.id);
        this.save();
      },
    });
    this.live.set(runner.id, runner);
    void runner.start();
    return runner;
  }

  runner(id: string): SessionRunner | undefined {
    return this.live.get(id);
  }

  get(id: string): SessionView | undefined {
    return this.live.get(id)?.view() ?? this.finished[id];
  }

  list(ownerId: string): SessionView[] {
    const all = [...[...this.live.values()].map((r) => r.view()), ...Object.values(this.finished)];
    return all.filter((s) => s.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Kill switch: stops every running session for an owner (used on consent revocation too). */
  stopAll(ownerId: string, reason: "kill_switch" | "consent_revoked"): number {
    let n = 0;
    for (const r of this.live.values()) {
      if (r.req.twin.ownerId === ownerId) {
        r.end(reason);
        n++;
      }
    }
    return n;
  }
}

/** Ledger that writes its state back after every mutation. */
class PersistedLedger extends Ledger {
  constructor(state: LedgerState, private readonly onChange: (s: LedgerState) => void) {
    super(structuredClone(state));
  }
  override topUp(...args: Parameters<Ledger["topUp"]>) {
    const r = super.topUp(...args);
    this.onChange(this.state);
    return r;
  }
  override reserve(...args: Parameters<Ledger["reserve"]>) {
    const r = super.reserve(...args);
    this.onChange(this.state);
    return r;
  }
  override settle(...args: Parameters<Ledger["settle"]>) {
    const r = super.settle(...args);
    this.onChange(this.state);
    return r;
  }
}
