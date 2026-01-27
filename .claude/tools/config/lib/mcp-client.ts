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

import * as path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { execFileSync } from 'child_process';
import { resolveProjectPath, findProjectRoot } from '../../../lib/find-project-root.js';
import { routeToSerena } from '../../serena/semantic-router.js';
import { createSerenaHTTPClient } from './serena-http-client.js';
import { createPyghidraHTTPClient } from './pyghidra-http-client.js';
import { serenaLog, mcpLog, isDebugEnabled } from './debug.js';
import {
  getDefaultSecretsProvider,
  type SecretsProvider,
  type SecretErrorCode,
} from './secrets-provider.js';
import { getItemName } from '../../1password/lib/config.js';

// Global type declarations for Serena semantic routing state
declare global {
  var __serenaCurrentModule: string | null;
}

/**
 * Result of credential resolution attempt
 *
 * Discriminated union for explicit handling of each outcome:
 * - 'success': Credentials retrieved, use them
 * - 'not_configured': Service not in 1Password, continue without auth
 * - 'auth_failed': 1Password error, surface to user (do NOT proceed)
 */
export type CredentialResult =
  | { status: 'success'; credentials: Record<string, string> }
  | { status: 'not_configured'; reason: string }
  | { status: 'auth_failed'; error: string; code: SecretErrorCode };

/**
 * Error thrown when credential retrieval fails for a service that requires auth
 */
export class CredentialError extends Error {
  constructor(
    public mcpName: string,
    public originalError: string,
    public code: SecretErrorCode
  ) {
    super(CredentialError.formatMessage(mcpName, originalError, code));
    this.name = 'CredentialError';
  }

  static formatMessage(mcpName: string, error: string, code: SecretErrorCode): string {
    const action = CredentialError.getActionForCode(code);
    return `Failed to get credentials for ${mcpName}\n\nError: ${error}\nCode: ${code}\n\nAction: ${action}`;
  }

  static getActionForCode(code: SecretErrorCode): string {
    switch (code) {
      case 'AUTH_REQUIRED':
        return 'Please complete Touch ID authentication and try again.';
      case 'NOT_SIGNED_IN':
        return 'Please connect 1Password CLI to the desktop app (Settings > Developer > CLI Integration).';
      case 'NOT_FOUND':
        return 'Create the missing item in your 1Password vault.';
      case 'NOT_CONFIGURED':
        return 'Add this service to DEFAULT_CONFIG.serviceItems in .claude/tools/1password/lib/config.ts';
      case 'PROVIDER_ERROR':
      default:
        return 'Check 1Password CLI is installed and configured correctly.';
    }
  }
}

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
 * Serena routing result with metadata for observability
 */
interface SerenaRoutingResult {
  args: string[];
  routedTo: string;
  semanticContext?: string;
  wasRouted: boolean;
}

/**
 * Track last Serena routing for observability
 * Accessible via getLastSerenaRouting() for debugging
 */
let lastSerenaRouting: SerenaRoutingResult | null = null;

/**
 * Get the last Serena routing decision for debugging
 */
export function getLastSerenaRouting(): SerenaRoutingResult | null {
  return lastSerenaRouting;
}

/**
 * Get Serena args with semantic routing
 *
 * If semanticContext is provided, routes to the most relevant module.
 * Otherwise, falls back to --project-from-cwd (full super-repo scan).
 *
 * @param semanticContext - Optional query for semantic routing
 * @returns Array of CLI args for Serena
 */
