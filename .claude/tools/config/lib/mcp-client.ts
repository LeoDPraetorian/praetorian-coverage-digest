/**
 * Shared MCP Client Infrastructure
 *
 * Generic MCP SDK client that works with any MCP server.
 * Shared across all MCP wrappers (Currents, GitHub, Atlassian, etc.)
 *
 * CRITICAL: Enables independent MCP connections (no Claude Code runtime dependency)
 * allowing MCPs to be DISABLED in settings for 98%+ token reduction.
 *
 * Security: All MCP calls have a 30-second timeout to prevent hanging.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { getToolConfig } from '../config-loader';
import { resolveProjectPath } from '../../../lib/find-project-root.js';

/**
 * Default timeout for MCP calls (30 seconds)
 * Can be overridden per-call via options
 */
export const DEFAULT_MCP_TIMEOUT_MS = 30_000;

/**
 * Wrap a promise with a timeout
 * Rejects with TimeoutError if the promise doesn't resolve within the specified time
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(
        `MCP operation timed out after ${timeoutMs}ms: ${operation}\n` +
        `This may indicate the MCP server is unresponsive or overloaded.`
      ));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * MCP Server Configuration
 *
 * Loaded from .mcp.json to determine how to connect to each MCP server
 */
interface MCPServerConfig {
  command: string;
  args: string[];
  envVars?: Record<string, string>;
}

/**
 * Get MCP server configuration from .mcp.json
 *
 * @param mcpName - Name of MCP server (e.g., 'currents', 'linear', 'github')
 * @returns Server configuration with command, args, and env vars
 */
function getMCPServerConfig(mcpName: string): MCPServerConfig {
  // In real implementation, would read from .mcp.json
  // For now, hardcoded configs based on .mcp.json
  const configs: Record<string, MCPServerConfig> = {
    // Note: Uses sh wrapper to suppress debug output (stderr)
    'currents': {
      command: 'sh',
      args: ['-c', 'npx -y @currents/mcp 2>/dev/null'],
      envVars: { 'CURRENTS_API_KEY': 'apiKey' }
    },
    'chrome-devtools': {
      command: 'npx',
      args: ['chrome-devtools-mcp@latest', '--browserUrl', 'http://localhost:9222'],
      envVars: {} // No authentication required
    },
    'context7': {
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp@latest'],
      envVars: { 'CONTEXT7_API_KEY': 'apiKey' }
    },
    'chariot': {
      command: 'go',
      args: ['run', resolveProjectPath('modules', 'chariot', 'backend', 'cmd', 'tools', 'chariot-mcp')],
      envVars: {} // No authentication (internal tool)
    },
    // Linear uses OAuth via mcp-remote (NO API KEY NEEDED)
    // - More secure: tokens stored in ~/.mcp-auth/, not in repo
    // - Auto-refresh: 7-day tokens with refresh_token rotation
    // - Granular scopes: only permissions explicitly granted
    // - User consent: explicit browser authorization required
    // Note: Uses sh wrapper to suppress mcp-remote debug output (stderr)
    'linear-mcp': {
      command: 'sh',
      args: ['-c', 'npx -y mcp-remote https://mcp.linear.app/sse 2>/dev/null'],
      envVars: { 'LINEAR_SCOPES': 'read,write,issues:create,admin' }
    },
    'linear': {
      command: 'sh',
      args: ['-c', 'npx -y mcp-remote https://mcp.linear.app/sse 2>/dev/null'],
      envVars: { 'LINEAR_SCOPES': 'read,write,issues:create,admin' }
    },
    'github': {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      envVars: { 'GITHUB_TOKEN': 'apiKey' }
    },
    'praetorian-cli': {
      command: 'praetorian',
      args: ['--profile', process.env.PRAETORIAN_PROFILE || 'demo', 'chariot', 'agent', 'mcp', 'start'],
      envVars: {} // Uses profile from ~/.praetorian/keychain.ini
    },
    'nebula': {
      command: 'go',
      args: ['run', resolveProjectPath('modules', 'nebula'), 'mcp-server'],
      envVars: {} // Uses local AWS credentials
    },
    'perplexity': {
      command: 'npx',
      args: ['-y', '@perplexity-ai/mcp-server'],
      envVars: { 'PERPLEXITY_API_KEY': 'apiKey' } // Uses apiKey from credentials.json
    }
  };

  const config = configs[mcpName];
  if (!config) {
    throw new Error(
      `MCP server '${mcpName}' not configured in shared client.\n` +
      `Check .mcp.json for configuration or add to shared client.\n` +
      `Available: ${Object.keys(configs).join(', ')}`
    );
  }

  return config;
}

/**
 * Default retry configuration
 */
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_DELAY_MS = 1000;
export const DEFAULT_RETRYABLE_ERRORS = ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'timed out'];

/**
 * Default response size limit (1MB)
 */
export const DEFAULT_MAX_RESPONSE_BYTES = 1_000_000;

/**
 * Per-service response size limits
 * Services not listed use DEFAULT_MAX_RESPONSE_BYTES
 */
