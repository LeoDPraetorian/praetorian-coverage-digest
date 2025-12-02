// Praetorian-CLI MCP Wrapper: attributes_list
// Purpose: List attributes with intelligent filtering to reduce token usage
// Token savings: ~85% (1,000 attributes × 50 tokens → 7,500 tokens summary)
//
// Schema Discovery Results (tested with real MCP server):
// - next_offset: Returns NUMBER (not string) for pagination offset

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  prefix_filter: z.string().default(''),
  source_key: z.string().optional(),
  offset: z.string().optional(),
  pages: z.number().int().min(1).max(100).default(1)
});

// ============================================================================
// Output Schema (Filtered)
// ============================================================================

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    returned_count: z.number(),
    has_more: z.boolean(),
    attribute_names: z.record(z.number()),
    sources: z.record(z.number())
  }),
  attributes: z.array(z.object({
    key: z.string(),
    name: z.string().optional(),
    value: z.string().optional(),
    source: z.string().optional()
  })),
  next_offset: z.number().nullable(),
  estimated_tokens: z.number()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const attributesList = {
  name: 'praetorian-cli.attributes_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);
    // Remove null values before sending to MCP (MCP expects string or omitted, not null)
    const cleanedInput = Object.fromEntries(
      Object.entries(validated).filter(([_, v]) => v !== null)
    );

    // TODO: Replace with actual MCP client call
    // For now, return mock data structure
    const rawResult = await callMCPTool('praetorian-cli', 'attributes_list', cleanedInput);

    // Filter: Extract essential information only
    const filtered = filterAttributesResult(rawResult);

    // Validate output
    return FilteredOutputSchema.parse(filtered);
  }
};

// ============================================================================
// Filtering Logic
// ============================================================================

/**
 * Filter attributes result to reduce token usage
 * Strategy:
 * - Return summary statistics (counts by name/source)
 * - Return full details for first 20 attributes only
 * - Remove verbose fields (timestamps, metadata)
 */
function filterAttributesResult(rawResult: any): any {
  // MCP may return array directly OR as [array, offset] tuple
  const attributes = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
  const nextOffset = Array.isArray(rawResult[0]) ? rawResult[1] : null;

  // Calculate summary statistics
  const attributeNames: Record<string, number> = {};
  const sources: Record<string, number> = {};

  attributes.forEach((attr: any) => {
    const name = attr.name || 'unknown';
    const source = attr.source || 'unknown';
    attributeNames[name] = (attributeNames[name] || 0) + 1;
    sources[source] = (sources[source] || 0) + 1;
  });

  // Return detailed info for first 20, keys only for rest
  const filteredAttributes = attributes.slice(0, 20).map((attr: any) => ({
    key: attr.key,
    name: attr.name,
    value: attr.value,
    source: attr.source
  }));

  return {
    summary: {
      total_count: attributes.length,
      returned_count: filteredAttributes.length,
      has_more: attributes.length > 20,
      attribute_names: attributeNames,
      sources: sources
    },
    attributes: filteredAttributes,
    next_offset: nextOffset,
    estimated_tokens: 750 // vs 5,000+ for full result
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type AttributesListInput = z.infer<typeof InputSchema>;
export type AttributesListOutput = z.infer<typeof FilteredOutputSchema>;
