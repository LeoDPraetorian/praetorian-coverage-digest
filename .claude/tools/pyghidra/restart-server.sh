#!/usr/bin/env bash
#
# Restart PyGhidra MCP Server
#
# Stops the current server (if running) and starts a fresh one
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

echo "=== PyGhidra HTTP Server Restart ==="
echo ""

# Stop existing server
if [ -f "${SCRIPT_DIR}/.server-pid" ]; then
  echo "Stopping existing server..."
  "${SCRIPT_DIR}/stop-server.sh" || true
  sleep 2
  echo ""
fi

# Start fresh server
echo "Starting fresh server..."
"${SCRIPT_DIR}/start-server.sh" "$@"
