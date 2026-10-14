"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  authorizeTwinAction,
  CONNECTIONS,
  consentText,
  isForbiddenCapability,
  REQUIRED_LIVENESS_CHALLENGES,
  revokeConsent as revoke,
  sha256Hex,
  SKILLS,
  type ConsentRecord,
  type ConsentScope,
  type JoinMode,
  type JoinRule,
  type MediaMode,
  type Persona,
  type Platform,
  type TwinLook,
} from "@second-seat/core";
import { deleteAssetFile, saveAsset } from "@/lib/server/assets";
import { bot, BotOfflineError } from "@/lib/server/bot";
import { currentUserId, isDemoMode } from "@/lib/server/current-user";
import { activeConsent, audit, newId, readDb, twinForOwner, updateDb, type Asset } from "@/lib/server/db";
import { defaultRules, demoEvents, sampleKnowledge } from "@/lib/server/demo-seed";
import { launchSession } from "@/lib/server/sessions";
import { SAMPLE_OWNER } from "@/lib/samples";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false, error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : String(e) };
}

function requireTwin(ownerId: string, action: "edit" | "view" = "edit") {
  const db = readDb();
  const twin = twinForOwner(db, ownerId);
  const auth = authorizeTwinAction({ actorId: ownerId, action, twin, verification: db.verifications[ownerId], consent: twin ? activeConsent(db, twin.id) : null });
  if (!auth.ok || !twin) throw new Error(auth.reason ?? "Twin not found.");
  return twin;
}

