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

  constructor(options: PyGhidraHTTPClientOptions = {}) {
    // Determine port: explicit option > env var > default
    this.port = options.port ?? parseInt(process.env.PYGHIDRA_HTTP_PORT || '8001', 10);

    // Determine base URL
    this.baseUrl = options.baseUrl ?? `http://localhost:${this.port}`;

    // Default timeout: 5 minutes (Ghidra can be slow on cold start)
    this.defaultTimeoutMs = options.timeoutMs ?? 300_000;
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

    // Initialize session if needed
    if (!this.sessionId) {
      await this.initializeSession(timeoutMs);
    }

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
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
