// Praetorian-CLI MCP Wrapper: keys_list
// Purpose: List API keys with pagination
// Token savings: ~75%
//
// Schema Discovery Results (tested with real MCP server):
// - next_offset: Returns NUMBER (not string) for pagination offset

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

const InputSchema = z.object({
  offset: z.string().optional(),
  pages: z.number().int().min(1).max(100).default(1)
});

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    active_count: z.number(),
    deleted_count: z.number()
  }),
  keys: z.array(z.object({
    key: z.string(),
    name: z.string(),
    expires: z.string(),
    creator: z.string(),
    status: z.string()
  })),
  next_offset: z.number().nullable(),
  estimated_tokens: z.number()
});

export const keysList = {
  name: 'praetorian-cli.keys_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    // Remove null values before sending to MCP (MCP expects string or omitted, not null)
    const cleanedInput = Object.fromEntries(
      Object.entries(validated).filter(([_, v]) => v !== null)
    );
    const rawResult = await callMCPTool('praetorian-cli', 'keys_list', cleanedInput);
    const filtered = filterKeysResult(rawResult);
    return FilteredOutputSchema.parse(filtered);
  }
};

function filterKeysResult(rawResult: any): any {
  // MCP may return array directly OR as [array, offset] tuple
  const keys = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
  const nextOffset = Array.isArray(rawResult[0]) ? rawResult[1] : null;

  let activeCount = 0;
  let deletedCount = 0;

  keys.forEach((key: any) => {
    if (key.status === 'A') activeCount++;
    if (key.status === 'D') deletedCount++;
  });

  const filteredKeys = keys.slice(0, 20).map((key: any) => ({
    key: key.key,
    name: key.name,
    expires: key.expires,
    creator: key.creator,
    status: key.status
  }));

  return {
    summary: {
      total_count: keys.length,
      active_count: activeCount,
      deleted_count: deletedCount
    },
    keys: filteredKeys,
    next_offset: nextOffset,
    estimated_tokens: 500
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockKeysListCall(params: any): Promise<any> {
//   return [[{ key: '#key#uuid-123', name: 'test-key', expires: '2025-12-31', creator: 'user@example.com', status: 'A' }], null];
// }
// 
// 

export type KeysListInput = z.infer<typeof InputSchema>;
export type KeysListOutput = z.infer<typeof FilteredOutputSchema>;
