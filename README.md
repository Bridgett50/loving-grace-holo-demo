# Loving Grace Presence · Hologram Demo
**Loving Grace Technologies, LLC** · Grenada, MS

**Live:** https://bridgett50.github.io/loving-grace-holo-demo/

A concert-style "Pepper's Ghost" hologram in the browser. Open the link, tap **Tap to appear** once (browsers need one tap to allow the camera), and you appear as clean, live video of yourself on pure black, full screen. No menus, settings or codes.

## What it does
- **Real camera video, not a point cloud.** Front camera at the highest resolution offered (ideal 1920×1080, falling back to 1280×720), 30 fps. Rendered by WebGL directly onto a canvas at full devicePixelRatio. The mask is used only as alpha over the original camera frame (colour is never blurred or blended).
- **Person matting:** MediaPipe Image Segmenter, **selfie multiclass 256×256** model (background channel inverted = person), GPU delegate with CPU fallback. Slow devices (>40 ms per frame) switch automatically to the lighter **selfie segmenter** model.
- **Clean edges:** adaptive temporal smoothing (damps flicker, follows real motion), joint-bilateral refinement that snaps the low-res mask to colour edges of the full-res frame, smoothstep tightening + feathering (no halo). The colour frame and its mask are kept in sync.
- **People + Pets (on by default):** a second MediaPipe ImageSegmenter running **DeepLabV3 (Pascal VOC, 21 classes)** at half rate; the dog (12) and cat (8) confidence masks are merged (max) with the person mask. It switches off automatically on slow devices (toggle to retry). `?pets=0` / `?pets=1` force it.
- **Clear by default:** light unsharp mask, +4% contrast and +5% saturation, no brightness lift (true blacks), and a 1–2 px feather on the outline only. **Glow** (toggle) adds a subtle blue-white tint and rim light. Scanline shimmer is optional and off by default.
- **UI disappears.** The wordmark fades out after about 3.5 s; tapping the screen shows a small overlay for 3 s: **Stage mode** (4-way Pepper's Ghost pyramid layout on black), **Mirror**, **Clear/Glow**, **Scanlines**, **Rescan** (restarts the camera and segmentation and resets smoothing), **Share (beta)**. A one-time tip after start: "Face a light, plain wall behind you."
- **Share (beta):** creates a link `…/?watch=<id>` (native share sheet or clipboard). The other person just opens it. The *already-matted* hologram (background removed) is streamed peer-to-peer over WebRTC; signaling uses the free public PeerJS broker (0.peerjs.com) and public STUN. No TURN relay, so some strict/cellular networks will not connect, which is why it is labelled beta. Video only, no audio. The host must keep the page open.
- **Old 3D point cloud** lives at [`/lab/`](https://bridgett50.github.io/loving-grace-holo-demo/lab/) (also `?mode=3d`). It is not the default.

URL options (for testing): `?stage` (start in stage mode), `?glow`, `?model=selfie|multiclass`, `?delegate=cpu`, `?debug` (PeerJS logs).

## Run locally
```
python3 -m http.server 8765   # then open http://localhost:8765 (camera needs https or localhost)
```

## Dependencies and licenses (Apache-2.0 / MIT only)
| Component | Used by | License | Loaded from |
|---|---|---|---|
| @mediapipe/tasks-vision 0.10.14 | segmentation runtime (main + lab) | Apache-2.0 | jsDelivr CDN |
| MediaPipe Selfie Multiclass Segmentation 256×256 model | person matting (default) | Apache-2.0 (Google model card) | Google Storage |
| MediaPipe DeepLabV3 model (`deeplab_v3.tflite`) | dog + cat masks (People + Pets) | Apache-2.0 (Google model card) | Google Storage |
| MediaPipe Selfie Segmenter model | fallback on slow devices; lab | Apache-2.0 (Google model card) | Google Storage |
| PeerJS 1.5.4 (client) | Share (beta) | MIT | jsDelivr CDN |
| PeerJS public cloud broker (0.peerjs.com) | signaling only | free public service (PeerServer is MIT) | network |
| three.js r170 | `/lab/` only | MIT | vendored in `vendor/` |
| @huggingface/transformers 3.0.2 + ONNX Runtime Web | `/lab/` only | Apache-2.0 / MIT | jsDelivr CDN |
| Depth Anything V2 **Small** | `/lab/` only | Apache-2.0 (Small only; Base/Large are non-commercial, do not swap in) | Hugging Face Hub |
| WebRTC, WebGL2, Fullscreen, Wake Lock | browser APIs | n/a | built in |

## Testing
`test.js` (puppeteer-core) runs headless Chrome with `--use-file-for-fake-video-capture=person.y4m`. The clip is 3.5 s of a real person talking (public-domain interview video from the California Department of Corrections and Rehabilitation on Wikimedia Commons, cropped to 1280×720 and converted with ffmpeg). It screenshots the landing page, the default view, stage mode, the overlay and a desktop view. Result: **0 console errors and 0 page errors.**

Pet test: a run with a CC BY-SA 4.0 Wikimedia Commons cat clip ("Hiirepyyk kass koer 2022") and a CC BY-SA 3.0 dog clip, used only for local testing and not committed.

## Honest limits
- Pets: DeepLabV3 runs at 257×257, so animal edges are coarser than a person's, a dark dog almost disappears on a black stage, and on slow devices the pet mask lags and can leave a patch of floor or grass behind a moving animal.
- It is 2D video. That is what concert holograms are, and it only looks "3D" on a real Pepper's Ghost reflector/pyramid in a dark room.
- The segmentation model is 256×256, so fine hair strands, fingers and fast motion can show soft or slightly late edges. Busy backgrounds with colours similar to the person's clothing or hair can leak at the edges.
- The phone frame rate depends on the device. Recent phones should hold roughly 25–30 fps; older ones use the lighter model.
- Share is beta: there is no TURN relay, so roughly 10–20% of network pairs (strict NAT/cellular) will not connect.
