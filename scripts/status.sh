#!/bin/bash

if [ -f ../public/status.json ]; then
	echo "Status file exists. Deleting old file."
	rm ../public/status.json
fi

echo "Creating new status file"
touch ../public/status.json
echo "{ \"started\": \"$(date -u -d "$(uptime -s)" +%Y-%m-%dT%H:%M:%SZ)\" }"> ../public/status.json
echo "Script complete"
