/**
 * PyGhidra HTTP Client for Streamable HTTP Transport Mode
 *
 * Connects to PyGhidra running in Streamable HTTP mode (`uvx pyghidra-mcp -t streamable-http`)
 * for persistent session-long connections per MCP 2025 spec.
 *
 * Architecture:
 * - PyGhidra runs as persistent HTTP server on localhost:8001
 * - Sends JSON-RPC 2.0 requests via POST to /mcp
 * - Uses session management (mcp-session-id header)
 * - Warm connections: ~50-200ms (vs 3-5s for subprocess spawning)
 * - Cold start: ~3-5s (first call only - Ghidra JVM initialization)
 *
 * Performance Benefits:
 * - Ghidra project stays loaded in memory
 * - Binary analysis results cached
 * - ~100x faster for subsequent calls
 *
 * @module pyghidra-http-client
 */

import { PyGhidraMetrics, createMetrics, type MetricsSummary } from '../../pyghidra/lib/metrics.js';
import { ServerUnavailableError } from '../../pyghidra/lib/errors.js';

/**
 * JSON-RPC 2.0 request structure
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 response structure (success)
 */
interface JSONRPCSuccessResponse {
  jsonrpc: '2.0';
  id: number;
  result: {
    content?: Array<{ type: string; text?: string }>;
    tools?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
}

/**
 * JSON-RPC 2.0 response structure (error)
 */
interface JSONRPCErrorResponse {
  jsonrpc: '2.0';
  id: number | string;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse;

/**
 * Parameters for calling a PyGhidra tool
 */
export interface PyGhidraCallToolParams {
  /** Tool name (e.g., 'search_code', 'decompile_function') */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
}

/**
 * Result from calling a PyGhidra tool (parsed from JSON-RPC response)
 */
export type PyGhidraCallToolResult = unknown;

/**
 * Health check result
 */
export interface PyGhidraHealthCheck {
  /** Whether PyGhidra is reachable and healthy */
  healthy: boolean;
  /** Port PyGhidra is running on */
  port: number;
  /** Response time in milliseconds */
  responseTimeMs?: number;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * Options for creating PyGhidra HTTP client
 */
export interface PyGhidraHTTPClientOptions {
  /** Port PyGhidra is running on (default: 8001 or PYGHIDRA_HTTP_PORT env var) */
  port?: number;
  /** Base URL (overrides port, for custom hosts) */
  baseUrl?: string;
  /** Default timeout for requests in milliseconds */
  timeoutMs?: number;
}

/**
 * Options for individual tool calls
 */
export interface PyGhidraCallOptions {
  /** Timeout for this specific request */
  timeoutMs?: number;
}

/**
 * Options for health checks
 */
export interface PyGhidraHealthCheckOptions {
  /** Timeout for health check */
  timeoutMs?: number;
}

/**
 * PyGhidra HTTP Client interface
 */
export interface PyGhidraHTTPClient {
  /**
   * Call a PyGhidra tool via JSON-RPC
   * @param params Tool name and arguments
   * @param options Call-specific options
   * @returns Parsed tool result
   * @throws Error if call fails
   */
  callTool(params: PyGhidraCallToolParams, options?: PyGhidraCallOptions): Promise<PyGhidraCallToolResult>;

  /**
   * Check if PyGhidra is healthy and reachable
   * @param options Health check options
   * @returns Health status
   */
  healthCheck(options?: PyGhidraHealthCheckOptions): Promise<PyGhidraHealthCheck>;

  /**
   * Get performance and reliability metrics
   * @returns Metrics summary
   */
  getMetrics(): MetricsSummary;

  /**
   * Reset all collected metrics
   */
  resetMetrics(): void;
}

/**
 * PyGhidra HTTP Client implementation for Streamable HTTP transport
 */
class PyGhidraHTTPClientImpl implements PyGhidraHTTPClient {
  private readonly baseUrl: string;
  private readonly port: number;
  private readonly defaultTimeoutMs: number;
  private requestId = 1;
  private sessionId: string | null = null;
  private sessionInitializedAt: number | null = null;
  private consecutiveFailures = 0;
  private readonly SESSION_STALENESS_MS = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_RETRIES = 3;
  private readonly metrics: PyGhidraMetrics;

