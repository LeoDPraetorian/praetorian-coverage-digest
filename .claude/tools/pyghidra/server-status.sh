#!/usr/bin/env bash
#
# Check PyGhidra MCP Server Status
#
# Shows:
# - Whether server is running
# - PID and port info
# - Health check results
# - Imported binaries
# - Recent log activity
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
BLUE='\033[0;34m'
NC='\033[0m'

echo "=== PyGhidra HTTP Server Status ==="
echo ""

# Check for PID file
if [ ! -f "$SERVER_PID_FILE" ]; then
  echo -e "${RED}❌ Server not running${NC}"
  echo "  No .server-pid file found"
  echo ""

  # Check for orphaned processes
  PIDS=$(pgrep -f "pyghidra-mcp" || echo "")
  if [ -n "$PIDS" ]; then
    echo -e "${YELLOW}⚠️  Found orphaned PyGhidra processes:${NC}"
    ps -p "$PIDS" -o pid,etime,command || true
    echo ""
    echo "Run ./stop-server.sh to clean up"
  else
    echo "Start server with: ./start-server.sh"
  fi
  exit 1
fi

# Read server info
PID=$(jq -r '.pid' "$SERVER_PID_FILE" 2>/dev/null || echo "")
PORT=$(jq -r '.port' "$SERVER_PID_FILE" 2>/dev/null || echo "")
URL=$(jq -r '.url' "$SERVER_PID_FILE" 2>/dev/null || echo "")
STARTED_AT=$(jq -r '.startedAt' "$SERVER_PID_FILE" 2>/dev/null || echo "unknown")

if [ -z "$PID" ]; then
  echo -e "${RED}❌ Invalid .server-pid file${NC}"
  cat "$SERVER_PID_FILE"
  exit 1
fi

# Check if process is running
if ! ps -p "$PID" > /dev/null 2>&1; then
  echo -e "${RED}❌ Server process not running${NC}"
  echo "  PID $PID from .server-pid file is dead"
  echo ""
  echo "Server info (stale):"
  cat "$SERVER_PID_FILE" | jq '.'
  echo ""
  echo "Cleanup with: ./stop-server.sh"
  exit 1
fi

# Server is running - get process info
echo -e "${GREEN}✓ Server running${NC}"
echo ""
echo "Process Info:"
ps -p "$PID" -o pid,etime,rss,command | tail -n +2 | awk '{printf "  PID: %s\n  Uptime: %s\n  Memory: %s KB\n  Command: %s %s %s %s %s %s\n", $1, $2, $3, $4, $5, $6, $7, $8, $9}'
echo ""

echo "Server Details:"
echo "  URL: $URL"
echo "  Port: $PORT"
echo "  Started: $STARTED_AT"
echo "  Log: $SERVER_LOG_FILE"
echo ""

# HTTP health check (curl has built-in timing)
echo "Health Check:"
CURL_OUTPUT=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" "http://localhost:${PORT}/" 2>&1 || echo "000|0")
HTTP_RESPONSE=$(echo "$CURL_OUTPUT" | cut -d'|' -f1)
RESPONSE_TIME_SEC=$(echo "$CURL_OUTPUT" | cut -d'|' -f2)
# Use awk for floating point math (bc may not be available)
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME_SEC" | awk '{printf "%.0f", $1 * 1000}')

if [ "$HTTP_RESPONSE" = "404" ] || [ "$HTTP_RESPONSE" = "200" ]; then
  echo -e "  ${GREEN}✓ HTTP responding${NC} (${RESPONSE_TIME_MS}ms)"
else
  echo -e "  ${YELLOW}⚠️  HTTP status: $HTTP_RESPONSE${NC}"
fi

# Get binaries if server is responding
if [ "$HTTP_RESPONSE" = "404" ] || [ "$HTTP_RESPONSE" = "200" ]; then
  echo ""
  echo "Loaded Binaries:"

  # Try to get binary list using HTTP client
  BINARY_COUNT=$(npx -q tsx -e "
    import { createPyghidraHTTPClient } from '../config/lib/pyghidra-http-client.js';
    const client = createPyghidraHTTPClient({ port: ${PORT} });
    try {
      const result = await client.callTool({
        name: 'list_project_binaries',
        arguments: {}
      }, { timeoutMs: 10000 });
      if (result.programs) {
        console.log(result.programs.length);
        result.programs.forEach((b, i) => {
          console.error(\`  \${i+1}. \${b.name} (analyzed: \${b.analysis_complete})\`);
        });
      } else {
        console.log(0);
      }
    } catch (err) {
      console.log(0);
      console.error(\`  Error: \${err.message}\`);
    }
  " 2>&1)

  if [ "$BINARY_COUNT" = "0" ]; then
    echo "  No binaries loaded"
  fi
fi

# Show recent log activity
echo ""
echo "Recent Log Activity (last 10 lines):"
echo -e "${BLUE}────────────────────────────────────────${NC}"
tail -10 "$SERVER_LOG_FILE" | grep -v "WARNING:" || echo "  (no recent activity)"
echo -e "${BLUE}────────────────────────────────────────${NC}"
echo ""

echo "Full log: tail -f $SERVER_LOG_FILE"
