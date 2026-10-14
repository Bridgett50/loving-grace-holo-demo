# Loving Grace Holo Lab: One-Tap Realistic Hologram Presence (Prototype Spec)

Goal: one tap puts a clean, lifelike person on a hologram display, the way holographic concerts look (full-color, smooth, real video), not blocky or cartoon 3D.

## Look: how to get "concert-real", not blocky
- Use photoreal video of the person (lip-sync talking-head or half-body video), not a game-style 3D mesh.
- Pure black background, keyed edges, soft rim light; black = invisible on Pepper's-ghost and LED fan displays, so the person seems to float.
- 1080p+ at 30 fps minimum; 60 fps for LED fans. Match display brightness; slight bloom/glow, no hard outline.
- Concert method = Pepper's ghost (angled transparent film reflecting a bright screen). Kiosk version: 45-degree glass box. Large version: holographic fan or transparent LED.

## One-tap flow
1. Tap "Go Live" on the Holo Lab page/kiosk.
2. System runs pre-flight silently: consent on file, balance >= session cap, avatar + voice ready, room created.
3. Countdown 3-2-1; presence appears and greets.
4. Tap again (or say "goodbye") to end. Receipt shows minutes and cost.
Modes: Live (real-time talking presence via LiveKit + avatar vendor) and Recorded (pre-rendered message clips via lip-sync model, cheapest and most reliable for memorial/tribute use).

## Architecture
Kiosk browser (LiveKit components) <- LiveKit room <- Agent worker (STT -> LLM persona -> TTS) + Avatar worker (publishes video) -> HDMI to hologram display. Persona file: identity / tone / facts / limits.

## Consent and likeness checklist (required before any session)
- [ ] Written consent from the person (or estate/legal next-of-kin for someone deceased), signed and dated, stored.
- [ ] Who may view, where it may be shown, for how long; revocation path.
- [ ] Source photos/video/voice owned or licensed; voice cloning specifically approved.
- [ ] No minors' likeness without guardian consent; no impersonation of living public figures.
- [ ] Visible "AI presence" label on screen and in any recording.
- [ ] Topics the presence must not discuss (medical, legal, financial advice; private family matters).
- [ ] Data retention: delete voice clones/source media on request; vendor terms checked (no training on her media).

## Failure safeguards (from the Apr 11 Pika failure)
- Balance check BEFORE connecting: estimated cost (minutes x rate) must be covered plus buffer; otherwise do not start.
- Hard session cap (e.g., 10 min or $X), user-visible.
- Ready means real: session is "live" only after the first video frame AND first audio packet arrive in the room (room name must exist).
- No-video timeout: if no video within 20 s, auto-stop, release all workers, mark failed.
- Auto-refund: failed or under-30-second sessions are not billed / credits returned automatically, with a logged reason.
- Silence watchdog: avatar connected but silent for 15 s -> one retry, then stop and refund.
- Session log (id, room, timestamps, frames, cost) kept for support.
- Graceful fallback: if live fails, offer the Recorded clip instead.

## Prototype milestones
1. Recorded mode on glass box (1 week). 2. Live mode on laptop screen via LiveKit (1-2 weeks). 3. Live on hologram display with safeguards (1 week). 4. Consent intake form + admin log.
