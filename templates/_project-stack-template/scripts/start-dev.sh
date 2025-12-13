#!/usr/bin/env bash
# Idempotent helper to free up PORT (default 3000), verify it's free, optionally build, then start Next.js dev.
# Usage:
#   ./scripts/start-dev.sh [--port PORT] [--build]
# Examples:
#   ./scripts/start-dev.sh
#   ./scripts/start-dev.sh --port 3000 --build
#
# Behavior:
#  - Finds processes listening on the port and attempts graceful shutdown (SIGTERM).
#  - Waits up to 8s for processes to exit, then escalates to SIGKILL if needed.
#  - Verifies the port is free before starting the dev server.
#  - Changes into the repository root (script is location-aware) and optionally runs `pnpm build` before `pnpm dev`.
#  - Runs `pnpm dev` in the foreground (so you can see logs); use Ctrl-C to stop.
set -euo pipefail

# Resolve script directory and repository root so the script is idempotent no matter where it's invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PORT=3000
DO_BUILD=false
WAIT_GRACE=8

# simple arg parsing
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"
      shift 2
      ;;
    --build)
      DO_BUILD=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--port PORT] [--build]"
      echo ""
      echo "Start the Next.js dev server, ensuring the port is free first."
      echo ""
      echo "Options:"
      echo "  --port PORT    Port number (default: 3000)"
      echo "  --build        Run pnpm build before starting dev server"
      echo "  --help         Show this help"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1"
      echo "Usage: $0 [--port PORT] [--build]"
      exit 1
      ;;
  esac
done

echo "[start-dev] running from script dir: ${SCRIPT_DIR}"
echo "[start-dev] repository root: ${REPO_ROOT}"
echo "[start-dev] ensuring port ${PORT} is free..."

# find PIDs listening on the TCP port
PIDS=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)

if [[ -z "${PIDS}" ]]; then
  echo "[start-dev] no process listening on port ${PORT}"
else
  echo "[start-dev] found processes on port ${PORT}: ${PIDS}"
  for pid in ${PIDS}; do
    if [[ -z "${pid}" ]]; then
      continue
    fi
    echo "[start-dev] attempting graceful shutdown of PID ${pid} (SIGTERM)..."
    kill -15 "${pid}" 2>/dev/null || true
  done

  # wait up to WAIT_GRACE seconds for them to exit
  echo "[start-dev] waiting up to ${WAIT_GRACE}s for processes to exit..."
  SECONDS_PASSED=0
  while [[ ${SECONDS_PASSED} -lt ${WAIT_GRACE} ]]; do
    sleep 1
    SECONDS_PASSED=$((SECONDS_PASSED + 1))
    STILL=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)
    if [[ -z "${STILL}" ]]; then
      echo "[start-dev] port ${PORT} now free after ${SECONDS_PASSED}s"
      break
    fi
  done

  STILL=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)
  if [[ -n "${STILL}" ]]; then
    echo "[start-dev] processes still listening on ${PORT}: ${STILL}"
    echo "[start-dev] escalating to SIGKILL..."
    for pid in ${STILL}; do
      kill -9 "${pid}" 2>/dev/null || true
    done
    sleep 0.5
  fi

  # final check
  STILL=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)
  if [[ -n "${STILL}" ]]; then
    echo "[start-dev] ERROR: port ${PORT} remains in use by: ${STILL}"
    echo "[start-dev] aborting. You may need to inspect/kill those processes manually."
    exit 2
  fi
fi

# Change to repo root so the script can be run from anywhere
cd "${REPO_ROOT}"

if [[ "${DO_BUILD}" == "true" ]]; then
  echo "[start-dev] running pnpm build..."
  pnpm build
fi

echo "[start-dev] starting dev server on port ${PORT}..."
# Use exec so the script forwards signals to the dev server process
# Note: Don't use -- separator as it gets passed literally to next dev
PORT="${PORT}" exec pnpm dev
