/* eslint-disable @next/next/no-img-element */
import { SAMPLE_REALISTIC_SRC, SAMPLE_STYLIZED_SRC, SAMPLE_STYLIZED_TALK_SRC } from "@/lib/samples";
import { cn } from "@/lib/utils";

/**
 * Preview renderers. In production the meeting video comes from the avatar worker (LivePortrait +
 * MuseTalk for realistic, a rigged stylized character for stylized); these previews use the same
 * reference frame and look so the owner sees what attendees will see.
 */


function SpeakingBars() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[8%] flex items-end justify-center gap-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="twin-bar w-1 rounded-full bg-white/80" style={{ animationDelay: `${i * 0.11}s` }} />
      ))}
    </div>
  );
}

/**
 * Concert-hologram treatment: the person is feathered out of a black frame (no hard rectangle), with a
 * soft cool rim glow and gentle idle motion, so it reads as real video rather than a 3D mesh.
 */
function HoloPortrait({ src, talkSrc, alt, speaking, className }: { src: string; talkSrc?: string; alt: string; speaking?: boolean; className?: string }) {
  return (
    <div className={cn("relative h-full w-full", className)}>
      <div className={cn("absolute inset-0 [mask-image:radial-gradient(ellipse_62%_78%_at_50%_42%,black_62%,transparent_100%)]", speaking ? "twin-talk" : "twin-breathe")}>
        <img src={src} alt={alt} className="h-full w-full object-cover object-[50%_22%]" draggable={false} />
        {talkSrc && <img src={talkSrc} alt="" aria-hidden className={cn("absolute inset-0 h-full w-full object-cover object-[50%_22%] opacity-0", speaking && "twin-lipflap")} draggable={false} />}
      </div>
      <div className="holo-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_50%_40%,transparent_60%,rgba(170,205,255,0.10)_75%,transparent_90%)]" />
      {speaking && <SpeakingBars />}
    </div>
  );
}

export function RealisticAvatar({ src, speaking, className }: { src?: string; speaking?: boolean; className?: string }) {
  return <HoloPortrait src={src || SAMPLE_REALISTIC_SRC} alt="Realistic twin" speaking={speaking} className={className} />;
}

export function StylizedAvatar({ src, speaking, className }: { src?: string; speaking?: boolean; className?: string }) {
  return <HoloPortrait src={src || SAMPLE_STYLIZED_SRC} talkSrc={src ? undefined : SAMPLE_STYLIZED_TALK_SRC} alt="Stylized 3D twin" speaking={speaking} className={className} />;
}

export function TwinStage({
  look,
  imageSrc,
  stylizedSrc,
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
  /** Owner's generated stylized character, once the avatar worker has produced one. */
  stylizedSrc?: string;
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
      <div className="absolute inset-y-0 left-1/2 aspect-[3/4] h-full -translate-x-1/2">
        {look === "realistic" ? <RealisticAvatar src={imageSrc} speaking={speaking} /> : <StylizedAvatar src={stylizedSrc} speaking={speaking} />}
      </div>
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/70 px-2.5 py-1 text-xs font-semibold text-white sm:text-sm">
        <span className="inline-block size-2 rounded-full bg-fuchsia-400" />
        {badge}
      </div>
      {recording && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
          <span className="size-2 animate-pulse rounded-full bg-red-500" />
          <span className="sm:hidden">Transcribing</span>
          <span className="hidden sm:inline">Transcribing · consent notice given</span>
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
