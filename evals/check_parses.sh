#!/bin/bash
# Usage: check_parses.sh <dir-containing-.rngo>
# Prints PASS or FAIL: <error text>
set -uo pipefail

DIR="$1"

if [ ! -d "$DIR/.rngo" ]; then
  echo "FAIL: no .rngo directory found at $DIR"
  exit 1
fi

if ! OUT=$(rngo eval --dry-run "$DIR" 2>&1); then
  echo "FAIL: $OUT"
  exit 1
fi

echo "PASS: spec parsed with no error"
