#!/bin/bash
# Helper script to run dev server with pretty logs
# Usage: ./dev-pretty.sh
#
# This script pipes Next.js dev server output to pino-pretty
# for colored, formatted logs in development.
#
# Alternative: Use npm scripts directly
#   npm run dev:pretty       → Colored logs with metadata
#   npm run dev:pretty:full  → Colored logs (message only)

echo "🚀 Starting SEIDO dev server with pino-pretty formatting..."
echo "ℹ️  Press Ctrl+C to stop"
echo ""

npm run dev 2>&1 | npx pino-pretty \
  --colorize \
  --translateTime 'HH:MM:ss' \
  --ignore 'pid,hostname' \
  --messageFormat '{msg}'
