# Putting Second Seat online

The website and the bot service ship as **one container**. `scripts/start.sh` runs the bot on an internal port (4317) and the website on `$PORT`, and stops the container if either one exits so the host restarts both. The data (JSON stores and uploads) lives under `DATA_DIR`, which must be a persistent disk.

This is why it doesn't run on Vercel or another serverless host: the bot keeps live meeting sessions in memory and runs timers for the whole meeting.

## Public demo link (no paid keys)

The defaults in the Dockerfile and `render.yaml` give you a **public demo**: `DEMO_MODE=true` and `PUBLIC_DEMO=true`. Every visitor gets a private sandbox (their own twin, wallet, sessions and notes) through a cookie, and nobody can see anyone else's data. The demo needs no API keys.

### Render (recommended; about $7/month for the Starter plan plus a 1 GB disk)

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com), choose **New → Blueprint** and pick the repo. Render reads `render.yaml` at the repo root, which builds from the `second-seat/` folder and sets up one Docker web service, a 1 GB disk at `/data`, and generated secrets.
3. When it asks for `APP_URL`, enter the URL Render gives you (for example `https://second-seat.onrender.com`), or leave it blank for now.
4. Deploy. The health check at `/api/health` turns green once both the website and the bot are up.

### Any Docker host (Railway, Fly.io, a VPS)

```bash
cd second-seat
docker build -t second-seat .
docker run -p 4310:4310 -v second-seat-data:/data second-seat
```

On Railway or Fly, attach a volume at `/data`. The platform sets `PORT` and the container listens on it.

### Renaming the product

The product name lives in `apps/web/src/lib/brand.ts`, and you can override it with `NEXT_PUBLIC_PRODUCT_NAME` and `NEXT_PUBLIC_COMPANY_NAME`. These values are compiled into the website, so redeploy (rebuild) after changing them. On Render, set them as environment variables; they're passed to the Docker build automatically.

## Card payments (Stripe)

Customers buy minutes packs ($10, $25 or $50) on Stripe's hosted checkout, and the credit lands in their minutes wallet. Card details never touch this app.

1. In Stripe (start in **test mode**), go to Developers → API keys and copy the secret key into `STRIPE_SECRET_KEY`.
2. Go to Developers → Webhooks → **Add endpoint**:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`

   Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Redeploy. The **Add minutes** buttons appear in the wallet.

Each payment is credited exactly once. The webhook credits it, and the customer's return to the site is a backup if the webhook is late. Both are keyed to the Checkout Session id. The webhook rejects forged, stale, unpaid or amount-mismatched events.

Payments stay off while `PUBLIC_DEMO=true`, because visitor wallets there are sandboxes. **Don't switch to live keys until sign-in exists.** Without it, `DEMO_MODE=false` means every visitor shares one owner account.

## Production (real owners, real meetings)

Switching off demo mode turns this into the real product. It needs these first (details in [PLATFORM_APPROVALS.md](PLATFORM_APPROVALS.md)):

| Needed | Why |
| --- | --- |
| Sign-in (Auth.js, Clerk or similar) | Demo mode has no accounts. `currentUserId()` in `apps/web/src/lib/server/current-user.ts` is the one place to plug it in. |
| Identity + liveness vendor (`IDENTITY_PROVIDER`) | Only a verified person can create a twin of themselves. |
| Payments (Stripe) | Wallet top-ups are demo-only. |
| Voice + avatar GPU workers (`OPENVOICE_URL`, `AVATAR_WORKER_URL`) | Cloned voice and a talking avatar. Without them the twin uses demo voice and images. |
| Meeting platform approvals | Zoom Marketplace review, Teams admin consent and Graph calling, and a Google Workspace OAuth review. |
| A database | Swap the JSON stores for Postgres before you have more than a handful of users. |

Set `DEMO_MODE=false`, `PUBLIC_DEMO=false`, a strong `BOT_SERVICE_TOKEN` and `CONTENT_CREDENTIALS_SECRET`, and `APP_URL` to your real domain so OAuth redirects work.
