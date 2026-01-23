/**
 * JADX MCP Wrapper: get-main-application-classes-code
 *
 * Pattern: paginated_list (with per-item code truncation)
 * Purpose: Lists main application classes with truncated source code
 * Security: LOW (numeric validation only)
 * Token Criticality: CRITICAL (95-99% reduction required)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { truncateWithIndicator } from '../config/lib/response-utils.js';
import { addTokenEstimation, handleMCPError, validateArrayResponse } from './utils.js';
import { OffsetSchema } from './shared-schemas.js';
import { JadxTruncationLimits } from './shared-utils.js';

// ============================================================================
// Input Schema (Code-optimized defaults)
// ============================================================================

/**
 * Input schema with code-appropriate default count
 * Default: count=5 (not 100) due to token cost per item
 */
const InputSchema = z.object({
  count: z
    .number()
    .int('count must be an integer')
    .min(0, 'count cannot be negative')
    .max(100, 'count exceeds maximum for code tools (100)')
    .default(5)
    .describe('Number of classes to return (default: 5, max: 100). Each class includes truncated code (300 chars).'),
  offset: OffsetSchema,
});

export type GetMainApplicationClassesCodeInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

/**
 * Item in the code list response
 */
export interface ClassCodeItem {
  /** Fully qualified class name */
  className: string;
  /** Truncated source code preview */
  code: string;
  /** Whether code was truncated from original */
  codeTruncated: boolean;
  /** Original code length in characters */
  originalLength: number;
}

/**
 * Response structure for get-main-application-classes-code
 */
export interface GetMainApplicationClassesCodeOutput {
  items: ClassCodeItem[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  tokenReduction: {
    originalChars: number;
    truncatedChars: number;
    reductionPercent: number;
  };
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering (CRITICAL: Per-item truncation)
// ============================================================================

/**
 * Filter and transform raw MCP response with per-item code truncation
 */
function filterResponse(
  rawData: unknown,
  params: { count: number; offset: number }
): GetMainApplicationClassesCodeOutput {
  const allItems = validateArrayResponse(rawData, 'get-main-application-classes-code');

  let originalChars = 0;
  let truncatedChars = 0;

  const items = allItems
    .slice(params.offset, params.offset + params.count)
    .map((item: { className?: string; code?: string }) => {
      const code = item.code ?? '';
      const originalLength = code.length;
      originalChars += originalLength;

      const truncatedCode = truncateWithIndicator(code, JadxTruncationLimits.LIST_CODE_ITEM) ?? '';
      truncatedChars += truncatedCode.length;

      return {
        className: item.className ?? '[unknown]',
        code: truncatedCode,
        codeTruncated: originalLength > JadxTruncationLimits.LIST_CODE_ITEM,
        originalLength,
      };
    });

  const total = allItems.length;
  const reductionPercent = originalChars > 0
    ? Math.round((1 - truncatedChars / originalChars) * 100)
    : 0;

  return addTokenEstimation({
    items,
    pagination: {
      offset: params.offset,
      limit: params.count,
      total,
      hasMore: params.offset + params.count < total,
    },
    tokenReduction: {
      originalChars,
      truncatedChars,
      reductionPercent,
    },
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getMainApplicationClassesCode = {
  name: 'jadx.get-main-application-classes-code',
  description:
    'Lists main application classes with truncated source code previews (300 chars each). ' +
    'Use small count values (default: 5) due to token cost. ' +
    'For full class code, use get-class-sources with specific class name.',
  inputSchema: InputSchema,

  async execute(input: GetMainApplicationClassesCodeInput = {}): Promise<GetMainApplicationClassesCodeOutput> {
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_main_application_classes_code', {
        count: validated.count,
        offset: validated.offset,
      });
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'get-main-application-classes-code');
    }
  },
};

export default getMainApplicationClassesCode;
