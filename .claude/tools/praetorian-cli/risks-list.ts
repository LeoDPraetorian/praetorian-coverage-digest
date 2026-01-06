// Praetorian-CLI MCP Wrapper: risks_list
// Purpose: List risks with intelligent filtering and prioritization
// Token savings: ~90% (5,000 risks × 200 tokens → 5,000 tokens summary)
//
// Schema Discovery Results (tested with real MCP server):
// - next_offset: Returns NUMBER (not string) for pagination offset

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  contains_filter: z.string().default(''),
  offset: z.string().nullable().default(null),
  pages: z.number().int().min(1).max(100).default(1)
});

// ============================================================================
// Output Schema (Filtered)
// ============================================================================

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    by_status: z.record(z.number()),
    by_severity: z.record(z.number()),
    critical_count: z.number(),
    high_count: z.number()
  }),
  critical_risks: z.array(z.object({
    key: z.string(),
    name: z.string(),
    status: z.string(),
    dns: z.string().optional(),
    created: z.string().optional()
  })),
  high_risks: z.array(z.object({
    key: z.string(),
    name: z.string(),
    status: z.string()
  })),
  other_risks_count: z.number(),
  next_offset: z.number().nullable(),
  estimatedTokens: z.number()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const risksList = {
  name: 'praetorian-cli.risks_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    // Remove null values before sending to MCP (MCP expects string or omitted, not null)
    const cleanedInput = Object.fromEntries(
      Object.entries(validated).filter(([_, v]) => v !== null)
    );
    const rawResult = await callMCPTool('praetorian-cli', 'risks_list', cleanedInput);
    const filtered = filterRisksResult(rawResult);
    return FilteredOutputSchema.parse(filtered);
  }
};

// ============================================================================
// Filtering Logic
// ============================================================================

function filterRisksResult(rawResult: any): any {
  // MCP may return array directly OR as [array, offset] tuple
  const risks = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
  const nextOffset = Array.isArray(rawResult[0]) ? rawResult[1] : null;

  // Categorize risks by severity (extracted from status field)
  // Status format: {triage_state}{severity} e.g., "OC" = Open Critical, "TH" = Triage High
  const criticalRisks: any[] = [];
  const highRisks: any[] = [];
  const otherRisks: any[] = [];

  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  risks.forEach((risk: any) => {
    const status = risk.status || '';
    const severity = status.charAt(1); // C, H, M, L

    byStatus[status] = (byStatus[status] || 0) + 1;
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;

    if (severity === 'C') {
      criticalRisks.push(risk);
    } else if (severity === 'H') {
      highRisks.push(risk);
    } else {
      otherRisks.push(risk);
    }
  });

  // Return detailed info for critical (all), high (top 10), and counts for rest
  const result = {
    summary: {
      total_count: risks.length,
      by_status: byStatus,
      by_severity: bySeverity,
      critical_count: criticalRisks.length,
      high_count: highRisks.length
    },
    critical_risks: criticalRisks.map(r => ({
      key: r.key,
      name: r.name,
      status: r.status,
      dns: r.dns,
      created: r.created
    })),
    high_risks: highRisks.slice(0, 10).map(r => ({
      key: r.key,
      name: r.name,
      status: r.status
    })),
    other_risks_count: otherRisks.length,
    next_offset: nextOffset
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result)
  };
}

// REMOVED: Mock function - now using real MCP server

export type RisksListInput = z.infer<typeof InputSchema>;
export type RisksListOutput = z.infer<typeof FilteredOutputSchema>;
