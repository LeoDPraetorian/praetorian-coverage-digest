/**
 * resume_tool_operation - Salesforce MCP Wrapper
 *
 * Continues long-running operations not completed by other tools.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~200 tokens (filtered response)
 * - vs MCP: ~2,000 tokens
 * - Reduction: 90%
 *
 * Security:
 * - Risk Level: LOW
 * - Validation: UUID format, control chars
 */

import { z } from 'zod';
import { salesforceOperationId, optionalOrgIdentifier } from './schemas/common.js';
import { defaultMCPClient } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { Result, MCPPort } from './types.js';
import { mapMCPError } from './errors.js';
import type { SalesforceError } from './errors.js';

// ============================================
// SECTION 1: Input Schema
// ============================================
export const resumeToolOperationParams = z.object({
  operationId: salesforceOperationId,
  targetOrg: optionalOrgIdentifier
});

export type ResumeToolOperationInput = z.infer<typeof resumeToolOperationParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const resumeToolOperationOutput = z.object({
  status: z.enum(['completed', 'in_progress', 'failed']),
  result: z.unknown().optional(),
  progress: z.number().optional(),
  estimatedTokens: z.number()
});

export type ResumeToolOperationOutput = z.infer<typeof resumeToolOperationOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const resumeToolOperation = {
  name: 'salesforce.resume_tool_operation',
  description: 'Resume a long-running Salesforce operation',
  parameters: resumeToolOperationParams,

  async execute(
    input: ResumeToolOperationInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<ResumeToolOperationOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = resumeToolOperationParams.parse(input);

      // Build params for MCP call
      const params: Record<string, unknown> = {
        operationId: validated.operationId
      };
      if (validated.targetOrg) {
        params.targetOrg = validated.targetOrg;
      }

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'resume_tool_operation', params);

      // Extract result from response
      const data = rawData as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;

      // Map status to enum value
      const rawStatus = String(data.status || result?.status || 'in_progress').toLowerCase();
      let status: 'completed' | 'in_progress' | 'failed' = 'in_progress';
      if (rawStatus === 'completed' || rawStatus === 'succeeded') {
        status = 'completed';
      } else if (rawStatus === 'failed' || rawStatus === 'error') {
        status = 'failed';
      }

      const output: ResumeToolOperationOutput = {
        status,
        result: data.result || result?.result,
        progress: typeof data.progress === 'number' ? data.progress :
                  (typeof result?.progress === 'number' ? result.progress : undefined),
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
    whenUsed: 200,
    reduction: '90%'
  }
};
