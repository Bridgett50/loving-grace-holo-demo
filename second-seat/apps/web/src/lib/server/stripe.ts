import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isPublicDemo } from "./current-user";

/**
 * Card payments for minutes credit through Stripe Checkout. Payments are on only when
 * STRIPE_SECRET_KEY is set, and never in the public demo (visitor wallets there are sandboxes).
 * Credit is applied by the webhook, with the success redirect as a backup; both are idempotent
 * per Checkout Session id, so a payment can never be credited twice.
 */

export interface CreditPack {
  id: string;
  cents: number;
  label: string;
  minutes: number;
}

const RATE = Number(process.env.RATE_PER_MINUTE_CENTS || 25);

export const CREDIT_PACKS: CreditPack[] = [1000, 2500, 5000].map((cents) => ({
  id: `pack_${cents}`,
  cents,
  label: `$${cents / 100}`,
  minutes: Math.floor(cents / RATE),
}));

export const paymentsEnabled = () => !!process.env.STRIPE_SECRET_KEY && !isPublicDemo;

async function stripe<T>(path: string, form?: Record<string, string>): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: form ? "POST" : "GET",
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form) : undefined,
    cache: "no-store",
  });
  const body = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(body.error?.message ?? `Stripe error ${res.status}`);
  return body;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  client_reference_id: string | null;
  metadata: Record<string, string>;
}

export function createCheckout(opts: { ownerId: string; email?: string; pack: CreditPack; origin: string }) {
  const { ownerId, email, pack, origin } = opts;
  return stripe<CheckoutSession>("/checkout/sessions", {
    mode: "payment",
    client_reference_id: ownerId,
    "metadata[ownerId]": ownerId,
    "metadata[creditCents]": String(pack.cents),
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(pack.cents),
    "line_items[0][price_data][product_data][name]": `Meeting minutes credit (${pack.label})`,
    "line_items[0][price_data][product_data][description]": `About ${pack.minutes} minutes of your AI twin in meetings. Unused minutes stay in your wallet.`,
    success_url: `${origin}/?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?paid=cancelled`,
    ...(email ? { customer_email: email } : {}),
  });
}

export const getCheckout = (id: string) => stripe<CheckoutSession>(`/checkout/sessions/${encodeURIComponent(id)}`);

/** The credit a completed Checkout Session is worth, or null if it isn't a paid credit purchase. */
export function paidCredit(s: CheckoutSession): { ownerId: string; cents: number } | null {
  const ownerId = s.metadata?.ownerId;
  const cents = Number(s.metadata?.creditCents);
  if (s.payment_status !== "paid" || !ownerId || ownerId !== s.client_reference_id) return null;
  if (!Number.isInteger(cents) || cents <= 0 || cents !== s.amount_total) return null;
  return { ownerId, cents };
}

/** Verifies a `Stripe-Signature` header (HMAC-SHA256 over `${timestamp}.${payload}`). */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now()): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(t) || !sigs.length || Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  return sigs.some((s) => {
    const got = Buffer.from(s);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
