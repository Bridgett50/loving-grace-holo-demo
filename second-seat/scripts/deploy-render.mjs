#!/usr/bin/env node
// One-shot, re-runnable deploy of Second Seat to Render, with Stripe test-mode payments.
//
//   RENDER_API_KEY=... STRIPE_SECRET_KEY=sk_test_... LLM_API_KEY=... \
//     node scripts/deploy-render.mjs --owner "MoJa's workspace" --repo https://github.com/Bridgett50/loving-grace-holo-demo \
//       --branch main --root-dir second-seat --domain app.lovinggracetechnologies.com
//
// Steps (each skipped if already done): find the workspace, create the web service + 1 GB disk,
// set env vars, create the Stripe webhook, deploy, wait until live, add the custom domain, and
// print the DNS record to add at the registrar.

import { randomBytes } from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const NAME = args.name ?? "second-seat";
const OWNER = args.owner;
const REPO = args.repo ?? "https://github.com/Bridgett50/loving-grace-holo-demo";
const BRANCH = args.branch ?? "main";
const ROOT_DIR = args["root-dir"] ?? "";
const DOMAIN = args.domain;
const REGION = args.region ?? "oregon";
const PLAN = args.plan ?? "starter";

const { RENDER_API_KEY, STRIPE_SECRET_KEY, LLM_API_KEY } = process.env;
if (!RENDER_API_KEY) throw new Error("RENDER_API_KEY is required");
if (STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.startsWith("sk_test_") && !args["allow-live"]) {
  throw new Error("Refusing a live Stripe key before sign-in exists. Use an sk_test_ key (or pass --allow-live true).");
}

const log = (...m) => console.log("•", ...m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function render(path, init = {}) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${RENDER_API_KEY}`, accept: "application/json", "content-type": "application/json", ...init.headers },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Render ${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  return body;
}

async function stripe(path, form) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: form ? "POST" : "GET",
    headers: { authorization: `Bearer ${STRIPE_SECRET_KEY}`, ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form) : undefined,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path} → ${res.status}: ${body.error?.message}`);
  return body;
}

// 1. Workspace
const owners = (await render("/owners?limit=100")).map((o) => o.owner);
log("Workspaces:", owners.map((o) => `${o.name} (${o.id})`).join(", "));
const owner = OWNER ? owners.find((o) => o.name === OWNER || o.id === OWNER) : owners.length === 1 ? owners[0] : null;
if (!owner) throw new Error(`Pick a workspace with --owner. Found: ${owners.map((o) => o.name).join(", ")}`);

// 2. Service (+ disk)
const existing = (await render(`/services?name=${encodeURIComponent(NAME)}&ownerId=${owner.id}&limit=20`)).map((s) => s.service);
let service = existing.find((s) => s.name === NAME);
const baseEnv = [
  { key: "DEMO_MODE", value: "true" },
  { key: "PUBLIC_DEMO", value: "true" },
  { key: "DATA_DIR", value: "/data" },
  { key: "AUTO_JOIN_SCHEDULER", value: "false" },
  { key: "NEXT_PUBLIC_PRODUCT_NAME", value: "Second Seat" },
  { key: "NEXT_PUBLIC_COMPANY_NAME", value: "Loving Grace" },
  { key: "BOT_SERVICE_TOKEN", value: randomBytes(24).toString("hex") },
  { key: "CONTENT_CREDENTIALS_SECRET", value: randomBytes(32).toString("hex") },
  ...(LLM_API_KEY ? [{ key: "LLM_BASE_URL", value: "https://api.openai.com/v1" }, { key: "LLM_API_KEY", value: LLM_API_KEY }, { key: "LLM_MODEL", value: args.model ?? "gpt-4o-mini" }] : []),
  ...(STRIPE_SECRET_KEY ? [{ key: "STRIPE_SECRET_KEY", value: STRIPE_SECRET_KEY }] : []),
];

