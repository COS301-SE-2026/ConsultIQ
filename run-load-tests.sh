#!/bin/bash
# ==========================================================================
# NFR evidence runner.
#
# Phases:
#   1. full                -> blended read/write/auth load
#   2. match_run_isolated  -> NFR4 match-run latency at 200 profiles, no contention
#   3. match_run_burst     -> queue backpressure under concurrent match-run enqueues
#   4. pool_stress         -> connection pool behavior above its configured size
#   5. cache_warmcold      -> Redis cache warm-vs-cold + invalidation-on-write
#
# Each phase's raw k6 output is saved under ./load-test-results/<timestamp>/
# ==========================================================================
set -e

ROOT_DIR=$(pwd)
BACKEND_DIR="./backend"
RESULTS_DIR="${ROOT_DIR}/load-test-results/$(date +%Y%m%d-%H%M%S)"
SERVER_PID=""
PORT="${PORT:-3000}"

mkdir -p "$RESULTS_DIR"
echo "Results will be saved to: $RESULTS_DIR"

# ==========================================
# 1. Cleanup Hook  (Teardown)
# ==========================================
cleanup() {
  echo -e "\n [Cleanup] Tearing down performance test environment..."
  if [[ -n "$SERVER_PID" ]]; then
    echo "Stopping NestJS server process group (PID: $SERVER_PID)..."
    kill -- -"$SERVER_PID" 2>/dev/null || true
  fi

  PORT_PID=$(lsof -ti tcp:"$PORT" || true)
  if [[ -n "$PORT_PID" ]]; then
    echo "Killing leftover process on port $PORT (PID: $PORT_PID)"
    kill -9 $PORT_PID || true
  fi

  echo "Cleaning testing database..."
  cd "$BACKEND_DIR"
  DATABASE_URL="$TEST_DB_URL" npx --no-install ts-node prisma/prisma-test-utils.ts
  cd "$ROOT_DIR"
  
  echo "[Cleanup] Complete. Evidence saved under: $RESULTS_DIR"
}

trap cleanup EXIT

# ==========================================
# 2. Environment Setup & DB Seeding
# ==========================================
echo "[Setup] Initializing environment and database..."
cd "$BACKEND_DIR"

if [[ ! -f ".env.test" ]]; then
  echo "FATAL: .env.test not found in $BACKEND_DIR"
  exit 1
fi

TEST_DB_URL=$(grep '^DATABASE_URL=' .env.test | cut -d '=' -f2- | tr -d '\r')
REDIS_URL=$(grep '^REDIS_URL=' .env.test | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
TARGET_URL=$(grep '^TARGET_URL=' .env.test | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
TARGET_URL="${TARGET_URL:-http://localhost:$PORT}"

if [[ -z "$TEST_DB_URL" ]]; then
  echo "FATAL: Could not extract DATABASE_URL from .env.test"
  exit 1
fi

EXISTING_PID=$(lsof -ti tcp:"$PORT" || true)
if [[ -n "$EXISTING_PID" ]]; then
  echo "Port $PORT already in use by PID $EXISTING_PID - killing it first"
  kill -9 $EXISTING_PID || true
  sleep 1
fi

echo " [Setup] Clean build of backend..."
rm -rf dist
npm run build

DATABASE_URL="$TEST_DB_URL" npx --no-install prisma db push --accept-data-loss
DATABASE_URL="$TEST_DB_URL" npx --no-install ts-node prisma/seed-test.ts

# ==========================================
# 3. Start the Backend Server
# ==========================================
echo "[Setup] Starting the backend server..."
DATABASE_URL="$TEST_DB_URL" setsid node dist/main.js &
SERVER_PID=$!
cd "$ROOT_DIR"

echo " [Setup] Waiting for server to become healthy..."
npx --no-install wait-on "$TARGET_URL/health" -t 30000
echo "Server is up and accepting connections!"

# ==========================================
# 4. Phase 1 - Full blended load (original realism check)
# ==========================================
echo -e "\n [Phase 1/5] full - blended read/write/auth load..."
TARGET_URL="$TARGET_URL" TEST_PROFILE=full \
  k6 run tests/load/k6-test.js 2>&1 | tee "$RESULTS_DIR/1-full.log"

# ==========================================
# 5. Phase 2 - Isolated NFR4 match-run latency
# ==========================================
echo -e "\n [Phase 2/5] match_run_isolated - NFR4 latency at 200 profiles, no contention..."
TARGET_URL="$TARGET_URL" TEST_PROFILE=match_run_isolated \
  k6 run tests/load/k6-test.js 2>&1 | tee "$RESULTS_DIR/2-match_run_isolated.log"

# ==========================================
# 6. Phase 3 - Match-run burst (queue backpressure)
# ==========================================
echo -e "\n [Phase 3/5] match_run_burst - concurrent match-run enqueues..."
TARGET_URL="$TARGET_URL" TEST_PROFILE=match_run_burst \
  k6 run tests/load/k6-test.js 2>&1 | tee "$RESULTS_DIR/3-match_run_burst.log"

# ==========================================
# 7. Phase 4 - Connection pool stress
# ==========================================
echo -e "\n [Phase 4/5] pool_stress - DB-bound reads above pool size..."
TARGET_URL="$TARGET_URL" TEST_PROFILE=pool_stress \
  k6 run tests/load/k6-test.js 2>&1 | tee "$RESULTS_DIR/4-pool_stress.log"

# ==========================================
# 8. Phase 5 - Cache warm/cold + invalidation
# ==========================================
echo -e "\n [Phase 5/5] cache_warmcold - flushing Redis before cold-read probe..."
if command -v redis-cli >/dev/null 2>&1; then
  redis-cli -u "$REDIS_URL" FLUSHALL
else
  echo " redis-cli not found - skipping FLUSHALL. Cold-read numbers may not reflect a genuinely empty cache."
fi

TARGET_URL="$TARGET_URL" \
  k6 run tests/load/k6-cache-warmcold.js 2>&1 | tee "$RESULTS_DIR/5-cache_warmcold.log"

echo -e "\n All phases complete. Evidence saved under: $RESULTS_DIR"
echo "   Use these logs directly as the 'Test / tool' and 'Target / actual' evidence in the NFR traceability matrix."