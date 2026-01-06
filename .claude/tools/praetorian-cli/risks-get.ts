// Praetorian-CLI MCP Wrapper: risks_get
// Purpose: Get single risk with optional details filtering
// Token savings: ~75% when details=true (4,000 tokens → 1,000 tokens)

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const InputSchema = z.object({
  key: z.string().min(1, 'Risk key is required'),
  details: z.boolean().default(false)
});

const FilteredOutputSchema = z.object({
  key: z.string(),
  name: z.string(),
  status: z.string(),
  dns: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  comment: z.string().optional(),
  affected_assets_summary: z.object({
    total_count: z.number(),
    sample_keys: z.array(z.string())
  }).optional(),
  attributes_summary: z.object({
    total_count: z.number(),
    sample: z.array(z.object({
      name: z.string(),
      value: z.string()
    }))
  }).optional(),
  estimatedTokens: z.number()
});

export const risksGet = {
  name: 'praetorian-cli.risks_get',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    const rawResult = await callMCPTool('praetorian-cli', 'risks_get', validated);
    const filtered = filterRiskDetails(rawResult, validated.details);
    return FilteredOutputSchema.parse(filtered);
  }
};

function filterRiskDetails(rawRisk: any, includeDetails: boolean): any {
  if (!rawRisk) {
    throw new Error('Risk not found');
  }

  const base = {
    key: rawRisk.key,
    name: rawRisk.name,
    status: rawRisk.status,
    dns: rawRisk.dns,
    created: rawRisk.created,
    updated: rawRisk.updated,
    comment: rawRisk.comment
  };

  if (!includeDetails) {
    return {
      ...base,
      estimatedTokens: estimateTokens(base)
    };
  }

  const assets = rawRisk.affected_assets || [];
  const attributes = rawRisk.attributes || [];

  const result = {
    ...base,
    affected_assets_summary: {
      total_count: assets.length,
      sample_keys: assets.slice(0, 5).map((a: any) => a.key)
    },
    attributes_summary: {
      total_count: attributes.length,
      sample: attributes.slice(0, 5).map((a: any) => ({
        name: a.name,
        value: a.value
      }))
    }
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result)
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockRisksGetCall(params: any): Promise<any> {
//   return {
//     key: params.key,
//     name: 'SQL Injection',
//     status: 'OC',
//     dns: 'example.com',
//     created: '2025-01-15T00:00:00Z',
//     updated: '2025-01-20T00:00:00Z',
//     comment: 'Critical vulnerability',
//     affected_assets: [],
//     attributes: []
//   };
// }
// 
// 

export type RisksGetInput = z.infer<typeof InputSchema>;
export type RisksGetOutput = z.infer<typeof FilteredOutputSchema>;