function getSerenaArgs(semanticContext?: string): string[] {
  const baseArgs = [
    '--from', 'git+https://github.com/oraios/serena',
    'serena', 'start-mcp-server',
    '--context', 'claude-code',
  ];

  if (!semanticContext) {
    // No context provided - fall back to project-from-cwd
    // This will be slow for super-repos but works as fallback
    lastSerenaRouting = {
      args: [...baseArgs, '--project-from-cwd'],
      routedTo: 'super-repo (no semanticContext provided)',
      wasRouted: false,
    };

    // Log warning - this is the slow path
    serenaLog.warn('⚠️  No semanticContext - using --project-from-cwd (SLOW)');

    return lastSerenaRouting.args;
  }

  try {
    const projectRoot = findProjectRoot();
    const { args: routedArgs, scopeDescription } = routeToSerena(semanticContext, projectRoot);

    lastSerenaRouting = {
      args: [...baseArgs, ...routedArgs],
      routedTo: scopeDescription,
      semanticContext,
      wasRouted: true,
    };

    // Log routing decision (only in debug mode)
    serenaLog.info(`✓ Routed: ${scopeDescription}`);

    return lastSerenaRouting.args;
  } catch (error) {
    // If routing fails, fall back to project-from-cwd
    lastSerenaRouting = {
      args: [...baseArgs, '--project-from-cwd'],
      routedTo: 'super-repo (routing failed)',
      semanticContext,
      wasRouted: false,
    };

    serenaLog.warn('⚠️  Routing failed, using --project-from-cwd:', error);
    return lastSerenaRouting.args;
  }
}

/**
 * Resolve Salesforce org username from multiple sources with priority
 *
 * Priority (highest to lowest):
 * 1. SALESFORCE_ORG_USERNAME environment variable
 * 2. SF CLI default org (sf config get target-org --json)
 * 3. orgUsername from credentials.json
 * 4. DEFAULT_TARGET_ORG (fallback)
 *
 * @param credentials - Credentials object (may contain orgUsername)
 * @returns Resolved org username
 */
function resolveSalesforceOrg(credentials: any): string {
  // Priority 1: Environment variable
  if (process.env.SALESFORCE_ORG_USERNAME) {
    return process.env.SALESFORCE_ORG_USERNAME;
  }

  // Priority 2: SF CLI default org
  try {
    const stdout = execFileSync('sf', ['config', 'get', 'target-org', '--json'], {
      encoding: 'utf-8',
      timeout: 5000, // 5 second timeout
    }) as string;

    const result = JSON.parse(stdout);
    if (result?.result?.[0]?.value) {
      return result.result[0].value;
    }
  } catch (error) {
    // SF CLI not installed, no default org, or other error - continue to next priority
  }

  // Priority 3: credentials.json orgUsername
  if (credentials.orgUsername) {
    return credentials.orgUsername;
  }

  // Priority 4: Fallback to DEFAULT_TARGET_ORG
  return 'DEFAULT_TARGET_ORG';
}

/**
 * Get Salesforce MCP args dynamically based on available credentials
 *
 * Scenarios:
 * 1. No credentials → DEFAULT_TARGET_ORG (uses SF CLI session)
 * 2. orgUsername only → Use that username
 * 3. Full JWT (orgUsername + clientId + jwtKeyFile) → Add JWT flags
 *
 * Uses multi-source org resolution:
 * - SALESFORCE_ORG_USERNAME env var (highest priority)
 * - SF CLI default org (sf config get target-org)
 * - credentials.json orgUsername
 * - DEFAULT_TARGET_ORG fallback
 *
 * @param credentials - Credentials from credentials.json
 * @returns Array of args for Salesforce MCP
 */
function getSalesforceArgs(credentials: any): string[] {
  const baseArgs = ['-y', '@salesforce/mcp'];

  // Resolve org username from multiple sources
  const orgUsername = resolveSalesforceOrg(credentials);

  // Scenario 3: Full JWT authentication (all required fields present)
  if (credentials.orgUsername && credentials.clientId && credentials.jwtKeyFile) {
    return [
      ...baseArgs,
      '-o',
      orgUsername, // Use resolved org (may differ from credentials.orgUsername)
      '--toolsets',
      'all',
      '--client-id',
      credentials.clientId,
      '--jwt-key-file',
      credentials.jwtKeyFile,
    ];
  }

  // Scenario 2 & 1: Org username only or no credentials
  // (orgUsername is already resolved to the correct value)
  return [...baseArgs, '-o', orgUsername, '--toolsets', 'all'];
}