if (!service) {
  log(`Creating web service "${NAME}" in ${owner.name} from ${REPO}@${BRANCH}${ROOT_DIR ? ` (${ROOT_DIR}/)` : ""}`);
  const created = await render("/services", {
    method: "POST",
    body: {
      type: "web_service",
      name: NAME,
      ownerId: owner.id,
      repo: REPO,
      branch: BRANCH,
      ...(ROOT_DIR ? { rootDir: ROOT_DIR } : {}),
      autoDeploy: "yes",
      envVars: baseEnv,
      serviceDetails: {
        runtime: "docker",
        plan: PLAN,
        region: REGION,
        healthCheckPath: "/api/health",
        disk: { name: `${NAME}-data`, mountPath: "/data", sizeGB: 1 },
        envSpecificDetails: { dockerfilePath: "./Dockerfile", dockerContext: "." },
      },
    },
  });
  service = created.service ?? created;
} else {
  log(`Service exists: ${service.id}. Updating keys only (generated secrets kept).`);
  for (const v of baseEnv.filter((e) => ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL", "STRIPE_SECRET_KEY"].includes(e.key))) {
    await render(`/services/${service.id}/env-vars/${v.key}`, { method: "PUT", body: { value: v.value } });
  }
}
const onRender = service.serviceDetails?.url ?? `https://${NAME}.onrender.com`;
log("Service:", service.id, onRender);

// 3. APP_URL (Checkout/OAuth return address) and the Stripe webhook
const appUrl = args["app-url"] ?? onRender;
await render(`/services/${service.id}/env-vars/APP_URL`, { method: "PUT", body: { value: appUrl } });
if (STRIPE_SECRET_KEY) {
  const hookUrl = `${appUrl}/api/stripe/webhook`;
  const hooks = (await stripe("/webhook_endpoints?limit=100")).data;
  const ours = hooks.find((h) => h.description === "Second Seat minutes credit" && h.status === "enabled");
  if (ours && ours.url !== hookUrl) {
    // Moving the URL keeps the signing secret already stored on Render valid.
    await stripe(`/webhook_endpoints/${ours.id}`, { url: hookUrl });
    log("Stripe webhook moved to:", hookUrl);
  } else if (!ours) {
    const hook = await stripe("/webhook_endpoints", {
      url: hookUrl,
      "enabled_events[0]": "checkout.session.completed",
      "enabled_events[1]": "checkout.session.async_payment_succeeded",
      description: "Second Seat minutes credit",
    });
    await render(`/services/${service.id}/env-vars/STRIPE_WEBHOOK_SECRET`, { method: "PUT", body: { value: hook.secret } });
    log("Stripe webhook created:", hookUrl);
  } else log("Stripe webhook already exists:", hookUrl);
}

// 4. Deploy and wait
const deploy = await render(`/services/${service.id}/deploys`, { method: "POST", body: { clearCache: "do_not_clear" } });
log("Deploy started:", deploy.id);
for (let i = 0; i < 120; i++) {
  const d = await render(`/services/${service.id}/deploys/${deploy.id}`);
  if (d.status === "live") {
    log("Deploy is live.");
    break;
  }
  if (["build_failed", "update_failed", "canceled", "deactivated", "pre_deploy_failed"].includes(d.status)) {
    throw new Error(`Deploy ${d.status}. Check logs: https://dashboard.render.com/web/${service.id}/deploys/${deploy.id}`);
  }
  if (i % 4 === 0) log("…", d.status);
  await sleep(15_000);
}
const health = await fetch(`${onRender}/api/health`).then((r) => r.json()).catch((e) => ({ error: String(e) }));
log("Health:", JSON.stringify(health));

// 5. Custom domain + DNS record
if (DOMAIN) {
  const domains = await render(`/services/${service.id}/custom-domains?limit=20`);
  if (!domains.some((d) => (d.customDomain ?? d).name === DOMAIN)) {
    await render(`/services/${service.id}/custom-domains`, { method: "POST", body: { name: DOMAIN } });
    log("Custom domain added:", DOMAIN);
  }
  const host = DOMAIN.split(".").length > 2 ? DOMAIN.split(".")[0] : "@";
  console.log(`\nAdd this DNS record at the registrar:\n  Type: CNAME   Host: ${host}   Data: ${new URL(onRender).host}   TTL: default\n`);
  console.log(`After it resolves, re-run with --app-url https://${DOMAIN} so Stripe and redirects use the custom domain.`);
}
