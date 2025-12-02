// Praetorian-CLI MCP Wrapper: seeds_list
// Purpose: List asset seeds with filtering
// Token savings: ~85%
//
// Schema Discovery Results (tested with real MCP server):
// - next_offset: Returns NUMBER (not string) for pagination offset

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

const InputSchema = z.object({
  seed_type: z.string().optional(),
  key_prefix: z.string().default(''),
  pages: z.number().int().min(1).max(100).default(1)
});

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    returned_count: z.number(),
    seed_types: z.record(z.number()),
    statuses: z.record(z.number())
  }),
  seeds: z.array(z.object({
    key: z.string(),
    dns: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    seed_type: z.string().optional()
  })),
  next_offset: z.number().nullable(),
  estimated_tokens: z.number()
});

export const seedsList = {
  name: 'praetorian-cli.seeds_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    const rawResult = await callMCPTool('praetorian-cli', 'seeds_list', validated);
    const filtered = filterSeedsResult(rawResult);
    return FilteredOutputSchema.parse(filtered);
  }
};

function filterSeedsResult(rawResult: any): any {
  // MCP may return array directly OR as [array, offset] tuple
  const seeds = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
  const nextOffset = Array.isArray(rawResult[0]) ? rawResult[1] : null;

  const seedTypes: Record<string, number> = {};
  const statuses: Record<string, number> = {};

  seeds.forEach((seed: any) => {
    const type = seed.seed_type || 'unknown';
    const status = seed.status || 'unknown';
    seedTypes[type] = (seedTypes[type] || 0) + 1;
    statuses[status] = (statuses[status] || 0) + 1;
  });

  const filteredSeeds = seeds.slice(0, 20).map((seed: any) => ({
    key: seed.key,
    dns: seed.dns,
    name: seed.name,
    status: seed.status,
    seed_type: seed.seed_type
  }));

  return {
    summary: {
      total_count: seeds.length,
      returned_count: filteredSeeds.length,
      seed_types: seedTypes,
      statuses
    },
    seeds: filteredSeeds,
    next_offset: nextOffset,
    estimated_tokens: 850
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockSeedsListCall(params: any): Promise<any> {
//   return [[{ key: '#asset#example.com#example.com', dns: 'example.com', name: 'example.com', status: 'A', seed_type: 'asset' }], null];
// }
// 
// 

export type SeedsListInput = z.infer<typeof InputSchema>;
export type SeedsListOutput = z.infer<typeof FilteredOutputSchema>;
