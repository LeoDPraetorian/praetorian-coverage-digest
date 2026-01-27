/**
 * create_scratch_org - Salesforce MCP Wrapper
 *
 * Provisions a new scratch org.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (filtered response)
 * - vs MCP: ~5,000 tokens
 * - Reduction: 94%
 *
 * Security:
 * - Risk Level: MEDIUM
 * - Validation: Command injection, CLI-safe params, rate limiting
 */

import { z } from 'zod';
import { optionalOrgIdentifier, salesforceProjectPath, durationDays } from './schemas/common.js';
import { defaultMCPClient } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { Result, MCPPort } from './types.js';
import { mapMCPError } from './errors.js';
import type { SalesforceError } from './errors.js';

// ============================================
// SECTION 1: Input Schema
// ============================================
export const createScratchOrgParams = z.object({
  definitionFile: salesforceProjectPath.optional(),
  alias: z.string()
    .max(40, 'Alias max 40 characters')
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, 'Invalid alias format')
    .optional(),
  targetDevHub: optionalOrgIdentifier,
  durationDays: durationDays,
  setDefault: z.boolean().default(false),
  noAncestors: z.boolean().default(false),
  noNamespace: z.boolean().default(false)
});

export type CreateScratchOrgInput = z.infer<typeof createScratchOrgParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const createScratchOrgOutput = z.object({
  username: z.string(),
  orgId: z.string(),
  alias: z.string().optional(),
  instanceUrl: z.string().optional(),
  expirationDate: z.string().optional(),
  estimatedTokens: z.number()
});

export type CreateScratchOrgOutput = z.infer<typeof createScratchOrgOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const createScratchOrg = {
  name: 'salesforce.create_scratch_org',
  description: 'Create a new Salesforce scratch org',
  parameters: createScratchOrgParams,

  async execute(
    input: CreateScratchOrgInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<CreateScratchOrgOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = createScratchOrgParams.parse(input);

      // Build params for MCP call
      const params: Record<string, unknown> = {
        durationDays: validated.durationDays,
        setDefault: validated.setDefault,
        noAncestors: validated.noAncestors,
        noNamespace: validated.noNamespace
      };
      if (validated.definitionFile) {
        params.definitionFile = validated.definitionFile;
      }
      if (validated.alias) {
        params.alias = validated.alias;
      }
      if (validated.targetDevHub) {
        params.targetDevHub = validated.targetDevHub;
      }

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'create_scratch_org', params);

      // Extract result from response
      const data = rawData as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;

      const output: CreateScratchOrgOutput = {
        username: String(data.username || result?.username || ''),
        orgId: String(data.orgId || result?.orgId || ''),
        alias: data.alias ? String(data.alias) : (result?.alias ? String(result.alias) : undefined),
        instanceUrl: data.instanceUrl ? String(data.instanceUrl) : (result?.instanceUrl ? String(result.instanceUrl) : undefined),
        expirationDate: data.expirationDate ? String(data.expirationDate) : (result?.expirationDate ? String(result.expirationDate) : undefined),
        estimatedTokens: estimateTokens(rawData)
      };

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: mapMCPError(error) };
    }
  },

  tokenEstimate: {
    withoutCustomTool: 5000,
    withCustomTool: 0,
    whenUsed: 300,
    reduction: '94%'
  }
};
