#!/bin/bash
# Usage: check_parses.sh <dir-containing-.rngo>
# Prints PASS or FAIL: <error text>
set -uo pipefail

DIR="$1"

if [ ! -d "$DIR/.rngo" ]; then
  echo "FAIL: no .rngo directory found at $DIR"
  exit 1
fi

OUT=$(cd "$DIR/.." && rngo run --dry-run --dir "$(basename "$DIR")" 2>&1)

if echo "$OUT" | grep -qi "^error:"; then
  echo "FAIL: $(echo "$OUT" | grep -i '^error:' | head -1)"
  exit 1
fi

echo "PASS: spec parsed with no error"
