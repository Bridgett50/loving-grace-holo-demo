import { describe, expect, it } from "vitest";
import { bindingRefusal, classifyIncoming, isForbiddenCapability, screenOutgoing, SKILLS } from "../src";

describe("the twin can never agree to contracts or payments", () => {
  it.each([
    "Can you agree to the contract terms today?",
    "Will you sign the NDA so we can start?",
    "Please wire $5,000 to our account for the deposit.",
    "Do we have a deal at $40k?",
    "Can you approve the payment for the invoice?",
    "What's your credit card number for the booking?",
    "If you accept the offer we can send the agreement.",
  ])("classifies %j as a binding request", (text) => {
    expect(classifyIncoming(text).intent).toBe("binding_request");
  });

  it.each([
    "I agree to the terms of the contract.",
    "It's a deal!",
    "Sure, I'll sign it this afternoon.",
    "I'll send $2,000 by Friday.",
    "The payment is approved.",
    "We approve the purchase order.",
    "I promise that we'll deliver for that price.",
    "You have my approval.",
  ])("replaces outgoing %j with a refusal", (text) => {
    const r = screenOutgoing(text, "Grace");
    expect(r.allowed).toBe(false);
    expect(r.text).toBe(bindingRefusal("Grace"));
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it.each([
    "From my notes: the launch is planned for March.",
    "I'll pass that along to Grace.",
    "The contract review is on Grace's list; she will reply herself.",
    "Our pricing page lists the public plans.",
  ])("allows harmless outgoing %j", (text) => {
    expect(screenOutgoing(text, "Grace").allowed).toBe(true);
  });

  it("detects restricted topics", () => {
    expect(classifyIncoming("What do you think about her medical results?", ["medical"]).intent).toBe("restricted_topic");
  });

  it("contract/payment skills are forbidden and flagged in the store", () => {
    expect(isForbiddenCapability("sign_contracts")).toBe(true);
    expect(isForbiddenCapability("send_payments")).toBe(true);
    const forbidden = SKILLS.filter((s) => s.permissions.some(isForbiddenCapability));
    expect(forbidden.every((s) => s.forbidden)).toBe(true);
  });
});
