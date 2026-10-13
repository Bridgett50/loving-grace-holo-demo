# Loving Grace Presence: Holographic Demo
**Loving Grace Technologies, LLC** · Grenada, MS

This free, browser-only demo turns an ordinary webcam into a live 3D "hologram" (a point cloud) that you can rotate. It runs entirely on your device. Video only leaves the device if you open the optional peer-to-peer link.

## Features
- Webcam → **MediaPipe selfie segmentation** (removes the background) + **Depth Anything V2 Small** monocular depth (via transformers.js / ONNX Runtime Web, using WebGPU if available, otherwise WASM).
- A live **three.js point cloud** with 160×120 points. Drag to rotate, and pinch or scroll to zoom. Sliders control depth strength and point size.
- **Pepper's Ghost mode**: a black screen with 4 views (front, right, back, left), each oriented outward, for a phone or tablet pyramid or an acrylic stage reflector. Tap the ◆ button again to exit.
- **WebXR**: an "Enter VR" button appears on supported headsets (Quest browser, etc.).
- **Two-person link**: WebRTC peer-to-peer with copy/paste signaling, so no paid server is needed. It uses Google's public STUN. Very strict networks would need a TURN relay, which this demo does not include. Each side renders the *remote* person's video as a hologram on its own device.
- Mobile-friendly layout. Models (about 25–30 MB) download on first use and are cached by the browser.

## Run it
It must be served over **https** or **localhost**, because browsers require that for camera access:
```
cd holo_demo && python3 -m http.server 8000   # then open http://localhost:8000
```
Free hosting: upload the folder to GitHub Pages, Cloudflare Pages, or Netlify. All of them serve static files over https.

## Open-source dependencies and licenses
| Component | Use | License | How it is loaded |
|---|---|---|---|
| three.js r170 (`three.module.js`, `OrbitControls.js`, `VRButton.js`) | 3D rendering, controls, WebXR button | MIT | vendored in `vendor/` (license in `vendor/LICENSE`) |
| @huggingface/transformers (transformers.js) 3.0.2 | runs the depth model | Apache-2.0 | jsDelivr CDN |
| ONNX Runtime Web (bundled by transformers.js) | WASM/WebGPU inference | MIT | jsDelivr CDN |
| Depth Anything V2 **Small** (`onnx-community/depth-anything-v2-small`) | monocular depth weights | Apache-2.0 (**only the Small model**; Base/Large are CC-BY-NC-4.0, **do not swap them in**) | Hugging Face Hub |
| @mediapipe/tasks-vision 0.10.14 | selfie segmentation runtime | Apache-2.0 | jsDelivr CDN |
| MediaPipe Selfie Segmenter model (float16) | person mask | Apache-2.0 (per Google model card) | Google Storage |
| WebRTC, WebXR, WebGL, WebGPU | browser-native APIs | n/a | built into browsers |
| Google public STUN server | NAT discovery for the P2P link | free public service (no license) | `stun:stun.l.google.com:19302` |

No non-commercial code is used. REA was not installed or used.

## Testing done (Oct 12, 2026)
Headless Google Chrome was launched with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` at a 412×860 mobile viewport. Both models loaded (WASM path; no GPU in headless). The 3D view, the rotated view and Pepper's Ghost mode all rendered. **0 console errors and 0 page errors.** Screenshots: `test_screenshot_*.png`. Test script: `test.js` (puppeteer-core).

## Limits (honest)
This is 2.5D: a single camera only sees the front of a person, so the back is not captured. Monocular depth is relative, not metric. On older phones expect roughly 2–8 depth updates per second. The design deliberately uses a single commodity camera, browser-standard codecs and published open models. It is not a multi-camera, network-controlled capture rig.
