/**
 * Serena Connection Pool
 *
 * @deprecated This file is DEPRECATED as of 2026-01-04
 *
 * Serena now uses HTTP client with SSE transport mode instead of subprocess pooling.
 * See: serena-http-client.ts
 *
 * Reason: Subprocess spawning per call prevented connection reuse (each npx tsx call
 * creates a fresh Node.js process, so singleton pool never persisted between calls).
 *
 * New architecture: Serena runs persistently in SSE mode on localhost:9121,
 * wrappers connect via HTTP (warm connections ~50-200ms vs 5-60s for subprocesses).
 *
 * ---
 *
 * ORIGINAL DOCUMENTATION (kept for reference):
 *
 * Single pooled connection with module affinity tracking.
 * Reduces latency from ~3-5s per call to ~2ms for warm connections.
 *
 * Architecture:
 * - Single connection per pool (not map-by-module)
 * - Async mutex for concurrency control
 * - TTL-based cleanup for idle connections
 * - Module switching triggers kill-and-respawn
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Mutex } from 'async-mutex';
import { serenaPoolLog } from './debug.js';

/**
 * Connection lifecycle states
 */
export type ConnectionState =
  | 'disconnected'  // No active connection
  | 'connecting'    // Connection in progress
  | 'idle'          // Connected, awaiting calls
  | 'in_use'        // Currently executing
  | 'expired';      // TTL exceeded, pending cleanup

/**
 * Pooled connection with metadata
 */
export interface PooledConnection {
  /** MCP SDK client instance */
  client: Client;

  /** Underlying transport (holds process reference) */
  transport: StdioClientTransport;

  /** Current state */
  state: ConnectionState;

  /** Module this connection is scoped to */
  currentModule: string;

  /** Timestamp of last activity (for TTL) */
  lastUsed: number;

  /** Connection creation timestamp */
  createdAt: number;

  /** Number of calls on this connection */
  callCount: number;
}

/**
 * Pool configuration
 */
export interface PoolConfig {
  /** Idle timeout in ms before connection is closed (default: 5 min) */
  idleTimeoutMs: number;

  /** Maximum calls per connection before forced refresh (default: 1000) */
  maxCallsPerConnection: number;

  /** Enable debug logging */
  debug: boolean;

  /** Circuit breaker configuration (optional) */
  circuitBreaker?: {
    /** Number of consecutive failures before opening circuit (default: 5) */
    failureThreshold: number;
    /** Time in ms to wait before attempting to close circuit (default: 60000) */
    resetTimeMs: number;
  };
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
  circuitState?: 'OPEN' | 'CLOSED';
  consecutiveFailures?: number;
}

/**
 * Serena Connection Pool implementation
 *
 * @example
 * ```typescript
 * const pool = new SerenaPoolImpl({
 *   idleTimeoutMs: 300_000,  // 5 minutes
 *   maxCallsPerConnection: 1000,
 *   debug: false
 * });
 *
 * // First call - creates connection (~3-5s)
 * const client1 = await pool.acquire('chariot', env);
 * // ... use client ...
 * pool.release();
 *
 * // Second call - reuses connection (~2ms)
 * const client2 = await pool.acquire('chariot', env);
 * ```
 */
export class SerenaPoolImpl {
  private connection: PooledConnection | null = null;
  private mutex: Mutex = new Mutex();
  private idleTimer: NodeJS.Timeout | null = null;

  // Circuit breaker state
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(private config: PoolConfig) {}

