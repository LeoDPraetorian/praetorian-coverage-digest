#!/bin/bash
# Serena Health Check Script
#
# @deprecated This script is DEPRECATED as of 2026-01-04
#
# Serena now runs in persistent SSE mode (started by session-start.sh).
# This script is kept for backwards compatibility but only performs a health check.
#
# Previous behavior: Spawned subprocess to warm up connection pool
# New behavior: Verifies Serena is running on localhost:9121 (SSE mode)
#
# Per HOOKS-LESSONS-LEARNED.md: Use pure shell, don't rely on TypeScript execution.

set -euo pipefail

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOG_FILE="${PROJECT_ROOT}/.claude/.serena-health-check.log"
STATUS_FILE="${PROJECT_ROOT}/.claude/.serena-health-check-status.json"
SERENA_SSE_PORT="${SERENA_SSE_PORT:-9121}"

# Log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "Checking Serena SSE server health (port ${SERENA_SSE_PORT})..."

START_TIME=$(date +%s)

# Health check: Verify Serena is running on port 9121
# Use TCP port test (not curl - SSE streams forever)
if timeout 1 bash -c "</dev/tcp/localhost/${SERENA_SSE_PORT}" 2>/dev/null; then
    HEALTH_SUCCESS=true
    log "✓ Serena SSE server is running on port ${SERENA_SSE_PORT}"
else
    HEALTH_SUCCESS=false
    log "✗ Serena SSE server is NOT running on port ${SERENA_SSE_PORT}"
    log "Note: session-start.sh should have started Serena in SSE mode"
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

if [ "$HEALTH_SUCCESS" = true ]; then
    log "Health check passed in ${ELAPSED}s"
else
    log "Health check failed after ${ELAPSED}s"
fi

# Write status for debugging
cat > "${STATUS_FILE}" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "health_check": {
    "port": ${SERENA_SSE_PORT},
    "duration_seconds": ${ELAPSED},
    "success": ${HEALTH_SUCCESS}
  },
  "note": "Serena warmup is deprecated. Server runs persistently in SSE mode (started by session-start.sh)."
}
EOF

log "Status written to ${STATUS_FILE}"

# Exit with appropriate status code
if [ "$HEALTH_SUCCESS" = true ]; then
    exit 0
else
    exit 1
fi