  constructor(options: PyGhidraHTTPClientOptions = {}) {
    // Determine port: explicit option > env var > default
    this.port = options.port ?? parseInt(process.env.PYGHIDRA_HTTP_PORT || '8001', 10);

    // Determine base URL
    this.baseUrl = options.baseUrl ?? `http://localhost:${this.port}`;

    // Default timeout: 5 minutes (Ghidra can be slow on cold start)
    this.defaultTimeoutMs = options.timeoutMs ?? 300_000;

    // Initialize metrics collector
    this.metrics = createMetrics();
  }

  /**
   * Check if session is stale (30 minutes idle)
   */
  private isSessionStale(): boolean {
    if (!this.sessionInitializedAt) {
      return false;
    }
    return Date.now() - this.sessionInitializedAt > this.SESSION_STALENESS_MS;
  }

  /**
   * Reset session state
   */
  private resetSession(): void {
    this.sessionId = null;
    this.sessionInitializedAt = null;
    this.metrics.recordSessionReset();
  }

  /**
   * Parse SSE response format
   * SSE responses look like: "event: message\ndata: {...json...}"
   */
  private parseSSEResponse(text: string): JSONRPCResponse {
    const lines = text.split('\n');
    let jsonData = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        jsonData = line.substring(6);
        break;
      }
    }

    if (!jsonData) {
      // Try parsing entire response as JSON (some responses may not use SSE format)
      try {
        return JSON.parse(text) as JSONRPCResponse;
      } catch {
        throw new Error(`Invalid response format: ${text.substring(0, 200)}`);
      }
    }

    return JSON.parse(jsonData) as JSONRPCResponse;
  }

  /**
   * Initialize session by sending initialize request
   */
  private async initializeSession(timeoutMs: number): Promise<void> {
    const id = this.requestId++;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'pyghidra-http-client',
          version: '1.0.0',
        },
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      // Get session ID from response header
      const newSessionId = response.headers.get('mcp-session-id');
      if (newSessionId) {
        this.sessionId = newSessionId;
        this.sessionInitializedAt = Date.now();
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
      }

      // Read and validate response
      const text = await response.text();
      const jsonResponse = this.parseSSEResponse(text);

      if ('error' in jsonResponse) {
        throw new Error(`Initialize failed: ${jsonResponse.error.message}`);
      }

      // Reset failure counter on successful initialization
      this.consecutiveFailures = 0;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send JSON-RPC 2.0 request to PyGhidra via Streamable HTTP
   */
  private async sendJSONRPC(
    method: string,
    params: Record<string, unknown>,
    options?: { timeoutMs?: number }
  ): Promise<unknown> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    // Check for session staleness and reset if needed
    if (this.isSessionStale()) {
      this.resetSession();
    }

