/**
 * Shodan Host Search Wrapper
 *
 * Wraps Shodan's /shodan/host/search endpoint with token optimization.
 * Searches Shodan for hosts matching the query.
 */

import { z } from 'zod';
import { createShodanClientAsync } from './client.js';
import type { HTTPPort } from '../config/lib/http-client.js';
import { truncate, estimateTokens } from '../config/lib/response-utils.js';

// =============================================================================
// Input Schema
// =============================================================================

const InputSchema = z.object({
  query: z.string().min(1).describe('Shodan search query'),
  page: z.number().int().min(1).max(100).optional().default(1),
  facets: z.string().optional(),
});

// =============================================================================
// Raw Response Schema (from API)
// =============================================================================

const RawMatchSchema = z.object({
  ip_str: z.string(),
  port: z.number(),
  transport: z.string().optional(),
  product: z.string().optional(),
  version: z.string().optional(),
  os: z.string().optional(),
  asn: z.string().optional(),
  org: z.string().optional(),
  isp: z.string().optional(),
  hostnames: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
  timestamp: z.string().optional(),
  data: z.string().optional(), // Large field - truncate
  // Omit: _shodan, location, opts, http (internal/bloated)
});

// =============================================================================
// Filtered Output Schema (token-optimized)
// =============================================================================

const FilteredOutputSchema = z.object({
  summary: z.object({
    total: z.number(),
    returned: z.number(),
    hasMore: z.boolean(),
    query: z.string(),
  }),
  matches: z.array(
    z.object({
      ip: z.string(),
      port: z.number(),
      protocol: z.string().optional(),
      product: z.string().optional(),
      version: z.string().optional(),
      os: z.string().optional(),
      org: z.string().optional(),
      hostnames: z.array(z.string()).optional(),
      bannerPreview: z.string().optional(), // First 200 chars of data
    })
  ),
  estimatedTokens: z.number(),
});

// =============================================================================
// Wrapper Implementation
// =============================================================================

export const hostSearch = {
  name: 'shodan.host_search',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(
    input: z.infer<typeof InputSchema>,
    client?: HTTPPort
  ): Promise<z.infer<typeof FilteredOutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Create client if not provided (for testing)
    const httpClient = client ?? await createShodanClientAsync();

    // Build search params
    const searchParams: Record<string, string | number> = {
      query: validated.query,
      page: validated.page,
    };

    if (validated.facets) {
      searchParams.facets = validated.facets;
    }

    // Call Shodan API (increase limit since search can return large responses)
    const result = await httpClient.request<{
      matches: z.infer<typeof RawMatchSchema>[];
      total: number;
    }>('get', 'shodan/host/search', {
      searchParams,
      maxResponseBytes: 10_000_000, // 10MB limit for search results
    });

    // Handle errors
    if (!result.ok) {
      throw new Error(`Shodan API error: ${result.error.message}`);
    }

    // Filter response for token efficiency (80-95% reduction target)
    const filtered = filterResponse(result.data, validated.query);

    // Validate output
    return FilteredOutputSchema.parse(filtered);
  },
};

/**
 * Filter raw Shodan response for token efficiency
 *
 * Applies patterns from optimizing-llm-api-responses skill:
 * - Field selection (keep essential, omit internal)
 * - Truncation with indicators
 * - Summary metadata
 */
function filterResponse(
  raw: { matches: any[]; total: number },
  query: string
): z.infer<typeof FilteredOutputSchema> {
  const LIMIT = 20; // Per PaginationLimits.DEFAULT

  const matches = raw.matches.slice(0, LIMIT).map((m) => ({
    ip: m.ip_str,
    port: m.port,
    protocol: m.transport ?? undefined,
    product: m.product ?? undefined,
    version: m.version ?? undefined,
    os: m.os ?? undefined, // Convert null to undefined for Zod schema
    org: m.org ?? undefined,
    hostnames: m.hostnames?.slice(0, 3), // Limit array size
    bannerPreview: truncate(m.data, 200), // Truncate large text
    // Omit: location, _shodan, opts, http, full data
  }));

  const result = {
    summary: {
      total: raw.total,
      returned: matches.length,
      hasMore: raw.total > matches.length,
      query,
    },
    matches,
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result),
  };
}

// =============================================================================
// Type Exports
// =============================================================================

export type HostSearchInput = z.infer<typeof InputSchema>;
export type HostSearchOutput = z.infer<typeof FilteredOutputSchema>;
