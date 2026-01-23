#!/usr/bin/env bash
#
# Start PyGhidra MCP Server in Streamable HTTP Mode
#
# Usage:
#   ./start-server.sh [port] [project-path]
#
# Defaults:
#   port: 8765
#   project-path: pyghidra_mcp_projects/pyghidra_mcp
#
# Creates:
#   .server-pid   - Server process info (PID, port, URL, timestamp)
#   .server.log   - Server output log
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8765}"
PROJECT_PATH="${2:-pyghidra_mcp_projects/pyghidra_mcp}"
SERVER_PID_FILE="${SCRIPT_DIR}/.server-pid"
SERVER_LOG_FILE="${SCRIPT_DIR}/.server.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== PyGhidra HTTP Server Startup ==="
echo ""

# Check if server is already running
if [ -f "$SERVER_PID_FILE" ]; then
  OLD_PID=$(jq -r '.pid' "$SERVER_PID_FILE" 2>/dev/null || echo "")
  if [ -n "$OLD_PID" ] && ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Server already running (PID: $OLD_PID)${NC}"
    echo ""
    cat "$SERVER_PID_FILE" | jq '.'
    echo ""
    echo "Use ./stop-server.sh to stop it first"
    exit 1
  else
    echo "Removing stale .server-pid file..."
    rm -f "$SERVER_PID_FILE"
  fi
fi

# Check if port is already in use
if lsof -ti ":$PORT" > /dev/null 2>&1; then
  echo -e "${RED}❌ Port $PORT is already in use${NC}"
  echo ""
  echo "Process using port:"
  lsof -i ":$PORT" | head -5
  echo ""
  echo "Kill it with: lsof -ti :$PORT | xargs kill -9"
  echo "Or use a different port: ./start-server.sh 8766"
  exit 1
fi

# Ensure project directory exists
mkdir -p "$PROJECT_PATH"

# Start server in background
echo "Starting PyGhidra MCP server..."
echo "  Port: $PORT"
echo "  Project: $PROJECT_PATH"
echo "  Log: $SERVER_LOG_FILE"
echo ""

# Redirect to log file
uvx pyghidra-mcp \
  -t streamable-http \
  -p "$PORT" \
  --project-path "$PROJECT_PATH" \
  > "$SERVER_LOG_FILE" 2>&1 &

SERVER_PID=$!

# Give server time to start
echo "Waiting for server to start (PID: $SERVER_PID)..."
sleep 5

# Check if process is still running
if ! ps -p "$SERVER_PID" > /dev/null 2>&1; then
  echo -e "${RED}❌ Server failed to start${NC}"
  echo ""
  echo "Last 30 lines of log:"
  tail -30 "$SERVER_LOG_FILE"
  exit 1
fi

# Check if server is responding
echo "Checking server health..."
HEALTH_CHECK=$(curl -s "http://localhost:${PORT}/" 2>&1 || echo "")

# Wait for Uvicorn to start (check log)
MAX_WAIT=15
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if grep -q "Uvicorn running" "$SERVER_LOG_FILE" 2>/dev/null; then
    break
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo -e "${YELLOW}⚠️  Server started but Uvicorn not detected in logs${NC}"
fi

# Write server info to .server-pid
cat > "$SERVER_PID_FILE" <<EOF
{
  "pid": $SERVER_PID,
  "port": $PORT,
  "url": "http://localhost:$PORT",
  "projectPath": "$PROJECT_PATH",
  "startedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "logFile": "$SERVER_LOG_FILE"
}
EOF

echo -e "${GREEN}✓ Server started successfully${NC}"
echo ""
echo "Server info:"
cat "$SERVER_PID_FILE" | jq '.'
echo ""
echo "Commands:"
echo "  ./server-status.sh    - Check server status"
echo "  ./stop-server.sh      - Stop server"
echo "  tail -f .server.log   - Watch server logs"
echo ""
echo "Test the server:"
echo "  npx tsx test-final.ts"
