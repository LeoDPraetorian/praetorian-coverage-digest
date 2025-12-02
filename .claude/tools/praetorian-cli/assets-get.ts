// Praetorian-CLI MCP Wrapper: assets_get
// Purpose: Get single asset with optional details filtering
// Token savings: ~70% when details=true (5,000 tokens → 1,500 tokens)

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  key: z.string().min(1, 'Asset key is required'),
  details: z.boolean().default(false)
});

// ============================================================================
// Output Schema (Filtered)
// ============================================================================

const FilteredOutputSchema = z.object({
  key: z.string(),
  dns: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  class: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  attributes_summary: z.object({
    total_count: z.number(),
    types: z.record(z.number()),
    sample: z.array(z.object({
      name: z.string(),
      value: z.string()
    }))
  }).optional(),
  risks_summary: z.object({
    total_count: z.number(),
    by_severity: z.record(z.number()),
    critical_risks: z.array(z.object({
      key: z.string(),
      name: z.string(),
      status: z.string()
    }))
  }).optional(),
  estimated_tokens: z.number()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const assetsGet = {
  name: 'praetorian-cli.assets_get',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    const rawResult = await callMCPTool('praetorian-cli', 'assets_get', validated);
    const filtered = filterAssetDetails(rawResult, validated.details);
    return FilteredOutputSchema.parse(filtered);
  }
};

// ============================================================================
// Filtering Logic
// ============================================================================

function filterAssetDetails(rawAsset: any, includeDetails: boolean): any {
  if (!rawAsset) {
    throw new Error('Asset not found');
  }

  const base = {
    key: rawAsset.key,
    dns: rawAsset.dns,
    name: rawAsset.name,
    status: rawAsset.status,
    class: rawAsset.class,
    created: rawAsset.created,
    updated: rawAsset.updated,
    estimated_tokens: includeDetails ? 1500 : 200
  };

  if (!includeDetails) {
    return base;
  }

  // Summarize attributes instead of returning all
  const attributes = rawAsset.attributes || [];
  const attributeTypes: Record<string, number> = {};
  attributes.forEach((attr: any) => {
    const type = attr.name || 'unknown';
    attributeTypes[type] = (attributeTypes[type] || 0) + 1;
  });

  // Summarize risks - return only critical/high
  const risks = rawAsset.associated_risks || [];
  const risksBySeverity: Record<string, number> = {};
  risks.forEach((risk: any) => {
    const severity = risk.status?.charAt(1) || 'U'; // Extract severity from status
    risksBySeverity[severity] = (risksBySeverity[severity] || 0) + 1;
  });

  const criticalRisks = risks
    .filter((r: any) => r.status?.includes('C') || r.status?.includes('H'))
    .slice(0, 5)
    .map((r: any) => ({
      key: r.key,
      name: r.name,
      status: r.status
    }));

  return {
    ...base,
    attributes_summary: {
      total_count: attributes.length,
      types: attributeTypes,
      sample: attributes.slice(0, 5).map((a: any) => ({
        name: a.name,
        value: a.value
      }))
    },
    risks_summary: {
      total_count: risks.length,
      by_severity: risksBySeverity,
      critical_risks: criticalRisks
    }
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockAssetsGetCall(params: any): Promise<any> {
//   return {
//     key: params.key,
//     dns: 'example.com',
//     name: 'example.com',
//     status: 'A',
//     class: 'domain',
//     created: '2025-01-01T00:00:00Z',
//     updated: '2025-01-15T00:00:00Z',
//     attributes: [],
//     associated_risks: []
//   };
// }
// 
// 

export type AssetsGetInput = z.infer<typeof InputSchema>;
export type AssetsGetOutput = z.infer<typeof FilteredOutputSchema>;
