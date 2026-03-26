#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# md-to-docx.sh — Convert markdown files to SEIDO-branded Word documents
# Usage: ./scripts/md-to-docx.sh <input.md> [output.docx]
# If output is omitted, generates alongside the input file.
# ─────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="$PROJECT_ROOT/docs/templates/seido-reference.docx"
LUA_FILTER="$PROJECT_ROOT/docs/templates/seido-filter.lua"

# Pandoc path (winget install location)
PANDOC_CANDIDATES=(
  "pandoc"
  "$HOME/AppData/Local/Microsoft/WinGet/Packages/JohnMacFarlane.Pandoc_Microsoft.Winget.Source_8wekyb3d8bbwe/pandoc-3.9.0.1/pandoc.exe"
  "/c/Users/$USER/AppData/Local/Microsoft/WinGet/Packages/JohnMacFarlane.Pandoc_Microsoft.Winget.Source_8wekyb3d8bbwe/pandoc-3.9.0.1/pandoc.exe"
)

PANDOC=""
for candidate in "${PANDOC_CANDIDATES[@]}"; do
  if command -v "$candidate" &>/dev/null || [ -f "$candidate" ]; then
    PANDOC="$candidate"
    break
  fi
done

if [ -z "$PANDOC" ]; then
  echo "ERROR: pandoc not found. Install with: winget install JohnMacFarlane.Pandoc"
  exit 1
fi

# Args
INPUT="${1:?Usage: md-to-docx.sh <input.md> [output.docx]}"
OUTPUT="${2:-${INPUT%.md}.docx}"

if [ ! -f "$INPUT" ]; then
  echo "ERROR: File not found: $INPUT"
  exit 1
fi

# Build pandoc command
PANDOC_ARGS=(
  "$INPUT"
  -o "$OUTPUT"
  --reference-doc="$TEMPLATE"
  --from=markdown+pipe_tables+yaml_metadata_block
  --toc
  --toc-depth=2
  --number-sections
  --standalone
)

# Add Lua filter if it exists
if [ -f "$LUA_FILTER" ]; then
  PANDOC_ARGS+=(--lua-filter="$LUA_FILTER")
fi

echo "Converting: $INPUT -> $OUTPUT"
"$PANDOC" "${PANDOC_ARGS[@]}"
echo "Done: $OUTPUT"
