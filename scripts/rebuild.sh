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

# Right after boot the clock can be hours off until NTP corrects it (e.g. a hardware clock kept in
# local time), so wait for the sync, up to 2 minutes, before reading it
echo "Waiting for the clock to sync"
for _ in $(seq 60); do
	[ "$(timedatectl show -p NTPSynchronized --value 2>/dev/null)" = yes ] && break
	sleep 2
done

# Boot time = now minus seconds since boot, in UTC (the Z). No time zones are parsed, and the
# browser converts it, so the server's time zone doesn't matter.
echo "Writing status.json"
BOOT=$(( $(date +%s) - $(cut -d. -f1 /proc/uptime) ))
echo "{ \"started\": \"$(date -u -d "@$BOOT" +%Y-%m-%dT%H:%M:%SZ)\" }" > public/assets/status.json

echo "Rebuilding website"
npm run build
