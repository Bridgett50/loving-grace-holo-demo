FROM node:22-slim

ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY services/bot/package.json services/bot/
RUN pnpm install --frozen-lockfile

COPY . .
# NEXT_PUBLIC_* values are compiled into the build, so a rename needs a rebuild.
ARG NEXT_PUBLIC_PRODUCT_NAME
ARG NEXT_PUBLIC_COMPANY_NAME
RUN pnpm --filter @second-seat/web build

ENV NODE_ENV=production \
    PORT=4310 \
    DATA_DIR=/data \
    DEMO_MODE=true \
    PUBLIC_DEMO=true

VOLUME ["/data"]
EXPOSE 4310

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4310)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "scripts/start.sh"]
