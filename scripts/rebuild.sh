#!/bin/bash
# Server jobs, run from cron (which starts jobs in $HOME; this works from any directory):
#   rebuild.sh           at boot: writes status.json, then rebuilds the site. In that order, so the
#                        build copies the new status.json into dist/.
#   rebuild.sh --status  every 5 minutes: rewrites status.json in public/ and the live dist/, no
#                        rebuild. Right after boot the clock can be hours off until it syncs, so the
#                        boot run's value can be wrong; this corrects it.

set -e
cd "$(dirname "$0")/.."

# Boot time = now minus seconds since boot, in UTC (the Z). No time zones are parsed, and the
# browser converts it, so the server's time zone doesn't matter.
write_status() {
	local boot=$(( $(date +%s) - $(cut -d. -f1 /proc/uptime) ))
	local status="{ \"started\": \"$(date -u -d "@$boot" +%Y-%m-%dT%H:%M:%SZ)\" }"
	echo "$status" > public/assets/status.json
	if [ -d dist/assets ]; then
		echo "$status" > dist/assets/status.json
	fi
	echo "Wrote $status"
}

if [ "$1" = "--status" ]; then
	write_status
	exit
fi

# cron's PATH is minimal and finds the system Node (too old for Astro); load nvm's default Node,
# the one an interactive shell uses, when nvm is installed
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

write_status

echo "Rebuilding website"
npm run build
