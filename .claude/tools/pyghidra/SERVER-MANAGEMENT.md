# PyGhidra MCP Server Management

**Automated server lifecycle management with persistent state tracking**

---

## Quick Start

```bash
cd .claude/tools/pyghidra

./start-server.sh       # Start server (creates .server-pid and .server.log)
./server-status.sh      # Check if running
./stop-server.sh        # Stop server
./restart-server.sh     # Stop and start fresh
```

---

## Server Management Scripts

### `start-server.sh` - Start Server

**Usage:**
```bash
./start-server.sh [port] [project-path]
```

**Defaults:**
- Port: `8765`
- Project path: `pyghidra_mcp_projects/pyghidra_mcp`

**What it does:**
1. Checks if server already running (prevents duplicates)
2. Checks if port is available
3. Creates project directory if needed
4. Starts PyGhidra in streamable-http mode
5. Waits for server to initialize
6. Creates `.server-pid` with server metadata
7. Redirects all output to `.server.log`

**Example:**
```bash
# Default (port 8765)
./start-server.sh

# Custom port
./start-server.sh 8766

# Custom port and project
./start-server.sh 8766 pyghidra_mcp_projects/my_project
```

**Output:**
```
✓ Server started successfully

Server info:
{
  "pid": 15432,
  "port": 8765,
  "url": "http://localhost:8765",
  "projectPath": "pyghidra_mcp_projects/pyghidra_mcp",
  "startedAt": "2026-01-20T17:41:07Z",
  "logFile": ".server.log"
}
```

---

### `server-status.sh` - Check Status

**Usage:**
```bash
./server-status.sh
```

**Shows:**
- Process status (running/stopped)
- PID, uptime, memory usage
- HTTP health check with response time
- Loaded binaries (if any)
- Recent log activity

**Example Output:**
```
✓ Server running

Process Info:
  PID: 15432
  Uptime: 02:33
  Memory: 38640 KB

Server Details:
  URL: http://localhost:8765
  Port: 8765
  Started: 2026-01-20T17:41:07Z

Health Check:
  ✓ HTTP responding (25ms)

Loaded Binaries:
  1. /afw_vehcle_info_boot_tool-70c33e (analyzed: true)
```

---

### `stop-server.sh` - Stop Server

**Usage:**
```bash
./stop-server.sh
```

**What it does:**
1. Reads PID from `.server-pid`
2. Tries graceful shutdown (SIGTERM, waits 10s)
3. Force kills if needed (SIGKILL)
4. Removes `.server-pid` file
5. Preserves `.server.log` for debugging

**Graceful shutdown:**
```
Sending SIGTERM to PID 15432...
✓ Server stopped gracefully
```

**If process stuck:**
```
⚠️  Graceful shutdown timed out
Sending SIGKILL to PID 15432...
✓ Server force-killed
```

---

### `restart-server.sh` - Restart Server

**Usage:**
```bash
./restart-server.sh [port] [project-path]
```

**What it does:**
1. Stops existing server (if running)
2. Starts fresh server with new PID
3. Preserves old logs (appends to `.server.log`)

**Use cases:**
- Server became unresponsive
- Want fresh Ghidra JVM instance
- Changed project configuration

---

## State Files

### `.server-pid` - Server Metadata

**Format:** JSON

```json
{
  "pid": 15432,
  "port": 8765,
  "url": "http://localhost:8765",
  "projectPath": "pyghidra_mcp_projects/pyghidra_mcp",
  "startedAt": "2026-01-20T17:41:07Z",
  "logFile": ".server.log"
}
```

**Updated:**
- Created by `start-server.sh`
- Removed by `stop-server.sh`
- Read by `server-status.sh`

**Purpose:**
- Track server PID for lifecycle management
- Avoid duplicate servers on same port
- Provide server metadata for debugging

---

### `.server.log` - Server Output Log

**Format:** Plain text (Uvicorn + PyGhidra logs)

**Updated:**
- Appended during server runtime
- Preserved after server stops (for debugging)
- Rotated manually if too large

