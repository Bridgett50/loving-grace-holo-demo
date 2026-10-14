"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleSkill } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useSafeTransition } from "@/lib/use-safe-transition";

export function SkillToggle({ id, installed }: { id: string; installed: boolean }) {
  const [pending, start] = useSafeTransition();
  return (
    <Button
      size="sm"
      variant={installed ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await toggleSkill(id, !installed);
          if (!r.ok) toast.error(r.error);
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />}
      {installed ? "Remove" : "Add"}
    </Button>
  );
}
