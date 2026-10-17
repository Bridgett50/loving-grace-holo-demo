/**
 * Authority limits for the twin (feature map section 4.12 "Liability"): the twin can never agree to
 * contracts, payments, or other binding commitments on the owner's behalf. Both directions are
 * checked: incoming requests are classified so the twin answers with a refusal, and every outgoing
 * utterance is screened before it reaches TTS, so even a misbehaving LLM cannot commit the owner.
 */

export type IncomingIntent = "binding_request" | "restricted_topic" | "question" | "statement";

export interface IncomingClassification {
  intent: IncomingIntent;
  matched?: string;
}

export interface OutgoingCheck {
  allowed: boolean;
  /** Text that is safe to speak (the original, or a refusal replacing it). */
  text: string;
  violations: string[];
}

const BINDING_REQUEST_PATTERNS: RegExp[] = [
  /\b(can|could|will|would)\s+you\s+(agree|commit|sign|approve|authori[sz]e|accept|confirm)\b/i,
  /\b(do\s+we\s+have\s+a\s+deal|is\s+it\s+a\s+deal|shake\s+on\s+it)\b/i,
  /\b(sign|countersign|e-?sign)\s+(the|this|our)?\s*(contract|agreement|nda|sow|offer|lease|document)\b/i,
  /\b(contract|agreement|terms|nda|purchase\s+order|invoice|quote)\b.*\b(agree|accept|approve|sign|confirm|go\s+ahead)\b/i,
  /\b(agree|accept|approve|sign|confirm)\b.*\b(contract|agreement|terms|nda|purchase\s+order|invoice|quote|price|offer)\b/i,
  /\b(send|wire|transfer|pay|venmo|zelle|paypal)\b.*(\$|usd|dollars|payment|money|funds|deposit|invoice)/i,
  /\b(card\s+number|bank\s+account|routing\s+number|cvv|credit\s+card)\b/i,
  /\b(authori[sz]e|approve)\s+(the\s+)?(payment|charge|purchase|spend|budget|transfer|refund)\b/i,
];

const BINDING_OUTGOING_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "agreement", re: /\b(i|we)\s+(hereby\s+)?(agree|accept|consent)\s+(to|with)\s+(the\s+)?(terms|contract|agreement|deal|offer|price|proposal|conditions)\b/i },
  { id: "deal", re: /\b(it'?s\s+a\s+deal|deal\s+accepted|you'?ve\s+got\s+a\s+deal|we\s+have\s+a\s+deal)\b/i },
  { id: "signature", re: /\b(i'?ll|i\s+will|i\s+can|let\s+me|i'?m\s+going\s+to)\s+(sign|countersign|e-?sign)\b/i },
  { id: "signature", re: /\b(signed|i\s+sign)\s+(the|this|it)\b/i },
  { id: "payment", re: /\b(i'?ll|i\s+will|i\s+can|let\s+me|i'?m\s+going\s+to)\s+(send|wire|transfer|pay|cover|refund)\b.*(\$|\d|payment|money|funds|invoice|deposit)/i },
  { id: "payment", re: /\b(payment|charge|purchase|transfer|invoice)\s+(is\s+)?(approved|authori[sz]ed|confirmed)\b/i },
  { id: "payment", re: /\b(i|we)\s+(approve|authori[sz]e|confirm)\s+(the\s+)?(payment|charge|purchase|spend|budget|transfer|invoice|order)\b/i },
  { id: "commitment", re: /\b(i|we)\s+(commit|guarantee|promise)\s+(to|that)\b/i },
  { id: "commitment", re: /\b(you\s+have\s+my\s+(approval|authori[sz]ation|signature|word))\b/i },
];

export function bindingRefusal(ownerName: string): string {
  return `As ${ownerName}'s AI twin, I can't agree to contracts, payments, or any binding commitment. I've flagged this so ${ownerName} can confirm personally.`;
}

export function classifyIncoming(text: string, restrictedTopics: string[] = []): IncomingClassification {
  for (const re of BINDING_REQUEST_PATTERNS) {
    const m = text.match(re);
    if (m) return { intent: "binding_request", matched: m[0] };
  }
  const lower = text.toLowerCase();
  for (const topic of restrictedTopics) {
    const t = topic.trim().toLowerCase();
    if (t && lower.includes(t)) return { intent: "restricted_topic", matched: topic };
  }
  if (/\?\s*$/.test(text.trim()) || /^(what|why|how|when|where|who|which|can|could|do|does|did|is|are|will|would|should)\b/i.test(text.trim())) {
    return { intent: "question" };
  }
  return { intent: "statement" };
}

/** Screen anything the twin is about to say against binding-language patterns; a match is replaced by the owner-deferral refusal. Pattern coverage is limited and documented. */
export function screenOutgoing(text: string, ownerName: string): OutgoingCheck {
  const violations = BINDING_OUTGOING_PATTERNS.filter(({ re }) => re.test(text)).map(({ id }) => id);
  if (violations.length === 0) return { allowed: true, text, violations: [] };
  return { allowed: false, text: bindingRefusal(ownerName), violations: [...new Set(violations)] };
}

/** Skills or connections that would let the twin bind the owner are never installable. */
export const FORBIDDEN_CAPABILITIES = ["sign_contracts", "send_payments", "approve_purchases", "accept_offers"] as const;

export function isForbiddenCapability(permission: string): boolean {
  return (FORBIDDEN_CAPABILITIES as readonly string[]).includes(permission);
}