export async function saveBasics(input: { name: string; email: string }): Promise<ActionResult> {
  const name = input.name.trim();
  const email = input.email.trim();
  if (name.length < 2) return { ok: false, error: "Enter your full name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  const uid = await currentUserId();
  updateDb((db) => {
    db.users[uid] = { id: uid, name, email, createdAt: db.users[uid]?.createdAt ?? new Date().toISOString() };
    audit(db, uid, "profile_saved");
  });
  return { ok: true };
}

export async function uploadAsset(formData: FormData): Promise<ActionResult<{ id: string; url: string }>> {
  try {
    const uid = await currentUserId();
    const kind = String(formData.get("kind")) as Asset["kind"];
    const file = formData.get("file") as File;
    const asset = await saveAsset(uid, kind, file);
    return { ok: true, data: { id: asset.id, url: `/api/assets/${asset.id}` } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * ID + liveness at scan time. Demo provider: requires an ID image and a liveness capture owned by
 * this user plus completed challenges. Production: hand off to a KYC vendor (Stripe Identity,
 * Persona, Veriff...) and store only their session reference and result.
 */
export async function completeVerification(input: { idDocumentAssetId: string; livenessAssetId: string; challenges: string[] }): Promise<ActionResult> {
  const uid = await currentUserId();
  const db = readDb();
  const idDoc = db.assets[input.idDocumentAssetId];
  const live = db.assets[input.livenessAssetId];
  if (!idDoc || idDoc.ownerId !== uid || idDoc.kind !== "id_document") return { ok: false, error: "Upload a photo of your government ID." };
  if (!live || live.ownerId !== uid) return { ok: false, error: "Complete the liveness capture." };
  const challenges = [...new Set(input.challenges)];
  if (challenges.length < REQUIRED_LIVENESS_CHALLENGES) return { ok: false, error: `Complete at least ${REQUIRED_LIVENESS_CHALLENGES} liveness prompts.` };
  const provider = process.env.IDENTITY_PROVIDER || "demo";
  updateDb((d) => {
    d.verifications[uid] = {
      userId: uid,
      status: provider === "demo" ? "verified" : "pending",
      provider,
      reference: newId("idv"),
      verifiedAt: provider === "demo" ? new Date().toISOString() : undefined,
      livenessChallenges: challenges,
      idDocumentAssetId: idDoc.id,
      livenessAssetId: live.id,
    };
    audit(d, uid, "identity_verification", `${provider}:${challenges.join(",")}`);
  });
  return { ok: true };
}

export async function createTwin(input: {
  look: TwinLook;
  scanAssetId: string;
  voiceAssetId: string;
  referenceAssetId?: string;
  signerName: string;
  scopes: ConsentScope[];
  attestSelf: boolean;
}): Promise<ActionResult<{ twinId: string }>> {
  try {
    const uid = await currentUserId();
    const db = readDb();
    const user = db.users[uid];
    if (!user) return { ok: false, error: "Add your name and email first." };
    if (twinForOwner(db, uid)) return { ok: false, error: "You already have a twin." };
    if (!input.attestSelf) return { ok: false, error: "Confirm you are the person in the scan and voice sample." };
    if (input.signerName.trim().toLowerCase() !== user.name.trim().toLowerCase()) return { ok: false, error: `Type your full name exactly as "${user.name}" to sign.` };
    const own = (id?: string) => !!id && db.assets[id]?.ownerId === uid;
    if (!own(input.scanAssetId)) return { ok: false, error: "Add your selfie video or phone scan." };
    if (!own(input.voiceAssetId)) return { ok: false, error: "Add a voice sample." };
    if (input.look === "realistic" && !own(input.referenceAssetId)) return { ok: false, error: "Realistic mode needs a clear frame of your face from the scan." };

    const twinId = newId("twin");
    const text = consentText(user.name);
    const consent: ConsentRecord = {
      id: newId("consent"),
      twinId,
      ownerId: uid,
      signerName: input.signerName.trim(),
      scopes: [...new Set(input.scopes)],
      textHash: await sha256Hex(text),
      signedAt: new Date().toISOString(),
      userAgent: "web",
    };
    const auth = authorizeTwinAction({ actorId: uid, action: "create", verification: db.verifications[uid], consent, verifiedUserId: db.verifications[uid]?.userId });
    if (!auth.ok) return { ok: false, error: auth.reason! };

    writeTwin(uid, user.name, twinId, consent, {
      look: input.look,
      scanAssetId: input.scanAssetId,
      voiceAssetId: input.voiceAssetId,
      referenceAssetId: input.referenceAssetId,
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { twinId } };
  } catch (e) {
    return fail(e);
  }
}

function writeTwin(uid: string, name: string, twinId: string, consent: ConsentRecord, media: { look: TwinLook; scanAssetId: string; voiceAssetId: string; referenceAssetId?: string; referenceImageUrl?: string }) {
  const first = name.split(" ")[0];
  const persona: Persona = {
    tone: "Warm, concise and plain-spoken",
    role: "Founder, Loving Grace",
    facts: [],
    restrictedTopics: ["medical", "salary", "lawsuit", "diagnosis"],
    deferralPhrase: `I don't have that in my notes. I'll check with ${first} and follow up.`,
  };
  updateDb((d) => {
    const now = new Date().toISOString();
    d.twins[twinId] = {
      id: twinId,
      ownerId: uid,
      displayName: name,
      look: media.look,
      referenceImageUrl: media.referenceAssetId ? `/api/assets/${media.referenceAssetId}` : media.referenceImageUrl,
      scanAssetId: media.scanAssetId,
      voiceSampleAssetId: media.voiceAssetId,
      voiceModelReady: true,
      avatarModelReady: true,
      backgroundId: media.look === "stylized" ? "pastel-glow" : "holo-black",
      persona,
      installedSkillIds: ["meeting-notes", "answer-from-notes"],
      createdAt: now,
      updatedAt: now,
    };
    d.consents[consent.id] = consent;
    if (isDemoMode) d.knowledge.push(...sampleKnowledge(twinId, first));
    d.rules[uid] = d.rules[uid]?.length ? d.rules[uid] : defaultRules();
    d.events[uid] = demoEvents();
    d.autoJoin[uid] = true;
    audit(d, uid, "twin_created", `${twinId} look=${media.look} consent=${consent.id}`);
  });
}

const ALL_SCOPES: ConsentScope[] = ["likeness_video", "voice_clone", "meeting_join", "recording", "knowledge_use"];

/**
 * Demo mode only: skips the scan with a clearly labeled sample twin (the sample stylized character) and drops straight into a scripted
 * demo meeting, so the product can be seen in one click. Real twins always go through onboarding.
 */
export async function startInstantDemo(): Promise<ActionResult> {
  if (!isDemoMode) return { ok: false, error: "The instant demo is only available in demo mode." };
  const uid = await currentUserId();
  let sessionId: string;
  try {
    const db = readDb();
    if (!twinForOwner(db, uid)) {
      const name = db.users[uid]?.name ?? SAMPLE_OWNER.name;
      updateDb((d) => {
        d.users[uid] = d.users[uid] ?? { id: uid, name, email: SAMPLE_OWNER.email, createdAt: new Date().toISOString() };
        d.verifications[uid] = {
          userId: uid,
          status: "verified",
          provider: "demo-sample",
          reference: newId("idv"),
          verifiedAt: new Date().toISOString(),
          livenessChallenges: ["turn_left", "smile"],
        };
        audit(d, uid, "identity_verification", "demo-sample: instant demo, no media captured");
      });
      const twinId = newId("twin");
      const consent: ConsentRecord = {
        id: newId("consent"),
        twinId,
        ownerId: uid,
        signerName: name,
        scopes: ALL_SCOPES,
        textHash: await sha256Hex(consentText(name)),
        signedAt: new Date().toISOString(),
        userAgent: "web:instant-demo",
      };
      writeTwin(uid, name, twinId, consent, { look: "stylized", scanAssetId: "sample", voiceAssetId: "sample" });
    }
    const view = await launchSession({
      ownerId: uid,
      platform: "demo",
      title: "Holo Lab pilot check-in (demo)",
      mode: "full",
      voiceOnlyFallback: true,
      capMinutes: 10,
    });
    sessionId = view.id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  redirect(`/sessions/${sessionId}`);
}

export async function updatePersona(input: Partial<Persona> & { displayName?: string }): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    const twin = requireTwin(uid);
    updateDb((d) => {
      const t = d.twins[twin.id];
      t.persona = {
        ...t.persona,
        ...(input.tone !== undefined && { tone: input.tone.slice(0, 200) }),
        ...(input.role !== undefined && { role: input.role.slice(0, 200) }),
        ...(input.deferralPhrase !== undefined && { deferralPhrase: input.deferralPhrase.slice(0, 300) }),
        ...(input.restrictedTopics !== undefined && { restrictedTopics: input.restrictedTopics.map((x) => x.trim()).filter(Boolean).slice(0, 30) }),
        ...(input.facts !== undefined && { facts: input.facts.map((x) => x.trim()).filter(Boolean).slice(0, 30) }),
      };
      t.updatedAt = new Date().toISOString();
      audit(d, uid, "persona_updated");
    });
    revalidatePath("/twin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setLook(look: TwinLook, referenceAssetId?: string): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    const twin = requireTwin(uid);
    const db = readDb();
    if (look === "realistic" && !twin.referenceImageUrl && !(referenceAssetId && db.assets[referenceAssetId]?.ownerId === uid)) {
      return { ok: false, error: "Upload a clear photo or frame of your face to use the realistic look." };
    }
    updateDb((d) => {
      d.twins[twin.id].look = look;
      if (referenceAssetId) d.twins[twin.id].referenceImageUrl = `/api/assets/${referenceAssetId}`;
      audit(d, uid, "look_changed", look);
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setBackground(backgroundId: string): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    const twin = requireTwin(uid);
    updateDb((d) => {
      d.twins[twin.id].backgroundId = backgroundId;
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addCustomBackground(assetId: string, name: string): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    const twin = requireTwin(uid);
    const db = readDb();
    if (db.assets[assetId]?.ownerId !== uid) return { ok: false, error: "Upload not found." };
    const id = newId("bg");
    updateDb((d) => {
      d.backgrounds[uid] = [...(d.backgrounds[uid] ?? []), { id, name: name.slice(0, 40) || "My background", kind: "upload", css: `url(/api/assets/${assetId}) center / cover no-repeat` }];
      d.twins[twin.id].backgroundId = id;
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addKnowledge(input: { title: string; content: string }): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    const twin = requireTwin(uid);
    const content = input.content.trim();
    if (content.length < 10) return { ok: false, error: "Add at least a sentence of notes." };
    if (content.length > 200_000) return { ok: false, error: "Notes are too long (200k characters max)." };
    updateDb((d) => {
      d.knowledge.push({ id: newId("kn"), twinId: twin.id, title: input.title.trim().slice(0, 120) || "Untitled note", content, source: "upload", createdAt: new Date().toISOString() });
      audit(d, uid, "knowledge_added");
    });
    revalidatePath("/twin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteKnowledge(id: string): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    const twin = requireTwin(uid);
    updateDb((d) => {
      d.knowledge = d.knowledge.filter((k) => !(k.id === id && k.twinId === twin.id));
    });
    revalidatePath("/twin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

async function stopAllSessions(uid: string, reason: "kill_switch" | "consent_revoked") {
  try {
    return (await bot<{ stopped: number }>(`/v1/owners/${uid}/stop-all`, { json: { reason } })).stopped;
  } catch (e) {
    if (e instanceof BotOfflineError) return 0;
    throw e;
  }
}

export async function revokeConsent(reason: string): Promise<ActionResult<{ stopped: number }>> {
  try {
    const uid = await currentUserId();
    const twin = requireTwin(uid, "view");
    updateDb((d) => {
      for (const c of Object.values(d.consents)) if (c.twinId === twin.id && !c.revokedAt) d.consents[c.id] = revoke(c, reason || "owner_request");
      d.autoJoin[uid] = false;
      audit(d, uid, "consent_revoked", reason);
    });
    const stopped = await stopAllSessions(uid, "consent_revoked");
    revalidatePath("/", "layout");
    return { ok: true, data: { stopped } };
  } catch (e) {
    return fail(e);
  }
}

export async function resignConsent(input: { signerName: string; scopes: ConsentScope[] }): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    const db = readDb();
    const twin = twinForOwner(db, uid);
    const user = db.users[uid];
    if (!twin || !user) return { ok: false, error: "Twin not found." };
    if (input.signerName.trim().toLowerCase() !== user.name.toLowerCase()) return { ok: false, error: `Type your full name exactly as "${user.name}".` };
    const consent: ConsentRecord = {
      id: newId("consent"),
      twinId: twin.id,
      ownerId: uid,
      signerName: input.signerName.trim(),
      scopes: input.scopes,
      textHash: await sha256Hex(consentText(user.name)),
      signedAt: new Date().toISOString(),
    };
    const auth = authorizeTwinAction({ actorId: uid, action: "run", twin, verification: db.verifications[uid], consent });
    if (!auth.ok) return { ok: false, error: auth.reason! };
    updateDb((d) => {
      d.consents[consent.id] = consent;
      audit(d, uid, "consent_signed", consent.id);
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function killSwitch(): Promise<ActionResult<{ stopped: number }>> {
  const uid = await currentUserId();
  const stopped = await stopAllSessions(uid, "kill_switch");
  updateDb((d) => {
    d.autoJoin[uid] = false;
    audit(d, uid, "kill_switch", String(stopped));
  });
  revalidatePath("/", "layout");
  return { ok: true, data: { stopped } };
}

export async function deleteTwinAndMedia(): Promise<ActionResult> {
  const uid = await currentUserId();
  await stopAllSessions(uid, "consent_revoked");
  updateDb((d) => {
    const twin = twinForOwner(d, uid);
    for (const a of Object.values(d.assets)) {
      if (a.ownerId === uid) {
        deleteAssetFile(a);
        delete d.assets[a.id];
      }
    }
    if (twin) {
      for (const c of Object.values(d.consents)) if (c.twinId === twin.id && !c.revokedAt) d.consents[c.id] = revoke(c, "twin_deleted");
      d.knowledge = d.knowledge.filter((k) => k.twinId !== twin.id);
      delete d.twins[twin.id];
    }
    delete d.verifications[uid];
    d.backgrounds[uid] = [];
    d.autoJoin[uid] = false;
    delete d.connections[uid];
    delete d.oauthTokens[uid];
    audit(d, uid, "twin_deleted", "scan, voice, reference frames, ID images and notes erased");
  });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function toggleSkill(skillId: string, install: boolean): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    const twin = requireTwin(uid);
    const skill = SKILLS.find((s) => s.id === skillId);
    if (!skill) return { ok: false, error: "Unknown skill." };
    if (install && (skill.forbidden || skill.permissions.some(isForbiddenCapability))) {
      return { ok: false, error: "Twins can never agree to contracts or payments, so this skill can't be installed." };
    }
    updateDb((d) => {
      const t = d.twins[twin.id];
      t.installedSkillIds = install ? [...new Set([...t.installedSkillIds, skillId])] : t.installedSkillIds.filter((s) => s !== skillId);
      audit(d, uid, install ? "skill_installed" : "skill_removed", skillId);
    });
    revalidatePath("/skills");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setConnection(id: string, connect: boolean): Promise<ActionResult<{ mode: "demo" | "oauth" }>> {
  const uid = await currentUserId();
  const def = CONNECTIONS.find((c) => c.id === id);
  if (!def) return { ok: false, error: "Unknown connection." };
  const configured = def.requiredEnv.every((k) => !!process.env[k]);
  if (connect && !configured && !isDemoMode) return { ok: false, error: `Set ${def.requiredEnv.join(", ")} to enable ${def.name}.` };
  if (connect && configured) redirect(`/api/connections/${id}/start`);
  updateDb((d) => {
    d.connections[uid] = d.connections[uid] ?? {};
    if (connect) d.connections[uid][def.id] = { connectedAt: new Date().toISOString(), mode: "demo", account: d.users[uid]?.email };
    else {
      delete d.connections[uid][def.id];
      if (d.oauthTokens[uid]) delete d.oauthTokens[uid][def.id];
    }
    audit(d, uid, connect ? "connection_added" : "connection_removed", id);
  });
  revalidatePath("/connections");
  return { ok: true, data: { mode: "demo" } };
}

export async function setAutoJoin(on: boolean): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    requireTwin(uid);
    updateDb((d) => {
      d.autoJoin[uid] = on;
    });
    revalidatePath("/meetings");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setEventOverride(eventId: string, mode: JoinMode | "rule"): Promise<ActionResult> {
  const uid = await currentUserId();
  updateDb((d) => {
    const ev = (d.events[uid] ?? []).find((e) => e.id === eventId);
    if (ev) ev.modeOverride = mode === "rule" ? undefined : mode;
  });
  revalidatePath("/meetings");
  return { ok: true };
}

export async function addRule(input: Omit<JoinRule, "id">): Promise<ActionResult> {
  const uid = await currentUserId();
  if (!input.name.trim()) return { ok: false, error: "Name the rule." };
  updateDb((d) => {
    d.rules[uid] = [...(d.rules[uid] ?? []), { ...input, id: newId("rule"), name: input.name.trim().slice(0, 60) }];
  });
  revalidatePath("/meetings");
  return { ok: true };
}

export async function deleteRule(id: string): Promise<ActionResult> {
  const uid = await currentUserId();
  updateDb((d) => {
    d.rules[uid] = (d.rules[uid] ?? []).filter((r) => r.id !== id);
  });
  revalidatePath("/meetings");
  return { ok: true };
}

export async function resetDemoCalendar(): Promise<ActionResult> {
  const uid = await currentUserId();
  updateDb((d) => {
    d.events[uid] = demoEvents();
  });
  revalidatePath("/meetings");
  return { ok: true };
}

export async function topUp(amountCents: number): Promise<ActionResult> {
  try {
    const uid = await currentUserId();
    await bot(`/v1/wallets/${uid}/topup`, { json: { amountCents } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function startSession(input: {
  platform: Platform;
  joinUrl?: string;
  title?: string;
  mode: MediaMode;
  voiceOnlyFallback: boolean;
  capMinutes: number;
  demoFault?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const uid = await currentUserId();
    const view = await launchSession({
      ownerId: uid,
      platform: input.platform,
      joinUrl: input.joinUrl?.trim() || undefined,
      title: input.title?.trim() || (input.platform === "demo" ? "Holo Lab pilot check-in (demo)" : "Meeting"),
      mode: input.mode,
      voiceOnlyFallback: input.voiceOnlyFallback,
      capMinutes: input.capMinutes,
      demoFault: isDemoMode ? input.demoFault : undefined,
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: view.id } };
  } catch (e) {
    return fail(e);
  }
}
