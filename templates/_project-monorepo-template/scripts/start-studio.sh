#!/usr/bin/env bash
# Start the Evaluation Optimizer app on port 3001
# This is a companion app to the main CORA web app (port 3000)
#
# Usage:
#   ./scripts/start-opt.sh [--port PORT] [--build] [--type-check]
# Examples:
#   ./scripts/start-opt.sh
#   ./scripts/start-opt.sh --port 3001 --build
#
# See also: start-dev.sh for the main web app
set -euo pipefail

# Resolve script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PORT=3001
DO_BUILD=false
DO_TYPE_CHECK=true
SKIP_TYPE_CHECK=false
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
    --type-check)
      DO_TYPE_CHECK=true
      SKIP_TYPE_CHECK=false
      shift
      ;;
    --skip-type-check)
      SKIP_TYPE_CHECK=true
      DO_TYPE_CHECK=false
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--port PORT] [--build]"
      echo ""
      echo "Start the Evaluation Optimizer app (port 3001 by default)."
      echo "This is a companion app to the main web app."
      echo ""
      echo "Options:"
      echo "  --port PORT        Port number (default: 3001)"
      echo "  --build            Run pnpm build before starting"
      echo "  --type-check       Run TypeScript type checking before starting (default)"
      echo "  --skip-type-check  Skip type checking for faster startup"
      echo "  --help             Show this help"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1"
      echo "Usage: $0 [--port PORT] [--build]"
      exit 1
      ;;
  esac
done

echo "[start-opt] running from script dir: ${SCRIPT_DIR}"
echo "[start-opt] repository root: ${REPO_ROOT}"
echo "[start-opt] ensuring port ${PORT} is free..."

# find PIDs listening on the TCP port
PIDS=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)

if [[ -z "${PIDS}" ]]; then
  echo "[start-opt] no process listening on port ${PORT}"
else
  echo "[start-opt] found processes on port ${PORT}: ${PIDS}"
  for pid in ${PIDS}; do
    if [[ -z "${pid}" ]]; then
      continue
    fi
    echo "[start-opt] attempting graceful shutdown of PID ${pid} (SIGTERM)..."
    kill -15 "${pid}" 2>/dev/null || true
  done

  # wait up to WAIT_GRACE seconds for them to exit
  echo "[start-opt] waiting up to ${WAIT_GRACE}s for processes to exit..."
  SECONDS_PASSED=0
  while [[ ${SECONDS_PASSED} -lt ${WAIT_GRACE} ]]; do
    sleep 1
    SECONDS_PASSED=$((SECONDS_PASSED + 1))
    STILL=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)
    if [[ -z "${STILL}" ]]; then
      echo "[start-opt] port ${PORT} now free after ${SECONDS_PASSED}s"
      break
    fi
  done

  STILL=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)
  if [[ -n "${STILL}" ]]; then
    echo "[start-opt] processes still listening on ${PORT}: ${STILL}"
    echo "[start-opt] escalating to SIGKILL..."
    for pid in ${STILL}; do
      kill -9 "${pid}" 2>/dev/null || true
    done
    sleep 0.5
  fi

  # final check
  STILL=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)
  if [[ -n "${STILL}" ]]; then
    echo "[start-opt] ERROR: port ${PORT} remains in use by: ${STILL}"
    echo "[start-opt] aborting. You may need to inspect/kill those processes manually."
    exit 2
  fi
fi

# Change to repo root
cd "${REPO_ROOT}"

# Check and install dependencies if needed
check_and_install_dependencies() {
  if [ ! -d "${REPO_ROOT}/node_modules" ]; then
    echo "[start-opt] node_modules not found. Installing dependencies..."
    pnpm install
    if [ $? -ne 0 ]; then
      echo "[start-opt] ERROR: Failed to install dependencies"
      exit 1
    fi
    echo "[start-opt] ✅ Dependencies installed successfully"
  else
    echo "[start-opt] dependencies already installed"
  fi
}

# Install dependencies if needed
check_and_install_dependencies

# Ensure studio app has access to the same .env.local as the main web app
# Both apps share the same authentication configuration (Okta/Cognito)
ensure_env_symlink() {
  local studio_env="${REPO_ROOT}/apps/studio/.env.local"
  local web_env="${REPO_ROOT}/apps/web/.env.local"
  
  if [[ -L "$studio_env" ]]; then
    echo "[start-studio] .env.local symlink already exists"
  elif [[ -f "$studio_env" ]]; then
    echo "[start-studio] .env.local file already exists (not a symlink)"
  elif [[ -f "$web_env" ]]; then
    echo "[start-studio] creating .env.local symlink to ../web/.env.local"
    ln -s ../web/.env.local "$studio_env"
    echo "[start-studio] ✅ .env.local symlink created (shared auth config)"
  else
    echo "[start-studio] ⚠️  No .env.local found in apps/web/"
    echo "[start-studio] Please create apps/web/.env.local with your auth configuration"
    echo "[start-studio] See apps/web/.env.example for required variables"
  fi
}

# Ensure environment symlink exists
ensure_env_symlink

# Check if shared packages need building (dist/ folders missing)
check_and_build_packages() {
  local needs_build=false
  local packages_to_check=("api-client" "shared-types" "contracts")
  
  for pkg in "${packages_to_check[@]}"; do
    local pkg_dir="${REPO_ROOT}/packages/${pkg}"
    if [[ -d "$pkg_dir" && -f "$pkg_dir/package.json" ]]; then
      local main_path=$(grep -o '"main"[[:space:]]*:[[:space:]]*"[^"]*"' "$pkg_dir/package.json" | grep -o '"[^"]*"$' | tr -d '"')
      if [[ "$main_path" == dist/* && ! -d "$pkg_dir/dist" ]]; then
        echo "[start-studio] Package '${pkg}' needs building (dist/ missing)"
        needs_build=true
      fi
    fi
  done
  
  if [[ "$needs_build" == "true" ]]; then
    echo "[start-studio] Building shared packages (first-time setup)..."
    pnpm -r --filter './packages/*' run build 2>&1 || {
      echo "[start-studio] ⚠️  Some packages failed to build. This may cause import errors."
      echo "[start-studio] Try running 'pnpm build' manually to see detailed errors."
    }
    echo "[start-studio] ✅ Shared packages built"
  fi
}

# Build shared packages if needed
check_and_build_packages

if [[ "${DO_BUILD}" == "true" ]]; then
  echo "[start-studio] running pnpm build..."
  pnpm build
elif [[ "${DO_TYPE_CHECK}" == "true" && "${SKIP_TYPE_CHECK}" == "false" ]]; then
  echo "[start-studio] running TypeScript type check (use --skip-type-check to bypass)..."
  pnpm -r run type-check 2>&1 || {
    echo "[start-studio] ⚠️  Type errors found. Run 'pnpm build' for details."
    echo "[start-studio] Starting dev server anyway (type errors may cause issues)..."
  }
elif [[ "${SKIP_TYPE_CHECK}" == "true" ]]; then
  echo "[start-studio] skipping type check (--skip-type-check flag)"
fi

echo "[start-studio] starting studio app on port ${PORT}..."
# Override NEXTAUTH_URL to use the correct port for studio app
# The shared .env.local has port 3000 (main app), but studio needs its own port
export NEXTAUTH_URL="http://localhost:${PORT}"
echo "[start-studio] NEXTAUTH_URL set to ${NEXTAUTH_URL}"

# Use pnpm filter to run only the studio app
PORT="${PORT}" exec pnpm --filter "**/studio" dev
