/**
 * JADX MCP Wrapper: get-class-sources
 *
 * Pattern: name_lookup
 * Security: HIGH RISK - path traversal prevention required
 * Token optimization: 98% reduction (50K chars → 1K chars)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { truncateWithIndicator, estimateTokens } from '../config/lib/response-utils.js';
import { addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';
import { JavaClassNameSchema } from './shared-schemas.js';

// ============================================================================
// Constants
// ============================================================================

const CODE_TRUNCATION_LIMIT = 1000; // Chars

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  class_name: JavaClassNameSchema,
}).strict();

export type GetClassSourcesInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

export interface GetClassSourcesOutput {
  className: string;
  code: string;
  codeTruncated: boolean;
  originalLength: number;
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

function filterResponse(rawData: unknown): GetClassSourcesOutput {
  const raw = validateObjectResponse(rawData, 'get-class-sources');

  const className = raw.className ?? '';
  const code = raw.code ?? '';

  const truncatedCode = truncateWithIndicator(code, CODE_TRUNCATION_LIMIT) ?? '';
  const codeTruncated = code.length > CODE_TRUNCATION_LIMIT;

  const result = {
    className,
    code: truncatedCode,
    codeTruncated,
    originalLength: code.length,
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result),
  };
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getClassSources = {
  name: 'jadx.get-class-sources',
  description: 'Fetch Java source code of a specific class. Content truncated to 1000 chars.',
  inputSchema: InputSchema,

  async execute(input: GetClassSourcesInput): Promise<GetClassSourcesOutput> {
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_class_sources', {
        class_name: validated.class_name,
      });
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'get-class-sources');
    }
  },
};

export default getClassSources;
