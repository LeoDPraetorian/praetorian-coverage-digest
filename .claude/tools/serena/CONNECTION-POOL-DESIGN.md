# Serena Connection Pool Architecture

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Serena MCP call latency from ~3-5s (cold start per call) to ~2ms (warm pooled connection) for consecutive calls targeting the same module.

**Architecture:** Single pooled connection with module affinity tracking, async mutex for concurrency, TTL-based cleanup, and explicit module-switch detection triggering kill-and-respawn.

**Tech Stack:** TypeScript, MCP SDK (`@modelcontextprotocol/sdk`), async-mutex for locking

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Verified Current Architecture](#2-verified-current-architecture)
3. [Design Constraints](#3-design-constraints)
4. [Pool Data Structure](#4-pool-data-structure)
5. [Lifecycle State Machine](#5-lifecycle-state-machine)
6. [Integration Plan](#6-integration-plan)
7. [Locking Strategy](#7-locking-strategy)
8. [Module Switching Logic](#8-module-switching-logic)
9. [Error Handling Matrix](#9-error-handling-matrix)
10. [Cleanup Strategy](#10-cleanup-strategy)
11. [Testing Strategy](#11-testing-strategy)
12. [Implementation Tasks](#12-implementation-tasks)
13. [Trade-offs and Alternatives](#13-trade-offs-and-alternatives)

---

## 1. Problem Statement

### Current Behavior

Each Serena call in `mcp-client.ts` spawns a NEW process:

```typescript
// Lines 534-543 of mcp-client.ts (verified)
const transport = new StdioClientTransport({
  command: serverConfig.command,  // 'uvx'
  args: serverConfig.args,        // Serena args with --project
  env
});
const client = new Client(...);
await client.connect(transport);  // ~3-5s cold start (uvx + LSP init)
await client.callTool({ name: toolName, arguments: params });
await client.close();  // Kills process
```

### Performance Impact

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Cold start per call | 3-5s | 3-5s (first only) | Same |
| Warm call latency | 3-5s | ~2ms | 1500-2500x |
| Consecutive calls (10) | 30-50s | ~5s | 6-10x |

### Root Cause

- `uvx` spawns Python environment (~1-2s)
- Serena initializes LSP for project (~2-3s)
- Every call repeats this initialization

---

## 2. Verified Current Architecture

### Key Source Files (Evidence-Based)

**mcp-client.ts (lines 450-677):**
```typescript
// Line 450-455: Function signature
export async function callMCPTool<T = any>(
  mcpName: string,
  toolName: string,
  params: any = {},
  options: MCPCallOptions = {}
): Promise<T>

// Line 502: Get server config with semantic routing
const serverConfig = getMCPServerConfig(mcpName, options.semanticContext);

// Lines 534-543: Create fresh connection EVERY call
const transport = new StdioClientTransport({
  command: serverConfig.command,
  args: serverConfig.args,
  env
});
const client = new Client(
  { name: `${mcpName}-wrapper-client`, version: '1.0.0' },
  { capabilities: {} }
);
```

**semantic-router.ts (lines 272-292):**
```typescript
// routeToSerena returns module-specific args
export function routeToSerena(
  userQuery: string,
  projectRoot: string
): {
  args: string[];              // ['--project', '/path/to/module']
  scopeDescription: string;    // 'chariot (matched: react, frontend)'
  primaryModule: string;       // 'chariot'
  allMatches: ModuleScope[];
}
```

**SERVICE_TIMEOUTS (line 262):**
```typescript
export const SERVICE_TIMEOUTS: Record<string, number> = {
  'serena': 60_000,  // 60s - module-scoped cold start
};
```

### Critical Constraint (from semantic-router.ts line 13-14)

> "Key insight from Serena GitHub #474: 'Not currently, no' for simultaneous multi-project.
> Therefore, we scope to SINGLE module per call, not multiple."

**Implication:** Only ONE Serena process can be active at a time per project scope.

---

## 3. Design Constraints

| Constraint | Source | Impact on Design |
|------------|--------|------------------|
| Single project per Serena | GitHub #474 | Pool holds ONE connection, not map-by-module |
| No `activate_project` in claude-code context | Serena docs | Cannot switch projects via API, must kill/respawn |
| Super-repo with 21+ modules | .serena/project.yml | Semantic routing critical for performance |
| 60s timeout per call | SERVICE_TIMEOUTS | Pool TTL should be shorter than this |
| Retry with backoff | DEFAULT_MAX_RETRIES=3 | Retry should use pooled connection when possible |

---

## 4. Pool Data Structure

### Interface Definitions

```typescript
// File: .claude/tools/config/lib/serena-pool.ts

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Mutex } from 'async-mutex';

/**
 * Serena connection state
 */
export type ConnectionState =
  | 'disconnected'  // No active connection
  | 'connecting'    // Connection in progress
  | 'idle'          // Connected, waiting for calls
  | 'in_use'        // Currently executing a call
  | 'expired';      // TTL exceeded, pending cleanup

/**
 * Pooled connection with module affinity
 */
export interface PooledConnection {
  /** MCP SDK client instance */
  client: Client;

  /** Underlying stdio transport (holds process reference) */
  transport: StdioClientTransport;

  /** Current state */
  state: ConnectionState;

  /** Module this connection is scoped to */
  currentModule: string;

  /** Timestamp of last activity (for TTL) */
  lastUsed: number;

  /** Connection creation timestamp (for debugging) */
  createdAt: number;

  /** Number of calls made on this connection */
  callCount: number;
}

/**
 * Pool configuration
 */
export interface PoolConfig {
  /** Idle timeout in ms before connection is closed (default: 5 min) */
  idleTimeoutMs: number;

  /** Maximum calls on single connection before forced refresh (default: 1000) */
  maxCallsPerConnection: number;

  /** Enable debug logging */
  debug: boolean;
}

/**
 * Serena Connection Pool
 *
 * Single connection pool with module affinity.
 * Thread-safe via async mutex.
 */
export interface SerenaPool {
  /** Get or create connection for module */
  acquire(targetModule: string, env: Record<string, string>): Promise<Client>;

  /** Release connection back to pool */
  release(): void;

  /** Force close and clean up */
  dispose(): Promise<void>;

  /** Get current pool stats (for debugging/testing) */
  stats(): PoolStats;
}

/**
 * Pool statistics for observability
 */
export interface PoolStats {
  state: ConnectionState;
  currentModule: string | null;
  callCount: number;
  idleMs: number;
  connectionAgeMs: number;
}
```

### Why Single Connection, Not Map-by-Module

**Decision:** Pool holds ONE connection, not `Map<module, connection>`.

**Rationale:**
1. Serena only supports one project at a time (constraint from GitHub #474)
2. Map-by-module would require managing multiple processes (wasteful)
3. Module switching is explicit (kill → spawn) not implicit (just use different connection)
4. Simpler state management, fewer edge cases

**Alternative Considered:** `Map<module, PooledConnection>` with LRU eviction
- **Rejected** because: Serena process overhead is high; keeping multiple idle processes wastes resources

---

## 5. Lifecycle State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
    ┌──────────────────────────┐                              │
    │      disconnected        │◄─────────────────────────────┤
    │  (no active connection)  │                              │
    └────────────┬─────────────┘                              │
                 │                                            │
                 │ acquire() called                           │
                 ▼                                            │
    ┌──────────────────────────┐                              │
    │       connecting         │                              │
    │  (spawning uvx process)  │──── error ───────────────────┤
    └────────────┬─────────────┘                              │
                 │                                            │
                 │ connected                                  │
                 ▼                                            │
    ┌──────────────────────────┐                              │
    │          idle            │◄─────────────────────┐       │
    │ (awaiting next call)     │                      │       │
    └────────────┬─────────────┘                      │       │
                 │                                    │       │
                 │ acquire() + same module            │       │
                 ▼                                    │       │
    ┌──────────────────────────┐                      │       │
    │         in_use           │                      │       │
    │  (executing MCP call)    │─── release() ────────┘       │
    └────────────┬─────────────┘                              │
                 │                                            │
                 │ error OR different module                  │
                 ▼                                            │
    ┌──────────────────────────┐                              │
    │         expired          │                              │
    │   (pending cleanup)      │─── dispose() ────────────────┘
    └──────────────────────────┘

    TTL timer runs continuously:
    - If idle > idleTimeoutMs → state = expired → dispose()
```

### State Transition Rules

| From | To | Trigger | Action |
|------|----|---------|--------|
| `disconnected` | `connecting` | `acquire()` | Spawn uvx process |
| `connecting` | `idle` | Connection success | Start TTL timer |
| `connecting` | `disconnected` | Connection error | Log error, throw |
| `idle` | `in_use` | `acquire()` + same module | Reset TTL timer |
| `idle` | `expired` | `acquire()` + different module | Kill process |
| `idle` | `expired` | TTL exceeded | Start cleanup |
| `in_use` | `idle` | `release()` | Reset TTL timer |
| `in_use` | `expired` | Call error | Kill process |
| `expired` | `disconnected` | `dispose()` | Cleanup complete |

---

## 6. Integration Plan

### Where to Add Pool Logic

**Location:** `callMCPTool` function in `mcp-client.ts` (line 450)

**Integration Point:** After getting server config (line 502), before creating transport (line 534)

### Modified Flow (Pseudocode)

```typescript
// In callMCPTool, BEFORE the retry loop (line 532)

// ONLY for Serena - other MCPs don't need pooling
if (mcpName === 'serena') {
  // Get routing info
  const routing = routeToSerena(options.semanticContext || '', projectRoot);
  const targetModule = routing.primaryModule;

  // Acquire from pool (may reuse or spawn new)
  const client = await serenaPool.acquire(targetModule, env);

  try {
    // Call tool on pooled connection
    const result = await withTimeout(
      client.callTool({ name: toolName, arguments: params }),
      timeoutMs,
      `${mcpName}.${toolName}`
    );

    // Release back to pool
    serenaPool.release();

    // Parse and return result (same as existing code)
    return parseResult(result);

  } catch (error) {
    // On error, dispose and let next call create fresh connection
    await serenaPool.dispose();
    throw error;
  }
}

// Non-Serena MCPs use existing fresh-connection logic
```

### File Structure

```
.claude/tools/config/lib/
├── mcp-client.ts           # Modified to use pool for Serena
├── serena-pool.ts          # NEW: Pool implementation
└── serena-pool.test.ts     # NEW: Unit tests
```

---

## 7. Locking Strategy

### Problem

Multiple concurrent calls to `callMCPTool('serena', ...)` could:
1. Both try to acquire the same connection
2. One call interrupts another's in-flight request
3. Race condition during module switch

### Solution: Async Mutex

```typescript
import { Mutex, MutexInterface } from 'async-mutex';

class SerenaPoolImpl implements SerenaPool {
  private mutex: Mutex = new Mutex();
  private connection: PooledConnection | null = null;

  async acquire(targetModule: string, env: Record<string, string>): Promise<Client> {
    // Serialize all acquire/release operations
    const release = await this.mutex.acquire();

    try {
      if (this.connection?.state === 'idle' &&
          this.connection.currentModule === targetModule) {
        // Reuse existing connection
        this.connection.state = 'in_use';
        this.connection.lastUsed = Date.now();
        this.connection.callCount++;
        return this.connection.client;
      }

      // Need new connection - dispose old one first
      if (this.connection) {
        await this.disposeInternal();
      }

      // Create new connection
      const conn = await this.createConnection(targetModule, env);
      this.connection = conn;
      return conn.client;

    } finally {
      release();  // Release mutex in all cases
    }
  }

  // Release does NOT release mutex - it just marks state
  release(): void {
    if (this.connection?.state === 'in_use') {
      this.connection.state = 'idle';
      this.connection.lastUsed = Date.now();
    }
  }
}
```

### Why async-mutex Over Other Options

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **async-mutex** | Battle-tested, simple API | External dependency | **Chosen** |
| Custom semaphore | No dependency | Error-prone implementation | Rejected |
| Queue-based | Fair ordering | Over-engineered for single resource | Rejected |
| No locking | Simplest | Race conditions | Rejected |

**Note:** `async-mutex` is a ~2KB dependency with zero sub-dependencies.

---

## 8. Module Switching Logic

### Detection

```typescript
function needsModuleSwitch(
  currentModule: string | null,
  targetModule: string
): boolean {
  // No current connection - no switch needed (will create new)
  if (!currentModule) return false;

  // Same module - reuse connection
  if (currentModule === targetModule) return false;

  // Different module - must switch
  return true;
}
```

### Switch Procedure

```typescript
async function switchModule(
  pool: SerenaPoolImpl,
  targetModule: string,
  env: Record<string, string>
): Promise<Client> {
  // 1. Log the switch for observability
  console.warn(
    `[Serena Pool] Module switch: ${pool.currentModule} → ${targetModule}`
  );

  // 2. Kill existing process (cannot switch in-place)
  await pool.dispose();

  // 3. Create new connection for target module
  return pool.acquire(targetModule, env);
}
```

### Performance Impact of Module Switching

| Scenario | Latency | Why |
|----------|---------|-----|
| Same module (warm) | ~2ms | Reuse existing connection |
| Different module (switch) | ~3-5s | Kill + cold start |
| No prior connection | ~3-5s | Cold start |

**Optimization:** Batch calls to same module together. The semantic routing already helps by grouping related queries.

---

## 9. Error Handling Matrix

| Error Type | Detection | Action | Pool State After |
|------------|-----------|--------|------------------|
| **Connection timeout** | `client.connect()` throws after 60s | Log, dispose, rethrow | `disconnected` |
| **Call timeout** | `client.callTool()` throws after 60s | Log, dispose, rethrow | `disconnected` |
| **Process crash** | Transport `exit` event | Auto-dispose | `disconnected` |
| **Invalid response** | Parse error | Keep connection, rethrow | `idle` |
| **LSP error** | Error in response content | Keep connection, rethrow | `idle` |
| **Module not found** | Routing returns unknown module | Rethrow (don't spawn) | Unchanged |

### Error Recovery Example

```typescript
async acquire(targetModule: string, env: Record<string, string>): Promise<Client> {
  // ... mutex acquisition ...

  try {
    return await this.getOrCreateConnection(targetModule, env);

  } catch (error) {
    // Any error during acquire → mark as disconnected
    this.connection = null;

    // Log with context
    console.error(
      `[Serena Pool] Connection failed for module ${targetModule}:`,
      error instanceof Error ? error.message : error
    );

    throw error;  // Let caller handle retry
  }
}
```

### Integration with Existing Retry Logic

The existing retry loop in `callMCPTool` (lines 532-673) should work with pooling:

```typescript
// Modified retry logic for Serena
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    // Get connection from pool (may be warm or cold)
    const client = await serenaPool.acquire(targetModule, env);

    const result = await withTimeout(
      client.callTool({ name: toolName, arguments: params }),
      timeoutMs,
      `serena.${toolName}`
    );

    serenaPool.release();
    return parseResult(result);

  } catch (error) {
    // Dispose on error - next attempt will create fresh
    await serenaPool.dispose();

    if (shouldRetry(error, attempt, maxRetries)) {
      await sleep(retryDelayMs * Math.pow(2, attempt));
      continue;
    }

    throw error;
  }
}
```

---

## 10. Cleanup Strategy

### TTL-Based Cleanup

```typescript
class SerenaPoolImpl implements SerenaPool {
  private idleTimer: NodeJS.Timeout | null = null;
  private config: PoolConfig;

  private startIdleTimer(): void {
    this.clearIdleTimer();

    this.idleTimer = setTimeout(() => {
      if (this.connection?.state === 'idle') {
        console.warn(
          `[Serena Pool] Idle timeout (${this.config.idleTimeoutMs}ms), disposing connection`
        );
        this.dispose();
      }
    }, this.config.idleTimeoutMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
```

### Process Exit Cleanup

```typescript
// Register cleanup handlers on module load
function registerCleanupHandlers(pool: SerenaPool): void {
  const cleanup = async () => {
    console.warn('[Serena Pool] Process exit, cleaning up...');
    await pool.dispose();
  };

  // Normal exit
  process.on('exit', () => {
    // Can only do sync cleanup in exit handler
    // The pool should already be disposed by SIGTERM/SIGINT
  });

  // Ctrl+C
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(130);
  });

  // Kill signal
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(143);
  });

  // Uncaught exception
  process.on('uncaughtException', async (error) => {
    console.error('[Serena Pool] Uncaught exception:', error);
    await cleanup();
    process.exit(1);
  });
}

// Initialize on module load
const serenaPool = new SerenaPoolImpl(DEFAULT_POOL_CONFIG);
registerCleanupHandlers(serenaPool);
export { serenaPool };
```

### Transport Exit Event Handling

```typescript
private async createConnection(
  targetModule: string,
  env: Record<string, string>
): Promise<PooledConnection> {
  const transport = new StdioClientTransport({
    command: 'uvx',
    args: getSerenaArgs(targetModule),
    env
  });

  // Handle unexpected process exit
  transport.on('exit', (code) => {
    console.warn(
      `[Serena Pool] Process exited unexpectedly with code ${code}`
    );
    this.connection = null;  // Mark as disconnected
  });

  const client = new Client(
    { name: 'serena-pooled-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);

  return {
    client,
    transport,
    state: 'idle',
    currentModule: targetModule,
    lastUsed: Date.now(),
    createdAt: Date.now(),
    callCount: 0,
  };
}
```

---

## 11. Testing Strategy

### Unit Tests (No Actual Serena Process)

```typescript
// File: serena-pool.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SerenaPoolImpl } from './serena-pool';

// Mock MCP SDK
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    callTool: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '[]' }] }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

describe('SerenaPool', () => {
  let pool: SerenaPoolImpl;

  beforeEach(() => {
    pool = new SerenaPoolImpl({
      idleTimeoutMs: 1000,
      maxCallsPerConnection: 10,
      debug: false
    });
  });

  afterEach(async () => {
    await pool.dispose();
  });

  describe('acquire', () => {
    it('should create new connection when none exists', async () => {
      const client = await pool.acquire('chariot', {});
      expect(client).toBeDefined();
      expect(pool.stats().state).toBe('in_use');
    });

    it('should reuse connection for same module', async () => {
      const client1 = await pool.acquire('chariot', {});
      pool.release();
      const client2 = await pool.acquire('chariot', {});

      expect(client1).toBe(client2);
      expect(pool.stats().callCount).toBe(2);
    });

    it('should create new connection for different module', async () => {
      const client1 = await pool.acquire('chariot', {});
      pool.release();
      const client2 = await pool.acquire('nebula', {});

      expect(client1).not.toBe(client2);
      expect(pool.stats().currentModule).toBe('nebula');
    });
  });

  describe('concurrency', () => {
    it('should serialize concurrent acquire calls', async () => {
      const results = await Promise.all([
        pool.acquire('chariot', {}),
        pool.acquire('chariot', {}),
        pool.acquire('chariot', {}),
      ]);

      // All should get the same client (serialized)
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
  });

  describe('TTL cleanup', () => {
    it('should dispose connection after idle timeout', async () => {
      vi.useFakeTimers();

      await pool.acquire('chariot', {});
      pool.release();

      expect(pool.stats().state).toBe('idle');

      // Advance past idle timeout
      vi.advanceTimersByTime(1100);

      expect(pool.stats().state).toBe('disconnected');

      vi.useRealTimers();
    });
  });

  describe('error recovery', () => {
    it('should reset to disconnected on connection error', async () => {
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      vi.mocked(Client).mockImplementationOnce(() => ({
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        close: vi.fn(),
      }));

      await expect(pool.acquire('chariot', {})).rejects.toThrow('Connection failed');
      expect(pool.stats().state).toBe('disconnected');
    });
  });
});
```

### Integration Tests (With Mock MCP Server)

```typescript
// File: serena-pool.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { SerenaPoolImpl } from './serena-pool';

describe('SerenaPool Integration', () => {
  let mockServer: ChildProcess;
  let pool: SerenaPoolImpl;

  beforeAll(async () => {
    // Start mock MCP server that responds to Serena protocol
    mockServer = spawn('npx', ['tsx', './test-fixtures/mock-serena-server.ts'], {
      stdio: 'pipe'
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    pool = new SerenaPoolImpl({
      idleTimeoutMs: 5000,
      maxCallsPerConnection: 100,
      debug: true
    });
  });

  afterAll(async () => {
    await pool.dispose();
    mockServer.kill();
  });

  it('should complete multiple calls on same connection', async () => {
    const client1 = await pool.acquire('chariot', {});
    // Make some calls
    pool.release();

    const client2 = await pool.acquire('chariot', {});
    // Same client instance = connection reused
    expect(client1).toBe(client2);
  });
});
```

### Test Coverage Requirements

| Component | Coverage Target | Key Scenarios |
|-----------|-----------------|---------------|
| State transitions | 100% | All state machine edges |
| Module switching | 100% | Same module, different module |
| Concurrency | 90% | Parallel acquire, race conditions |
| Error handling | 90% | Connection fail, call fail, timeout |
| Cleanup | 100% | TTL, SIGTERM, SIGINT, uncaught |

---

## 12. Implementation Tasks

### Task 1: Create Pool Module Structure

**Files:**
- Create: `.claude/tools/config/lib/serena-pool.ts`
- Create: `.claude/tools/config/lib/serena-pool.test.ts`

**Step 1: Write the failing test**

```typescript
// serena-pool.test.ts
import { describe, it, expect } from 'vitest';
import { SerenaPoolImpl } from './serena-pool';

describe('SerenaPoolImpl', () => {
  it('should exist and be constructable', () => {
    const pool = new SerenaPoolImpl({
      idleTimeoutMs: 5000,
      maxCallsPerConnection: 1000,
      debug: false
    });
    expect(pool).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run serena-pool.test.ts`
Expected: FAIL with "Cannot find module './serena-pool'"

**Step 3: Write minimal implementation**

```typescript
// serena-pool.ts
export interface PoolConfig {
  idleTimeoutMs: number;
  maxCallsPerConnection: number;
  debug: boolean;
}

export class SerenaPoolImpl {
  constructor(private config: PoolConfig) {}
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run serena-pool.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/tools/config/lib/serena-pool.ts .claude/tools/config/lib/serena-pool.test.ts
git commit -m "feat(serena): add pool module structure"
```

---

### Task 2: Implement State Machine

**Files:**
- Modify: `.claude/tools/config/lib/serena-pool.ts`
- Modify: `.claude/tools/config/lib/serena-pool.test.ts`

**Step 1: Write the failing tests**

```typescript
describe('state management', () => {
  it('should start in disconnected state', () => {
    const pool = new SerenaPoolImpl(config);
    expect(pool.stats().state).toBe('disconnected');
  });

  it('should transition to idle after acquire', async () => {
    const pool = new SerenaPoolImpl(config);
    await pool.acquire('chariot', {});
    expect(pool.stats().state).toBe('in_use');
    pool.release();
    expect(pool.stats().state).toBe('idle');
  });
});
```

**Step 2-4:** Run tests, implement state tracking, verify pass.

**Step 5: Commit**

```bash
git commit -m "feat(serena): implement connection state machine"
```

---

### Task 3: Implement Mutex Locking

**Files:**
- Modify: `.claude/tools/config/lib/serena-pool.ts`
- Create: `package.json` dependency on `async-mutex`

**Step 1: Install dependency**

```bash
npm install async-mutex
```

**Step 2: Write concurrent access test**

```typescript
describe('concurrency', () => {
  it('should serialize concurrent acquire calls', async () => {
    const pool = new SerenaPoolImpl(config);
    const results = await Promise.all([
      pool.acquire('chariot', {}),
      pool.acquire('chariot', {}),
    ]);
    expect(results[0]).toBe(results[1]);  // Same client
  });
});
```

**Step 3-4:** Run tests, implement mutex, verify pass.

**Step 5: Commit**

```bash
git commit -m "feat(serena): add mutex for concurrent access"
```

---

### Task 4: Implement Module Switching

(Continue pattern for Tasks 4-8: TTL cleanup, process cleanup, error handling, integration with callMCPTool, observability logging)

---

## 13. Trade-offs and Alternatives

### Decision: Single Connection vs Connection-per-Module

**Chosen:** Single connection with module affinity

**Trade-offs:**
| Aspect | Single Connection | Connection-per-Module |
|--------|-------------------|----------------------|
| Memory | Low (one process) | High (21 processes possible) |
| Switch latency | 3-5s | ~2ms (if cached) |
| Complexity | Simple | Complex (LRU eviction) |
| Resource usage | Minimal | Wasteful if many modules |

**Rationale:** Most workflows stay within 1-2 modules per session. The 3-5s switch cost is acceptable for the simplicity and resource savings.

### Decision: async-mutex vs Built-in

**Chosen:** async-mutex package

**Alternatives Considered:**
1. Custom Promise-based lock - Error-prone, reinventing wheel
2. No locking (assume sequential) - Dangerous, race conditions possible
3. Worker-based isolation - Over-engineered for this use case

**Rationale:** async-mutex is tiny (~2KB), battle-tested, and solves the exact problem.

### Decision: 5-Minute Idle Timeout

**Chosen:** 5 minutes (300,000ms)

**Trade-offs:**
| Timeout | Pros | Cons |
|---------|------|------|
| 1 min | Quick resource release | Too many cold starts |
| 5 min | Balances reuse and cleanup | Some resource holding |
| 15 min | Maximum reuse | Resource waste if unused |

**Rationale:** Typical code exploration sessions involve bursts of 3-5 related queries within 2-3 minutes. 5-minute timeout captures this pattern while not holding resources indefinitely.

### Decision: Error = Dispose

**Chosen:** Any error during call disposes the connection

**Trade-offs:**
- **Aggressive:** Dispose on any error → More cold starts but guaranteed clean state
- **Conservative:** Only dispose on connection errors → Fewer cold starts but risk stale state

**Rationale:** Serena LSP state can become corrupt. Fresh connection is safest.

---

## 14. gopls Pre-Warming

### Background

gopls loads the entire `go.work` workspace on cold start (~30-40s for 1276 packages across 10 Go modules). This creates unacceptable delays for Go semantic operations when using Serena.

**Problem:**
- First Go query in a session: 30-40s blocking delay
- User must wait for gopls to initialize before results appear
- MCP calls may timeout before gopls finishes warming

### Solution

The session hook (`.claude/hooks/session-start.sh`) spawns a background warmup process (`serena-warmup.sh`) that:

1. Targets `modules/chariot/backend` (primary Go module) as warmup target
2. Makes a lightweight Serena call (`get_symbols_overview` on a small Go file)
3. Triggers gopls to load the entire `go.work` workspace and populate its file-based cache
4. Completes in background (non-blocking for session start)

**gopls caching behavior (v0.21.0+):**
- Cache persists to `~/Library/Caches/gopls/` (macOS) or `~/.cache/gopls/` (Linux)
- Cache is workspace-scoped, not per-process
- Subsequent Serena spawns benefit from the warm cache
- Cache survives gopls process restarts

### Verification

After session start completes, check warmup status:

```bash
cat .claude/.serena-warmup-status.json
```

**Expected output:**
```json
{
  "timestamp": "2026-01-04T15:30:45Z",
  "typescript_warmup": {
    "project": "/path/to/modules/chariot",
    "duration_seconds": 12,
    "success": true
  },
  "go_warmup": {
    "project": "/path/to/modules/chariot/backend",
    "duration_seconds": 38,
    "success": true
  }
}
```

**Verify gopls cache exists:**
```bash
# macOS
ls -la ~/Library/Caches/gopls/

# Linux
ls -la ~/.cache/gopls/
```

Should show workspace-specific cache files with recent modification times.

### Expected Performance

| Scenario | Without Warmup | With Warmup | Improvement |
|----------|----------------|-------------|-------------|
| First Go query (cold) | 30-40s | 5-10s | 3-6x faster |
| Subsequent queries (same module) | 100ms-2s | 100ms-2s | Same (already pooled) |
| Module switch | 30-40s | 5-15s | 2-4x faster |
| Session start impact | 0s | 0s (async) | No delay |

**Why warmup helps:**
- gopls file cache is pre-populated during session start
- First query benefits from warm cache instead of cold initialization
- Cache persists across Serena respawns (connection pool kills/spawns)

### Troubleshooting

**If Go operations still slow after warmup:**

1. **Check warmup status file:**
   ```bash
   cat .claude/.serena-warmup-status.json
   ```
   - `"success": false` indicates warmup failed
   - Check duration_seconds - should be 30-50s for successful warmup

2. **Verify gopls cache exists:**
   ```bash
   # macOS
   ls -la ~/Library/Caches/gopls/

   # Linux
   ls -la ~/.cache/gopls/
   ```
   - Should have recent files (modified within last session)
   - If empty, gopls caching may be disabled or failing

3. **Check Serena logs for gopls initialization:**
   ```bash
   grep -i "gopls" .serena/logs/$(date +%Y-%m-%d)/*.txt | tail -20
   ```
   - Look for "background imports cache refresh" messages
   - First occurrence should be during warmup (early in session)
   - Subsequent occurrences should be faster (~5-15s)

4. **Manually trigger warmup:**
   ```bash
   .claude/hooks/serena-warmup.sh
   ```
   - Check `.claude/.serena-warmup.log` for errors
   - Should complete in 30-60s total

5. **Check go.work integrity:**
   ```bash
   cd /path/to/repo
   go work sync
   ```
   - Ensures all modules in go.work are valid
   - Rebuild may be needed if modules changed

**Common issues:**

| Symptom | Cause | Solution |
|---------|-------|----------|
| warmup never completes | uvx or Serena installation issue | Check `uvx --version` and install Serena |
| success=false in status | gopls crash or timeout | Check Serena logs, verify go.work |
| Cache not persisting | gopls version <0.21.0 | Upgrade gopls: `go install golang.org/x/tools/gopls@latest` |
| Still 30s+ on first query | Cache invalidated | Normal after go.mod changes, will rebuild |

---

## Metadata

```json
{
  "agent": "mcp-tool-lead",
  "output_type": "architecture-plan",
  "timestamp": "2025-01-02T00:00:00Z",
  "feature_directory": ".claude/tools/serena",
  "skills_invoked": [
    "enforcing-evidence-based-analysis",
    "gateway-mcp-tools",
    "gateway-typescript",
    "writing-plans",
    "brainstorming"
  ],
  "library_skills_read": [
    ".claude/skill-library/claude/mcp-tools/mcp-tools-serena/SKILL.md",
    ".claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md"
  ],
  "source_files_verified": [
    ".claude/tools/config/lib/mcp-client.ts:450-677",
    ".claude/tools/serena/semantic-router.ts:272-292",
    ".claude/tools/serena/find-symbol.ts:1-287"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "mcp-tool-developer",
    "context": "Implement connection pool per Task 1-8 in Implementation Tasks section"
  }
}
```
