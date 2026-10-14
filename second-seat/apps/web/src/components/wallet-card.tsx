"use client";

import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { topUp } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { money, type Wallet } from "@/lib/types";
import { useSafeTransition } from "@/lib/use-safe-transition";

const REASONS: Record<string, string> = {
  demo_starting_credit: "Demo starting credit",
  demo_top_up: "Demo top-up",
  session_cap_reserved: "Reserved for session cap",
  unused_reservation_released: "Unused reservation released",
};

function reasonLabel(r: string) {
  if (REASONS[r]) return REASONS[r];
  if (r.startsWith("auto_refund:")) return `Auto-refund: ${r.slice(12).replace(/_/g, " ")}`;
  return r.replace(/_/g, " ");
}

export function WalletCard({ wallet, demoMode }: { wallet: Wallet; demoMode: boolean }) {
  const [pending, start] = useSafeTransition();
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
