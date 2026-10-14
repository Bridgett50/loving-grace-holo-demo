# Meeting Twin - REA Feature Map & Gaps

Loving Grace product concept, Oct 14, 2026. Working names: Grace Presence, Ever Present, Proxy Me, Second Seat, Holo Twin.
Concept: one 3D scan of a consenting person creates a realistic, hologram-style twin that joins Zoom, Google Meet and Teams on its own (custom background), speaks in their voice, answers from their notes, takes notes and summarizes, auto-joins from the calendar, lets the person take over live, and always discloses it is a twin.

Method: REA (rea-agents 6.5.0, MIT) `import-reference-source` run locally on the box against openly licensed repos only. Closed competitors: public product pages/docs/pricing and public reviews only (no logins, no scraping). Prices and features change often; verify before relying on them. Not legal advice.

## 1. License check (what REA was allowed to study)
| Repo | License | Used? | Note |
|---|---|---|---|
| recallai/meeting-bot (example) | MIT | Yes | Tiny tutorial bot via Recall.ai API (the API itself is paid) |
| screenappai/meeting-bot | MIT | Yes | Playwright bots for Meet, Teams, Zoom; recording + upload |
| Vexa-ai/vexa | Apache-2.0 | Yes | Self-hosted meeting bots + real-time speaker transcripts + knowledge base |
| livekit/agents (+ avatar plug-ins: Tavus, Simli, Anam, Beyond Presence, bitHuman, LiveAvatar) | Apache-2.0 | Yes | Real-time voice/video agent pipeline |
| KlingAIResearch/LivePortrait | MIT (code) | Yes | Photo-to-animated portrait; check bundled face-detection model licenses (some non-commercial) |
| TMElyralab/MuseTalk | MIT (code) | Yes | Real-time lip-sync; check model weights' terms |
| OpenTalker/SadTalker | Apache-2.0 (with third-party exceptions) | Yes | Audio-driven talking head (older, slower) |
| myshell-ai/OpenVoice | MIT | Yes | Voice cloning, free commercial use |
| SWivid/F5-TTS | MIT code, CC-BY-NC models | Code only | Weights are non-commercial; need own/licensed weights |
| letmaik/pyvirtualcam, obsproject/obs-studio | GPL-2.0 | Studied only | Copyleft: keep as a separate process or avoid linking into closed code |
| attendee-labs/attendee | Elastic License 2.0 | SKIPPED | Not open source (cannot offer as hosted service) |
| ShenhanQian/GaussianAvatars | CC-BY-NC-SA + Toyota rights | SKIPPED | Non-commercial |
| fishaudio/fish-speech | Fish Audio Community License | SKIPPED | Custom, restrictive |

## 2. Function map (what we need, and where it comes from)
| # | Function | Open source to learn from / build on | Status |
|---|---|---|---|
| 1 | Join Zoom/Meet/Teams as a bot (headless browser) | screenappai/meeting-bot (GoogleMeetBot, ZoomBot, MicrosoftTeamsBot), Vexa | Available |
| 2 | Calendar auto-join (read invites, schedule bot) | Vexa scheduling ideas; Google/Microsoft calendar APIs | Partly; must build |
| 3 | Live transcript with speaker names | Vexa (real-time, speaker-attributed) | Available |
| 4 | Notes, summary, action items, follow-up email | Vexa knowledge-base agents + LLM | Available/build |
| 5 | Answer from the person's notes (private knowledge base, retrieval) | Vexa markdown KB; LiveKit agents + any RAG | Build |
| 6 | Turn-taking: hear, decide to speak, interrupt politely | LiveKit agents (VAD, turn detection) | Available |
| 7 | Speak in their voice (consented clone) | OpenVoice (MIT); commercial TTS as option | Available |
| 8 | Realistic talking face video in real time | MuseTalk, LivePortrait; paid LiveKit avatar plug-ins (Tavus, Simli, Anam, bitHuman) | Available (quality varies) |
| 9 | Hologram look: black/custom background, rim light, keyed edges | Own compositor; OBS concepts | Build |
| 10 | Publish video+audio INTO the meeting as a participant | Meeting bot injects a fake camera/mic in the browser; pyvirtualcam for desktop | Partly; hard part |
| 11 | Live takeover ("I'll take it from here") and whisper/coach mode | None found | MISSING - build |
| 12 | One 3D scan -> realistic avatar | Open options are non-commercial (GaussianAvatars) or 2D-only | MISSING for commercial use |
| 13 | Twin disclosure (name tag, spoken intro, on-screen badge) | None found | MISSING - build |
| 14 | Consent vault (signed likeness/voice release, revocation) | None found | MISSING - build |
| 15 | Watermark / content credentials (C2PA) on video and audio | C2PA open tools (separate study) | Build |
| 16 | Anti-impersonation: owner verification, liveness, per-meeting permission | None in these repos | MISSING - build |
| 17 | Guardrails: topics it may not answer, "I'll check with her" fallback | LLM policy layer | Build |
| 18 | Cost/failure safeguards: balance check, timeout, auto-refund | From the Pika lesson (see Holo Lab spec) | Build |
| 19 | Multi-language speech in/out | Whisper/OpenVoice support many languages | Available |
| 20 | Captions, accessibility | Transcript stream -> captions | Build (easy) |

