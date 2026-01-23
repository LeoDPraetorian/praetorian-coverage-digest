/**
 * JADX MCP Wrapper: get-resource-file
 *
 * Pattern: name_lookup
 * Security: HIGH RISK - path traversal prevention + directory whitelist required
 * Token optimization: 70% reduction (10K chars → 500 chars)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { truncateWithIndicator, estimateTokens } from '../config/lib/response-utils.js';
import { addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';
import { JadxTruncationLimits } from './shared-utils.js';
import { ResourceNameSchema } from './shared-schemas.js';
import { validateResourceName } from './security-utils.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  resource_name: ResourceNameSchema,
}).strict();

export type GetResourceFileInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

export interface GetResourceFileOutput {
  name: string;
  type: string;
  content: string;
  contentTruncated: boolean;
  originalLength: number;
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

function filterResponse(rawData: unknown): GetResourceFileOutput {
  const raw = validateObjectResponse(rawData, 'get-resource-file');

  const name = raw.name ?? '[unknown]';
  const type = raw.type ?? 'text';
  const content = raw.content ?? '';

  const truncatedContent = truncateWithIndicator(content, JadxTruncationLimits.RESOURCE_PREVIEW) ?? '';
  const contentTruncated = content.length > JadxTruncationLimits.RESOURCE_PREVIEW;

  const result = {
    name,
    type,
    content: truncatedContent,
    contentTruncated,
    originalLength: content.length,
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result),
  };
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getResourceFile = {
  name: 'jadx.get-resource-file',
  description: 'Get content of a specific resource file (res/, assets/) from the loaded APK. Content truncated to 500 chars.',
  inputSchema: InputSchema,

  async execute(input: GetResourceFileInput): Promise<GetResourceFileOutput> {
    const validated = InputSchema.parse(input);

    // Extra security validation: directory whitelist + URL encoding check
    validateResourceName(validated.resource_name, 'get-resource-file');

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_resource_file', {
        resource_name: validated.resource_name,
      });
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'get-resource-file');
    }
  },
};

export default getResourceFile;
