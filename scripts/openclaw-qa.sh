#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# SEIDO QA Bot — Legacy wrapper
#
# This script is kept for backward compatibility (GitHub Actions, webhooks).
# It delegates to the general openclaw.sh with --qa flag.
#
# Usage:
#   ./scripts/openclaw-qa.sh                          # Uses TARGET_URL from .env
#   ./scripts/openclaw-qa.sh https://custom-url.com   # Override target URL
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/openclaw.sh" --qa "${1:-}"
