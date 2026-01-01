// Praetorian-CLI MCP Wrapper: jobs_list
// Purpose: List jobs with status filtering and token optimization
// Token savings: ~90% (10,000 jobs × 150 tokens → 1,500 tokens summary)
//
// Schema Discovery Results (tested with real MCP server):
// - next_offset: Returns STRING object (JSON) unlike other list wrappers which return NUMBER

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({
  prefix_filter: z.string().default(''),
  offset: z.string().optional(),
  pages: z.number().int().min(1).max(100).default(1),  // Default to 1 page (~100 jobs)
  limit: z.number().int().min(1).max(1000).default(100)  // Max results to return
});

// ============================================================================
// Output Schema (Filtered)
// ============================================================================

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    returned_count: z.number(),
    has_more: z.boolean(),
    status_counts: z.record(z.number()),
    capability_counts: z.record(z.number())
  }),
  jobs: z.array(z.object({
    key: z.string(),
    status: z.string().optional(),
    dns: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    created: z.string().optional(),
    updated: z.string().optional()
  })),
  next_offset: z.string().nullable(),
  estimated_tokens: z.number()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const jobsList = {
  name: 'praetorian-cli.jobs_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    // Remove limit (wrapper-only param) and null values before sending to MCP
    const { limit, ...mcpParams } = validated;
    const cleanedInput = Object.fromEntries(
      Object.entries(mcpParams).filter(([_, v]) => v !== null)
    );
    const rawResult = await callMCPTool('praetorian-cli', 'jobs_list', cleanedInput);
    const filtered = filterJobsResult(rawResult, limit);
    return FilteredOutputSchema.parse(filtered);
  }
};

// ============================================================================
// Filtering Logic
// ============================================================================

function filterJobsResult(rawResult: any, limit: number = 100): any {
  // MCP may return array directly OR as [array, offset] tuple
  const jobs = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
  const nextOffset = Array.isArray(rawResult[0]) ? rawResult[1] : null;

  const statusCounts: Record<string, number> = {};
  const capabilityCounts: Record<string, number> = {};

  jobs.forEach((job: any) => {
    const status = job.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    (job.capabilities || []).forEach((cap: string) => {
      capabilityCounts[cap] = (capabilityCounts[cap] || 0) + 1;
    });
  });

  const filteredJobs = jobs.slice(0, limit).map((job: any) => ({
    key: job.key,
    status: job.status,
    dns: job.dns,
    capabilities: job.capabilities,
    created: job.created,
    updated: job.updated
  }));

  return {
    summary: {
      total_count: jobs.length,
      returned_count: filteredJobs.length,
      has_more: jobs.length > limit,
      status_counts: statusCounts,
      capability_counts: capabilityCounts
    },
    jobs: filteredJobs,
    next_offset: nextOffset,
    estimated_tokens: 1500
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockJobsListCall(params: any): Promise<any> {
//   return [
//     [
//       {
//         key: '#job#example.com#1.2.3.4#nuclei#1234567890',
//         status: 'JQ',
//         dns: 'example.com',
//         capabilities: ['nuclei'],
//         created: '2025-01-01T00:00:00Z',
//         updated: '2025-01-01T00:00:00Z'
//       }
//     ],
//     null
//   ];
// }
// 
// 

export type JobsListInput = z.infer<typeof InputSchema>;
export type JobsListOutput = z.infer<typeof FilteredOutputSchema>;
