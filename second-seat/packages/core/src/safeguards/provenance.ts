/**
 * Content credentials for twin output. Produces a C2PA-shaped manifest (claim generator, actions
 * assertion with IPTC digitalSourceType "trainedAlgorithmicMedia", author, AI-twin disclosure) bound
 * to the asset by SHA-256 and signed with HMAC-SHA256.
 *
 * Production note: real C2PA embedding and X.509 signing should use the open-source c2pa-rs / c2pa-node
 * (MIT/Apache-2.0) with a certificate from a C2PA trust-list CA. The manifest structure here matches so
 * the swap is a signing-backend change only. Uses Web Crypto so it runs in Node 20+ and browsers.
 */

export interface ContentCredentialInput {
  asset: string | Uint8Array;
  assetType: "transcript" | "summary" | "video_frame" | "audio_chunk" | "recording";
  ownerName: string;
  twinId: string;
  sessionId?: string;
  generator?: string;
}

export interface ContentCredential {
  manifestVersion: "c2pa-compatible/1";
  claimGenerator: string;
  createdAt: string;
  assetType: ContentCredentialInput["assetType"];
  assetHash: { alg: "sha256"; value: string };
  assertions: Array<{ label: string; data: Record<string, unknown> }>;
  signature: { alg: "hmac-sha256"; value: string };
}

const encoder = new TextEncoder();

function toBytes(asset: string | Uint8Array): Uint8Array {
  return typeof asset === "string" ? encoder.encode(asset) : asset;
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", toBytes(data) as BufferSource));
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

function canonical(cred: Omit<ContentCredential, "signature">): string {
  return JSON.stringify(cred, Object.keys(cred).sort());
}

export async function createContentCredential(input: ContentCredentialInput, signingSecret: string, now = new Date()): Promise<ContentCredential> {
  const unsigned: Omit<ContentCredential, "signature"> = {
    manifestVersion: "c2pa-compatible/1",
    claimGenerator: input.generator ?? "SecondSeat/0.1 (Loving Grace)",
    createdAt: now.toISOString(),
    assetType: input.assetType,
    assetHash: { alg: "sha256", value: await sha256Hex(input.asset) },
    assertions: [
      {
        label: "c2pa.actions",
        data: {
          actions: [
            {
              action: "c2pa.created",
              digitalSourceType: "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
              softwareAgent: "Second Seat AI Twin",
            },
          ],
        },
      },
      { label: "stds.schema-org.CreativeWork", data: { author: [{ "@type": "Person", name: input.ownerName }] } },
      {
        label: "com.lovinggrace.ai_twin",
        data: { disclosure: `AI Twin of ${input.ownerName}`, twinId: input.twinId, sessionId: input.sessionId ?? null, isHuman: false },
      },
    ],
  };
  return { ...unsigned, signature: { alg: "hmac-sha256", value: await hmac(signingSecret, canonical(unsigned)) } };
}

export async function verifyContentCredential(
  cred: ContentCredential,
  asset: string | Uint8Array,
  signingSecret: string,
): Promise<{ valid: boolean; reason?: string }> {
  const { signature, ...unsigned } = cred;
  if ((await hmac(signingSecret, canonical(unsigned))) !== signature.value) return { valid: false, reason: "signature_mismatch" };
  if ((await sha256Hex(asset)) !== cred.assetHash.value) return { valid: false, reason: "asset_modified" };
  return { valid: true };
}

/**
 * Invisible text watermark: encodes an id as zero-width characters appended to text output
 * (transcripts, notes, chat messages) so copies can be traced back to a twin session.
 * Video/audio watermarking belongs in the avatar/voice workers (e.g. an Apache/MIT spread-spectrum or
 * AudioSeal-class watermark, licence permitting).
 */
const ZW = ["\u200b", "\u200c"] as const;
const ZW_START = "\u2060";
const ZW_END = "\u2063";

export function embedTextWatermark(text: string, id: string): string {
  const bits = [...encoder.encode(id)].map((b) => b.toString(2).padStart(8, "0")).join("");
  return text + ZW_START + [...bits].map((b) => ZW[Number(b)]).join("") + ZW_END;
}

export function extractTextWatermark(text: string): string | null {
  const start = text.lastIndexOf(ZW_START);
  const end = text.lastIndexOf(ZW_END);
  if (start === -1 || end === -1 || end < start) return null;
  const bits = [...text.slice(start + 1, end)].map((c) => (c === ZW[1] ? "1" : "0")).join("");
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return new TextDecoder().decode(bytes);
}

export function stripTextWatermark(text: string): string {
  const start = text.lastIndexOf(ZW_START);
  return start === -1 ? text : text.slice(0, start);
}
