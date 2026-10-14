# License audit

Policy: ship only permissively licensed code (MIT, Apache-2.0, BSD, ISC). No GPL or AGPL code is linked into the product. No model weights may carry a non-commercial restriction. No code or assets are copied from Pika or any other competitor. All brand art and copy in this repo are original. The sample twin images in `apps/web/public/samples/` were generated for this project. The stylized character follows Bridgett's own AI-self reference (`docs/reference/` in the GitHub repo) as art direction only: no Pika image, UI or code is included. The realistic sample shows a fictional person.

This repo's own code is Apache-2.0.

## npm dependencies (`pnpm licenses:scan`)

| License | Packages |
| --- | --- |
| MIT | 558 |
| ISC | 26 |
| Apache-2.0 | 24 |
| BSD-2-Clause / BSD-3-Clause | 19 |
| BlueOak-1.0.0, 0BSD, CC0-1.0, Python-2.0, MIT OR CC0-1.0 | a handful |

These need a note, but none of them blocks shipping:

| Package | License | Why it's acceptable |
| --- | --- | --- |
| `lightningcss`, `axe-core` (and `@vercel/og`, vendored inside Next) | MPL-2.0 | File-level copyleft. We use them unmodified, as build-time or dev tooling. |
| `@img/sharp-libvips-*` | LGPL-3.0-or-later | A prebuilt shared library that `sharp` loads dynamically (it comes with Next's image optimizer). It isn't modified or statically linked, so the LGPL relinking terms are met. |
| `caniuse-lite` | CC-BY-4.0 | Browser-support data used at build time. Attribution is given here. |

**No GPL or AGPL packages were found.** Re-run the scan before each release:

```bash
pnpm licenses:scan   # exits non-zero on GPL/AGPL/non-commercial licences
```

## Runtime components (not bundled; self-hosted or fetched at runtime)

| Component | Use | Code license | Weights / notes |
| --- | --- | --- | --- |
| LiveKit server + Agents | Media transport | Apache-2.0 | n/a |
| Playwright (optional) | Google Meet browser bot | Apache-2.0 | Chromium is BSD-3 |
| Vexa | Google Meet fallback (listen-only) | Apache-2.0 | Self-host or hosted API |
| ScreenApp meeting-bot | Reference for the browser-bot approach | MIT | Studied only; no code copied |
| OpenVoice V2 | Voice cloning | MIT | V2 checkpoints are MIT (commercial use allowed since April 2024). Don't use V1 weights, which had a different licence. |
| MeloTTS | Base TTS for OpenVoice | MIT | MIT |
| MuseTalk | Lip-sync | MIT | MuseTalk weights allow commercial use, but its pipeline pulls third-party models. **Verify each one:** `sd-vae-ft-mse` (MIT on Hugging Face), Whisper tiny (MIT), DWPose (Apache-2.0), face-parse BiSeNet (MIT), and the S3FD face detector weights (**check the source you download from**). |
| LivePortrait | Head and expression animation from the owner's photo or video | MIT | **Caution:** the default face detector and landmarker come from **InsightFace, whose models are non-commercial**. Replace them with MediaPipe Face Landmarker (Apache-2.0) or another commercially licensed detector before production. |
| Zoom Meeting SDK | Zoom joins | Proprietary (Zoom SDK terms) | Loaded from Zoom's CDN at runtime and never vendored. Use is governed by your Zoom Marketplace app agreement. |
| Microsoft Graph Communications / `Microsoft.Skype.Bots.Media` | Teams calling and video | Samples are MIT; the media library is proprietary (Microsoft terms) | Runs in the separate Windows media worker |
| C2PA SDK (`c2pa-rs`, `c2pa-node`) | Production content credentials | MIT / Apache-2.0 | Needs an X.509 signing certificate |

## Explicitly excluded

| Component | Reason |
| --- | --- |
| XTTS / Coqui TTS models | Coqui Public Model License (non-commercial) |
| F5-TTS pretrained weights | CC-BY-NC-4.0 |
| Fish-Speech weights | CC-BY-NC-SA-4.0 |
| GaussianAvatars, most NeRF/3DGS head-avatar research weights | Non-commercial research licences |
| InsightFace models (buffalo_l, etc.) | Non-commercial |
| Wav2Lip | Its weights are for research or non-commercial use only |
| SadTalker | Uses non-commercial third-party face models |
| Recall.ai-style SaaS bot code, Pika or other competitor assets | Not open source; must not be copied |
| attendee (meeting bot) | Elastic License 2.0, which is not OSI open source |
| pyvirtualcam, v4l2loopback tooling, OBS | GPL. We use an in-page `getUserMedia` shim instead of a virtual camera driver. |

## Checklist for adding a model or package

1. Read the licence for the **code** and, separately, for the **weights** and any models the code downloads at runtime.
2. Reject anything with NC, research-only, RAIL use-restriction clauses we can't comply with, or a GPL or AGPL licence that would be linked into our code.
3. Record it in the table above, in the same PR.
