import "server-only";
import { BACKGROUNDS, isConsentActive, isVerified, resolveJoinMode, type PastMeeting } from "@second-seat/core";
import type { SessionView, Wallet } from "@/lib/types";
import { getWallet, listSessions } from "./bot";
import { currentUserId } from "./current-user";
import { activeConsent, readDb, twinForOwner } from "./db";
import { backgroundFor } from "./sessions";

export async function loadOwner() {
  const uid = await currentUserId();
  const db = readDb();
  const user = db.users[uid];
  const twin = twinForOwner(db, uid);
  const verification = db.verifications[uid];
  const consent = twin ? activeConsent(db, twin.id) : null;
  const consents = twin ? Object.values(db.consents).filter((c) => c.twinId === twin.id).sort((a, b) => b.signedAt.localeCompare(a.signedAt)) : [];
  const background = twin ? backgroundFor(uid, twin.backgroundId) : BACKGROUNDS[0];
  const backgrounds = [...BACKGROUNDS, ...(db.backgrounds[uid] ?? [])];
  const events = (db.events[uid] ?? [])
    .filter((e) => Date.parse(e.endsAt) > Date.now())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((e) => ({ ...resolveJoinMode(e, db.rules[uid] ?? []), launchedSessionId: db.launched[e.id], startsSoon: Date.parse(e.startsAt) - Date.now() < 10 * 60_000 }));
  return {
    uid,
    user,
    twin,
    verification,
    verified: isVerified(verification),
    consent,
    consentActive: isConsentActive(consent, ["likeness_video", "voice_clone", "meeting_join"]),
    consents,
    background,
    backgrounds,
    knowledge: twin ? db.knowledge.filter((k) => k.twinId === twin.id) : [],
    rules: db.rules[uid] ?? [],
    events,
    autoJoin: !!db.autoJoin[uid],
    connections: db.connections[uid] ?? {},
    audit: db.audit.filter((a) => a.userId === uid).slice(-30).reverse(),
  };
}

export async function loadBotData(uid: string): Promise<{ wallet: Wallet | null; sessions: SessionView[] | null; error?: string }> {
  try {
    const [wallet, sessions] = await Promise.all([getWallet(uid), listSessions(uid)]);
    return { wallet, sessions };
  } catch (e) {
    return { wallet: null, sessions: null, error: (e as Error).message };
  }
}

/** Finished sessions with notes, in the shape the meeting-intelligence helpers expect. */
export function pastMeetings(sessions: SessionView[] | null): PastMeeting[] {
  return (sessions ?? [])
    .filter((s) => s.transcript.length > 0)
    .map((s) => ({ sessionId: s.id, title: s.meeting.title, at: s.createdAt, transcript: s.transcript, summary: s.summary }));
}
