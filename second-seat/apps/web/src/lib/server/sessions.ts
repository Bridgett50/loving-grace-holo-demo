import "server-only";
import { authorizeTwinAction, BACKGROUNDS, type MediaMode, type Platform } from "@second-seat/core";
import type { SessionView } from "@/lib/types";
import { assetDataUrl } from "./assets";
import { bot } from "./bot";
import { activeConsent, audit, readDb, twinForOwner, updateDb } from "./db";

export interface LaunchInput {
  ownerId: string;
  platform: Platform;
  joinUrl?: string;
  title: string;
  eventId?: string;
  mode: MediaMode;
  voiceOnlyFallback: boolean;
  capMinutes: number;
  demoFault?: string;
}

export function backgroundFor(ownerId: string, backgroundId: string) {
  const db = readDb();
  const custom = (db.backgrounds[ownerId] ?? []).find((b) => b.id === backgroundId);
  return custom ?? BACKGROUNDS.find((b) => b.id === backgroundId) ?? BACKGROUNDS[0];
}

/** Builds the bot request from stored state. The bot re-runs every check (defense in depth). */
export async function launchSession(input: LaunchInput): Promise<SessionView> {
  const db = readDb();
  const twin = twinForOwner(db, input.ownerId);
  if (!twin) throw new Error("Create your twin first.");
  const consent = activeConsent(db, twin.id);
  const verification = db.verifications[input.ownerId];
  const auth = authorizeTwinAction({ actorId: input.ownerId, action: "run", twin, verification, consent, verifiedUserId: verification?.userId });
  if (!auth.ok) throw new Error(auth.reason);

  const bg = backgroundFor(input.ownerId, twin.backgroundId);
  const bgAssetId = bg.kind === "upload" ? bg.css.match(/\/api\/assets\/([\w-]+)/)?.[1] : undefined;
  const bgAsset = bgAssetId ? db.assets[bgAssetId] : undefined;
  const bgImage = bgAsset && bgAsset.ownerId === input.ownerId ? assetDataUrl(bgAsset) : undefined;
  const view = await bot<SessionView>("/v1/sessions", {
    json: {
      actorId: input.ownerId,
      twin: {
        id: twin.id,
        ownerId: twin.ownerId,
        displayName: twin.displayName,
        look: twin.look,
        persona: twin.persona,
        backgroundCss: bg.css,
        backgroundImageUrl: bgImage,
        voiceModelReady: twin.voiceModelReady,
        avatarModelReady: twin.avatarModelReady,
        scanAssetId: twin.scanAssetId,
      },
      verification,
      consent,
      knowledge: db.knowledge.filter((k) => k.twinId === twin.id),
      meeting: { platform: input.platform, joinUrl: input.joinUrl, title: input.title, eventId: input.eventId },
      meetingAuthorized: true,
      mode: input.mode,
      voiceOnlyFallback: input.voiceOnlyFallback,
      capMinutes: input.capMinutes,
      demoFault: input.demoFault,
    },
  });
  updateDb((d) => {
    if (input.eventId) d.launched[input.eventId] = view.id;
    audit(d, input.ownerId, "session_started", `${view.id} ${input.platform} ${input.mode}`);
  });
  return view;
}
