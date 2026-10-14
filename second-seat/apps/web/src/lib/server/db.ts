import "server-only";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  BackgroundOption,
  CalendarEvent,
  ConnectionDef,
  ConsentRecord,
  JoinRule,
  KnowledgeDoc,
  OwnerVerification,
  TwinProfile,
} from "@second-seat/core";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Verification extends OwnerVerification {
  userId: string;
  idDocumentAssetId?: string;
  livenessAssetId?: string;
}

export interface Asset {
  id: string;
  ownerId: string;
  kind: "id_document" | "liveness" | "scan" | "voice" | "reference" | "background" | "knowledge";
  mime: string;
  name: string;
  file: string;
  size: number;
  createdAt: string;
}

export interface ConnectionState {
  connectedAt: string;
  mode: "demo" | "oauth";
  account?: string;
}

export interface DB {
  users: Record<string, User>;
  verifications: Record<string, Verification>;
  twins: Record<string, TwinProfile>;
  consents: Record<string, ConsentRecord>;
  knowledge: KnowledgeDoc[];
  rules: Record<string, JoinRule[]>;
  events: Record<string, CalendarEvent[]>;
  autoJoin: Record<string, boolean>;
  launched: Record<string, string>;
  connections: Record<string, Partial<Record<ConnectionDef["id"], ConnectionState>>>;
  /** Server-only OAuth tokens, keyed by user then connection. Never sent to the client. */
  oauthTokens: Record<string, Partial<Record<ConnectionDef["id"], Record<string, unknown>>>>;
  assets: Record<string, Asset>;
  backgrounds: Record<string, BackgroundOption[]>;
  audit: Array<{ at: string; userId: string; action: string; detail?: string }>;
}

export const DATA_DIR = process.env.WEB_DATA_DIR || join(process.cwd(), ".data");
export const UPLOAD_DIR = join(DATA_DIR, "uploads");
const FILE = join(DATA_DIR, "web-store.json");

const empty = (): DB => ({
  users: {},
  verifications: {},
  twins: {},
  consents: {},
  knowledge: [],
  rules: {},
  events: {},
  autoJoin: {},
  launched: {},
  connections: {},
  oauthTokens: {},
  assets: {},
  backgrounds: {},
  audit: [],
});

export function readDb(): DB {
  try {
    return { ...empty(), ...(JSON.parse(readFileSync(FILE, "utf8")) as Partial<DB>) };
  } catch {
    return empty();
  }
}

/** Read-modify-write. Synchronous so concurrent requests in one Node process cannot interleave. */
export function updateDb<T>(fn: (db: DB) => T): T {
  const db = readDb();
  const result = fn(db);
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, FILE);
  return result;
}

export function audit(db: DB, userId: string, action: string, detail?: string) {
  db.audit.push({ at: new Date().toISOString(), userId, action, detail });
  if (db.audit.length > 500) db.audit.splice(0, db.audit.length - 500);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function twinForOwner(db: DB, ownerId: string): TwinProfile | undefined {
  return Object.values(db.twins).find((t) => t.ownerId === ownerId);
}

export function activeConsent(db: DB, twinId: string): ConsentRecord | null {
  return (
    Object.values(db.consents)
      .filter((c) => c.twinId === twinId && !c.revokedAt)
      .sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0] ?? null
  );
}
