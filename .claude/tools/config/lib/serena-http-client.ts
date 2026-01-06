/**
 * Serena HTTP Client for Streamable HTTP Transport Mode
 *
 * Connects to Serena running in Streamable HTTP mode (`--transport streamable-http`)
 * for persistent session-long connections per MCP 2025 spec.
 *
 * Architecture:
 * - Serena runs as persistent HTTP server on localhost:9121
 * - Sends JSON-RPC 2.0 requests via POST to /mcp
 * - Uses session management (mcp-session-id header)
 * - Warm connections: ~50-200ms (vs 5-60s for subprocess spawning)
 * - Cold start: ~5-10s (first call only)
 *
 * @module serena-http-client
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
 * Parameters for calling a Serena tool
 */
export interface SerenaCallToolParams {
  /** Tool name (e.g., 'find_symbol', 'get_symbols_overview') */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
}

/**
 * Result from calling a Serena tool (parsed from JSON-RPC response)
 */
export type SerenaCallToolResult = unknown;

/**
 * Health check result
 */
export interface SerenaHealthCheck {
  /** Whether Serena is reachable and healthy */
  healthy: boolean;
  /** Port Serena is running on */
  port: number;
  /** Response time in milliseconds */
  responseTimeMs?: number;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * Options for creating Serena HTTP client
 */
export interface SerenaHTTPClientOptions {
  /** Port Serena is running on (default: 9121 or SERENA_SSE_PORT env var) */
  port?: number;
  /** Base URL (overrides port, for custom hosts) */
  baseUrl?: string;
  /** Default timeout for requests in milliseconds */
  timeoutMs?: number;
}

/**
 * Options for individual tool calls
 */
export interface SerenaCallOptions {
  /** Timeout for this specific request */
  timeoutMs?: number;
}

/**
 * Options for health checks
 */
export interface SerenaHealthCheckOptions {
  /** Timeout for health check */
  timeoutMs?: number;
}

/**
 * Serena HTTP Client interface
 */
export interface SerenaHTTPClient {
  /**
   * Call a Serena tool via JSON-RPC
   * @param params Tool name and arguments
   * @param options Call-specific options
   * @returns Parsed tool result
   * @throws Error if call fails
   */
  callTool(params: SerenaCallToolParams, options?: SerenaCallOptions): Promise<SerenaCallToolResult>;

  /**
   * Activate a project (semantic routing)
   * @param projectPath Absolute path to project root
   * @param options Call-specific options
   * @returns Activation result
   */
  activateProject(projectPath: string, options?: SerenaCallOptions): Promise<unknown>;

  /**
   * Check if Serena is healthy and reachable
   * @param options Health check options
   * @returns Health status
   */
  healthCheck(options?: SerenaHealthCheckOptions): Promise<SerenaHealthCheck>;
}

/**
 * Serena HTTP Client implementation for Streamable HTTP transport
 */
class SerenaHTTPClientImpl implements SerenaHTTPClient {
  private readonly baseUrl: string;
  private readonly port: number;
  private readonly defaultTimeoutMs: number;
  private requestId = 1;
  private sessionId: string | null = null;

  constructor(options: SerenaHTTPClientOptions = {}) {
    // Determine port: explicit option > env var > default
    this.port = options.port ?? parseInt(process.env.SERENA_SSE_PORT || '9121', 10);

    // Determine base URL
    this.baseUrl = options.baseUrl ?? `http://localhost:${this.port}`;

    // Default timeout: 10 minutes (Serena can be slow on cold start)
    this.defaultTimeoutMs = options.timeoutMs ?? 600_000;
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
        throw new Error(`Invalid SSE response format: ${text.substring(0, 200)}`);
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
          name: 'serena-http-client',
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
   * Send JSON-RPC 2.0 request to Serena via Streamable HTTP
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
    params: SerenaCallToolParams,
    options?: SerenaCallOptions
  ): Promise<SerenaCallToolResult> {
    return this.sendJSONRPC('tools/call', {
      name: params.name,
      arguments: params.arguments,
    }, options);
  }

  async activateProject(
    projectPath: string,
    options?: SerenaCallOptions
  ): Promise<unknown> {
    return this.sendJSONRPC('tools/call', {
      name: 'activate_project',
      arguments: { project_path: projectPath },
    }, options);
  }

  async healthCheck(options?: SerenaHealthCheckOptions): Promise<SerenaHealthCheck> {
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

        if (error instanceof Error && error.name === 'AbortError') {
          return {
            healthy: false,
            port: this.port,
            error: `Health check timeout after ${timeoutMs}ms`,
          };
        }

        throw error;
      }
    } catch (error) {
      return {
        healthy: false,
        port: this.port,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create a new Serena HTTP client for Streamable HTTP transport
 *
 * @param options Client configuration options
 * @returns Serena HTTP client instance
 *
 * @example
 * ```typescript
 * // Use default port (9121 or SERENA_SSE_PORT env var)
 * const client = createSerenaHTTPClient();
 *
 * // Custom port
 * const client = createSerenaHTTPClient({ port: 9122 });
 *
 * // Custom base URL
 * const client = createSerenaHTTPClient({ baseUrl: 'http://remote-host:9121' });
 *
 * // Call a tool
 * const result = await client.callTool({
 *   name: 'find_symbol',
 *   arguments: { name_path_pattern: 'MyClass' }
 * });
 *
 * // Activate a project (semantic routing)
 * await client.activateProject('/path/to/chariot/module');
 *
 * // Health check
 * const health = await client.healthCheck();
 * if (!health.healthy) {
 *   console.error('Serena is not reachable:', health.error);
 * }
 * ```
 */
export function createSerenaHTTPClient(options?: SerenaHTTPClientOptions): SerenaHTTPClient {
  return new SerenaHTTPClientImpl(options);
}