  /**
   * Acquire connection for target module
   *
   * If pool has idle connection for same module, reuses it.
   * If module differs, kills and creates new connection.
   *
   * Thread-safe via async mutex.
   *
   * @param targetModule - Module name for affinity tracking (e.g., 'chariot', 'nebula')
   * @param targetPath - Absolute path to pass to Serena CLI
   * @param env - Environment variables for Serena process
   * @returns MCP Client instance
   */
  async acquire(
    targetModule: string,
    targetPath: string,
    env: Record<string, string>
  ): Promise<Client> {
    // Check circuit breaker state (always check, even if config not explicitly set)
    if (Date.now() < this.circuitOpenUntil) {
      const resetTime = new Date(this.circuitOpenUntil).toISOString();
      throw new Error(
        `[Serena Pool] Circuit breaker OPEN. Retry after ${resetTime}`
      );
    }

    // Serialize all acquire operations with mutex
    const release = await this.mutex.acquire();

    try {
      // Check if max calls reached before reuse
      if (this.connection &&
          this.connection.callCount >= this.config.maxCallsPerConnection) {
        serenaPoolLog.info(`Max calls reached (${this.config.maxCallsPerConnection}), refreshing`);
        await this.disposeInternal();
        // Connection will be recreated below
      }

      // Check if we can reuse existing connection for same module
      if (
        this.connection &&
        this.connection.currentModule === targetModule &&
        (this.connection.state === 'idle' || this.connection.state === 'in_use')
      ) {
        // Verify connection is healthy before reuse
        if (!this.isTransportHealthy()) {
          serenaPoolLog.info('Connection unhealthy, refreshing');
          await this.disposeInternal();
          // Connection will be recreated below
        } else {
          // Clear idle timer when reusing connection
          this.clearIdleTimer();
          // Reuse existing connection (even if already in_use from concurrent call)
          this.connection.state = 'in_use';
          this.connection.lastUsed = Date.now();
          this.connection.callCount++;
          // Record success for circuit breaker
          this.recordSuccess();
          return this.connection.client;
        }
      }

      // Need new connection - dispose old one first
      if (this.connection) {
        await this.disposeInternal();
      }

      // Create new connection
      const conn = await this.createConnection(targetModule, targetPath, env);
      this.connection = conn;
      // Record success for circuit breaker
      this.recordSuccess();
      return conn.client;
    } catch (error) {
      // Record failure for circuit breaker when connection fails
      this.recordFailure();
      throw error;
    } finally {
      // Always release mutex
      release();
    }
  }

  /**
   * Release connection back to pool
   *
   * Transitions from in_use → idle and resets TTL timer.
   */
  release(): void {
    if (this.connection?.state === 'in_use') {
      this.connection.state = 'idle';
      this.connection.lastUsed = Date.now();
      // Start idle timeout timer
      this.startIdleTimer();
    }
  }

  /**
   * Force close and clean up
   *
   * Kills process, clears timers, resets state to disconnected.
   */
  async dispose(): Promise<void> {
    await this.disposeInternal();
  }

  /**
   * Get current pool statistics
   *
   * @returns Pool stats for debugging/monitoring
   */
  stats(): PoolStats {
    if (!this.connection) {
      return {
        state: 'disconnected',
        currentModule: null,
        callCount: 0,
        idleMs: 0,
        connectionAgeMs: 0,
        circuitState: Date.now() < this.circuitOpenUntil ? 'OPEN' : 'CLOSED',
        consecutiveFailures: this.consecutiveFailures,
      };
    }

    const now = Date.now();
    return {
      state: this.connection.state,
      currentModule: this.connection.currentModule,
      callCount: this.connection.callCount,
      idleMs: now - this.connection.lastUsed,
      connectionAgeMs: now - this.connection.createdAt,
      circuitState: Date.now() < this.circuitOpenUntil ? 'OPEN' : 'CLOSED',
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Perform health check on current connection
   *
   * Checks connection state, circuit breaker status, and transport health.
   *
   * @returns Health status with circuit breaker state and connection details
   *
   * @example
   * ```typescript
   * const health = await pool.healthCheck();
   * if (!health.healthy) {
   *   console.warn(`Pool unhealthy: ${health.details.circuitBreakerState}`);
   * }
   * ```
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      state: ConnectionState;
      circuitBreakerState: 'OPEN' | 'CLOSED';
      currentModule: string | null;
      callCount: number;
      consecutiveFailures: number;
    };
  }> {
    const circuitState = Date.now() < this.circuitOpenUntil ? 'OPEN' : 'CLOSED';
    const stats = this.stats();

    // Connection is healthy if:
    // 1. Connection exists and is not expired
    // 2. Circuit breaker is not OPEN
    // 3. Transport is connected (if we can verify)
    const healthy =
      this.connection !== null &&
      this.connection.state !== 'expired' &&
      circuitState === 'CLOSED' &&
      this.isTransportHealthy();

    return {
      healthy,
      details: {
        state: stats.state,
        circuitBreakerState: circuitState,
        currentModule: stats.currentModule,
        callCount: stats.callCount,
        consecutiveFailures: this.consecutiveFailures,
      },
    };
  }

