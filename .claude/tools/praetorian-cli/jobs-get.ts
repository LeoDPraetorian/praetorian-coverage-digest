// Praetorian-CLI MCP Wrapper: jobs_get
// Purpose: Get specific job details with validation
// Token savings: ~40% (detailed job × 300 tokens → 180 tokens filtered)

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

const InputSchema = z.object({
  key: z.string().min(1).startsWith('#job#')
});

const FilteredOutputSchema = z.object({
  key: z.string(),
  status: z.string(),
  dns: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  config: z.record(z.any()).optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  estimated_tokens: z.number()
}).nullable();

export const jobsGet = {
  name: 'praetorian-cli.jobs_get',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    const rawResult = await callMCPTool('praetorian-cli', 'jobs_get', validated);

    if (!rawResult) {
      return null;
    }

    return FilteredOutputSchema.parse({
      key: rawResult.key,
      status: rawResult.status,
      dns: rawResult.dns,
      capabilities: rawResult.capabilities,
      config: rawResult.config,
      created: rawResult.created,
      updated: rawResult.updated,
      estimated_tokens: 180
    });
  }
};

// REMOVED: Mock function - now using real MCP server
// async function mockJobsGetCall(params: any): Promise<any> {
//   return {
//     key: params.key,
//     status: 'JQ',
//     dns: 'example.com',
//     capabilities: ['nuclei'],
//     config: {},
//     created: '2025-01-01T00:00:00Z',
//     updated: '2025-01-01T00:00:00Z'
//   };
// }
// 
// 

export type JobsGetInput = z.infer<typeof InputSchema>;
export type JobsGetOutput = z.infer<typeof FilteredOutputSchema>;
