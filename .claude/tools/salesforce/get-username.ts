/**
 * get_username - Salesforce MCP Wrapper
 *
 * Identifies the appropriate username/alias for Salesforce operations.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~150 tokens (filtered response)
 * - vs MCP: ~1,000 tokens
 * - Reduction: 85%
 *
 * Security:
 * - Risk Level: LOW
 * - Validation: Control chars, command injection
 */

import { z } from 'zod';
import { optionalOrgIdentifier } from './schemas/common.js';
import { defaultMCPClient } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { Result, MCPPort } from './types.js';
import { mapMCPError } from './errors.js';
import type { SalesforceError } from './errors.js';

// ============================================
// SECTION 1: Input Schema
// ============================================
export const getUsernameParams = z.object({
  targetOrg: optionalOrgIdentifier
});

export type GetUsernameInput = z.infer<typeof getUsernameParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const getUsernameOutput = z.object({
  username: z.string(),
  orgId: z.string().optional(),
  alias: z.string().optional(),
  instanceUrl: z.string().optional(),
  estimatedTokens: z.number()
});

export type GetUsernameOutput = z.infer<typeof getUsernameOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const getUsername = {
  name: 'salesforce.get_username',
  description: 'Get the username for a Salesforce org',
  parameters: getUsernameParams,

  async execute(
    input: GetUsernameInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<GetUsernameOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = getUsernameParams.parse(input);

      // Build params for MCP call
      const params: Record<string, unknown> = {};
      if (validated.targetOrg) {
        params.targetOrg = validated.targetOrg;
      }

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'get_username', params);

      // Extract and filter response
      const data = rawData as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;
      const output: GetUsernameOutput = {
        username: String(data.username || result?.username || ''),
        orgId: data.orgId ? String(data.orgId) : (result?.orgId ? String(result.orgId) : undefined),
        alias: data.alias ? String(data.alias) : (result?.alias ? String(result.alias) : undefined),
        instanceUrl: data.instanceUrl ? String(data.instanceUrl) : (result?.instanceUrl ? String(result.instanceUrl) : undefined),
        estimatedTokens: estimateTokens(rawData)
      };

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: mapMCPError(error) };
    }
  },

  tokenEstimate: {
    withoutCustomTool: 1000,
    withCustomTool: 0,
    whenUsed: 150,
    reduction: '85%'
  }
};
