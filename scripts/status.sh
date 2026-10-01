#!/bin/bash

if [ -f ../public/assets/status.json ]; then
	echo "Status file exists. Deleting old file."
	rm ../public/assets/status.json
fi

echo "Creating new status file"
touch ../public/assets/status.json
echo "{ \"started\": \"$(date -u -d "$(uptime -s)" +%Y-%m-%dT%H:%M:%SZ)\" }"> ../public/assets/status.json
echo "Script complete"
