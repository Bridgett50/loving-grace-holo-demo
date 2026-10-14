#!/usr/bin/env sh
# Production entrypoint: runs the bot service on an internal port and the web app on $PORT.
# Either process exiting stops the container so the host restarts both together.
set -eu

cd "$(dirname "$0")/.."

export BOT_PORT="${BOT_PORT:-4317}"
export BOT_SERVICE_URL="${BOT_SERVICE_URL:-http://127.0.0.1:${BOT_PORT}}"
export PORT="${PORT:-4310}"

if [ -n "${DATA_DIR:-}" ]; then
  export WEB_DATA_DIR="${WEB_DATA_DIR:-$DATA_DIR/web}"
  export BOT_DATA_DIR="${BOT_DATA_DIR:-$DATA_DIR/bot}"
  mkdir -p "$WEB_DATA_DIR" "$BOT_DATA_DIR"
fi

pnpm --filter @second-seat/bot start &
BOT_PID=$!

pnpm --filter @second-seat/web start &
WEB_PID=$!

trap 'kill "$BOT_PID" "$WEB_PID" 2>/dev/null || true' INT TERM

while kill -0 "$BOT_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do
  sleep 2
done

kill "$BOT_PID" "$WEB_PID" 2>/dev/null || true
exit 1
