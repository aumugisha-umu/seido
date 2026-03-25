#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# SEIDO Assistant — OpenClaw Launch Script
#
# General-purpose launcher for the SEIDO OpenClaw assistant.
# Supports QA testing, research, content creation, and any project task.
#
# Usage:
#   ./scripts/openclaw.sh "ta demande ici"
#   ./scripts/openclaw.sh --qa                              # QA pipeline shortcut
#   ./scripts/openclaw.sh --qa https://custom-url.com       # QA with custom URL
#   ./scripts/openclaw.sh "recherche les tendances PropTech 2026"
#   ./scripts/openclaw.sh "redige un article blog sur la maintenance"
#
# Prerequisites:
#   - OpenClaw installed and running (openclaw doctor)
#   - Environment variables in ~/.openclaw/.env or passed inline
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

log()  { echo -e "${BLUE}[seido]${NC} $*"; }
ok()   { echo -e "${GREEN}[seido]${NC} $*"; }
warn() { echo -e "${YELLOW}[seido]${NC} $*"; }
err()  { echo -e "${RED}[seido]${NC} $*" >&2; }

# ── Parse args ──
MODE="general"
MESSAGE=""
TARGET_URL="${TARGET_URL:-}"

if [[ "${1:-}" == "--qa" ]]; then
  MODE="qa"
  TARGET_URL="${2:-${TARGET_URL:-}}"
  # Load from .env.local if not set
  if [[ -z "$TARGET_URL" && -f "$PROJECT_ROOT/.env.local" ]]; then
    TARGET_URL=$(grep -E '^[[:space:]]*TARGET_URL=' "$PROJECT_ROOT/.env.local" | sed 's/.*TARGET_URL=//' | tr -d '[:space:]')
  fi
  if [[ -z "$TARGET_URL" ]]; then
    err "TARGET_URL not set. Pass as argument or set in .env.local"
    exit 1
  fi
  COMMIT_SHA="${COMMIT_SHA:-$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
  MESSAGE="Run the full QA pipeline against $TARGET_URL (commit: $COMMIT_SHA). Execute Phase 1 (guided Playwright tests), Phase 2 (autonomous exploration), and Phase 3 (reporting with email + GitHub issue). Set COMMIT_SHA=$COMMIT_SHA and TARGET_URL=$TARGET_URL in the environment."
elif [[ -n "${1:-}" ]]; then
  MESSAGE="$*"
else
  err "Usage: $0 \"your task\" | $0 --qa [url]"
  echo ""
  echo "Examples:"
  echo "  $0 --qa                                    # Run QA pipeline"
  echo "  $0 --qa https://preview.seido-app.com          # QA with custom URL"
  echo "  $0 \"recherche les stats PropTech 2026\"     # Market research"
  echo "  $0 \"redige un article blog sur X\"          # Content creation"
  echo "  $0 \"analyse les concurrents belges\"        # Competitor analysis"
  echo "  $0 \"mets a jour le pitch kit avec Y\"       # Document update"
  exit 1
fi

log "Mode:    $MODE"
log "Config:  $OPENCLAW_DIR/openclaw.json"
[[ -n "$TARGET_URL" ]] && log "Target:  $TARGET_URL"

# ── Preflight checks ──
if ! command -v openclaw &>/dev/null; then
  err "openclaw CLI not found. Install: curl -fsSL https://raw.githubusercontent.com/pasogott/openclaw-ansible/main/install.sh | bash"
  exit 1
fi

log "Running OpenClaw doctor..."
if ! openclaw doctor 2>/dev/null; then
  warn "OpenClaw doctor reported issues — continuing anyway"
fi

# ── Verify required env vars (only ANTHROPIC_API_KEY is always required) ──
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  err "ANTHROPIC_API_KEY not set. Export it or add to ~/.openclaw/.env"
  exit 1
fi

# QA mode needs E2E credentials
if [[ "$MODE" == "qa" ]]; then
  QA_VARS=("E2E_GESTIONNAIRE_EMAIL" "E2E_GESTIONNAIRE_PASSWORD" "E2E_LOCATAIRE_EMAIL" "E2E_LOCATAIRE_PASSWORD" "E2E_PRESTATAIRE_EMAIL" "E2E_PRESTATAIRE_PASSWORD")
  MISSING=()
  for var in "${QA_VARS[@]}"; do
    [[ -z "${!var:-}" ]] && MISSING+=("$var")
  done
  if [[ ${#MISSING[@]} -gt 0 ]]; then
    err "QA mode requires: ${MISSING[*]}"
    exit 1
  fi
fi

# ── Sync workspace ──
WORKSPACE="$HOME/.openclaw/workspace-seido"
if [[ ! -d "$WORKSPACE/seido-app" ]]; then
  log "Cloning SEIDO repo to workspace..."
  mkdir -p "$WORKSPACE"
  git clone --depth 1 --branch preview "$PROJECT_ROOT" "$WORKSPACE/seido-app" 2>/dev/null || {
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
log "Launching SEIDO Assistant..."
echo ""

ENV_ARGS=()
[[ -n "$TARGET_URL" ]] && ENV_ARGS+=(--env "TARGET_URL=$TARGET_URL")
[[ -n "${COMMIT_SHA:-}" ]] && ENV_ARGS+=(--env "COMMIT_SHA=$COMMIT_SHA")

openclaw agent run \
  --config "$OPENCLAW_DIR/openclaw.json" \
  --agent seido-assistant \
  --session isolated \
  --message "$MESSAGE" \
  "${ENV_ARGS[@]}"

EXIT_CODE=$?

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  ok "Task completed successfully"
else
  err "Task failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