  /**
   * Record successful call for circuit breaker
   * Resets consecutive failure count
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Record failed call for circuit breaker
   * Opens circuit after threshold consecutive failures
   */
  recordFailure(): void {
    // Use default config if not provided
    const cbConfig = this.config.circuitBreaker || {
      failureThreshold: 5,
      resetTimeMs: 60_000,
    };

    this.consecutiveFailures++;

    if (this.consecutiveFailures >= cbConfig.failureThreshold) {
      this.circuitOpenUntil = Date.now() + cbConfig.resetTimeMs;
      serenaPoolLog.warn(
        `Circuit breaker OPENED after ${this.consecutiveFailures} failures. ` +
        `Reset at ${new Date(this.circuitOpenUntil).toISOString()}`
      );
    }
  }

  /**
   * Verify transport connection is alive
   *
   * Checks if the underlying transport is still connected.
   * Prefers checking transport.connected property if available,
   * falls back to checking process state.
   *
   * @returns True if transport is healthy, false otherwise
   */
  private isTransportHealthy(): boolean {
    if (!this.connection) return false;

    // Access the transport directly (from PooledConnection)
    const transport = this.connection.transport as any;

    // First check: transport.connected property (if available)
    if ('connected' in transport) {
      return transport.connected === true;
    }

    // Second check: process state (for StdioClientTransport)
    if (transport?.process) {
      return !transport.process.killed && transport.process.exitCode === null;
    }

    // Assume healthy if we can't verify (transport structure might differ)
    return true;
  }

  /**
   * Create new connection to target module
   *
   * @param targetModule - Module name for affinity tracking
   * @param targetPath - Absolute path to pass to Serena CLI
   * @param env - Environment variables for Serena process
   */
  private async createConnection(
    targetModule: string,
    targetPath: string,
    env: Record<string, string>
  ): Promise<PooledConnection> {
    const transport = new StdioClientTransport({
      command: 'uvx',
      args: [
        '--from', 'git+https://github.com/oraios/serena',
        'serena', 'start-mcp-server',
        '--context', 'claude-code',
        '--project', targetPath,  // Use absolute path instead of module name
      ],
      env,
    });

    // Handle unexpected process exit/close
    transport.onclose = () => {
      serenaPoolLog.warn('Process closed unexpectedly');
      this.clearIdleTimer();  // Clear any pending timer
      this.connection = null;  // Mark as disconnected
    };

    // Handle transport errors
    transport.onerror = (error: Error) => {
      serenaPoolLog.error('Transport error:', error);
      this.clearIdleTimer();  // Clear any pending timer
      this.connection = null;  // Mark as disconnected
    };

    const client = new Client(
      { name: 'serena-pooled-client', version: '1.0.0' },
      { capabilities: {} }
    );

    try {
      await client.connect(transport);
    } catch (error) {
      // CLEANUP: Close transport if connect fails to prevent resource leak
      try {
        await transport.close();
      } catch (cleanupError) {
        // Ignore cleanup errors, original error is more important
        serenaPoolLog.debug('Transport cleanup failed:', cleanupError);
      }
      throw error; // Re-throw original connection error
    }

    return {
      client,
      transport,
      state: 'in_use',
      currentModule: targetModule,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      callCount: 1,
    };
  }

