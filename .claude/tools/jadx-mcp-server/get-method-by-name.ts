/**
 * JADX MCP Wrapper: get-method-by-name
 *
 * Pattern: name_lookup (dual parameter variant)
 * Security: HIGH RISK - path traversal prevention required for both params
 * Token optimization: 70-96% reduction (5K chars → 200 chars)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { truncateWithIndicator, estimateTokens } from '../config/lib/response-utils.js';
import { addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';
import { JavaClassNameSchema, MethodNameSchema } from './shared-schemas.js';

// ============================================================================
// Constants
// ============================================================================

const CODE_TRUNCATION_LIMIT = 500; // Chars

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  class_name: JavaClassNameSchema,
  method_name: MethodNameSchema,
}).strict();

export type GetMethodByNameInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

export interface GetMethodByNameOutput {
  className: string;
  methodName: string;
  declaration: string;
  code: string;
  codeTruncated: boolean;
  originalLength: number;
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

function filterResponse(rawData: unknown): GetMethodByNameOutput {
  const raw = validateObjectResponse(rawData, 'get-method-by-name');

  const className = raw.class ?? '';
  const methodName = raw.method ?? '';
  const declaration = raw.decl ?? '';
  const code = raw.code ?? '';

  const truncatedCode = truncateWithIndicator(code, CODE_TRUNCATION_LIMIT) ?? '';
  const codeTruncated = code.length > CODE_TRUNCATION_LIMIT;

  const result = {
    className,
    methodName,
    declaration,
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

export const getMethodByName = {
  name: 'jadx.get-method-by-name',
  description: 'Fetch Java source code of a specific method from a class. Content truncated to 500 chars.',
  inputSchema: InputSchema,

  async execute(input: GetMethodByNameInput): Promise<GetMethodByNameOutput> {
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_method_by_name', {
        class_name: validated.class_name,
        method_name: validated.method_name,
      });
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'get-method-by-name');
    }
  },
};

export default getMethodByName;
