#!/bin/bash
# Runs at boot (cron @reboot): writes status.json with the boot time for the uptime readout,
# then rebuilds the site. In that order, so the build copies the new status.json into dist/.
# Works from any directory: cron starts jobs in $HOME, not here.

set -e
cd "$(dirname "$0")/.."

# cron's PATH is minimal and finds the system Node (too old for Astro); load nvm's default Node,
# the one an interactive shell uses, when nvm is installed
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Boot time in UTC (the Z); the browser converts it, so the server's time zone doesn't matter
echo "Writing status.json"
echo "{ \"started\": \"$(date -u -d "$(uptime -s)" +%Y-%m-%dT%H:%M:%SZ)\" }" > public/assets/status.json

echo "Rebuilding website"
npm run build
