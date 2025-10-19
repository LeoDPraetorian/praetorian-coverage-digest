#!/bin/bash

# Check if running in DevPod
if [ "$DEVPOD" != "true" ]; then
    echo "Error: This script should only be run in a DevPod environment (DEVPOD=true)."
    exit 1
fi

# In order to chrome to launch with the debug port 9222, AI suggests to
# create point chrome to a profile directory. I admit I don't understand it.
# But this is the minimal change that did make it work. This is the incremental
# change that enable chrome to open 9222 and respond to inspections by the
# chrome-devtools-mcp server.
# Aapparently some humans made the original observation here:
# https://stackoverflow.com/questions/51563287/how-to-make-chrome-always-launch-with-remote-debugging-port-flag
CHROME_PROFILE="/tmp/chrome-profile"
mkdir -p $CHROME_PROFILE
rm -rf $CHROME_PROFILE/*

# kill the running chrome instances to reclaim port 9222.
ps aux | grep /opt/google/chrome/chrome | grep -v grep | awk '{print $2}' | xargs -r kill

# Launch Chrome with devcontainer-friendly settings
google-chrome \
  --no-sandbox \
  --use-angle=swiftshader-webgl \
  --ignore-certificate-errors \
  --no-first-run \
  --user-data-dir=$CHROME_PROFILE \
  --remote-debugging-port=9222 \
  "$@" > /dev/null 2>&1 &
  