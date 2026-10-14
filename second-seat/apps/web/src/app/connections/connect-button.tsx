"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setConnection } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useSafeTransition } from "@/lib/use-safe-transition";

export function ConnectButton({ id, connected, disabled }: { id: string; connected: boolean; disabled?: boolean }) {
  const [pending, start] = useSafeTransition();
  return (
    <Button
      variant={connected ? "outline" : "default"}
      disabled={pending || disabled}
      onClick={() =>
        start(async () => {
          const r = await setConnection(id, !connected);
          if (!r.ok) toast.error(r.error);
          else toast.success(connected ? "Disconnected" : "Connected");
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />}
      {connected ? "Disconnect" : "Connect"}
    </Button>
  );
}