/**
 * Get MCP server configuration from .mcp.json
 *
 * @param mcpName - Name of MCP server (e.g., 'currents', 'linear', 'github')
 * @param semanticContext - Optional context for semantic routing (Serena only)
 * @param credentials - Optional credentials (injected for testing, loaded internally if not provided)
 * @returns Server configuration with command, args, and env vars
 */
export function getMCPServerConfig(
  mcpName: string,
  semanticContext?: string,
  credentials?: any
): MCPServerConfig {
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
      envVars: { 'GITHUB_TOKEN': 'apiKey' } // Expected in process.env (set via ~/.zshrc or ~/.bashrc)
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
    },
    'serena': {
      command: 'uvx',
      // Args generated dynamically via getSerenaArgs() with semantic routing
      args: getSerenaArgs(semanticContext),
      envVars: {} // No authentication required (local tool)
    },
    'ghydra': {
      command: 'npx',
      args: ['-y', 'ghydra-mcp'],
      envVars: {} // No authentication required (connects to local Ghidra instances)
    },
    'pyghidra': {
      command: 'uvx',
      args: ['pyghidra-mcp'],
      envVars: {} // Uses GHIDRA_INSTALL_DIR from environment
    },
    // Salesforce MCP (Official @salesforce/mcp)
    // Supports 3 auth modes:
    // 1. SF CLI session (DEFAULT_TARGET_ORG) - no credentials needed
    // 2. Org username from credentials.json - uses SF CLI auth for that org
    // 3. JWT auth - full credentials (orgUsername + clientId + jwtKeyFile)
    'salesforce': {
      command: 'npx',
      args: getSalesforceArgs(credentials || {}), // Dynamic args based on credentials
      envVars: {}
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
 * Resolve credentials for an MCP service
 *
 * Returns a CredentialResult discriminated union for explicit handling.
 * DOES NOT THROW - callers must handle all status values.
 *
 * @param mcpName - Service name (e.g., 'perplexity', 'currents')
 * @param provider - SecretsProvider instance
 * @returns CredentialResult with status: 'success' | 'not_configured' | 'auth_failed'
 */
async function resolveCredentialsAsync(
  mcpName: string,
  provider: SecretsProvider = getDefaultSecretsProvider()
): Promise<CredentialResult> {
  // Check if service is configured in 1Password
  try {
    getItemName(mcpName);
  } catch {
    // Service not configured - this is OK, continue without auth
    return {
      status: 'not_configured',
      reason: `Service '${mcpName}' not configured in 1Password`
    };
  }

  // Service IS configured - credentials are REQUIRED
  const result = await provider.getSecret(mcpName, 'apiKey');

  if (result.ok) {
    return {
      status: 'success',
      credentials: { apiKey: result.value }
    };
  } else {
    // Auth failed - return error for caller to handle
    return {
      status: 'auth_failed',
      error: result.error,
      code: result.code
    };
  }
}

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
  'serena': 5_000_000,           // 5MB - symbol bodies can be large with include_body=true
};

/**
 * Per-service timeout overrides
 * Services not listed use DEFAULT_MCP_TIMEOUT_MS (30s)
 *
 * Serena needs longer timeout for Go modules with large go.work workspaces.
 * gopls loads entire workspace (1000+ packages) on cold start (~30-40s).
 * 5 minutes allows for cold start + LSP initialization + actual query.
 */
