/**
 * retrieve_metadata - Salesforce MCP Wrapper
 *
 * Pulls metadata from org into DX project.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (filtered response)
 * - vs MCP: ~10,000 tokens
 * - Reduction: 96%
 *
 * Security:
 * - Risk Level: MEDIUM
 * - Validation: Path traversal, output directory validation
 */

import { z } from 'zod';
import { salesforceProjectPath, optionalOrgIdentifier } from './schemas/common.js';
import { defaultMCPClient } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { Result, MCPPort } from './types.js';
import { mapMCPError } from './errors.js';
import type { SalesforceError } from './errors.js';

// ============================================
// SECTION 1: Input Schema
// ============================================
export const retrieveMetadataParams = z.object({
  targetPath: salesforceProjectPath,
  targetOrg: optionalOrgIdentifier,
  metadataTypes: z.array(z.string()).optional(),
  packageNames: z.array(z.string()).optional()
});

export type RetrieveMetadataInput = z.infer<typeof retrieveMetadataParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const retrieveMetadataOutput = z.object({
  status: z.enum(['Succeeded', 'Failed', 'SucceededPartial', 'Pending', 'InProgress']),
  retrieveId: z.string().optional(),
  numberComponentsTotal: z.number().optional(),
  numberComponentsRetrieved: z.number().optional(),
  files: z.array(z.string()).optional(),
  estimatedTokens: z.number()
});

export type RetrieveMetadataOutput = z.infer<typeof retrieveMetadataOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const retrieveMetadata = {
  name: 'salesforce.retrieve_metadata',
  description: 'Retrieve metadata from Salesforce org to local project',
  parameters: retrieveMetadataParams,

  async execute(
    input: RetrieveMetadataInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<RetrieveMetadataOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = retrieveMetadataParams.parse(input);

      // Build params for MCP call
      const params: Record<string, unknown> = {
        targetPath: validated.targetPath
      };
      if (validated.targetOrg) {
        params.targetOrg = validated.targetOrg;
      }
      if (validated.metadataTypes && validated.metadataTypes.length > 0) {
        params.metadataTypes = validated.metadataTypes;
      }
      if (validated.packageNames && validated.packageNames.length > 0) {
        params.packageNames = validated.packageNames;
      }

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'retrieve_metadata', params);

      // Extract result from response
      const data = rawData as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;

      // Map status to enum value
      const rawStatus = String(data.status || result?.status || 'Pending');
      const validStatuses = ['Succeeded', 'Failed', 'SucceededPartial', 'Pending', 'InProgress'];
      const status = validStatuses.includes(rawStatus) ? rawStatus as RetrieveMetadataOutput['status'] : 'Pending';

      // Extract files list if present
      const rawFiles = (data.fileProperties || result?.fileProperties || []) as Array<Record<string, unknown>>;
      const files = rawFiles.length > 0 ? rawFiles.map(f => String(f.fileName || f.fullName || '')) : undefined;

      const output: RetrieveMetadataOutput = {
        status,
        retrieveId: data.id ? String(data.id) : (result?.id ? String(result.id) : undefined),
        numberComponentsTotal: typeof data.numberComponentsTotal === 'number' ? data.numberComponentsTotal :
                               (typeof result?.numberComponentsTotal === 'number' ? result.numberComponentsTotal : undefined),
        numberComponentsRetrieved: typeof data.numberComponentsRetrieved === 'number' ? data.numberComponentsRetrieved :
                                   (typeof result?.numberComponentsRetrieved === 'number' ? result.numberComponentsRetrieved : undefined),
        files,
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
