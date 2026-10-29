/**
 * T2 twin room: the owner-scoped controller behind the meeting-room UI.
 * Every read and write goes through the mirrored meeting connector with the
 * current owner's principal, so another owner's meetings, transcript lines,
 * guidance and packages never reach the screen. All data here is invented.
 */
import { MeetingDenied, createMeetingConnector, packageHash, type OwnerPrincipal, type StoredCallback } from "./connector";

export type MeetingConnector = ReturnType<typeof createMeetingConnector>;

export interface DemoOwner {
  ownerId: string;
  displayName: string;
  twinName: string;
  email: string;
}

export interface ScriptLine {
  speaker: string;
  text: string;
  /** "twin" lines are the twin's own proactive answers. */
  kind: "guest" | "twin";
}

export interface MeetingScript {
  key: string;
  ownerId: string;
  title: string;
  /** Owner's private prep notes for this meeting (source evidence). */
  notes: string;
  lines: ScriptLine[];
  recipients: string[];
  draft: { subject: string; body: string };
}

export const MAIL_APP_LABEL = "Open in your mail app";
export const F2_NOTE = "Takeover can't recall an email that's already sending.";
export const F3_NOTE = "A sent package stays exportable until the meeting changes (edit, revoke, delete, expire, suspend or takeover).";
export const TAKEOVER_REFUSAL = "You took over, so the twin is paused and new transcript lines are refused.";

export const DEMO_OWNERS: DemoOwner[] = [
  { ownerId: "demo-owner-a", displayName: "Avery Brooks", twinName: "Avery's twin", email: "avery@example.test" },
  { ownerId: "demo-owner-b", displayName: "Jordan Reyes", twinName: "Jordan's twin", email: "jordan@example.test" },
];

export const DEMO_SCRIPTS: MeetingScript[] = [
  {
    key: "kiosk-pilot",
    ownerId: "demo-owner-a",
    title: "Kiosk pilot check-in",
    notes: "Pilot budget is 12,000 for three kiosks. Launch window is the week of March 9. Do not promise on-site support before April.",
    recipients: ["dana@client.example.test", "lee@client.example.test"],
    lines: [
      { speaker: "Dana (client)", kind: "guest", text: "Thanks for joining. Can we still launch the kiosks in early March?" },
      { speaker: "Avery's twin", kind: "twin", text: "Yes. The launch window is the week of March 9, and all three kiosks fit in the 12,000 pilot budget." },
      { speaker: "Lee (client)", kind: "guest", text: "Could someone be on site for the first weekend?" },
      { speaker: "Avery's twin", kind: "twin", text: "Remote support covers launch weekend. On-site support starts in April, so I won't promise it sooner." },
      { speaker: "Dana (client)", kind: "guest", text: "Great. Please send a recap with the dates." },
      { speaker: "Avery's twin", kind: "twin", text: "Will do. You'll get a recap that I review before it's sent." },
    ],
    draft: {
      subject: "Recap: Kiosk pilot check-in",
      body: [
        "Hi Dana and Lee,",
        "",
        "Thanks for today's check-in. Here's the recap.",
        "",
        "- Launch window: the week of March 9.",
        "- Budget: three kiosks within the 12,000 pilot budget.",
        "- Support: remote support for launch weekend; on-site support starts in April.",
        "",
        "Best,",
        "Avery",
      ].join("\n"),
    },
  },
  {
    key: "board-prep",
    ownerId: "demo-owner-a",
    title: "Board prep (internal)",
    notes: "Confidential: runway is 14 months. Hiring freeze on the design team until Q3.",
    recipients: ["cofounder@example.test"],
    lines: [
      { speaker: "Sam (cofounder)", kind: "guest", text: "Let's lock the runway slide before Thursday." },
      { speaker: "Avery's twin", kind: "twin", text: "The runway slide says 14 months, and the design hiring freeze runs until Q3." },
    ],
    draft: {
      subject: "Board prep notes",
      body: "Sam,\n\nRunway slide: 14 months. Design hiring freeze until Q3.\n\nAvery",
    },
  },
  {
    key: "vendor-sync",
    ownerId: "demo-owner-b",
    title: "Vendor sync",
    notes: "Jordan's private note: the vendor contract renews on June 1 at 4,500 a month.",
    recipients: ["ops@vendor.example.test"],
    lines: [
      { speaker: "Riley (vendor)", kind: "guest", text: "Are we renewing on the same terms?" },
      { speaker: "Jordan's twin", kind: "twin", text: "The contract renews on June 1 at 4,500 a month. Jordan will confirm in writing." },
    ],
    draft: {
      subject: "Renewal terms",
      body: "Hi Riley,\n\nConfirming the renewal on June 1 at 4,500 a month.\n\nJordan",
    },
  },
];

