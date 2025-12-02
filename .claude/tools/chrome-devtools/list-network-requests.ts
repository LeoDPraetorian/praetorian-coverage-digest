// Wrapper for chrome-devtools list_network_requests tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// ============================================================================
// Input Schema (matches ACTUAL chrome-devtools MCP tool signature)
// ============================================================================

const InputSchema = z.object({
  includePreservedRequests: z.boolean().optional().default(false),
  pageIdx: z.number().int().min(0).optional(),
  pageSize: z.number().int().optional(),
  resourceTypes: z.array(z.enum(['document', 'stylesheet', 'image', 'media', 'font', 'script', 'texttrack', 'xhr', 'fetch', 'prefetch', 'eventsource', 'websocket', 'manifest', 'signedexchange', 'ping', 'cspviolationreport', 'preflight', 'fedcm', 'other'])).optional()
});

// ============================================================================
// Output Schema (filtered for token efficiency)
// ============================================================================

const OutputSchema = z.object({
  success: z.boolean(),
  requests: z.array(z.any()).optional()
});

// ============================================================================
// Tool Wrapper
// ============================================================================

export const listNetworkRequests = {
  name: 'chrome-devtools.list-network-requests',
  description: 'List all network requests',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Call chrome-devtools MCP server via SHARED client
    const requests = await callMCPTool(
      'chrome-devtools',                               // MCP name
      'mcp__chrome-devtools__list_network_requests',  // Actual MCP tool name
      validated                                        // Pass params directly
    );

    // Return filtered result (token efficient)
    return { success: true, requests };
  }
};

// Type exports
export type ListNetworkRequestsInput = z.infer<typeof InputSchema>;
export type ListNetworkRequestsOutput = z.infer<typeof OutputSchema>;
