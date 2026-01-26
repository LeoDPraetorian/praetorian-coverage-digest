/**
 * Shodan DNS Domain Lookup Wrapper
 *
 * Wraps the /dns/domain/{domain} endpoint with token-optimized response filtering.
 * Returns DNS records: A, AAAA, CNAME, MX, NS, SOA, TXT for a domain.
 */

import { z } from 'zod';
import { createShodanClientAsync } from './client.js';
import type { HTTPPort } from '../config/lib/http-client.js';
import { estimateTokens, PaginationLimits } from '../config/lib/response-utils.js';

// =============================================================================
// Input Schema
// =============================================================================

const InputSchema = z.object({
  domain: z
    .string()
    .min(1, 'Domain is required')
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i,
      'Invalid domain format'
    )
    .describe('Domain name to lookup'),
  history: z.boolean().optional().describe('Include historical DNS records'),
  page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Page number for pagination'),
});

// =============================================================================
// Raw Response Schema (from API)
// =============================================================================

const RawDNSRecordSchema = z.object({
  subdomain: z.string().optional(),
  type: z.string(), // A, AAAA, MX, NS, TXT, CNAME, SOA, etc.
  value: z.string(),
  ttl: z.number().optional(),
  priority: z.number().optional(), // For MX records
  last_seen: z.string().optional(),
});

const RawResponseSchema = z.object({
  domain: z.string(),
  subdomains: z.array(z.string()).optional(),
  data: z.array(RawDNSRecordSchema),
  tags: z.array(z.string()).optional(),
  more_data_available: z.boolean().optional(),
});

// =============================================================================
// Filtered Output Schema (token-optimized)
// =============================================================================

const DNSRecordsSchema = z.object({
  A: z.array(z.string()).optional(),
  AAAA: z.array(z.string()).optional(),
  MX: z.array(z.string()).optional(),
  NS: z.array(z.string()).optional(),
  TXT: z.array(z.string()).optional(),
  CNAME: z.array(z.string()).optional(),
  SOA: z.array(z.string()).optional(),
});

const FilteredOutputSchema = z.object({
  domain: z.string(),
  subdomains: z.array(z.string()).optional(),
  records: DNSRecordsSchema,
  summary: z
    .object({
      totalSubdomains: z.number(),
      hasMoreSubdomains: z.boolean(),
      totalRecords: z.number(),
      recordTypes: z.record(z.number()),
    })
    .optional(),
  estimatedTokens: z.number(),
});

// =============================================================================
// Wrapper Implementation
// =============================================================================

export const dnsDomain = {
  name: 'shodan.dns_domain',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(
    input: z.infer<typeof InputSchema>,
    client?: HTTPPort
  ): Promise<z.infer<typeof FilteredOutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Use provided client or create default Shodan client
    const httpClient = client ?? await createShodanClientAsync();

    // Build query parameters
    const searchParams: Record<string, string | number | boolean> = {};
    if (validated.history !== undefined) {
      searchParams.history = validated.history;
    }
    if (validated.page !== undefined) {
      searchParams.page = validated.page;
    }

    // Call Shodan API
    const result = await httpClient.request<z.infer<typeof RawResponseSchema>>(
      'get',
      `dns/domain/${validated.domain}`,
      { searchParams }
    );

    // Handle errors
    if (!result.ok) {
      throw new Error(`Shodan DNS API error: ${result.error.message}`);
    }

    // Validate raw response
    const rawData = RawResponseSchema.parse(result.data);

    // Filter response for token efficiency
    const filtered = filterResponse(rawData);

    // Validate and return output
    return FilteredOutputSchema.parse(filtered);
  },
};

/**
 * Filter raw Shodan DNS response for token efficiency
 *
 * Applies patterns from optimizing-llm-api-responses skill:
 * - Field selection (keep essential DNS records)
 * - Array limiting (subdomains)
 * - Summary metadata with counts
 */
function filterResponse(
  raw: z.infer<typeof RawResponseSchema>
): z.infer<typeof FilteredOutputSchema> {
  const SUBDOMAIN_LIMIT = PaginationLimits.DEFAULT; // 20

  // Group DNS records by type
  const records: Record<string, string[]> = {};
  for (const record of raw.data) {
    const type = record.type;
    if (!records[type]) {
      records[type] = [];
    }
    records[type].push(record.value);
  }

  // Calculate summary statistics
  const totalSubdomains = raw.subdomains?.length ?? 0;
  const limitedSubdomains = raw.subdomains?.slice(0, SUBDOMAIN_LIMIT);
  const hasMoreSubdomains = totalSubdomains > SUBDOMAIN_LIMIT;

  const recordTypes: Record<string, number> = {};
  for (const [type, values] of Object.entries(records)) {
    recordTypes[type] = values.length;
  }

  const result = {
    domain: raw.domain,
    subdomains: limitedSubdomains,
    records: {
      A: records.A,
      AAAA: records.AAAA,
      MX: records.MX,
      NS: records.NS,
      TXT: records.TXT,
      CNAME: records.CNAME,
      SOA: records.SOA,
    },
    summary: {
      totalSubdomains,
      hasMoreSubdomains,
      totalRecords: raw.data.length,
      recordTypes,
    },
  };

  return {
    ...result,
    estimatedTokens: estimateTokens(result),
  };
}

// =============================================================================
// Type Exports
// =============================================================================

export type DNSDomainInput = z.infer<typeof InputSchema>;
export type DNSDomainOutput = z.infer<typeof FilteredOutputSchema>;
