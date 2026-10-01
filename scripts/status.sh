#!/bin/bash
# Writes status.json with the time the server booted, for the site's uptime readout.
# Run it from anywhere; paths are relative to the repo, not the current directory.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATUS="{ \"started\": \"$(date -u -d "$(uptime -s)" +%Y-%m-%dT%H:%M:%SZ)\" }"

# public/ is copied into dist/ on every build, so the file survives rebuilds
echo "Creating new status file"
echo "$STATUS" > "$ROOT/public/assets/status.json"

# The live copy, if the site is already built
if [ -d "$ROOT/dist/assets" ]; then
	echo "$STATUS" > "$ROOT/dist/assets/status.json"
fi

echo "Script complete"
