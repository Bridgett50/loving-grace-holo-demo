import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <defs>
        <linearGradient id="ss-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.62 0.17 340)" />
          <stop offset="1" stopColor="oklch(0.44 0.16 300)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#ss-g)" />
      <circle cx="12" cy="12.5" r="4" fill="white" />
      <circle cx="21" cy="12.5" r="4" fill="white" fillOpacity="0.45" />
      <path d="M5.5 25c1-4.2 3.8-6.3 6.5-6.3s5.5 2.1 6.5 6.3" fill="white" />
      <path d="M14.5 25c1-4.2 3.8-6.3 6.5-6.3s5.5 2.1 6.5 6.3" fill="white" fillOpacity="0.45" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <BrandMark />
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-tight">{BRAND.name}</span>
      </span>
    </span>
  );
}
