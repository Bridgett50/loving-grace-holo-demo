import { NextResponse } from "next/server";
import { bot } from "@/lib/server/bot";
import { paidCredit, verifyStripeSignature, type CheckoutSession } from "@/lib/server/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const credit = paidCredit(event.data.object);
    if (credit) {
      // A non-2xx response makes Stripe retry, which is what we want if the bot is briefly down.
      await bot(`/v1/wallets/${credit.ownerId}/credit`, { json: { amountCents: credit.cents, ref: event.data.object.id } });
    }
  }
  return NextResponse.json({ received: true });
}
