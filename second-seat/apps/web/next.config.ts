import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// The web app and bot share one .env at the repo root; values already in the environment win.
const rootEnv = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  // Next dev only serves its client runtime to localhost by default; without this, opening the app
  // at 127.0.0.1 or a LAN IP renders but never hydrates, so buttons do nothing.
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.local", "192.168.*.*", "10.*.*.*"],
  transpilePackages: ["@second-seat/core"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
