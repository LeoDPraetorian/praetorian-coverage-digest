// Wrapper for chrome-devtools list_network_requests tool
// Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  ensureArray,
  truncate,
  paginate,
  PaginationLimits,
  estimateTokens,
} from '../config/lib/response-utils';

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
  requests: z.array(z.object({
    url: z.string(),
    method: z.string().optional(),
    status: z.number().optional(),
    type: z.string().optional(),
    size: z.number().optional(),
    time: z.number().optional(),
  })),
  summary: z.object({
    total: z.number(),
    returned: z.number(),
    hasMore: z.boolean(),
  }),
  estimatedTokens: z.number()
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
    const validated = InputSchema.parse(input);

    const rawRequests = await callMCPTool(
      'chrome-devtools',
      'list_network_requests',
      validated
    );

    // Normalize and filter using shared utilities
    const allRequests = ensureArray(rawRequests);
    const limit = validated.pageSize ?? PaginationLimits.MEDIUM;
    const filtered = paginate(allRequests, limit);

    const result = {
      success: true,
      requests: filtered.map((req: any) => ({
        url: truncate(req.url, 'MEDIUM') || req.url, // Truncate long URLs
        method: req.method,
        status: req.status,
        type: req.resourceType || req.type,
        size: req.encodedDataLength || req.size,
        time: req.time,
      })),
      summary: {
        total: allRequests.length,
        returned: filtered.length,
        hasMore: allRequests.length > limit,
      },
    };
    return { ...result, estimatedTokens: estimateTokens(result) };
  }
};

// Type exports
export type ListNetworkRequestsInput = z.infer<typeof InputSchema>;
export type ListNetworkRequestsOutput = z.infer<typeof OutputSchema>;
