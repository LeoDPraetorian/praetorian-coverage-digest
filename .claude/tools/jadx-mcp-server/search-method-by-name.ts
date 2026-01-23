/**
 * JADX MCP Wrapper: search-method-by-name
 *
 * Pattern: search
 * Security: MEDIUM RISK - search term validation required
 * Token optimization: 80-90% reduction via pagination + signature truncation
 *
 * This is the ONLY search pattern tool for jadx-mcp-server.
 * The patterns here establish the search pattern for future tools.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { truncateWithIndicator } from '../config/lib/response-utils.js';
import { addTokenEstimation, handleMCPError, validateArrayResponse } from './utils.js';
import { SearchTermSchema, CountSchema, OffsetSchema } from './shared-schemas.js';

// ============================================================================
// Constants
// ============================================================================

const SIGNATURE_TRUNCATION_LIMIT = 200;

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  method_name: SearchTermSchema,
  count: CountSchema,
  offset: OffsetSchema,
}).strict();

export type SearchMethodByNameInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

export interface SearchResultItem {
  className: string;
  methodName: string;
  signature: string;
  signatureTruncated?: boolean;
}

export interface SearchMethodByNameOutput {
  items: SearchResultItem[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

function filterResponse(
  rawData: unknown,
  params: { count: number; offset: number }
): SearchMethodByNameOutput {
  const result = validateArrayResponse(rawData, 'search-method-by-name');

  // Apply offset
  const offsetItems = result.slice(params.offset);

  // Apply count limit
  const limitedItems = offsetItems.slice(0, params.count);

  // Transform items with optional signature truncation
  const items = limitedItems.map((item: any) => {
    const signature = item.signature ?? '';
    const truncatedSig = truncateWithIndicator(signature, SIGNATURE_TRUNCATION_LIMIT) ?? '';
    const wasTruncated = signature.length > SIGNATURE_TRUNCATION_LIMIT;

    return {
      className: item.className ?? '',
      methodName: item.methodName ?? '',
      signature: truncatedSig,
      ...(wasTruncated && { signatureTruncated: true }),
    };
  });

  const response = {
    items,
    pagination: {
      offset: params.offset,
      limit: params.count,
      total: result.length,
      hasMore: result.length > params.offset + params.count,
    },
  };

  return addTokenEstimation(response);
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const searchMethodByName = {
  name: 'jadx.search-method-by-name',
  description: 'Search for methods by name across all classes. Returns paginated results.',
  inputSchema: InputSchema,

  async execute(input: SearchMethodByNameInput): Promise<SearchMethodByNameOutput> {
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'search_method_by_name', {
        method_name: validated.method_name,
        count: validated.count,
        offset: validated.offset,
      });
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'search-method-by-name');
    }
  },
};

export default searchMethodByName;