## 3. Closed competitors (public pages and public reviews only)
| Product | What they offer (public) | Common public complaints |
|---|---|---|
| Pika AI Selves (Pika Labs) | AI self from a selfie; voice clone; joins Google Meet live (Zoom "soon"); phone number; token packs $7.99-$149.99 | Credits burned on failed sessions; experimental, unreliable; default-public profiles |
| HeyGen | Photo/video avatars, voice clone, translation; Interactive/streaming avatars; LiveAvatar API; meeting join via Zoom; plans from free/$29+ per month | Cost of credits; uncanny/stiff motion in live mode; latency |
| Tavus | Conversational Video Interface (real-time digital twins), "replicas" from a short video, API; per-minute pricing | Developer-only; per-minute costs add up; consent video required (a plus) |
| Synthesia | Studio-quality avatars for training video; personal avatars; enterprise focus; strong consent/moderation | Not live/real-time; pricey for custom avatars; corporate look |
| Zoom (avatars / AI Companion / custom avatars for clips) | Cartoon/3D avatars in meetings; AI Companion notes; custom AI avatar for recorded clips | Live avatars are cartoonish; realistic twin limited to async clips |
| Microsoft Teams (avatars, Copilot, Facilitator) | Mesh-style avatars, Copilot recap; interpreter agent with voice simulation | Avatars not photoreal; licensing cost |
| Others: D-ID (Agents), Soul Machines, Delphi (AI clones), Read.ai/Otter/Fireflies/Fathom (note bots), Recall.ai (bot API), Captions/Hedra | Pieces of the stack: note bots, clone chat, avatar video | Note bots: privacy pushback, "bot spam" in meetings; clones: hallucinations |
Gap no one fills well: a realistic, consented, disclosed twin that can LIVE-join all three platforms, answer from your notes, and hand back to you instantly.

