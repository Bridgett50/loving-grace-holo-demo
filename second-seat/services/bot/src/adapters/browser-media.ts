/**
 * Injected into the meeting page before any platform script runs. Replaces getUserMedia with a
 * synthetic camera (canvas) and microphone (WebAudio) so the bot can publish the twin's video and
 * cloned voice as an ordinary participant. The bot pushes JPEG frames and PCM/MP3 chunks into the page
 * with `window.__secondSeat.pushFrame(...)` / `pushAudioUrl(...)`.
 *
 * Every frame is composited with the custom background, the "AI Twin of <name>" badge and a corner
 * provenance mark, so the disclosure survives screenshots and recordings.
 */
export function mediaShimScript(opts: { badge: string; backgroundCss: string; backgroundImageUrl?: string }): string {
  return `(() => {
  const BADGE = ${JSON.stringify(opts.badge)};
  const BG = ${JSON.stringify(opts.backgroundCss)};
  const BG_IMG = ${JSON.stringify(opts.backgroundImageUrl ?? "")};
  const canvas = document.createElement("canvas");
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext("2d");
  const frame = new Image();
  const bgImg = new Image();
  if (BG_IMG) bgImg.src = BG_IMG;
  const audioCtx = new AudioContext({ sampleRate: 48000 });
  const dest = audioCtx.createMediaStreamDestination();
  const keepAlive = audioCtx.createConstantSource();
  const gain = audioCtx.createGain(); gain.gain.value = 0.0001;
  keepAlive.connect(gain).connect(dest); keepAlive.start();

  function drawBackground() {
    if (BG_IMG && bgImg.complete && bgImg.naturalWidth) { ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height); return; }
    const m = /#([0-9a-f]{6})/gi; const colors = BG.match(m) || ["#05060a", "#1b2236"];
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    colors.forEach((c, i) => g.addColorStop(i / Math.max(1, colors.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  function draw() {
    drawBackground();
    if (frame.complete && frame.naturalWidth) {
      const h = canvas.height * 0.92, w = h * (frame.naturalWidth / frame.naturalHeight);
      ctx.drawImage(frame, (canvas.width - w) / 2, canvas.height - h, w, h);
    }
    ctx.font = "600 26px system-ui, sans-serif";
    const pad = 14, tw = ctx.measureText(BADGE).width;
    ctx.fillStyle = "rgba(10,10,20,0.72)"; ctx.fillRect(24, 24, tw + pad * 2, 44);
    ctx.fillStyle = "#fff"; ctx.fillText(BADGE, 24 + pad, 56);
    ctx.font = "500 16px system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("CR · AI-generated · Content Credentials", canvas.width - 330, canvas.height - 22);
    requestAnimationFrame(draw);
  }
  draw();
  const videoTrack = canvas.captureStream(30).getVideoTracks()[0];
  const audioTrack = dest.stream.getAudioTracks()[0];

  window.__secondSeat = {
    pushFrame(jpegBase64) { frame.src = "data:image/jpeg;base64," + jpegBase64; },
    async pushAudioUrl(url) {
      const buf = await (await fetch(url)).arrayBuffer();
      const audio = await audioCtx.decodeAudioData(buf);
      const src = audioCtx.createBufferSource(); src.buffer = audio; src.connect(dest); src.start();
    },
    stats: () => ({ video: videoTrack.readyState, audio: audioTrack.readyState }),
  };
  const md = navigator.mediaDevices;
  md.getUserMedia = async (c) => {
    const s = new MediaStream();
    if (!c || c.video) s.addTrack(videoTrack.clone());
    if (!c || c.audio) s.addTrack(audioTrack.clone());
    return s;
  };
  md.enumerateDevices = async () => [
    { deviceId: "second-seat-cam", kind: "videoinput", label: BADGE + " camera", groupId: "ss" },
    { deviceId: "second-seat-mic", kind: "audioinput", label: BADGE + " microphone", groupId: "ss" },
  ];
})();`;
}

/** Playwright is an optional dependency (Apache-2.0). Loaded lazily so demo mode never needs browsers. */
export async function loadChromium(): Promise<{ launch: (o: Record<string, unknown>) => Promise<any> }> {
  const mod = "playwright";
  try {
    const pw = await import(/* @vite-ignore */ mod);
    return pw.chromium;
  } catch {
    throw new Error("Playwright is not installed. Run `pnpm --filter @second-seat/bot add playwright && npx playwright install chromium`.");
  }
}

export const BROWSER_ARGS = [
  "--use-fake-ui-for-media-stream",
  "--autoplay-policy=no-user-gesture-required",
  "--disable-blink-features=AutomationControlled",
  "--no-sandbox",
];
