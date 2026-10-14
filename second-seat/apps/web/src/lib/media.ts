"use client";

import { uploadAsset } from "@/app/actions";

export async function upload(kind: string, blob: Blob, name: string): Promise<{ id: string; url: string }> {
  const fd = new FormData();
  fd.set("kind", kind);
  fd.set("file", new File([blob], name, { type: blob.type }));
  const r = await uploadAsset(fd);
  if (!r.ok) throw new Error(r.error);
  return r.data!;
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not capture a frame"))), "image/jpeg", 0.9));
}

function drawScaled(source: CanvasImageSource, w: number, h: number, max = 900): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

export function frameFromVideoElement(video: HTMLVideoElement): Promise<Blob> {
  return canvasToJpeg(drawScaled(video, video.videoWidth, video.videoHeight));
}

/** Reference frame for the realistic look: a frame ~1 s into a video, or the photo itself. */
export async function referenceFrameFromFile(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.src = url;
      await img.decode();
      return canvasToJpeg(drawScaled(img, img.naturalWidth, img.naturalHeight));
    }
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    await new Promise<void>((res, rej) => {
      v.onloadeddata = () => res();
      v.onerror = () => rej(new Error("Could not read that video. Try an MP4 or WebM."));
    });
    v.currentTime = Math.min(1, (v.duration || 2) / 2);
    await new Promise<void>((res) => (v.onseeked = () => res()));
    return frameFromVideoElement(v);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function pickRecorderMime(kind: "video" | "audio"): string {
  const options = kind === "video" ? ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"] : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}
