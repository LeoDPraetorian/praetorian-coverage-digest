/**
 * delete_org - Salesforce MCP Wrapper
 *
 * Removes locally-authorized scratch orgs or sandboxes.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~150 tokens (filtered response)
 * - vs MCP: ~2,000 tokens
 * - Reduction: 92%
 *
 * Security:
 * - Risk Level: HIGH
 * - Validation: Command injection, CLI-safe params, confirmation pattern
 */

import { z } from 'zod';
import { salesforceOrgIdentifier } from './schemas/common.js';
import { defaultMCPClient } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { Result, MCPPort } from './types.js';
import { mapMCPError } from './errors.js';
import type { SalesforceError } from './errors.js';

// ============================================
// SECTION 1: Input Schema
// ============================================
export const deleteOrgParams = z.object({
  targetOrg: salesforceOrgIdentifier,
  noPrompt: z.boolean().default(false)
});

export type DeleteOrgInput = z.infer<typeof deleteOrgParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const deleteOrgOutput = z.object({
  success: z.boolean(),
  username: z.string(),
  orgId: z.string().optional(),
  message: z.string().optional(),
  estimatedTokens: z.number()
});

export type DeleteOrgOutput = z.infer<typeof deleteOrgOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const deleteOrg = {
  name: 'salesforce.delete_org',
  description: 'Delete a Salesforce scratch org or sandbox',
  parameters: deleteOrgParams,

  async execute(
    input: DeleteOrgInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<DeleteOrgOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = deleteOrgParams.parse(input);

      // Build params for MCP call
      const params: Record<string, unknown> = {
        targetOrg: validated.targetOrg,
        noPrompt: validated.noPrompt
      };

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'delete_org', params);

      // Extract result from response
      const data = rawData as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;

      const output: DeleteOrgOutput = {
        success: Boolean(data.success ?? result?.success ?? true),
        username: String(data.username || result?.username || validated.targetOrg),
        orgId: data.orgId ? String(data.orgId) : (result?.orgId ? String(result.orgId) : undefined),
        message: data.message ? String(data.message) : (result?.message ? String(result.message) : undefined),
        estimatedTokens: estimateTokens(rawData)
      };

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: mapMCPError(error) };
    }
  },

  tokenEstimate: {
    withoutCustomTool: 2000,
    withCustomTool: 0,
    whenUsed: 150,
    reduction: '92%'
  }
};