export const SERVICE_TIMEOUTS: Record<string, number> = {
  'serena': 600_000,  // 10 min - Go workspace cold start with gopls can take 3-4 min on large go.work
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
 * MCP Port Interface (Hexagonal Architecture)
 *
 * Explicit contract for MCP communication. All MCP wrappers depend on this
 * abstraction, not the concrete implementation. This enables:
 *
 * - **Testability**: Mock the port without vi.mock() module mocking
 * - **Swappability**: Add CachingMCPPort, BatchingMCPPort, etc.
 * - **Documentation**: Contract is visible and explicit
 *
 * @example Testing with port injection
 * ```typescript
 * const mockPort: MCPPort = {
 *   callTool: vi.fn().mockResolvedValue({ issues: [] })
 * };
 * const adapter = new ListIssuesAdapter(mockPort);
 * ```
 *
 * @example Multiple implementations
 * ```typescript
 * class CachingMCPPort implements MCPPort {
 *   constructor(private delegate: MCPPort, private cache: Map<string, any>) {}
 *   async callTool<T>(...args): Promise<T> {
 *     const key = JSON.stringify(args);
 *     if (this.cache.has(key)) return this.cache.get(key);
 *     const result = await this.delegate.callTool(...args);
 *     this.cache.set(key, result);
 *     return result;
 *   }
 * }
 * ```
 */
export interface MCPPort {
  callTool<T = unknown>(
    mcpName: string,
    toolName: string,
    params?: unknown,
    options?: MCPCallOptions
  ): Promise<T>;
}

/**
 * Options for MCP tool calls
 */
export interface MCPCallOptions {
  /** Timeout in milliseconds (default: 30000, or per-service override) */
  timeoutMs?: number;
  /** Maximum retry attempts for transient errors (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in ms, doubles each attempt (default: 1000) */
  retryDelayMs?: number;
  /** Error patterns that trigger retry (default: timeout, connection errors) */
  retryableErrors?: string[];
  /** Maximum response size in bytes (default: 1000000 = 1MB) */
  maxResponseBytes?: number;
  /**
   * Semantic context for intelligent routing (Serena only)
   *
   * When provided for Serena calls, the semantic router analyzes this
   * query to determine which module to scope Serena to, avoiding
   * full super-repo scanning.
   *
   * @example
   * ```typescript
   * await callMCPTool('serena', 'find-symbol', { name_path_pattern: 'Asset' }, {
   *   semanticContext: 'Find the Asset class in the React frontend'
   * });
   * ```
   */
  semanticContext?: string;
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

  mcpLog.debug(parts.join(' '));
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
  // Use per-service timeout if not explicitly overridden
  const timeoutMs = options.timeoutMs ?? SERVICE_TIMEOUTS[mcpName] ?? DEFAULT_MCP_TIMEOUT_MS;
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
    'linear',           // Uses OAuth via ~/.claude-oauth/ (clientId is PUBLIC, not in 1Password)
    'chrome-devtools',  // No auth needed (local browser)
    'chariot',          // Internal tool, no auth
    'serena',           // No auth needed (local tool)
    'pyghidra',         // Uses GHIDRA_INSTALL_DIR from environment
    'ghydra',           // No auth needed (connects to local Ghidra instances)
    'github',           // Uses GITHUB_TOKEN from environment
    // NOTE: salesforce NOT in this list - it can use credentials.json for JWT,
    // or fall back to SF CLI auth if no credentials present
  ];

  // Get credentials from shared config (only once, not per retry)
  let credentials: Record<string, string> = {};
  if (!usesExternalCredentials.includes(mcpName)) {
    const credResult = await resolveCredentialsAsync(mcpName);

    switch (credResult.status) {
      case 'success':
        credentials = credResult.credentials;
        logAuditEvent({
          timestamp: new Date().toISOString(),
          event: 'credential_access',
          mcpName,
        });
        break;

      case 'not_configured':
        // Service doesn't use 1Password - this is OK
        mcpLog.info(`${mcpName}: ${credResult.reason}`);
        break;

      case 'auth_failed':
        // Credential retrieval FAILED - surface to user (DO NOT PROCEED)
        throw new CredentialError(
          mcpName,
          credResult.error,
          credResult.code
        );
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
  // Pass semanticContext for Serena semantic routing
  // Pass credentials for Salesforce JWT auth
  const serverConfig = getMCPServerConfig(mcpName, options.semanticContext, credentials);

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

  // For Serena: Disable go.work workspace detection
  // Without this, gopls loads ALL 1276 packages from go.work (takes 30-40s)
  // With GOWORK=off, gopls only indexes the target module (~1s)
  if (mcpName === 'serena') {
    env.GOWORK = 'off';
  }

  // REMOVED: Legacy credentials.json injection (2026-01-25)
  // All credential resolution now uses resolveCredentialsAsync() → 1Password
  // Tools without 1Password config must be in usesExternalCredentials list
  //
  // Previous code (lines 652-663):
  // if (serverConfig.envVars) {
  //   for (const [envVar, credentialKeyOrValue] of Object.entries(serverConfig.envVars)) {
  //     if (credentials[credentialKeyOrValue]) {
  //       env[envVar] = credentials[credentialKeyOrValue];
  //     } else if (!credentialKeyOrValue.startsWith('$')) {
  //       env[envVar] = credentialKeyOrValue;
  //     }
  //   }
  // }

  // Inject resolved credentials into MCP server environment
  // Maps credential keys (e.g., 'apiKey') to env vars (e.g., 'CURRENTS_API_KEY')
  if (serverConfig.envVars && Object.keys(credentials).length > 0) {
    for (const [envVar, credentialKey] of Object.entries(serverConfig.envVars)) {
      if (credentials[credentialKey]) {
        env[envVar] = credentials[credentialKey];
      }
    }
  }

  // Special handling for Serena - use HTTP client (SSE transport mode)
  if (mcpName === 'serena') {
    // Create HTTP client (connects to Serena running in SSE mode on localhost:9121)
    const httpClient = createSerenaHTTPClient();

    // Get routing info for semantic module switching
    const projectRoot = findProjectRoot();
    const routing = routeToSerena(options.semanticContext || '', projectRoot);
    const targetModule = routing.primaryModule;

    // Compute absolute path for activate_project call
    const targetPath = routing.allMatches.length > 0
      ? path.join(projectRoot, routing.allMatches[0].path)
      : projectRoot;  // Fallback to project root if no matches

    // Track current active module for semantic routing
    // NOTE: In persistent SSE mode, we need to call activate_project when module changes
    // This is stored at module level to persist across calls
    if (!global.__serenaCurrentModule) {
      global.__serenaCurrentModule = null;
    }

    // Call activate_project if module changed (semantic routing)
    if (global.__serenaCurrentModule !== targetPath) {
      serenaLog.info(`[Serena] Module switch: ${global.__serenaCurrentModule || 'none'} → ${targetModule}`);
      try {
        await httpClient.activateProject(targetPath, { timeoutMs: 30_000 });
        global.__serenaCurrentModule = targetPath;
        serenaLog.info(`[Serena] ✓ Activated module: ${targetModule}`);
      } catch (error) {
        serenaLog.warn(`[Serena] Failed to activate project: ${error instanceof Error ? error.message : String(error)}`);
        // Continue anyway - the call might still work
      }
    }

    // Retry configuration for Serena (matches DEFAULT_MAX_RETRIES for consistency)
    const maxRetries = 3;
    let lastError: Error | null = null;

    // Retry loop
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Health check before call (fast TCP check)
        if (attempt === 0) {
          const health = await httpClient.healthCheck({ timeoutMs: 5000 });
          if (!health.healthy) {
            throw new Error(`[Serena] Server not reachable: ${health.error}`);
          }
        }

        if (attempt > 0) {
          serenaLog.info(`[Serena] Retry attempt ${attempt}/${maxRetries} for ${toolName}`);
        }

        // Call tool via HTTP
        const result = await httpClient.callTool(
          {
            name: toolName,
            arguments: params,
          },
          { timeoutMs }
        );

        // Result is already parsed by HTTP client (JSON or plain text)
        // Check if it's a string (needs further parsing) or already an object
        let parsedResult: T;
        if (typeof result === 'string') {
          // Try to parse as JSON, fall back to string
          try {
            parsedResult = JSON.parse(result) as T;
          } catch {
            parsedResult = result as T;
          }
        } else {
          parsedResult = result as T;
        }

        // Check response size (serialize to estimate)
        const responseBytes = JSON.stringify(parsedResult).length;
        if (responseBytes > maxResponseBytes) {
          throw new ResponseTooLargeError(responseBytes, maxResponseBytes, mcpName, toolName);
        }

        // Warn at 80% threshold
        if (responseBytes > maxResponseBytes * 0.8) {
          mcpLog.warn(
            `Response size ${responseBytes.toLocaleString()} bytes approaching limit of ${maxResponseBytes.toLocaleString()} bytes ` +
            `(${Math.round((responseBytes / maxResponseBytes) * 100)}%)`
          );
        }

        // Log success
        const durationMs = Date.now() - callStartTime;
        logAuditEvent({
          timestamp: new Date().toISOString(),
          event: 'mcp_call_success',
          mcpName,
          toolName,
          success: true,
          durationMs,
        });

        serenaLog.info(`[Serena] ✓ ${toolName} completed in ${durationMs}ms (HTTP, module: ${targetModule})`);

        return parsedResult;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Don't retry certain error types
        const errorMessage = lastError.message.toLowerCase();
        if (
          errorMessage.includes('not found') ||
          errorMessage.includes('permission denied') ||
          errorMessage.includes('not reachable')
        ) {
          serenaLog.info(`[Serena] Terminal error, not retrying: ${errorMessage}`);
          break;
        }

        // Small delay before retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `[Serena] All ${maxRetries + 1} attempts failed for ${toolName}. Last error: ${lastError?.message}`
    );
  }

  // Special handling for PyGhidra - ALWAYS use HTTP client (streamable-http transport mode)
  // This prevents lock conflicts by ensuring all calls go through a single persistent server
  if (mcpName === 'pyghidra') {
    const httpPort = parseInt(process.env.PYGHIDRA_HTTP_PORT || '8765', 10);
    mcpLog.info(`[PyGhidra] Using streamable-http mode on port ${httpPort}`);

    // Create HTTP client (connects to PyGhidra running in streamable-http mode)
    const httpClient = createPyghidraHTTPClient({ port: httpPort });

    // Retry configuration for PyGhidra (matches DEFAULT_MAX_RETRIES for consistency)
    let lastError: Error | null = null;

    // Retry loop
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Health check before call (fast HTTP check)
        if (attempt === 0) {
          const health = await httpClient.healthCheck({ timeoutMs: 5000 });
          if (!health.healthy) {
            throw new Error(
              `PyGhidra HTTP server not running on port ${httpPort}.\n` +
              `Start it with: cd .claude/tools/pyghidra && ./start-server.sh`
            );
          }
        }

        if (attempt > 0) {
          mcpLog.info(`[PyGhidra] Retry attempt ${attempt}/${maxRetries} for ${toolName}`);
        }

        // Call tool via HTTP
        const result = await httpClient.callTool(
          {
            name: toolName,
            arguments: params,
          },
          { timeoutMs }
        );

        // Result is already parsed by HTTP client (JSON or plain text)
        let parsedResult: T;
        if (typeof result === 'string') {
          // Try to parse as JSON, fall back to string
          try {
            parsedResult = JSON.parse(result) as T;
          } catch {
            parsedResult = result as T;
          }
        } else {
          parsedResult = result as T;
        }

        // Check response size (serialize to estimate)
        const responseBytes = JSON.stringify(parsedResult).length;
        if (responseBytes > maxResponseBytes) {
          throw new ResponseTooLargeError(responseBytes, maxResponseBytes, mcpName, toolName);
        }

        // Warn at 80% threshold
        if (responseBytes > maxResponseBytes * 0.8) {
          mcpLog.warn(
            `Response size ${responseBytes.toLocaleString()} bytes approaching limit of ${maxResponseBytes.toLocaleString()} bytes ` +
            `(${Math.round((responseBytes / maxResponseBytes) * 100)}%)`
          );
        }

        // Log success
        const durationMs = Date.now() - callStartTime;
        logAuditEvent({
          timestamp: new Date().toISOString(),
          event: 'mcp_call_success',
          mcpName,
          toolName,
          success: true,
          durationMs,
        });

        mcpLog.info(`[PyGhidra] ✓ ${toolName} completed in ${durationMs}ms (HTTP mode)`);

        return parsedResult;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Don't retry certain error types
        const errorMessage = lastError.message.toLowerCase();
        if (
          errorMessage.includes('not found') ||
          errorMessage.includes('permission denied') ||
          errorMessage.includes('not reachable')
        ) {
          mcpLog.info(`[PyGhidra] Terminal error, not retrying: ${errorMessage}`);
          break;
        }

        // Small delay before retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `[PyGhidra] All ${maxRetries + 1} attempts failed for ${toolName}. Last error: ${lastError?.message}`
    );
  }

  // Non-Serena/PyGhidra MCPs use existing fresh-connection logic
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
        mcpLog.warn(
          `Response size ${responseBytes.toLocaleString()} bytes approaching limit of ${maxResponseBytes.toLocaleString()} bytes ` +
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
      const durationMs = Date.now() - callStartTime;
      logAuditEvent({
        timestamp: new Date().toISOString(),
        event: 'mcp_call_success',
        mcpName,
        toolName,
        success: true,
        durationMs,
      });

      // Log Serena-specific timing for observability
      if (mcpName === 'serena') {
        const routing = lastSerenaRouting;
        serenaLog.info(
          `✓ ${toolName} completed in ${durationMs}ms` +
          (routing?.wasRouted ? ` (routed to ${routing.routedTo.split(' ')[0]})` : ' (no routing)')
        );
      }

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
        mcpLog.info(`Retry ${attempt + 1}/${maxRetries} for ${mcpName}.${toolName} after ${delay}ms`);
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
    mcpLog.error(`MCP ${mcpName} not available:`, error);
    return false;
  }
}

