import "server-only";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { audit, newId, UPLOAD_DIR, updateDb, type Asset } from "./db";

const LIMITS: Record<Asset["kind"], { maxBytes: number; mime: RegExp }> = {
  id_document: { maxBytes: 8e6, mime: /^image\/(jpeg|png|webp|heic)$/ },
  liveness: { maxBytes: 25e6, mime: /^(video\/(webm|mp4|quicktime)|image\/(jpeg|png|webp))$/ },
  scan: { maxBytes: 25e6, mime: /^(video\/(webm|mp4|quicktime)|image\/(jpeg|png|webp))$/ },
  voice: { maxBytes: 15e6, mime: /^audio\/(webm|ogg|mpeg|mp4|wav|x-wav|x-m4a|aac)|^video\/webm$/ },
  reference: { maxBytes: 4e6, mime: /^image\/(jpeg|png|webp)$/ },
  background: { maxBytes: 6e6, mime: /^image\/(jpeg|png|webp)$/ },
  knowledge: { maxBytes: 2e6, mime: /^(text\/(plain|markdown|csv)|application\/json|)$/ },
};

/**
 * Stores an upload on local disk under the owner's id. In production these go to encrypted object
 * storage (per-owner keys); scans and voice samples are never exported or used for shared training.
 */
export async function saveAsset(ownerId: string, kind: Asset["kind"], file: File): Promise<Asset> {
  const rule = LIMITS[kind];
  if (!file || file.size === 0) throw new Error("No file received.");
  if (file.size > rule.maxBytes) throw new Error(`File is too large (max ${Math.round(rule.maxBytes / 1e6)} MB).`);
  const mime = file.type.split(";")[0];
  if (!rule.mime.test(mime)) throw new Error(`Unsupported file type ${mime || "(unknown)"} for ${kind.replace("_", " ")}.`);
  const id = newId("asset");
  const dir = join(UPLOAD_DIR, ownerId);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, id);
  writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));
  const asset: Asset = { id, ownerId, kind, mime, name: file.name || kind, file: filePath, size: file.size, createdAt: new Date().toISOString() };
  updateDb((db) => {
    db.assets[id] = asset;
    audit(db, ownerId, "asset_uploaded", `${kind} ${id}`);
  });
  return asset;
}

export function readAsset(asset: Asset): Buffer {
  return readFileSync(asset.file);
}

export function deleteAssetFile(asset: Asset) {
  rmSync(asset.file, { force: true });
}

export function assetDataUrl(asset: Asset): string {
  return `data:${asset.mime};base64,${readAsset(asset).toString("base64")}`;
}