/**
 * The demo roster with owner A shown as the signed-in owner's own twin (their
 * real display name) instead of the placeholder "Avery Brooks". Owner IDs, the
 * meetings and the second owner stay invented.
 */
export function rosterFor(primaryName: string): { owners: DemoOwner[]; scripts: MeetingScript[] } {
  const full = primaryName.trim() || DEMO_OWNERS[0].displayName;
  const first = full.split(/\s+/)[0];
  const swap = (s: string) => s.replaceAll("Avery Brooks", full).replaceAll("Avery", first);
  const owners = DEMO_OWNERS.map((o, i) => (i === 0 ? { ...o, displayName: full, twinName: `${first}'s twin` } : o));
  const scripts = DEMO_SCRIPTS.map((s) => ({
    ...s,
    notes: swap(s.notes),
    lines: s.lines.map((l) => ({ ...l, speaker: swap(l.speaker), text: swap(l.text) })),
    draft: { subject: swap(s.draft.subject), body: swap(s.draft.body) },
  }));
  return { owners, scripts };
}

/** The exact package text that is hashed, approved, sent and exported. */
export function packageText(script: Pick<MeetingScript, "recipients">, draft: { subject: string; body: string }): string {
  return `To: ${script.recipients.join(", ")}\nSubject: ${draft.subject}\n\n${draft.body}`;
}

export function parsePackage(text: string): { to: string; subject: string; body: string } {
  const [head, ...rest] = text.split("\n\n");
  const to = /^To: (.*)$/m.exec(head)?.[1] ?? "";
  const subject = /^Subject: (.*)$/m.exec(head)?.[1] ?? "";
  return { to, subject, body: rest.join("\n\n") };
}

