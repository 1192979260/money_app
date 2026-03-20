#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-all}"

cd "$ROOT_DIR"

echo "[restart] stopping old dev processes..."
pkill -f "pnpm dev:server|pnpm dev:mobile|@money-app/server start:dev|@money-app/mobile dev:h5|uni -p h5|vite.*5173|apps/server/dist/apps/server/src/main.js" >/dev/null 2>&1 || true
sleep 1

case "$MODE" in
  server)
    echo "[restart] starting server in foreground..."
    exec pnpm dev:server
    ;;
  mobile)
    echo "[restart] starting mobile in foreground..."
    exec pnpm dev:mobile
    ;;
  all)
    echo "[restart] starting server and mobile in foreground..."
    echo "[restart] tips: press Ctrl+C once to stop both"
    pnpm dev:server &
    SERVER_PID=$!
    pnpm dev:mobile &
    MOBILE_PID=$!

    cleanup() {
      echo
      echo "[restart] stopping server/mobile..."
      kill "$SERVER_PID" "$MOBILE_PID" >/dev/null 2>&1 || true
    }

    trap cleanup INT TERM
    wait "$SERVER_PID" "$MOBILE_PID"
    ;;
  *)
    echo "Usage: $0 [server|mobile|all]"
    exit 1
    ;;
esac
