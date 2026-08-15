#!/bin/bash
# Usage: check_parses.sh <dir-containing-.rngo>
# Prints PASS or FAIL: <error text>
set -uo pipefail

DIR="$1"

if [ ! -d "$DIR/.rngo" ]; then
  echo "FAIL: no .rngo directory found at $DIR"
  exit 1
fi

OUT=$(cd "$DIR/.." && (rngo run --stdout --dir "$(basename "$DIR")" & PID=$!; sleep 4; kill $PID 2>/dev/null; wait $PID 2>/dev/null) 2>&1)

if echo "$OUT" | grep -qi "^error:"; then
  echo "FAIL: $(echo "$OUT" | grep -i '^error:' | head -1)"
  exit 1
fi

LINES=$(echo "$OUT" | grep -c '"key"')
if [ "$LINES" -eq 0 ]; then
  echo "FAIL: parsed without error but produced zero events in 4s"
  exit 1
fi

echo "PASS: produced $LINES events with no parse error"
