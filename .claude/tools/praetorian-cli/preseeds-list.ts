// Praetorian-CLI MCP Wrapper: preseeds_list
// Purpose: List discovery preseeds with filtering
// Token savings: ~85%
//
// Schema Discovery Results (tested with real MCP server):
// - next_offset: Returns NUMBER (not string) for pagination offset

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const InputSchema = z.object({
  prefix_filter: z.string().default(''),
  offset: z.string().optional(),
  pages: z.number().int().min(1).max(100).default(1)
});

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    returned_count: z.number(),
    preseed_types: z.record(z.number()),
    statuses: z.record(z.number())
  }),
  preseeds: z.array(z.object({
    key: z.string(),
    type: z.string().optional(),
    title: z.string().optional(),
    value: z.string().optional(),
    status: z.string().optional()
  })),
  next_offset: z.number().nullable(),
  estimatedTokens: z.number()
});

export const preseedsList = {
  name: 'praetorian-cli.preseeds_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    // Remove null values before sending to MCP (MCP expects string or omitted, not null)
    const cleanedInput = Object.fromEntries(
      Object.entries(validated).filter(([_, v]) => v !== null)
    );
    const rawResult = await callMCPTool('praetorian-cli', 'preseeds_list', cleanedInput);
    const filtered = filterPreseedsResult(rawResult);
    return FilteredOutputSchema.parse(filtered);
  }
};

function filterPreseedsResult(rawResult: any): any {
  // MCP may return array directly OR as [array, offset] tuple
  const preseeds = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
  const nextOffset = Array.isArray(rawResult[0]) ? rawResult[1] : null;

  const preseedTypes: Record<string, number> = {};
  const statuses: Record<string, number> = {};

  preseeds.forEach((preseed: any) => {
    const type = preseed.type || 'unknown';
    const status = preseed.status || 'unknown';
    preseedTypes[type] = (preseedTypes[type] || 0) + 1;
    statuses[status] = (statuses[status] || 0) + 1;
  });

  const filteredPreseeds = preseeds.slice(0, 20).map((preseed: any) => ({
    key: preseed.key,
    type: preseed.type,
    title: preseed.title,
    value: preseed.value,
    status: preseed.status
  }));

  const result = {
    summary: {
      total_count: preseeds.length,
      returned_count: filteredPreseeds.length,
      preseed_types: preseedTypes,
      statuses
    },
    preseeds: filteredPreseeds,
    next_offset: nextOffset
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result)
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockPreseedsListCall(params: any): Promise<any> {
//   return [[{ key: '#preseed#whois+company#Example#example', type: 'whois+company', title: 'Example', value: 'example', status: 'A' }], null];
// }
// 
// 

export type PreseedsListInput = z.infer<typeof InputSchema>;
export type PreseedsListOutput = z.infer<typeof FilteredOutputSchema>;
