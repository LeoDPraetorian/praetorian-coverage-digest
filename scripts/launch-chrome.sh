#!/bin/bash

# Launch Chrome with devcontainer-friendly settings
google-chrome \
  --no-sandbox \
  --use-angle=swiftshader-webgl \
  --ignore-certificate-errors \
  --no-first-run \
  --remote-debugging-port=9222 \
  "$@" > /dev/null 2>&1 &
