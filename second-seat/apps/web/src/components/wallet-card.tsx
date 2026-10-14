"use client";

import { CreditCard, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { buyCredit, topUp } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { money, type Wallet } from "@/lib/types";
import { useSafeTransition } from "@/lib/use-safe-transition";

const REASONS: Record<string, string> = {
  demo_starting_credit: "Demo starting credit",
  demo_top_up: "Demo top-up",
  card_payment: "Card payment",
  session_cap_reserved: "Reserved for session cap",
  unused_reservation_released: "Unused reservation released",
};

function reasonLabel(r: string) {
  if (REASONS[r]) return REASONS[r];
  if (r.startsWith("auto_refund:")) return `Auto-refund: ${r.slice(12).replace(/_/g, " ")}`;
  return r.replace(/_/g, " ");
}

export interface PackOption {
  id: string;
  label: string;
  minutes: number;
}

export function WalletCard({ wallet, demoMode, packs = [] }: { wallet: Wallet; demoMode: boolean; packs?: PackOption[] }) {
  const [pending, start] = useSafeTransition();
  const [buying, setBuying] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-semibold tabular-nums">{money(wallet.balanceCents)}</div>
          <div className="text-xs text-muted-foreground">
            {money(wallet.availableCents)} available · {money(wallet.ratePerMinuteCents)}/min
          </div>
        </div>
        {demoMode && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await topUp(500);
                if (r.ok) toast.success("Added $5.00 of demo credit");
                else toast.error(r.error);
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} $5 demo credit
          </Button>
        )}
      </div>
      {packs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Add minutes</div>
          <div className="grid grid-cols-3 gap-2">
            {packs.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                className="h-auto flex-col gap-0.5 py-2"
                disabled={buying !== null}
                onClick={async () => {
                  setBuying(p.id);
                  try {
                    const r = await buyCredit(p.id);
                    if (r.ok && r.data) window.location.assign(r.data.url);
                    else {
                      toast.error(r.ok ? "Couldn't open the payment page." : r.error);
                      setBuying(null);
                    }
                  } catch {
                    toast.error("Couldn't reach the server. Check your connection and try again.");
                    setBuying(null);
                  }
                }}
              >
                <span className="flex items-center gap-1 font-semibold">
                  {buying === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <CreditCard className="size-3.5" />} {p.label}
                </span>
                <span className="text-xs font-normal text-muted-foreground">~{p.minutes} min</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Secure checkout by Stripe. You only pay for minutes your twin is actually live.</p>
        </div>
      )}
      <ul className="space-y-1.5 text-sm">
        {wallet.entries.slice(0, 5).map((e) => (
          <li key={e.id} className="flex justify-between gap-3">
            <span className="truncate text-muted-foreground">{reasonLabel(e.reason)}</span>
            <span className={e.kind === "charge" ? "tabular-nums" : e.kind === "refund" || e.kind === "topup" ? "tabular-nums text-success" : "tabular-nums text-muted-foreground"}>
              {e.kind === "charge" ? "−" : e.kind === "reserve" ? "hold " : "+"}
              {money(e.amountCents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
