#!/usr/bin/env bash
#
# Stop PyGhidra MCP Server
#
# Reads PID from .server-pid and gracefully stops the server
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_PID_FILE="${SCRIPT_DIR}/.server-pid"
SERVER_LOG_FILE="${SCRIPT_DIR}/.server.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== PyGhidra HTTP Server Shutdown ==="
echo ""

# Check if PID file exists
if [ ! -f "$SERVER_PID_FILE" ]; then
  echo -e "${YELLOW}⚠️  No .server-pid file found${NC}"
  echo ""

  # Try to find any pyghidra-mcp processes
  PIDS=$(pgrep -f "pyghidra-mcp" || echo "")
  if [ -n "$PIDS" ]; then
    echo "Found PyGhidra processes running:"
    ps -p "$PIDS" -o pid,command || true
    echo ""
    read -p "Kill these processes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "$PIDS" | xargs kill -9 2>/dev/null || true
      echo -e "${GREEN}✓ Processes killed${NC}"
    fi
  else
    echo "No PyGhidra processes found"
  fi
  exit 0
fi

# Read PID from file
PID=$(jq -r '.pid' "$SERVER_PID_FILE" 2>/dev/null || echo "")
PORT=$(jq -r '.port' "$SERVER_PID_FILE" 2>/dev/null || echo "")

if [ -z "$PID" ]; then
  echo -e "${RED}❌ Invalid .server-pid file${NC}"
  cat "$SERVER_PID_FILE"
  exit 1
fi

echo "Server PID: $PID"
echo "Port: $PORT"
echo ""

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Process $PID is not running${NC}"
  echo "Removing stale .server-pid file..."
  rm -f "$SERVER_PID_FILE"
  exit 0
fi

# Try graceful shutdown first (SIGTERM)
echo "Sending SIGTERM to PID $PID..."
kill -TERM "$PID" 2>/dev/null || true

# Wait up to 10 seconds for graceful shutdown
WAITED=0
MAX_WAIT=10
while [ $WAITED -lt $MAX_WAIT ]; do
  if ! ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server stopped gracefully${NC}"
    rm -f "$SERVER_PID_FILE"
    exit 0
  fi
  sleep 1
  WAITED=$((WAITED + 1))
  echo -n "."
done

echo ""
echo -e "${YELLOW}⚠️  Graceful shutdown timed out${NC}"

# Force kill if still running
if ps -p "$PID" > /dev/null 2>&1; then
  echo "Sending SIGKILL to PID $PID..."
  kill -9 "$PID" 2>/dev/null || true
  sleep 1

  if ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to kill process $PID${NC}"
    exit 1
  else
    echo -e "${GREEN}✓ Server force-killed${NC}"
  fi
fi

# Cleanup
rm -f "$SERVER_PID_FILE"

echo ""
echo "Server stopped. Log preserved at:"
echo "  $SERVER_LOG_FILE"