## 4. What else she is not thinking about
1. Platform rules and approval. Zoom: bots must use the Meeting SDK, apps for others require Zoom Marketplace review; raw media needs approval. Teams: real-time media bots need Microsoft Graph Communications/Azure bot registration and tenant admin consent. Meet: no official bot API for joining as a participant; browser bots are a gray area and can break or be blocked. Plan for "host must admit" and recording-indicator rules.
2. Recording consent laws. About a dozen US states need all-party consent (e.g., California, Florida, Illinois, Maryland, Massachusetts, Montana, New Hampshire, Pennsylvania, Washington, Connecticut, Michigan-varies, Nevada for phone). Mississippi is one-party, but callers elsewhere change the rule. Default: announce and get consent from everyone; auto-post a notice in chat.
3. Likeness and voice rights. Tennessee ELVIS Act (2024) protects voice and likeness against AI cloning; California AB 2602/AB 1836 (digital replicas, deceased performers); New York digital-replica law; federal NO FAKES Act (proposed). Illinois BIPA treats face/voice prints as biometrics (written consent, retention policy, big penalties). Need written, revocable, scoped consent and estate rules for deceased persons.
4. Deepfake disclosure. EU AI Act transparency duties (2026) require disclosing AI-generated people; several US state laws on deceptive deepfakes (elections, fraud). Product must always label itself and never pretend to be the human.
5. Security. Biggest risk is impersonation fraud (e.g., the 2024 Hong Kong deepfake CFO video call that cost $25M). Need: verified owner identity (ID + liveness at scan), per-meeting authorization, an on-screen "Twin of ___ (AI)" badge, C2PA content credentials and invisible watermark, kill switch, audit log, encryption of scans and voice models, no export of raw models.
6. Business model. Real costs are per-minute (avatar rendering, voice, LLM). Avoid surprise charges: subscription with included minutes, hard caps, pre-session quote, auto-refund on failures. "No user fees" models (employer pays, sponsor pays, grant-funded pilots) are possible but still need cost controls; be careful with "free" claims.
7. Enterprise buyers. Need SSO, admin controls, data residency, SOC 2 (later), DPA, retention settings, IT approval of meeting bots, ability to block twins company-wide. Many companies ban note bots today.
8. Accessibility. A strong selling point: twin for people with speech, mobility, or chronic-illness limits; captions; screen-reader-friendly controls; WCAG 2.2 AA for the web app.
9. Multi-language. Real-time translation of the twin's speech is a differentiator; keep lip-sync matched; disclose translated speech.
10. Scan pipeline. Phone scan (video walk-around or selfie video) is cheap but lower quality; studio capture (multi-camera rig or LiDAR) gives "concert-real" quality. Most real-time systems actually drive a 2D/2.5D photoreal face from a short video; true 3D Gaussian avatars are mostly non-commercial research today. Offer tiers: phone (fast) and studio (premium).
11. Offline and latency. Live conversation needs under ~1 second end-to-end; GPU servers near users; fallback to voice-only or "notes-only" mode when the network is poor; graceful exit if video fails.
12. Liability. What the twin says can bind the person (promises, prices, legal statements). Need terms that limit authority, a "cannot agree to contracts" rule, logs, insurance (E&O/cyber), and incident response.
13. Trademark check on top names (quick public search, not a clearance): "PRESENCE" is a pending USPTO mark (Evers Inc.) for AI digital clones, so "Grace Presence" carries conflict risk. "SECOND ME" is registered (Mindverse AI) for AI digital identities; "Second Seat" is different in sound and meaning but a lawyer should check. "Ever Present" and "Proxy Me" are common phrases (weak, crowded). "Holo Twin" is descriptive (hard to protect). Run a full USPTO knockout search before filing.
14. Government / SBIR fit. SAM registration is active (allows federal awards). Fits: NSF SBIR (accessible human-AI presence, trustworthy AI), NIH SBIR (telehealth/caregiver presence, accessibility), DoD SBIR (secure identity-verified avatars, training), DHS S&T / DARPA SemaFor-related themes (deepfake detection and provenance). Pitch the safety layer (verified identity, watermarking, disclosure) as the innovation, not just the avatar.
15. Ethics/brand fit for Loving Grace. Memorial or deceased-person twins need extra care: estate consent, family approval, no live "meeting" use for deceased people without strict rules.

## 5. Top missing functions (priority)
1. Live takeover / coach mode. 2. Consent vault + verified owner + per-meeting permission. 3. Disclosure badge + C2PA watermark. 4. Commercial-safe scan-to-realistic-avatar. 5. Reliable media injection into Zoom/Teams via official SDKs. 6. Calendar auto-join with per-meeting rules. 7. Cost caps, timeouts, auto-refund.

## 6. Recommended name
Second Seat (by Loving Grace) - clear meaning ("your twin takes the second seat in the meeting"), meeting-specific, more distinctive than the others. Avoid "Grace Presence" because of the pending PRESENCE mark. Get a trademark attorney's knockout search (Class 9 and 42) before filing.

## 7. Next steps
- Prototype: Vexa (join + transcript) + LiveKit agents + OpenVoice + MuseTalk/LivePortrait or a paid avatar plug-in; Google Meet first, then Zoom via Meeting SDK, then Teams.
- Write consent/likeness release and disclosure text; legal review.
- Apply SBIR (NSF Project Pitch) framed around trustworthy, disclosed, verified digital presence.