**Contents:**
- Server initialization logs
- Binary import/analysis progress
- MCP tool calls
- Errors and warnings
- Ghidra JVM output

**Usage:**
```bash
# Watch live
tail -f .server.log

# Search for errors
grep -i error .server.log

# Check recent activity
tail -50 .server.log

# Clear old logs
> .server.log  # Truncate (while server stopped)
```

---

## Troubleshooting

### Server Won't Start - Port Already in Use

**Error:**
```
❌ Port 8765 is already in use
```

**Solutions:**
```bash
# Option 1: Kill the process using the port
lsof -ti :8765 | xargs kill -9

# Option 2: Use a different port
./start-server.sh 8766
```

---

### Server Won't Stop - Stale PID File

**Error:**
```
⚠️  Process 15432 is not running
```

**Solution:**
```bash
# Script auto-removes stale PID file
./stop-server.sh

# Or manually:
rm .server-pid
```

---

### Server Crashed - Check Logs

**Symptoms:**
- `server-status.sh` shows "not running"
- `.server-pid` exists but process is dead

**Debug:**
```bash
# Check last 50 lines for errors
tail -50 .server.log | grep -i error

# Look for Java exceptions
tail -100 .server.log | grep -A 5 "Exception"

# Check Ghidra-specific errors
tail -100 .server.log | grep "ghidra"
```

**Common Issues:**
- `LockException`: Project directory locked (remove `*.lock` files)
- `ClosedException`: Project database corruption (delete project, re-import)
- `NullPointerException`: Ghidra internal bug (restart server)

---

### Orphaned Processes

**If server-status.sh shows no PID file but processes are running:**

```bash
# Find all pyghidra-mcp processes
pgrep -fl pyghidra-mcp

# Kill them
pkill -9 -f pyghidra-mcp

# Verify
pgrep -f pyghidra-mcp || echo "All clean"
```

---

## Best Practices

### Development Workflow

```bash
# Morning: Start server once
./start-server.sh

# Work all day (server stays warm)
npx tsx test-final.ts
npx tsx test-wrapper-fix.ts
# ... etc

# Evening: Stop server
./stop-server.sh
```

**Benefits:**
- Ghidra JVM stays initialized
- Binaries stay analyzed
- 100x faster tool calls

### Production Deployment

For long-running servers, use systemd/launchd (see PERSISTENT-CONNECTION-SETUP.md).

### Log Rotation

```bash
# Archive old logs
mv .server.log .server.log.$(date +%Y%m%d)

# Start fresh
./restart-server.sh
```

---

## Integration with Wrappers

The wrappers automatically detect HTTP mode via environment variable:

```bash
# Option 1: Environment variable
export PYGHIDRA_HTTP_PORT=8765

# Option 2: Use HTTP client directly
import { createPyghidraHTTPClient } from '../config/lib/pyghidra-http-client.js';
const client = createPyghidraHTTPClient({ port: 8765 });
```

When `PYGHIDRA_HTTP_PORT` is set, wrappers will use the persistent server instead of spawning new processes.

---

## File Locations

```
.claude/tools/pyghidra/
├── start-server.sh          # Start server
├── stop-server.sh           # Stop server
├── server-status.sh         # Check status
├── restart-server.sh        # Restart server
├── .server-pid              # Server metadata (created/updated by scripts)
├── .server.log              # Server output log (created/updated by scripts)
└── pyghidra_mcp_projects/   # Ghidra project storage
    └── pyghidra_mcp/        # Default project
```

---

## Why This Matters

**Before (manual nohup commands):**
- ❌ No tracking of server PID
- ❌ Logs scattered in /tmp
- ❌ Can't tell if server is running
- ❌ Hard to stop cleanly
- ❌ Duplicate servers on same port

**After (server management scripts):**
- ✅ `.server-pid` tracks current server
- ✅ `.server.log` in consistent location
- ✅ `server-status.sh` shows health
- ✅ `stop-server.sh` cleans up properly
- ✅ Port conflict detection
- ✅ Stale PID file cleanup

**Result:** Reliable, manageable PyGhidra HTTP server with full lifecycle control.
