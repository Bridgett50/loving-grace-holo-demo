import "server-only";
import type { SessionView, Wallet } from "@/lib/types";

const BOT_URL = process.env.BOT_SERVICE_URL || "http://127.0.0.1:4317";
const TOKEN = process.env.BOT_SERVICE_TOKEN || "dev-local-token";

export class BotOfflineError extends Error {
  constructor() {
    super(`The bot service is not reachable at ${BOT_URL}. Start it with "pnpm dev:bot".`);
  }
}

export async function bot<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BOT_URL}${path}`, {
      ...init,
      method: init.method ?? (init.json !== undefined ? "POST" : "GET"),
      headers: { "content-type": "application/json", "x-second-seat-token": TOKEN, ...init.headers },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      cache: "no-store",
    });
  } catch {
    throw new BotOfflineError();
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || `Bot service error ${res.status}`);
  return body;
}

export async function botHealth(): Promise<{ ok: boolean; demoMode?: boolean; providers?: Record<string, unknown>; platforms?: Record<string, unknown> }> {
  try {
    const res = await fetch(`${BOT_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(1500) });
    return (await res.json()) as { ok: boolean };
  } catch {
    return { ok: false };
  }
}

export const getWallet = (ownerId: string) => bot<Wallet>(`/v1/wallets/${ownerId}`);
export const listSessions = (ownerId: string) => bot<SessionView[]>(`/v1/owners/${ownerId}/sessions`);
export const getSession = (id: string) => bot<SessionView>(`/v1/sessions/${id}`);
