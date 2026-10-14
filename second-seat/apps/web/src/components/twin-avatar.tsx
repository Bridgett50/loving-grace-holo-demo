/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * Preview renderers. In production the meeting video comes from the avatar worker (LivePortrait +
 * MuseTalk for realistic, a rigged stylized character for stylized); these previews use the same
 * reference frame and look so the owner sees what attendees will see.
 */

export function RealisticAvatar({ src, speaking, className }: { src: string; speaking?: boolean; className?: string }) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <img
        src={src}
        alt="Your realistic twin"
        className={cn("h-full w-full object-cover object-[50%_30%]", speaking ? "twin-talk" : "twin-breathe")}
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,transparent_55%,rgba(0,0,0,0.35))]" />
      {speaking && <div className="holo-glow pointer-events-none absolute inset-x-[20%] bottom-0 h-1/3 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,255,255,0.18),transparent_70%)]" />}
    </div>
  );
}

const SKIN = { light: ["#ffe3d3", "#f4bfa6"], medium: ["#e8b48f", "#c98a63"], deep: ["#a8714e", "#7a4a30"] } as const;

export function StylizedAvatar({ speaking, tone = "medium", hair = "#3b2a26", className }: { speaking?: boolean; tone?: keyof typeof SKIN; hair?: string; className?: string }) {
  const [skin, shade] = SKIN[tone];
  return (
    <svg viewBox="0 0 400 400" className={cn("h-full w-full", speaking ? "twin-talk" : "twin-breathe", className)} role="img" aria-label="Your stylized 3D twin">
      <defs>
        <radialGradient id="sa-skin" cx="45%" cy="38%" r="65%">
          <stop offset="0" stopColor={skin} />
          <stop offset="1" stopColor={shade} />
        </radialGradient>
        <radialGradient id="sa-hair" cx="40%" cy="25%" r="80%">
          <stop offset="0" stopColor={hair} stopOpacity="0.85" />
          <stop offset="1" stopColor="#120c0a" />
        </radialGradient>
        <linearGradient id="sa-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.55 0.15 300)" />
          <stop offset="1" stopColor="oklch(0.38 0.13 300)" />
        </linearGradient>
        <radialGradient id="sa-iris" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#8a5a3c" />
          <stop offset="1" stopColor="#3a2416" />
        </radialGradient>
        <filter id="sa-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <ellipse cx="200" cy="392" rx="150" ry="18" fill="#000" opacity="0.18" filter="url(#sa-soft)" />
      <path d="M70 400c8-70 60-108 130-108s122 38 130 108z" fill="url(#sa-top)" />
      <path d="M168 292h64l-6 30c-10 10-42 10-52 0z" fill={shade} />
      <rect x="172" y="250" width="56" height="58" rx="24" fill="url(#sa-skin)" />
      <path d="M96 168c0-78 46-126 104-126s104 48 104 126c0 22-4 40-10 54l-188 0c-6-14-10-32-10-54z" fill="url(#sa-hair)" />
      <ellipse cx="200" cy="178" rx="92" ry="104" fill="url(#sa-skin)" />
      <ellipse cx="110" cy="186" rx="14" ry="22" fill={shade} />
      <ellipse cx="290" cy="186" rx="14" ry="22" fill={shade} />
      <path d="M106 150c8-62 48-96 98-96 40 0 74 22 90 62-30-14-62-6-94-24-26 26-58 38-94 58z" fill="url(#sa-hair)" />
      <ellipse cx="150" cy="214" rx="20" ry="12" fill="#ff8f8f" opacity="0.28" />
      <ellipse cx="250" cy="214" rx="20" ry="12" fill="#ff8f8f" opacity="0.28" />
      <path d="M140 160q22-12 42 0" stroke="#2a1b16" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M218 160q22-12 42 0" stroke="#2a1b16" strokeWidth="6" strokeLinecap="round" fill="none" />
      <g className="twin-blink">
        <ellipse cx="161" cy="186" rx="17" ry="20" fill="#fff" />
        <ellipse cx="239" cy="186" rx="17" ry="20" fill="#fff" />
        <circle cx="163" cy="189" r="12" fill="url(#sa-iris)" />
        <circle cx="241" cy="189" r="12" fill="url(#sa-iris)" />
        <circle cx="163" cy="190" r="5.5" fill="#120a06" />
        <circle cx="241" cy="190" r="5.5" fill="#120a06" />
        <circle cx="167" cy="184" r="3.6" fill="#fff" />
        <circle cx="245" cy="184" r="3.6" fill="#fff" />
      </g>
      <path d="M196 200q-6 18 2 24q6 3 10-1" stroke={shade} strokeWidth="4" strokeLinecap="round" fill="none" />
      {speaking ? (
        <ellipse className="twin-mouth-talk" cx="200" cy="244" rx="20" ry="13" fill="#7a2e35" />
      ) : (
        <path d="M178 238q22 18 44 0" stroke="#8a3a40" strokeWidth="5" strokeLinecap="round" fill="none" />
      )}
      <ellipse cx="176" cy="132" rx="40" ry="16" fill="#fff" opacity="0.12" />
    </svg>
  );
}

export function TwinStage({
  look,
  imageSrc,
  backgroundCss,
  badge,
  speaking,
  recording = true,
  state,
  className,
  children,
}: {
  look: "realistic" | "stylized";
  imageSrc?: string;
  backgroundCss: string;
  badge: string;
  speaking?: boolean;
  recording?: boolean;
  state?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-xl bg-black", className)} style={{ background: backgroundCss }}>
      <div className="absolute inset-x-0 bottom-0 mx-auto h-[92%] w-full max-w-[70%]">
        {look === "realistic" && imageSrc ? (
          <div className="mx-auto h-full w-[min(100%,26rem)] overflow-hidden rounded-t-[45%] [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
            <RealisticAvatar src={imageSrc} speaking={speaking} />
          </div>
        ) : (
          <StylizedAvatar speaking={speaking} />
        )}
      </div>
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/70 px-2.5 py-1 text-xs font-semibold text-white sm:text-sm">
        <span className="inline-block size-2 rounded-full bg-fuchsia-400" />
        {badge}
      </div>
      {recording && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
          <span className="size-2 animate-pulse rounded-full bg-red-500" /> Transcribing · consent notice given
        </div>
      )}
      <div className="absolute bottom-2 right-3 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white/85" title="Output carries C2PA-compatible Content Credentials and an invisible watermark">
        CR · AI-generated · Content Credentials
      </div>
      {state && <div className="absolute bottom-2 left-3">{state}</div>}
      {children}
    </div>
  );
}
