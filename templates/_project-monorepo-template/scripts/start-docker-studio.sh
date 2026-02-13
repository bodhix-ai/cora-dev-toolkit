#!/usr/bin/env bash
# Start the studio app in Docker container (equivalent to start-studio.sh but using Docker)
# Usage:
#   ./scripts/start-docker-studio.sh [--port PORT] [--rebuild]
# Examples:
#   ./scripts/start-docker-studio.sh
#   ./scripts/start-docker-studio.sh --port 3001 --rebuild
set -euo pipefail

# Resolve script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PORT=3001
DO_REBUILD=false
CONTAINER_NAME="{{PROJECT_NAME}}-studio-dev"
IMAGE_NAME="{{PROJECT_NAME}}-studio"
IMAGE_TAG="local"
WAIT_GRACE=8

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"
      shift 2
      ;;
    --rebuild)
      DO_REBUILD=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--port PORT] [--rebuild]"
      echo ""
      echo "Start the studio app in Docker container for local testing."
      echo ""
      echo "Options:"
      echo "  --port PORT    Port number (default: 3001)"
      echo "  --rebuild      Rebuild Docker image before starting"
      echo "  --help         Show this help"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1"
      echo "Usage: $0 [--port PORT] [--rebuild]"
      exit 1
      ;;
  esac
done

echo "[start-docker-studio] starting Docker studio server on port ${PORT}..."
echo "[start-docker-studio] repository root: ${REPO_ROOT}"

# Change to repo root
cd "${REPO_ROOT}"

# Free up the port
echo "[start-docker-studio] ensuring port ${PORT} is free..."
PIDS=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)

if [[ -n "${PIDS}" ]]; then
  echo "[start-docker-studio] found processes on port ${PORT}: ${PIDS}"
  for pid in ${PIDS}; do
    if [[ -z "${pid}" ]]; then
      continue
    fi
    echo "[start-docker-studio] terminating PID ${pid}..."
    kill -15 "${pid}" 2>/dev/null || true
  done
  
  # Wait for processes to exit
  echo "[start-docker-studio] waiting up to ${WAIT_GRACE}s for processes to exit..."
  SECONDS_PASSED=0
  while [[ ${SECONDS_PASSED} -lt ${WAIT_GRACE} ]]; do
    sleep 1
    SECONDS_PASSED=$((SECONDS_PASSED + 1))
    STILL=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)
    if [[ -z "${STILL}" ]]; then
      echo "[start-docker-studio] port ${PORT} now free"
      break
    fi
  done
  
  # Force kill if needed
  STILL=$(lsof -tiTCP:${PORT} -sTCP:LISTEN -Pn || true)
  if [[ -n "${STILL}" ]]; then
    echo "[start-docker-studio] escalating to SIGKILL..."
    for pid in ${STILL}; do
      kill -9 "${pid}" 2>/dev/null || true
    done
    sleep 0.5
  fi
fi

# Stop and remove existing container
echo "[start-docker-studio] stopping existing container (if any)..."
docker stop "${CONTAINER_NAME}" 2>/dev/null || true
docker rm "${CONTAINER_NAME}" 2>/dev/null || true

# Build image if requested or if it doesn't exist
if [[ "${DO_REBUILD}" == "true" ]] || ! docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" &>/dev/null; then
  echo "[start-docker-studio] building Docker image..."
  docker build -f Dockerfile.studio -t "${IMAGE_NAME}:${IMAGE_TAG}" .
  echo "[start-docker-studio] ✅ Docker image built"
else
  echo "[start-docker-studio] using existing Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
fi

# Check for .env.local (studio shares the same .env.local as web)
if [[ ! -f "apps/web/.env.local" ]]; then
  echo "[start-docker-studio] ⚠️  No .env.local found in apps/web/"
  echo "[start-docker-studio] Please create apps/web/.env.local with your configuration"
  echo "[start-docker-studio] See apps/web/.env.example for required variables"
  exit 1
fi

# Start container with NEXTAUTH_URL override for studio port
echo "[start-docker-studio] starting Docker container..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${PORT}:3001" \
  --env-file apps/web/.env.local \
  -e NEXTAUTH_URL="http://localhost:${PORT}" \
  "${IMAGE_NAME}:${IMAGE_TAG}"

# Wait for startup
echo "[start-docker-studio] waiting for container to start..."
sleep 3

# Show logs
echo "[start-docker-studio] ===== Container Logs ====="
docker logs "${CONTAINER_NAME}"
echo "[start-docker-studio] =========================="

# Check if container is running
if docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" | grep -q "${CONTAINER_NAME}"; then
  echo "[start-docker-studio] ✅ Container running on http://localhost:${PORT}"
  echo "[start-docker-studio]"
  echo "[start-docker-studio] To view logs: docker logs -f ${CONTAINER_NAME}"
  echo "[start-docker-studio] To stop: docker stop ${CONTAINER_NAME}"
  echo "[start-docker-studio] To remove: docker rm ${CONTAINER_NAME}"
else
  echo "[start-docker-studio] ❌ Container failed to start"
  docker logs "${CONTAINER_NAME}" 2>&1 | tail -50
  exit 1
fi