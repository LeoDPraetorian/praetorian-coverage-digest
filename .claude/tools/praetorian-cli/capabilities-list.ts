// Praetorian-CLI MCP Wrapper: capabilities_list
// Purpose: List security capabilities with filtering by name/target/executor
// Token savings: ~85% (capabilities × 400 tokens → filtered summary)

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const InputSchema = z.object({
  name: z.string().optional(),
  target: z.enum(['asset', 'attribute', 'preseed', 'webpage', 'repository', 'integration']).optional(),
  executor: z.string().optional()
});

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    returned_count: z.number(),
    executors: z.record(z.number()),
    targets: z.record(z.number())
  }),
  capabilities: z.array(z.object({
    name: z.string(),
    title: z.string().optional(),
    target: z.string().optional(),
    executor: z.string().optional(),
    surface: z.string().optional()
  })),
  estimatedTokens: z.number()
});

export const capabilitiesList = {
  name: 'praetorian-cli.capabilities_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    const rawResult = await callMCPTool('praetorian-cli', 'capabilities_list', validated);
    const filtered = filterCapabilitiesResult(rawResult);
    return FilteredOutputSchema.parse(filtered);
  }
};

function filterCapabilitiesResult(rawResult: any): any {
  // MCP may return array directly OR as [array, offset] tuple
  // If rawResult[0] is an array, we have tuple format; otherwise direct array
  const capabilities = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;

  const executors: Record<string, number> = {};
  const targets: Record<string, number> = {};

  capabilities.forEach((cap: any) => {
    executors[cap.executor] = (executors[cap.executor] || 0) + 1;
    targets[cap.target] = (targets[cap.target] || 0) + 1;
  });

  const filteredCapabilities = capabilities.slice(0, 50).map((cap: any) => ({
    name: cap.name,
    title: cap.title,
    target: cap.target,
    executor: cap.executor,
    surface: cap.surface
  }));

  const result = {
    summary: {
      total_count: capabilities.length,
      returned_count: filteredCapabilities.length,
      executors,
      targets
    },
    capabilities: filteredCapabilities
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result)
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockCapabilitiesListCall(params: any): Promise<any> {
//   return [[{ name: 'nuclei', title: 'Nuclei Scanner', target: 'asset', executor: 'chariot', surface: 'external' }], null];
// }
// 
// 

export type CapabilitiesListInput = z.infer<typeof InputSchema>;
export type CapabilitiesListOutput = z.infer<typeof FilteredOutputSchema>;
