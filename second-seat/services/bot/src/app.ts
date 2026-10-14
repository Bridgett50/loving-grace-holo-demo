import { Hono } from "hono";
import { cors } from "hono/cors";
import { verifyContentCredential, type ContentCredential } from "@second-seat/core";
import { detectPlatform } from "./adapters";
import { config } from "./config";
import type { StartSessionRequest } from "./session";
import { BotStore } from "./store";

export function createApp(store = new BotStore()) {
  const app = new Hono();
  app.use("*", cors());

  app.get("/health", (c) =>
    c.json({
      ok: true,
      demoMode: config.demoMode,
      providers: {
        llm: config.llm.baseUrl ? "openai-compatible" : "retrieval-only",
        voice: config.voice.openVoiceUrl ? "openvoice" : "demo",
        avatar: config.avatar.workerUrl ? "avatar-worker" : "demo",
        livekit: !!config.livekit.url,
      },
      platforms: {
        demo: true,
        google_meet: { browserBot: "requires playwright", fallback: config.googleMeet.vexaApiUrl ? "vexa" : "none" },
        zoom: !!(config.zoom.sdkKey && config.zoom.sdkSecret),
        teams: !!(config.teams.appId && config.teams.appSecret && config.teams.tenantId),
        teamsVideo: !!config.teams.mediaWorkerUrl,
      },
    }),
  );

  app.use("/v1/*", async (c, next) => {
    if (c.req.header("x-second-seat-token") !== config.serviceToken) return c.json({ error: "unauthorized" }, 401);
    await next();
  });

  app.get("/v1/wallets/:ownerId", (c) => c.json(store.wallet(c.req.param("ownerId"))));

  app.post("/v1/wallets/:ownerId/topup", async (c) => {
    const { amountCents } = await c.req.json<{ amountCents: number }>();
    if (!config.demoMode) return c.json({ error: "Top-ups go through the payment provider outside demo mode." }, 400);
    if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 100_00) return c.json({ error: "Invalid amount" }, 400);
    return c.json(store.topUp(c.req.param("ownerId"), amountCents));
  });

  app.post("/v1/wallets/:ownerId/credit", async (c) => {
    const { amountCents, ref } = await c.req.json<{ amountCents: number; ref: string }>();
    if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 1000_00) return c.json({ error: "Invalid amount" }, 400);
    if (typeof ref !== "string" || !/^[A-Za-z0-9_]{8,255}$/.test(ref)) return c.json({ error: "Invalid payment reference" }, 400);
    return c.json(store.credit(c.req.param("ownerId"), amountCents, ref));
  });

  app.post("/v1/sessions", async (c) => {
    const req = await c.req.json<StartSessionRequest>();
    if (!req?.twin?.id || !req.actorId || !req.meeting) return c.json({ error: "Invalid session request" }, 400);
    if (req.meeting.platform !== "demo") {
      const detected = req.meeting.joinUrl ? detectPlatform(req.meeting.joinUrl) : null;
      if (!detected) return c.json({ error: "Paste a Google Meet, Zoom or Microsoft Teams link." }, 400);
      req.meeting.platform = detected;
    }
    if (req.demoFault && !config.demoMode) req.demoFault = "none";
    const runner = await store.start(req);
    return c.json(runner.view(), 201);
  });

  app.get("/v1/owners/:ownerId/sessions", (c) => c.json(store.list(c.req.param("ownerId"))));

  app.get("/v1/sessions/:id", (c) => {
    const s = store.get(c.req.param("id"));
    return s ? c.json(s) : c.json({ error: "not found" }, 404);
  });

  const withRunner = (handler: (r: NonNullable<ReturnType<BotStore["runner"]>>, body: any) => Promise<unknown> | unknown) => async (c: any) => {
    const r = store.runner(c.req.param("id"));
    if (!r) return c.json({ error: "Session is not running" }, 409);
    const body = await c.req.json().catch(() => ({}));
    if (body.actorId !== r.req.twin.ownerId) return c.json({ error: "Only the twin's owner can control this session" }, 403);
    await handler(r, body);
    return c.json(r.view());
  };

  app.post("/v1/sessions/:id/takeover", withRunner((r, b) => r.setTakeover(!!b.on)));
  app.post("/v1/sessions/:id/coach", withRunner((r, b) => r.coach(String(b.text ?? "").slice(0, 500), b.kind === "say" ? "say" : "whisper")));
  app.post("/v1/sessions/:id/owner-says", withRunner((r, b) => r.ownerSays(String(b.text ?? "").slice(0, 500))));
  app.post(
    "/v1/sessions/:id/answer",
    withRunner((r, b) => (b.followUp ? r.deferQuestion(String(b.questionId)) : r.answerQuestion(String(b.questionId), String(b.text ?? "").trim().slice(0, 500)))),
  );
  app.post("/v1/sessions/:id/end", withRunner((r, b) => r.end(b.reason === "kill_switch" ? "kill_switch" : "owner_ended")));
  app.post(
    "/v1/sessions/:id/demo-say",
    withRunner((r, b) => {
      if (config.demoMode) r.demoSay(String(b.speaker || "Guest"), String(b.text ?? "").slice(0, 500));
    }),
  );

  app.post("/v1/owners/:ownerId/stop-all", async (c) => {
    const { reason } = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));
    const stopped = store.stopAll(c.req.param("ownerId"), reason === "consent_revoked" ? "consent_revoked" : "kill_switch");
    return c.json({ stopped });
  });

  app.post("/v1/credentials/verify", async (c) => {
    const { credential, asset } = await c.req.json<{ credential: ContentCredential; asset: string }>();
    return c.json(await verifyContentCredential(credential, asset, config.credentialSecret));
  });

  return app;
}