export const SERVICE_SIZE_LIMITS: Record<string, number> = {
  'praetorian-cli': 10_000_000,  // 10MB - reasonable for paginated lists
};

/**
 * Error thrown when response exceeds size limit
 */
export class ResponseTooLargeError extends Error {
  constructor(
    public actualBytes: number,
    public maxBytes: number,
    public mcpName: string,
    public toolName: string
  ) {
    super(
      `Response too large: ${actualBytes.toLocaleString()} bytes exceeds limit of ${maxBytes.toLocaleString()} bytes\n` +
      `MCP: ${mcpName}\n` +
      `Tool: ${toolName}`
    );
    this.name = 'ResponseTooLargeError';
  }
}

/**
 * Options for MCP tool calls
 */
export interface MCPCallOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Maximum retry attempts for transient errors (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in ms, doubles each attempt (default: 1000) */
  retryDelayMs?: number;
  /** Error patterns that trigger retry (default: timeout, connection errors) */
  retryableErrors?: string[];
  /** Maximum response size in bytes (default: 1000000 = 1MB) */
  maxResponseBytes?: number;
}

/**
 * Sleep for the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (transient network/timeout errors)
 */
function isRetryableError(error: Error, retryablePatterns: string[]): boolean {
  const message = error.message.toLowerCase();
  return retryablePatterns.some(pattern => message.includes(pattern.toLowerCase()));
}

/**
 * Audit event types for MCP operations
 */
type AuditEventType = 'credential_access' | 'mcp_call_start' | 'mcp_call_success' | 'mcp_call_error';

/**
 * Audit log entry structure
 */
interface AuditLogEntry {
  timestamp: string;
  event: AuditEventType;
  mcpName: string;
  toolName?: string;
  success?: boolean;
  durationMs?: number;
  error?: string;
}

/**
 * Log an audit event if AUDIT_MCP_CALLS is enabled
 */
function logAuditEvent(entry: AuditLogEntry): void {
  if (!process.env.AUDIT_MCP_CALLS) {
    return;
  }

  const parts = [
    `[AUDIT]`,
    entry.timestamp,
    entry.event,
    `mcpName=${entry.mcpName}`,
  ];

  if (entry.toolName) {
    parts.push(`toolName=${entry.toolName}`);
  }

  if (entry.success !== undefined) {
    parts.push(`success=${entry.success}`);
  }

  if (entry.durationMs !== undefined) {
    parts.push(`durationMs=${entry.durationMs}`);
  }

  if (entry.error) {
    parts.push(`error="${entry.error}"`);
  }

  console.log(parts.join(' '));
}

/**
 * Call any MCP server tool via independent SDK connection
 *
 * Generic client that works with all MCP servers. Handles:
 * - Authentication via credentials.json
 * - Connection management
 * - Error handling
 * - Resource cleanup
 * - 30-second timeout (configurable)
 *
 * @param mcpName - MCP server name (e.g., 'currents', 'github')
 * @param toolName - MCP tool name (e.g., 'currents-get-projects')
 * @param params - Tool parameters
 * @param options - Optional settings (timeout, etc.)
 * @returns Tool response data
 *
 * @example
 * ```typescript
 * import { callMCPTool } from '../config/lib/mcp-client';
 *
 * // Currents (default 30s timeout)
 * const projects = await callMCPTool('currents', 'currents-get-projects', {});
 *
 * // GitHub with custom timeout
 * const repos = await callMCPTool('github', 'list-repositories', { org: 'acme' }, { timeoutMs: 60000 });
 * ```
 */