    // Initialize session if needed
    if (!this.sessionId) {
      await this.initializeSession(timeoutMs);
    }

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.sendJSONRPCAttempt(method, params, timeoutMs);
      } catch (error) {
        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.MAX_RETRIES;

        if (!isRetryable || isLastAttempt) {
          this.consecutiveFailures++;
          throw error;
        }

        // Exponential backoff: 100ms, 200ms, 400ms
        const delayMs = 100 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));

        // If 401 or invalid session, reset and retry
        if (this.is401Error(error) || this.isInvalidSessionError(error)) {
          this.resetSession();
          await this.initializeSession(timeoutMs);
        }
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();

    // Retryable: network errors, timeouts, server errors
    return (
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('timeout') ||
      message.includes('http 5') || // 5xx errors
      message.includes('401') || // Unauthorized (session expired)
      message.includes('invalid session')
    );
  }

  /**
   * Check if error is 401 Unauthorized
   */
  private is401Error(error: unknown): boolean {
    return error instanceof Error && error.message.includes('401');
  }

  /**
   * Check if error indicates invalid session
   */
  private isInvalidSessionError(error: unknown): boolean {
    return error instanceof Error && error.message.toLowerCase().includes('invalid session');
  }

  /**
   * Single attempt to send JSON-RPC request
   */
  private async sendJSONRPCAttempt(
    method: string,
    params: Record<string, unknown>,
    timeoutMs: number
  ): Promise<unknown> {
    const startTime = Date.now();
    const id = this.requestId++;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      };

      // Include session ID if we have one
      if (this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;
      }

      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      // Update session ID if returned
      const newSessionId = response.headers.get('mcp-session-id');
      if (newSessionId) {
        this.sessionId = newSessionId;
        this.sessionInitializedAt = Date.now(); // Update staleness timestamp
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
      }

      const text = await response.text();
      const jsonResponse = this.parseSSEResponse(text);

      // Check for JSON-RPC error
      if ('error' in jsonResponse) {
        throw new Error(`JSON-RPC error (${jsonResponse.error.code}): ${jsonResponse.error.message}`);
      }

      // Parse result based on method
      const { result } = jsonResponse;

      // For tools/call, extract content
      if (method === 'tools/call' && result.content && result.content.length > 0) {
        const content = result.content[0];
        if (content.type !== 'text') {
          throw new Error(`Non-text content type: ${content.type}`);
        }

        if (typeof content.text !== 'string') {
          throw new Error('Missing text field in content');
        }

        // Try to parse as JSON, fall back to plain text
        try {
          return JSON.parse(content.text);
        } catch {
          return content.text;
        }
      }

      // For other methods, return result as-is
      // Reset consecutive failures on success
      this.consecutiveFailures = 0;

      // Record successful request with response time
      const responseTime = Date.now() - startTime;
      this.metrics.recordSuccess(responseTime);

      return result;
    } catch (error) {
      // Record failure
      this.metrics.recordFailure();

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      // Check if server unavailable
      if (this.isServerUnavailableError(error)) {
        throw this.createServerUnavailableError();
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if error indicates server unavailability
   */
  private isServerUnavailableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    return (
      message.includes('econnrefused') ||
      message.includes('fetch failed') ||
      message.includes('network')
    );
  }

  /**
   * Create ServerUnavailableError with recovery suggestions
   */
  private createServerUnavailableError(): Error {
    const suggestions = [
      'Run ./start-server.sh to start the PyGhidra server',
      'Check server status with ./server-status.sh',
      `Verify server is running on port ${this.port}`,
      'Review server logs at .claude/tools/pyghidra/.server.log',
    ];

    if (this.consecutiveFailures >= 3) {
      suggestions.push('Multiple failures detected - consider restarting the server with ./restart-server.sh');
    }

    return new ServerUnavailableError(this.port, suggestions);
  }

  async callTool(
    params: PyGhidraCallToolParams,
    options?: PyGhidraCallOptions
  ): Promise<PyGhidraCallToolResult> {
    return this.sendJSONRPC('tools/call', {
      name: params.name,
      arguments: params.arguments,
    }, options);
  }

  async healthCheck(options?: PyGhidraHealthCheckOptions): Promise<PyGhidraHealthCheck> {
    const startTime = Date.now();
    const timeoutMs = options?.timeoutMs ?? 5000; // Health checks should be fast

    try {
      // Try to call tools/list as a health check
      // This validates both connectivity and session handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // Initialize session if needed
        if (!this.sessionId) {
          await this.initializeSession(timeoutMs);
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        };

        if (this.sessionId) {
          headers['mcp-session-id'] = this.sessionId;
        }

        const response = await fetch(`${this.baseUrl}/mcp`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: this.requestId++,
            method: 'tools/list',
            params: {},
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseTimeMs = Date.now() - startTime;

        if (!response.ok) {
          return {
            healthy: false,
            port: this.port,
            responseTimeMs,
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        return {
          healthy: true,
          port: this.port,
          responseTimeMs,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      return {
        healthy: false,
        port: this.port,
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getMetrics(): MetricsSummary {
    return this.metrics.getMetrics();
  }

  resetMetrics(): void {
    this.metrics.resetMetrics();
  }
}

/**
 * Create PyGhidra HTTP client for persistent connections
 *
 * @param options Client configuration
 * @returns PyGhidra HTTP client instance
 *
 * @example
 * ```typescript
 * const client = createPyghidraHTTPClient({ port: 8001 });
 * const result = await client.callTool({
 *   name: 'search_code',
 *   arguments: { binary_name: 'test.bin', query: 'main', limit: 5 }
 * });
 * ```
 */
export function createPyghidraHTTPClient(
  options?: PyGhidraHTTPClientOptions
): PyGhidraHTTPClient {
  return new PyGhidraHTTPClientImpl(options);
}
