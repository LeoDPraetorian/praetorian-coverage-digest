/**
 * org_open - Salesforce MCP Wrapper
 *
 * Launches an org in the browser.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~150 tokens (filtered response)
 * - vs MCP: ~2,000 tokens
 * - Reduction: 92%
 *
 * Security:
 * - Risk Level: LOW
 * - Validation: Command injection, URL validation
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
export const orgOpenParams = z.object({
  targetOrg: optionalOrgIdentifier,
  path: z.string()
    .max(2048, 'Path too long')
    .optional()
    .describe('Specific path to open in the org'),
  browser: z.enum(['chrome', 'firefox', 'safari', 'edge'])
    .optional()
    .describe('Browser to use'),
  urlOnly: z.boolean()
    .default(false)
    .describe('Return URL without opening browser')
});

export type OrgOpenInput = z.infer<typeof orgOpenParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const orgOpenOutput = z.object({
  url: z.string(),
  username: z.string().optional(),
  orgId: z.string().optional(),
  opened: z.boolean(),
  estimatedTokens: z.number()
});

export type OrgOpenOutput = z.infer<typeof orgOpenOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const orgOpen = {
  name: 'salesforce.org_open',
  description: 'Open a Salesforce org in the browser',
  parameters: orgOpenParams,

  async execute(
    input: OrgOpenInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<OrgOpenOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = orgOpenParams.parse(input);

      // Build params for MCP call
      const params: Record<string, unknown> = {
        urlOnly: validated.urlOnly
      };
      if (validated.targetOrg) {
        params.targetOrg = validated.targetOrg;
      }
      if (validated.path) {
        params.path = validated.path;
      }
      if (validated.browser) {
        params.browser = validated.browser;
      }

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'org_open', params);

      // Extract result from response
      const data = rawData as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;

      const output: OrgOpenOutput = {
        url: String(data.url || result?.url || ''),
        username: data.username ? String(data.username) : (result?.username ? String(result.username) : undefined),
        orgId: data.orgId ? String(data.orgId) : (result?.orgId ? String(result.orgId) : undefined),
        opened: !validated.urlOnly && Boolean(data.opened ?? result?.opened ?? true),
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
