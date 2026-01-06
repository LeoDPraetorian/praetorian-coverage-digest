// Praetorian-CLI MCP Wrapper: integrations_list
// Purpose: List integrations (cloud, SCM, scanners) with filtering
// Token savings: ~85%
//
// Schema Discovery Results (tested with real MCP server):
// - next_offset: Returns NUMBER (not string) for pagination offset

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const InputSchema = z.object({
  name_filter: z.string().default(''),
  offset: z.string().optional(),
  pages: z.number().int().min(1).max(100).default(1)
});

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    returned_count: z.number(),
    integration_types: z.record(z.number())
  }),
  integrations: z.array(z.object({
    key: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional()
  })),
  next_offset: z.number().nullable(),
  estimatedTokens: z.number()
});

export const integrationsList = {
  name: 'praetorian-cli.integrations_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    // Remove null values before sending to MCP (MCP expects string or omitted, not null)
    const cleanedInput = Object.fromEntries(
      Object.entries(validated).filter(([_, v]) => v !== null)
    );
    const rawResult = await callMCPTool('praetorian-cli', 'integrations_list', cleanedInput);
    const filtered = filterIntegrationsResult(rawResult);
    return FilteredOutputSchema.parse(filtered);
  }
};

function filterIntegrationsResult(rawResult: any): any {
  // MCP may return array directly OR as [array, offset] tuple
  const integrations = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
  const nextOffset = Array.isArray(rawResult[0]) ? rawResult[1] : null;

  const integrationTypes: Record<string, number> = {};
  integrations.forEach((int: any) => {
    const type = int.type || 'unknown';
    integrationTypes[type] = (integrationTypes[type] || 0) + 1;
  });

  const filteredIntegrations = integrations.slice(0, 20).map((int: any) => ({
    key: int.key,
    name: int.name,
    type: int.type,
    status: int.status
  }));

  const result = {
    summary: {
      total_count: integrations.length,
      returned_count: filteredIntegrations.length,
      integration_types: integrationTypes
    },
    integrations: filteredIntegrations,
    next_offset: nextOffset
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result)
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockIntegrationsListCall(params: any): Promise<any> {
//   return [[{ key: '#account#user#github#123', name: 'github', type: 'scm', status: 'active' }], null];
// }
// 
// 

export type IntegrationsListInput = z.infer<typeof InputSchema>;
export type IntegrationsListOutput = z.infer<typeof FilteredOutputSchema>;
