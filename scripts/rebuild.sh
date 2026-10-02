#!/bin/bash
# Runs at boot (cron @reboot): writes status.json with the boot time for the uptime readout,
# then rebuilds the site. In that order, so the build copies the new status.json into dist/.
# Works from any directory: cron starts jobs in $HOME, not here.

set -e
cd "$(dirname "$0")/.."

# cron's PATH is minimal; add the directory `which npm` prints on the server if it isn't here
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Boot time in UTC (the Z); the browser converts it, so the server's time zone doesn't matter
echo "Writing status.json"
echo "{ \"started\": \"$(date -u -d "$(uptime -s)" +%Y-%m-%dT%H:%M:%SZ)\" }" > public/assets/status.json

echo "Rebuilding website"
npm run build
