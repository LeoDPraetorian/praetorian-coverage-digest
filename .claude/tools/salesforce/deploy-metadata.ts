/**
 * deploy_metadata - Salesforce MCP Wrapper
 *
 * Transfers metadata from DX project to org.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (filtered response)
 * - vs MCP: ~10,000 tokens
 * - Reduction: 96%
 *
 * Security:
 * - Risk Level: HIGH
 * - Validation: Path traversal, command injection, allowlisted extensions
 */

import { z } from 'zod';
import { salesforceProjectPath, optionalOrgIdentifier, deployOptionsSchema } from './schemas/common.js';
import { defaultMCPClient } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { Result, MCPPort } from './types.js';
import { mapMCPError } from './errors.js';
import type { SalesforceError } from './errors.js';

// ============================================
// SECTION 1: Input Schema
// ============================================
export const deployMetadataParams = z.object({
  sourcePath: salesforceProjectPath,
  targetOrg: optionalOrgIdentifier,
  ...deployOptionsSchema.shape
});

export type DeployMetadataInput = z.infer<typeof deployMetadataParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const deployMetadataOutput = z.object({
  status: z.enum(['Succeeded', 'Failed', 'SucceededPartial', 'Canceled', 'Pending', 'InProgress']),
  deployId: z.string().optional(),
  numberComponentsTotal: z.number().optional(),
  numberComponentsDeployed: z.number().optional(),
  numberComponentErrors: z.number().optional(),
  errors: z.array(z.object({
    componentType: z.string().optional(),
    fileName: z.string().optional(),
    problem: z.string()
  })).optional(),
  estimatedTokens: z.number()
});

export type DeployMetadataOutput = z.infer<typeof deployMetadataOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const deployMetadata = {
  name: 'salesforce.deploy_metadata',
  description: 'Deploy metadata from local project to Salesforce org',
  parameters: deployMetadataParams,

  async execute(
    input: DeployMetadataInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<DeployMetadataOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = deployMetadataParams.parse(input);

      // Build params for MCP call
      const params: Record<string, unknown> = {
        sourcePath: validated.sourcePath,
        checkOnly: validated.checkOnly,
        testLevel: validated.testLevel
      };
      if (validated.targetOrg) {
        params.targetOrg = validated.targetOrg;
      }
      if (validated.runTests && validated.runTests.length > 0) {
        params.runTests = validated.runTests;
      }

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'deploy_metadata', params);

      // Extract result from response
      const data = rawData as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;

      // Map status to enum value
      const rawStatus = String(data.status || result?.status || 'Pending');
      const validStatuses = ['Succeeded', 'Failed', 'SucceededPartial', 'Canceled', 'Pending', 'InProgress'];
      const status = validStatuses.includes(rawStatus) ? rawStatus as DeployMetadataOutput['status'] : 'Pending';

      // Extract errors if present
      const rawErrors = (data.componentFailures || result?.componentFailures || []) as Array<Record<string, unknown>>;
      const errors = rawErrors.length > 0 ? rawErrors.map(err => ({
        componentType: err.componentType ? String(err.componentType) : undefined,
        fileName: err.fileName ? String(err.fileName) : undefined,
        problem: String(err.problem || err.message || 'Unknown error')
      })) : undefined;

      const output: DeployMetadataOutput = {
        status,
        deployId: data.id ? String(data.id) : (result?.id ? String(result.id) : undefined),
        numberComponentsTotal: typeof data.numberComponentsTotal === 'number' ? data.numberComponentsTotal :
                               (typeof result?.numberComponentsTotal === 'number' ? result.numberComponentsTotal : undefined),
        numberComponentsDeployed: typeof data.numberComponentsDeployed === 'number' ? data.numberComponentsDeployed :
                                  (typeof result?.numberComponentsDeployed === 'number' ? result.numberComponentsDeployed : undefined),
        numberComponentErrors: typeof data.numberComponentErrors === 'number' ? data.numberComponentErrors :
                               (typeof result?.numberComponentErrors === 'number' ? result.numberComponentErrors : undefined),
        errors,
        estimatedTokens: estimateTokens(rawData)
      };

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: mapMCPError(error) };
    }
  },

  tokenEstimate: {
    withoutCustomTool: 10000,
    withCustomTool: 0,
    whenUsed: 400,
    reduction: '96%'
  }
};
