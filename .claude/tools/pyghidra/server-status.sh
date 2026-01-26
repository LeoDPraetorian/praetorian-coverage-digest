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
# Options:
#   --quiet, -q: Output only essential info (for scripting)
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_PID_FILE="${SCRIPT_DIR}/.server-pid"
SERVER_LOG_FILE="${SCRIPT_DIR}/.server.log"
QUIET=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --quiet|-q)
      QUIET=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# Colors (disabled in quiet mode)
if [ "$QUIET" = true ]; then
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
else
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
fi

if [ "$QUIET" = false ]; then
  echo "=== PyGhidra HTTP Server Status ==="
  echo ""
fi

# Check for PID file
if [ ! -f "$SERVER_PID_FILE" ]; then
  if [ "$QUIET" = true ]; then
    echo "not_running"
    exit 1
  fi

  echo -e "${RED}❌ Server not running${NC}"
  echo "  No .server-pid file found"
  echo ""

  # Check for orphaned processes
  PIDS=$(pgrep -f "pyghidra-mcp" || echo "")
  if [ -n "$PIDS" ]; then
    echo -e "${YELLOW}⚠️  Found orphaned PyGhidra processes:${NC}"
    ps -p "$PIDS" -o pid,etime,command || true
    echo ""
    echo "Recovery steps:"
    echo "  1. Run ./stop-server.sh to clean up orphaned processes"
    echo "  2. Then run ./start-server.sh to start fresh"
  else
    echo "Recovery steps:"
    echo "  1. Run ./start-server.sh to start the server"
    echo "  2. Verify with ./server-status.sh"
    echo ""
    echo "If server fails to start:"
    echo "  - Check port 8001 is not in use: lsof -i :8001"
    echo "  - Review logs: tail -f ${SERVER_LOG_FILE}"
    echo "  - Ensure uvx is installed: uvx --version"
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
  if [ "$QUIET" = true ]; then
    echo "dead"
    exit 1
  fi

  echo -e "${RED}❌ Server process not running${NC}"
  echo "  PID $PID from .server-pid file is dead"
  echo ""
  echo "Server info (stale):"
  cat "$SERVER_PID_FILE" | jq '.'
  echo ""
  echo "Recovery steps:"
  echo "  1. Run ./stop-server.sh to clean up stale PID file"
  echo "  2. Run ./start-server.sh to start fresh server"
  echo ""
  echo "If problem persists:"
  echo "  - Check for crashed process: tail -100 ${SERVER_LOG_FILE}"
  echo "  - Check system resources: df -h && free -h"
  echo "  - Try manual cleanup: rm ${SERVER_PID_FILE}"
  exit 1
fi

# Server is running - get process info
if [ "$QUIET" = true ]; then
  echo "running"
  exit 0
fi

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
    import { createPyghidraHTTPClient } from '${SCRIPT_DIR}/../config/lib/pyghidra-http-client.ts';
    (async () => {
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
    })();
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

exit 0
