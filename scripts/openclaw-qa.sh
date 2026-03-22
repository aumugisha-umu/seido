#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# SEIDO QA Bot — OpenClaw Launch Script
#
# Triggers the seido-qa agent to run E2E tests against a target URL.
#
# Usage:
#   ./scripts/openclaw-qa.sh                          # Uses TARGET_URL from .env
#   ./scripts/openclaw-qa.sh https://custom-url.com   # Override target URL
#   COMMIT_SHA=abc123 ./scripts/openclaw-qa.sh        # Pass commit SHA
#
# Prerequisites:
#   - OpenClaw installed and running (openclaw doctor)
#   - Environment variables configured in ~/.openclaw/.env or passed inline
# ─────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OPENCLAW_DIR="$PROJECT_ROOT/openclaw"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[qa-bot]${NC} $*"; }
ok()   { echo -e "${GREEN}[qa-bot]${NC} $*"; }
warn() { echo -e "${YELLOW}[qa-bot]${NC} $*"; }
err()  { echo -e "${RED}[qa-bot]${NC} $*" >&2; }

# ── Parse args ──
TARGET_URL="${1:-${TARGET_URL:-}}"

if [[ -z "$TARGET_URL" ]]; then
  # Try loading from .env.local
  if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
    TARGET_URL=$(grep -E '^[[:space:]]*TARGET_URL=' "$PROJECT_ROOT/.env.local" | sed 's/.*TARGET_URL=//' | tr -d '[:space:]')
  fi
fi

if [[ -z "$TARGET_URL" ]]; then
  err "TARGET_URL not set. Pass as argument or set in .env.local"
  exit 1
fi

COMMIT_SHA="${COMMIT_SHA:-$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"

log "Target URL:  $TARGET_URL"
log "Commit SHA:  $COMMIT_SHA"
log "Config:      $OPENCLAW_DIR/openclaw.json"

# ── Preflight checks ──
if ! command -v openclaw &>/dev/null; then
  err "openclaw CLI not found. Install: curl -fsSL https://raw.githubusercontent.com/pasogott/openclaw-ansible/main/install.sh | bash"
  exit 1
fi

# Check OpenClaw health
log "Running OpenClaw doctor..."
if ! openclaw doctor 2>/dev/null; then
  warn "OpenClaw doctor reported issues — continuing anyway"
fi

# ── Verify required env vars ──
REQUIRED_VARS=(
  "E2E_GESTIONNAIRE_EMAIL"
  "E2E_GESTIONNAIRE_PASSWORD"
  "E2E_LOCATAIRE_EMAIL"
  "E2E_LOCATAIRE_PASSWORD"
  "E2E_PRESTATAIRE_EMAIL"
  "E2E_PRESTATAIRE_PASSWORD"
  "ANTHROPIC_API_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    MISSING_VARS+=("$var")
  fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  err "Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    err "  - $var"
  done
  err ""
  err "Set them in ~/.openclaw/.env or export them before running this script."
  exit 1
fi

# ── Clone repo to workspace (if not already there) ──
WORKSPACE="$HOME/.openclaw/workspace-seido-qa"
if [[ ! -d "$WORKSPACE/seido-app" ]]; then
  log "Cloning SEIDO repo to workspace..."
  mkdir -p "$WORKSPACE"
  git clone --depth 1 --branch preview "$PROJECT_ROOT" "$WORKSPACE/seido-app" 2>/dev/null || {
    # If local clone fails, try from GitHub
    git clone --depth 1 --branch preview https://github.com/seido-app/seido-app.git "$WORKSPACE/seido-app"
  }
else
  log "Updating workspace repo..."
  cd "$WORKSPACE/seido-app"
  git fetch origin preview --depth 1
  git reset --hard origin/preview
  cd "$PROJECT_ROOT"
fi

# ── Launch OpenClaw agent ──
log "Launching SEIDO QA Bot..."
echo ""

openclaw agent run \
  --config "$OPENCLAW_DIR/openclaw.json" \
  --agent seido-qa \
  --session isolated \
  --message "Run the full QA pipeline against $TARGET_URL (commit: $COMMIT_SHA). Execute Phase 1 (guided Playwright tests), Phase 2 (autonomous exploration), and Phase 3 (reporting with email + GitHub issue). Set COMMIT_SHA=$COMMIT_SHA and TARGET_URL=$TARGET_URL in the environment." \
  --env "TARGET_URL=$TARGET_URL" \
  --env "COMMIT_SHA=$COMMIT_SHA"

EXIT_CODE=$?

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  ok "QA Bot run completed successfully"

  # Check if report was generated
  LATEST_REPORT="$WORKSPACE/seido-app/reports/qa-report-latest.md"
  if [[ -f "$LATEST_REPORT" ]]; then
    ok "Report available at: $LATEST_REPORT"

    # Copy report back to project
    REPORTS_DIR="$PROJECT_ROOT/docs/qa/reports"
    mkdir -p "$REPORTS_DIR"
    cp "$LATEST_REPORT" "$REPORTS_DIR/qa-report-latest.md"
    ok "Report copied to: $REPORTS_DIR/qa-report-latest.md"
  fi
else
  err "QA Bot run failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
