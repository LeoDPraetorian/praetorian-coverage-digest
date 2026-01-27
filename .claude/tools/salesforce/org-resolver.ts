/**
 * org-resolver - Shared helper for resolving Salesforce org usernames
 *
 * Purpose: DRY helper to resolve default org when targetOrg not provided.
 * Used by: run-soql-query.ts, run-soql-query-enhanced.ts, and other wrappers
 *
 * Behavior:
 * - If targetOrg provided → return it (bypass resolution)
 * - If targetOrg undefined → resolve using multi-source priority:
 *   1. SALESFORCE_ORG_USERNAME environment variable
 *   2. SF CLI default org (sf config get target-org --json)
 *   3. DEFAULT_TARGET_ORG fallback
 *
 * This matches the resolution logic in mcp-client.ts::resolveSalesforceOrg()
 * ensuring consistency between MCP server startup and wrapper queries.
 */

import { execFileSync } from 'child_process';
import type { Result, MCPPort } from './types.js';
import type { SalesforceError } from './errors.js';

/**
 * Resolves the org username to use for Salesforce operations.
 *
 * Uses multi-source resolution with priority:
 * 1. Explicit targetOrg parameter (if provided)
 * 2. SALESFORCE_ORG_USERNAME environment variable
 * 3. SF CLI default org (sf config get target-org)
 * 4. DEFAULT_TARGET_ORG fallback
 *
 * @param targetOrg - Optional org identifier (username or alias)
 * @param _mcpPort - Unused, kept for backward compatibility
 * @returns Result with resolved username or error
 */
export async function resolveOrgUsername(
  targetOrg: string | undefined,
  _mcpPort?: MCPPort
): Promise<Result<string, SalesforceError>> {
  // Priority 0: If targetOrg provided, use it directly (bypass resolution)
  if (targetOrg !== undefined && targetOrg !== '') {
    return { success: true, data: targetOrg };
  }

  // Priority 1: Environment variable
  if (process.env.SALESFORCE_ORG_USERNAME) {
    return { success: true, data: process.env.SALESFORCE_ORG_USERNAME };
  }

  // Priority 2: SF CLI default org
  try {
    const stdout = execFileSync('sf', ['config', 'get', 'target-org', '--json'], {
      encoding: 'utf-8',
      timeout: 5000, // 5 second timeout
    }) as string;

    const result = JSON.parse(stdout);
    if (result?.result?.[0]?.value) {
      return { success: true, data: result.result[0].value };
    }
  } catch {
    // SF CLI not installed, no default org, or other error - continue to fallback
  }

  // Priority 3: Fallback to DEFAULT_TARGET_ORG
  // Note: This will only work if the MCP server was also started with DEFAULT_TARGET_ORG
  // In most cases, if we reach here, it means no org is configured anywhere
  return {
    success: false,
    error: {
      code: 'AUTH_ERROR',
      message:
        'No Salesforce org configured. Set SALESFORCE_ORG_USERNAME env var or configure SF CLI default org with: sf config set target-org <username>',
      retryable: false,
    },
  };
}