  /**
   * Internal dispose implementation with timeout protection
   */
  private async disposeInternal(): Promise<void> {
    if (!this.connection) return;

    // Clear any pending idle timer
    this.clearIdleTimer();

    // Set up 5-second timeout for dispose operation
    const timeoutHandle = setTimeout(() => {
      serenaPoolLog.warn('Dispose timed out, forcing cleanup');
      this.connection = null;
    }, 5000);

    try {
      // Race the cleanup against the timeout
      await Promise.race([
        (async () => {
          await this.connection!.client.close();
          await this.connection!.transport.close();
        })(),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            // If we reach here, the cleanup timed out
            resolve();
          }, 5000);
        }),
      ]);
    } catch (error) {
      // Log but don't throw during cleanup
      serenaPoolLog.debug('Cleanup error:', error);
    } finally {
      // Always clear the timeout and mark as disconnected
      clearTimeout(timeoutHandle);
      this.connection = null;
    }
  }

  /**
   * Check idle timeout and dispose if connection is idle
   * Protected for testing (can be called directly without timer)
   */
  protected checkIdleTimeout(): void {
    if (this.connection?.state === 'idle') {
      serenaPoolLog.info(`Idle timeout (${this.config.idleTimeoutMs}ms), disposing connection`);
      // Use async IIFE to properly await dispose
      void (async () => {
        try {
          await this.dispose();
        } catch (error) {
          serenaPoolLog.debug('Idle cleanup error:', error);
        }
      })();
    }
  }

  /**
   * Start idle timeout timer
   * Disposes connection after idleTimeoutMs of inactivity
   */
  private startIdleTimer(): void {
    this.clearIdleTimer();

    this.idleTimer = setTimeout(() => {
      this.checkIdleTimeout();
    }, this.config.idleTimeoutMs);
  }

  /**
   * Clear idle timeout timer
   */
  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}

/**
 * Default pool configuration
 */
export const DEFAULT_POOL_CONFIG: PoolConfig = {
  idleTimeoutMs: 300_000,     // 5 minutes
  maxCallsPerConnection: 1000,
  debug: false,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeMs: 60_000,
  },
};

/**
 * Register process cleanup handlers for graceful shutdown
 *
 * Handles SIGTERM, SIGINT, and uncaught exceptions to ensure
 * Serena process is cleaned up before exit.
 */
function registerCleanupHandlers(pool: SerenaPoolImpl): void {
  const cleanup = async () => {
    serenaPoolLog.info('Process exit, cleaning up...');
    await pool.dispose();
  };

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

  // Uncaught exception - cleanup before crashing
  process.on('uncaughtException', async (error) => {
    serenaPoolLog.error('Uncaught exception, cleaning up:', error);
    await cleanup();
    process.exit(1);
  });

  // Unhandled rejection - cleanup before crashing
  process.on('unhandledRejection', async (reason) => {
    serenaPoolLog.error('Unhandled rejection, cleaning up:', reason);
    await cleanup();
    process.exit(1);
  });
}

/**
 * Singleton pool instance (lazy initialization)
 */
let _singletonPool: SerenaPoolImpl | null = null;
let _handlersRegistered = false;

/**
 * Get singleton pool instance (lazy initialization)
 * Only registers cleanup handlers when actually used and not in test environment.
 */
export function getSerenaPool(): SerenaPoolImpl {
  if (!_singletonPool) {
    _singletonPool = new SerenaPoolImpl(DEFAULT_POOL_CONFIG);
    // Only register process handlers in production (not during tests)
    if (process.env.NODE_ENV !== 'test' && !_handlersRegistered) {
      registerCleanupHandlers(_singletonPool);
      _handlersRegistered = true;
    }
  }
  return _singletonPool;
}

/**
 * For testing: reset singleton and cleanup
 * @internal
 */
export async function resetSerenaPoolForTesting(): Promise<void> {
  if (_singletonPool) {
    await _singletonPool.dispose();
    _singletonPool = null;
  }
}

/**
 * @deprecated Legacy export removed to prevent import side effects.
 * This export created a singleton at module import time, which:
 * - Kept the Node.js process alive via 5-minute idle timer
 * - Prevented tests from exiting cleanly
 * - Could not be prevented by vi.mock() because it executed before hoisting
 *
 * Migration:
 *   Before: import { serenaPool } from './serena-pool';
 *   After:  import { getSerenaPool } from './serena-pool';
 *           const serenaPool = getSerenaPool();
 */
// REMOVED: export const serenaPool = getSerenaPool();