export async function callMCPTool<T = any>(
  mcpName: string,
  toolName: string,
  params: any = {},
  options: MCPCallOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_MCP_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const retryableErrors = options.retryableErrors ?? DEFAULT_RETRYABLE_ERRORS;
  const maxResponseBytes = options.maxResponseBytes ?? SERVICE_SIZE_LIMITS[mcpName] ?? DEFAULT_MAX_RESPONSE_BYTES;

  // MCPs that use external credentials (AWS CLI, system keychain, OAuth, etc.)
  // These don't need entries in credentials.json
  const usesExternalCredentials = [
    'nebula',           // Uses ~/.aws/credentials
    'praetorian-cli',   // Uses ~/.praetorian/keychain.ini
    'linear-mcp',       // Uses OAuth via ~/.mcp-auth/
    'chrome-devtools',  // No auth needed (local browser)
    'chariot',          // Internal tool, no auth
  ];

  // Get credentials from shared config (only once, not per retry)
  let credentials: any = {};
  if (!usesExternalCredentials.includes(mcpName)) {
    try {
      credentials = getToolConfig(mcpName);
      // Log credential access
      logAuditEvent({
        timestamp: new Date().toISOString(),
        event: 'credential_access',
        mcpName,
      });
    } catch (error) {
      // Some MCPs don't require credentials (e.g., local servers)
      console.warn(`No credentials found for ${mcpName}, continuing without auth`);
    }
  }

  // Log MCP call start
  const callStartTime = Date.now();
  logAuditEvent({
    timestamp: new Date().toISOString(),
    event: 'mcp_call_start',
    mcpName,
    toolName,
  });

  // Get MCP server configuration (only once, not per retry)
  const serverConfig = getMCPServerConfig(mcpName);

  // Build environment variables for MCP server
  // Filter out undefined values from process.env
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );

  // Suppress debug output from MCP processes (especially mcp-remote)
  // These environment variables disable common debug loggers
  env.DEBUG = '';           // Disable debug module
  env.NODE_DEBUG = '';      // Disable Node.js internal debug
  env.MCP_DEBUG = '0';      // Disable MCP debug if supported

  // Add credentials from credentials.json OR use literal values
  if (serverConfig.envVars) {
    for (const [envVar, credentialKeyOrValue] of Object.entries(serverConfig.envVars)) {
      if (credentials[credentialKeyOrValue]) {
        // Value is a key in credentials.json
        env[envVar] = credentials[credentialKeyOrValue];
      } else if (!credentialKeyOrValue.startsWith('$')) {
        // Value is a literal (not a variable reference)
        env[envVar] = credentialKeyOrValue;
      }
    }
  }

  let lastError: Error | null = null;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Create fresh connection for each attempt
    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env
    });

    const client = new Client(
      { name: `${mcpName}-wrapper-client`, version: '1.0.0' },
      { capabilities: {} }
    );

    try {
      // Connect to MCP server (with timeout)
      await withTimeout(
        client.connect(transport),
        timeoutMs,
        `connect to ${mcpName}`
      );

      // Call MCP tool (with timeout)
      const result = await withTimeout(
        client.callTool({
          name: toolName,
          arguments: params
        }),
        timeoutMs,
        `${mcpName}.${toolName}`
      );

      // Parse response - result.content is typed loosely, so we need type guards
      const contentArray = result.content as Array<{ type: string; text?: string }> | undefined;
      if (!contentArray || contentArray.length === 0) {
        throw new Error(`MCP tool ${toolName} returned no content`);
      }

      const content = contentArray[0];
      if (content.type !== 'text' || typeof content.text !== 'string') {
        throw new Error(`MCP tool ${toolName} returned non-text content: ${content.type}`);
      }

      // Check response size before parsing
      const responseBytes = content.text.length;
      if (responseBytes > maxResponseBytes) {
        throw new ResponseTooLargeError(responseBytes, maxResponseBytes, mcpName, toolName);
      }

      // Warn at 80% threshold
      if (responseBytes > maxResponseBytes * 0.8) {
        console.warn(
          `[MCP] Response size ${responseBytes.toLocaleString()} bytes approaching limit of ${maxResponseBytes.toLocaleString()} bytes ` +
          `(${Math.round((responseBytes / maxResponseBytes) * 100)}%)`
        );
      }

      // Close connection on success
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }

      // Log success
      logAuditEvent({
        timestamp: new Date().toISOString(),
        event: 'mcp_call_success',
        mcpName,
        toolName,
        success: true,
        durationMs: Date.now() - callStartTime,
      });

      // Parse JSON response (or return text if not JSON)
      try {
        return JSON.parse(content.text) as T;
      } catch {
        // Some MCP tools return plain text or error messages
        return content.text as T;
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Always close connection before potential retry or final throw
      try {
        await client.close();
      } catch {
        // Ignore close errors (connection may already be closed on timeout)
      }

      // Check if we should retry
      const shouldRetry = attempt < maxRetries && isRetryableError(lastError, retryableErrors);

      if (shouldRetry) {
        const delay = retryDelayMs * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
        console.warn(`[MCP] Retry ${attempt + 1}/${maxRetries} for ${mcpName}.${toolName} after ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // Not retryable or out of retries, throw final error
      // Log error
      logAuditEvent({
        timestamp: new Date().toISOString(),
        event: 'mcp_call_error',
        mcpName,
        toolName,
        success: false,
        durationMs: Date.now() - callStartTime,
        error: lastError.message.slice(0, 100), // Truncate long error messages
      });

      // Preserve ResponseTooLargeError without wrapping
      if (lastError instanceof ResponseTooLargeError) {
        throw lastError;
      }

      const errorMessage = lastError.message;
      const isTimeout = errorMessage.includes('timed out');
      const retriesUsed = attempt > 0 ? `\nRetries: ${attempt}/${maxRetries}` : '';

      throw new Error(
        `MCP call failed: ${errorMessage}\n` +
        `MCP: ${mcpName}\n` +
        `Tool: ${toolName}\n` +
        `Params: ${JSON.stringify(params, null, 2)}` +
        (isTimeout ? `\nTimeout: ${timeoutMs}ms` : '') +
        retriesUsed
      );
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Unexpected error in MCP call');
}

/**
 * Check if MCP server is available
 *
 * @param mcpName - MCP server name
 * @param testTool - Tool name to test (should be simple query like list/get projects)
 * @returns True if MCP responds, false otherwise
 */
export async function isMCPAvailable(mcpName: string, testTool: string): Promise<boolean> {
  try {
    await callMCPTool(mcpName, testTool, {});
    return true;
  } catch (error) {
    console.error(`MCP ${mcpName} not available:`, error);
    return false;
  }
}
