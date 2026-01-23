/**
 * JADX MCP Wrapper: get-smali-of-class
 *
 * Pattern: name_lookup
 * Security: HIGH RISK - path traversal prevention required
 * Token optimization: 95% reduction (100K chars → 500 chars, Smali is very verbose)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { truncateWithIndicator, estimateTokens } from '../config/lib/response-utils.js';
import { addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';
import { JavaClassNameSchema } from './shared-schemas.js';
import { JadxTruncationLimits } from './shared-utils.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  class_name: JavaClassNameSchema,
}).strict();

export type GetSmaliOfClassInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

export interface GetSmaliOfClassOutput {
  className: string;
  smali: string;
  smaliTruncated: boolean;
  originalLength: number;
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

function filterResponse(rawData: unknown): GetSmaliOfClassOutput {
  const raw = validateObjectResponse(rawData, 'get-smali-of-class');

  const className = raw.className ?? '';
  const smali = raw.smali ?? '';

  // Aggressive 500-char truncation (Smali is very verbose)
  const truncatedSmali = truncateWithIndicator(smali, JadxTruncationLimits.SMALI_PREVIEW) ?? '';
  const smaliTruncated = smali.length > JadxTruncationLimits.SMALI_PREVIEW;

  const result = {
    className,
    smali: truncatedSmali,
    smaliTruncated,
    originalLength: smali.length,
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result),
  };
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getSmaliOfClass = {
  name: 'jadx.get-smali-of-class',
  description: 'Fetch Smali bytecode of a specific class. Content truncated to 500 chars (Smali is very verbose).',
  inputSchema: InputSchema,

  async execute(input: GetSmaliOfClassInput): Promise<GetSmaliOfClassOutput> {
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_smali_of_class', {
        class_name: validated.class_name,
      });
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'get-smali-of-class');
    }
  },
};

export default getSmaliOfClass;