/** A mailto: link. It only opens the viewer's own mail app; it never sends. */
export function mailtoHref(pkg: string): string {
  const { to, subject, body } = parsePackage(pkg);
  const recipients = to
    .split(",")
    .map((r) => encodeURIComponent(r.trim()))
    .filter(Boolean)
    .join(",");
  return `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/**
 * The fake send transport is allowed only when SECOND_SEAT_TEST_MODE is exactly
 * "1" AND the request reached a loopback host, so a public deploy never shows it.
 */
export function fakeSendAllowed(testModeFlag: string | undefined, host: string | null | undefined): boolean {
  if (testModeFlag !== "1") return false;
  if (!host) return false;
  const bare = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return LOOPBACK_HOSTS.has(bare.toLowerCase());
}

export type PackageStatus = "none" | "pending" | "delivered" | "invalidated" | "failed";

export interface PackageView {
  jobId: string;
  text: string;
  hash: string;
  status: PackageStatus;
  approved: boolean;
  sent: boolean;
}

export interface RoomMeeting {
  meetingId: string;
  title: string;
}

interface Live {
  script: MeetingScript;
  generationId: string;
  next: number;
  guidance: string[];
  takenOver: boolean;
  pkg: { job: StoredCallback; text: string } | null;
}

export interface TwinRoom {
  connector: MeetingConnector;
  meetings(principal: OwnerPrincipal): RoomMeeting[];
  title(principal: OwnerPrincipal, meetingId: string): string | null;
  linesLeft(principal: OwnerPrincipal, meetingId: string): number;
  nextLine(principal: OwnerPrincipal, meetingId: string): { appended: boolean; reason?: string };
  transcript(principal: OwnerPrincipal, meetingId: string): string[];
  guide(principal: OwnerPrincipal, meetingId: string, text: string): { accepted: boolean; reason?: string };
  guidance(principal: OwnerPrincipal, meetingId: string): string[];
  takeover(principal: OwnerPrincipal, meetingId: string): { invalidatedJobs: number };
  isTakenOver(principal: OwnerPrincipal, meetingId: string): boolean;
  reasoningContext(principal: OwnerPrincipal, meetingId: string): string;
  draftText(principal: OwnerPrincipal, meetingId: string): string | null;
  deliverPackage(principal: OwnerPrincipal, meetingId: string, text: string): PackageView | null;
  packageView(principal: OwnerPrincipal, meetingId: string): PackageView | null;
  approve(principal: OwnerPrincipal, meetingId: string): { approved: boolean };
  send(
    principal: OwnerPrincipal,
    meetingId: string,
    transport: (pkg: { jobId: string; packageHash: string; body: string }) => Promise<void>,
  ): Promise<{ ran: boolean; error?: string }>;
  exportApproved(principal: OwnerPrincipal, meetingId: string): string | null;
}

/** Builds the room: one connector, one meeting per script, created by its own owner. */
export function createTwinRoom(opts?: { connector?: MeetingConnector; scripts?: MeetingScript[] }): TwinRoom {
  const connector = opts?.connector ?? createMeetingConnector();
  const scripts = opts?.scripts ?? DEMO_SCRIPTS;
  // meetingId -> live state. Keys are connector-issued random IDs; every
  // lookup below is re-checked against the connector with the caller's
  // principal, so knowing an ID is not enough to see anything.
  const live = new Map<string, Live>();

  for (const script of scripts) {
    const owner = { ownerId: script.ownerId };
    const { meetingId } = connector.createMeeting(owner, script.notes);
    const { generationId } = connector.openSession(owner, meetingId);
    live.set(meetingId, { script, generationId, next: 0, guidance: [], takenOver: false, pkg: null });
  }

  /** The owner's live state for a meeting, or null if the connector denies the owner. */
  function mine(principal: OwnerPrincipal, meetingId: string): Live | null {
    const state = live.get(meetingId);
    if (!state) return null;
    try {
      connector.act(principal, meetingId, { type: "read" });
    } catch (err) {
      if (err instanceof MeetingDenied) return null;
      throw err;
    }
    return state;
  }

  function view(principal: OwnerPrincipal, state: Live): PackageView | null {
    if (!state.pkg) return null;
    const s = connector.jobStatus(principal, state.pkg.job.jobId!);
    if (!s) return null;
    const status: PackageStatus = s.status === "consumed" ? "delivered" : s.status;
    return {
      jobId: state.pkg.job.jobId!,
      text: state.pkg.text,
      hash: packageHash(state.pkg.text),
      status,
      approved: s.approved && status === "delivered",
      sent: s.dispatched && status !== "failed",
    };
  }

  return {
    connector,
    meetings(principal) {
      const out: RoomMeeting[] = [];
      for (const [meetingId] of live) {
        const state = mine(principal, meetingId);
        if (state) out.push({ meetingId, title: state.script.title });
      }
      return out;
    },
    title(principal, meetingId) {
      return mine(principal, meetingId)?.script.title ?? null;
    },
    linesLeft(principal, meetingId) {
      const state = mine(principal, meetingId);
      return state ? state.script.lines.length - state.next : 0;
    },
    nextLine(principal, meetingId) {
      const state = mine(principal, meetingId);
      if (!state) return { appended: false, reason: "Not your meeting." };
      const line = state.script.lines[state.next];
      if (!line) return { appended: false, reason: "The scripted meeting has ended." };
      const { appended } = connector.appendTranscript(principal, state.generationId, {
        meetingId,
        text: `${line.speaker}: ${line.text}`,
      });
      if (!appended) {
        return { appended: false, reason: state.takenOver ? TAKEOVER_REFUSAL : "The connector refused this line." };
      }
      state.next += 1;
      return { appended: true };
    },
    transcript(principal, meetingId) {
      const state = mine(principal, meetingId);
      if (!state) return [];
      return connector.transcript(principal, state.generationId);
    },
    guide(principal, meetingId, text) {
      const state = mine(principal, meetingId);
      if (!state) return { accepted: false, reason: "Not your meeting." };
      if (state.takenOver) return { accepted: false, reason: "You took over. The twin is paused, so guidance isn't needed." };
      const clean = text.trim().slice(0, 500);
      if (!clean) return { accepted: false, reason: "Guidance is empty." };
      state.guidance.push(clean);
      return { accepted: true };
    },
    guidance(principal, meetingId) {
      const state = mine(principal, meetingId);
      return state ? [...state.guidance] : [];
    },
    takeover(principal, meetingId) {
      const state = mine(principal, meetingId);
      if (!state) throw new MeetingDenied("takeover");
      const before = state.pkg ? connector.jobStatus(principal, state.pkg.job.jobId!) : null;
      connector.takeover(principal, state.generationId);
      state.takenOver = true;
      const after = state.pkg ? connector.jobStatus(principal, state.pkg.job.jobId!) : null;
      const invalidatedJobs = before && after && before.status !== "invalidated" && after.status === "invalidated" ? 1 : 0;
      return { invalidatedJobs };
    },
    isTakenOver(principal, meetingId) {
      return mine(principal, meetingId)?.takenOver ?? false;
    },
    reasoningContext(principal, meetingId) {
      const state = mine(principal, meetingId);
      if (!state) return "";
      const notes = connector.act(principal, meetingId, { type: "read" }).text ?? "";
      const heard = connector.transcript(principal, state.generationId);
      return [
        `Owner: ${principal.ownerId}`,
        `Meeting: ${state.script.title}`,
        `Prep notes: ${notes}`,
        ...heard.map((l) => `Heard: ${l}`),
        ...state.guidance.map((g) => `Owner guidance: ${g}`),
      ].join("\n");
    },
    draftText(principal, meetingId) {
      const state = mine(principal, meetingId);
      return state ? packageText(state.script, state.script.draft) : null;
    },
    deliverPackage(principal, meetingId, text) {
      const state = mine(principal, meetingId);
      if (!state) return null;
      let job;
      try {
        job = connector.issueJob(principal, meetingId, state.generationId);
      } catch (err) {
        if (err instanceof MeetingDenied) return null;
        throw err;
      }
      const cb: StoredCallback = { ...job, artifact: text };
      if (!connector.resolveCallback(principal, cb).delivered) return null;
      state.pkg = { job: cb, text };
      return view(principal, state);
    },
    packageView(principal, meetingId) {
      const state = mine(principal, meetingId);
      return state ? view(principal, state) : null;
    },
    approve(principal, meetingId) {
      const state = mine(principal, meetingId);
      if (!state?.pkg) return { approved: false };
      return connector.approvePackage(principal, state.pkg.job.jobId!, packageHash(state.pkg.text));
    },
    async send(principal, meetingId, transport) {
      const state = mine(principal, meetingId);
      if (!state?.pkg) return { ran: false };
      try {
        return await connector.replay(principal, state.pkg.job, transport);
      } catch (err) {
        return { ran: false, error: (err as Error).message };
      }
    },
    exportApproved(principal, meetingId) {
      const state = mine(principal, meetingId);
      if (!state?.pkg) return null;
      try {
        return connector.exportApproved(principal, state.pkg.job.jobId!);
      } catch (err) {
        if (err instanceof MeetingDenied) return null;
        throw err;
      }
    },
  };
}
