// Praetorian-CLI MCP Wrapper: assets_list
// Purpose: List assets with intelligent filtering to reduce token usage
// Token savings: ~90% (10,000 assets × 100 tokens → 1,000 tokens summary)
//
// Schema Discovery Results (tested with real MCP server):
// - next_offset: Returns NUMBER (not string) for pagination offset

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import {
  extractPaginatedResponse,
  buildListResponse,
  PaginationLimits,
  estimateTokens,
} from '../config/lib/response-utils.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  key_prefix: z.string().optional().default(''),
  asset_type: z.string().optional().default(''),
  pages: z.number().int().min(1).max(100).optional().default(1)
});

// ============================================================================
// Output Schema (Filtered)
// ============================================================================

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    returned_count: z.number(),
    has_more: z.boolean(),
    asset_types: z.record(z.number()),
    statuses: z.record(z.number())
  }),
  assets: z.array(z.object({
    key: z.string(),
    dns: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    class: z.string().optional(),
    created: z.string().optional()
  })),
  next_offset: z.number().nullable(),
  estimatedTokens: z.number()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const assetsList = {
  name: 'praetorian-cli.assets_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call actual MCP server
    const rawResult = await callMCPTool('praetorian-cli', 'assets_list', validated);

    // Filter: Extract essential information only
    const filtered = filterAssetsResult(rawResult);

    // Validate output
    return FilteredOutputSchema.parse(filtered);
  }
};

// ============================================================================
// Filtering Logic (using shared utilities)
// ============================================================================

/**
 * Filter assets result to reduce token usage
 *
 * Uses shared utilities from response-utils.ts:
 * - extractPaginatedResponse: Handles tuple/object response formats
 * - buildListResponse: Generates summary with counts
 */
function filterAssetsResult(rawResult: any): any {
  // Parse response using shared utility (handles tuple, object, array formats)
  const { items: assets, nextOffset } = extractPaginatedResponse<any>(rawResult);

  // Build response with summary using shared utility
  const { items: filteredAssets, summary } = buildListResponse(
    assets,
    PaginationLimits.DEFAULT, // 20 items
    (asset: any) => ({
      key: asset.key,
      dns: asset.dns,
      name: asset.name,
      status: asset.status,
      class: asset.class,
      created: asset.created
    }),
    {
      // Generate counts by type and status
      asset_types: (a: any) => a.class || 'unknown',
      statuses: (a: any) => a.status || 'unknown',
    }
  );

  const result = {
    summary: {
      total_count: summary.total,
      returned_count: summary.returned,
      has_more: summary.hasMore,
      asset_types: summary.counts?.asset_types || {},
      statuses: summary.counts?.statuses || {}
    },
    assets: filteredAssets,
    next_offset: nextOffset
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result)
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type AssetsListInput = z.infer<typeof InputSchema>;
export type AssetsListOutput = z.infer<typeof FilteredOutputSchema>;
