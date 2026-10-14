"use client";

import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { startInstantDemo } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useSafeTransition } from "@/lib/use-safe-transition";

export function InstantDemoButton() {
  const [pending, start] = useSafeTransition();
  return (
    <Button
      size="lg"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await startInstantDemo();
          if (r && !r.ok) toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Play />} {pending ? "Starting demo meeting…" : "Watch a live demo"}
    </Button>
  );
}
