// Praetorian-CLI MCP Wrapper: aegis_list
// Purpose: List Aegis agents with system specs and tunnel status
// Token savings: ~80%

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';

const InputSchema = z.object({});

const FilteredOutputSchema = z.object({
  summary: z.object({
    total_count: z.number(),
    online_count: z.number(),
    os_distribution: z.record(z.number()),
    tunnel_status: z.object({
      active: z.number(),
      inactive: z.number()
    })
  }),
  agents: z.array(z.object({
    client_id: z.string(),
    hostname: z.string(),
    os: z.string(),
    is_online: z.boolean(),
    has_tunnel: z.boolean()
  })),
  estimated_tokens: z.number()
});

export const aegisList = {
  name: 'praetorian-cli.aegis_list',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof FilteredOutputSchema>> {
    const validated = InputSchema.parse(input);
    const rawResult = await callMCPTool('praetorian-cli', 'aegis_list', validated);
    const filtered = filterAegisResult(rawResult);
    return FilteredOutputSchema.parse(filtered);
  }
};

function filterAegisResult(rawResult: any): any {
  // MCP may return array directly OR as [array, offset] tuple
  // If rawResult[0] is an array, we have tuple format; otherwise direct array
  const agents = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;

  const osDistribution: Record<string, number> = {};
  let onlineCount = 0;
  let tunnelActive = 0;
  let tunnelInactive = 0;

  agents.forEach((agent: any) => {
    const os = agent.os || 'unknown';
    osDistribution[os] = (osDistribution[os] || 0) + 1;

    if (agent.is_online) onlineCount++;
    if (agent.has_tunnel) tunnelActive++;
    else tunnelInactive++;
  });

  const filteredAgents = agents.map((agent: any) => ({
    client_id: agent.client_id,
    hostname: agent.hostname,
    os: agent.os,
    is_online: agent.is_online,
    has_tunnel: agent.has_tunnel
  }));

  return {
    summary: {
      total_count: agents.length,
      online_count: onlineCount,
      os_distribution: osDistribution,
      tunnel_status: {
        active: tunnelActive,
        inactive: tunnelInactive
      }
    },
    agents: filteredAgents,
    estimated_tokens: 600
  };
}

// REMOVED: Mock function - now using real MCP server
// async function mockAegisListCall(params: any): Promise<any> {
//   return [[{ client_id: 'agent-123', hostname: 'server-001', os: 'linux', is_online: true, has_tunnel: true }], null];
// }
// 
// 

export type AegisListInput = z.infer<typeof InputSchema>;
export type AegisListOutput = z.infer<typeof FilteredOutputSchema>;