// =============================================================================
// Default MCP Client (Hexagonal Port Implementation)
// =============================================================================

/**
 * Default MCP client implementation
 *
 * Implements the MCPPort interface by delegating to callMCPTool.
 * Use this for dependency injection in new code.
 *
 * @example New adapter pattern (recommended for new code)
 * ```typescript
 * import { defaultMCPClient, type MCPPort } from '../config/lib/mcp-client';
 *
 * export class ListIssuesAdapter {
 *   constructor(private mcp: MCPPort = defaultMCPClient) {}
 *
 *   async execute(input: ListIssuesInput): Promise<ListIssuesOutput> {
 *     const data = await this.mcp.callTool('linear', 'list_issues', input);
 *     return this.transform(data);
 *   }
 * }
 *
 * // In tests - no vi.mock() needed!
 * const mockMCP: MCPPort = { callTool: vi.fn().mockResolvedValue([]) };
 * const adapter = new ListIssuesAdapter(mockMCP);
 * ```
 *
 * @example Existing pattern still works (backward compatible)
 * ```typescript
 * import { callMCPTool } from '../config/lib/mcp-client';
 * const data = await callMCPTool('linear', 'list_issues', {});
 * ```
 */
export const defaultMCPClient: MCPPort = {
  callTool: callMCPTool,
};

/**
 * Create a mock MCP client for testing
 *
 * Helper factory that creates a properly typed mock MCPPort.
 * Cleaner than vi.mock() for unit tests.
 *
 * @example
 * ```typescript
 * import { createMockMCPClient } from '../config/lib/mcp-client';
 *
 * const mockMCP = createMockMCPClient({
 *   'linear': {
 *     'list_issues': [{ id: '1', title: 'Test' }],
 *     'get_issue': { id: '1', title: 'Test', description: 'Details' }
 *   }
 * });
 *
 * const adapter = new ListIssuesAdapter(mockMCP);
 * const result = await adapter.execute({});
 * expect(result.issues).toHaveLength(1);
 * ```
 */
export function createMockMCPClient(
  responses: Record<string, Record<string, unknown>>
): MCPPort {
  return {
    callTool: async <T>(mcpName: string, toolName: string): Promise<T> => {
      const mcpResponses = responses[mcpName];
      if (!mcpResponses) {
        throw new Error(`No mock configured for MCP: ${mcpName}`);
      }
      const response = mcpResponses[toolName];
      if (response === undefined) {
        throw new Error(`No mock configured for tool: ${mcpName}.${toolName}`);
      }
      return response as T;
    },
  };
}
