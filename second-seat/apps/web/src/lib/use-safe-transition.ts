"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";

function isNextControlFlow(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}

/** useTransition for server actions: a dropped connection or server error shows a toast instead of failing silently. */
export function useSafeTransition(): [boolean, (fn: () => Promise<void>) => void] {
  const [pending, startTransition] = useTransition();
  const start = useCallback(
    (fn: () => Promise<void>) =>
      startTransition(async () => {
        try {
          await fn();
        } catch (e) {
          if (isNextControlFlow(e)) throw e;
          console.error(e);
          toast.error(`Couldn't reach ${BRAND.name}. Check your connection and try again.`);
        }
      }),
    [],
  );
  return [pending, start];
}
