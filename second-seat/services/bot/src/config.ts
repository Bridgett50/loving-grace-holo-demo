const env = process.env;

function num(name: string, fallback: number): number {
  const v = env[name];
  const n = v === undefined || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: num("BOT_PORT", 4317),
  /** Shared secret the web app sends on every request. */
  serviceToken: env.BOT_SERVICE_TOKEN || "dev-local-token",
  /** HMAC key for content credentials. Replace with a C2PA X.509 signer in production. */
  credentialSecret: env.CONTENT_CREDENTIALS_SECRET || "dev-content-credentials-secret",
  demoMode: env.DEMO_MODE !== "false",
  dataDir: env.BOT_DATA_DIR || ".data",
  ratePerMinuteCents: num("RATE_PER_MINUTE_CENTS", 25),
  maxCapMinutes: num("MAX_SESSION_MINUTES", 60),
  defaultCapMinutes: num("DEFAULT_SESSION_MINUTES", 30),
  demoStartingBalanceCents: num("DEMO_STARTING_BALANCE_CENTS", 2000),
  tickMs: num("GUARD_TICK_MS", 250),

  llm: {
    baseUrl: env.LLM_BASE_URL || "",
    apiKey: env.LLM_API_KEY || "",
    model: env.LLM_MODEL || "gpt-4o-mini",
  },
  voice: {
    /** Self-hosted OpenVoice (MIT) worker; see docs/SETUP.md. */
    openVoiceUrl: env.OPENVOICE_URL || "",
  },
  avatar: {
    /** Self-hosted MuseTalk / LivePortrait worker (MIT code; check weights). */
    workerUrl: env.AVATAR_WORKER_URL || "",
  },
  livekit: {
    url: env.LIVEKIT_URL || "",
    apiKey: env.LIVEKIT_API_KEY || "",
    apiSecret: env.LIVEKIT_API_SECRET || "",
  },
  googleMeet: {
    /** Vexa (Apache-2.0) API used as the Google Meet fallback when the browser bot cannot join. */
    vexaApiUrl: env.VEXA_API_URL || "",
    vexaApiKey: env.VEXA_API_KEY || "",
    headless: env.MEET_BOT_HEADLESS !== "false",
  },
  zoom: {
    sdkKey: env.ZOOM_MEETING_SDK_KEY || "",
    sdkSecret: env.ZOOM_MEETING_SDK_SECRET || "",
    sdkVersion: env.ZOOM_MEETING_SDK_VERSION || "3.13.2",
  },
  teams: {
    tenantId: env.TEAMS_TENANT_ID || "",
    appId: env.TEAMS_BOT_APP_ID || "",
    appSecret: env.TEAMS_BOT_APP_SECRET || "",
    callbackUrl: env.TEAMS_CALLBACK_URL || "",
    /** Application-hosted media worker (.NET, Windows) for real-time video. Without it Teams is voice-only. */
    mediaWorkerUrl: env.TEAMS_MEDIA_WORKER_URL || "",
  },
  publicUrl: env.BOT_PUBLIC_URL || `http://localhost:${num("BOT_PORT", 4317)}`,
};

export type Config = typeof config;
