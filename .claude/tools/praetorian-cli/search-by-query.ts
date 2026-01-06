// Praetorian-CLI MCP Wrapper: search_by_query
// Purpose: Execute graph queries with intelligent result filtering
// Token savings: ~95% (50,000 tokens → 2,500 tokens for complex queries)
//
// Schema Discovery Results (tested with real MCP server):
// - next_offset: Returns NUMBER (not string) for pagination offset

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

// Simplified query schema (full schema in SDK documentation)
const QueryNodeSchema: any = z.lazy(() =>
  z.object({
    labels: z.array(z.string()).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.union([z.string(), z.array(z.string())]),
      not: z.boolean().optional()
    })).optional(),
    relationships: z.array(z.any()).optional()
  })
);

const InputSchema = z.object({
  query: z.string(), // JSON stringified Query object
  pages: z.number().int().min(1).max(100).default(1)
});

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    node_types: z.record(z.number()),
    sample_result_types: z.array(z.string())
  }),
  results: z.array(z.object({
    key: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional()
  })),
  next_offset: z.number().nullable(),
  estimatedTokens: z.number()
});

export const searchByQuery = {
  name: 'praetorian-cli.search_by_query',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);

    // Validate query JSON (but keep as string for MCP)
    try {
      JSON.parse(validated.query);
    } catch (e) {
      throw new Error('Invalid query JSON');
    }

    const rawResult = await callMCPTool('praetorian-cli', 'search_by_query', { query: validated.query, pages: validated.pages });
    const filtered = filterQueryResults(rawResult);
    return FilteredOutputSchema.parse(filtered);
  }
};

function filterQueryResults(rawResult: any): any {
  // MCP may return array directly OR as [array, offset] tuple
  const results = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
  const nextOffset = Array.isArray(rawResult[0]) ? rawResult[1] : null;

  // Analyze result types
  const nodeTypes: Record<string, number> = {};
  const sampleTypes: Set<string> = new Set();

  results.forEach((result: any) => {
    const type = result.class || result.type || 'unknown';
    nodeTypes[type] = (nodeTypes[type] || 0) + 1;
    if (sampleTypes.size < 5) {
      sampleTypes.add(type);
    }
  });

  // Return essential fields only, limit to 50 results
  const filteredResults = results.slice(0, 50).map((r: any) => ({
    key: r.key,
    type: r.class || r.type,
    name: r.name || r.dns,
    status: r.status
  }));

  const result = {
    summary: {
      total_count: results.length,
      node_types: nodeTypes,
      sample_result_types: Array.from(sampleTypes)
    },
    results: filteredResults,
    next_offset: nextOffset
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result)
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockSearchByQueryCall(params: any): Promise<any> {
//   return [
//     [
//       {
//         key: '#asset#example.com#example.com',
//         class: 'domain',
//         name: 'example.com',
//         status: 'A'
//       }
//     ],
//     null
//   ];
// }
// 
// 

export type SearchByQueryInput = z.infer<typeof InputSchema>;
export type SearchByQueryOutput = z.infer<typeof FilteredOutputSchema>;
