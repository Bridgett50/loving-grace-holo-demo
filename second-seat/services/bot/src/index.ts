import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { config } from "./config";

const app = createApp();

serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Second Seat bot service on http://localhost:${info.port} (demo mode: ${config.demoMode})`);
});
