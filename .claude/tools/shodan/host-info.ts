/**
 * Shodan Host Information Wrapper
 *
 * Wraps the /shodan/host/{ip} endpoint to retrieve detailed information about a host.
 * Returns filtered response optimized for token efficiency.
 */

import { z } from 'zod';
import { createShodanClientAsync, type HTTPPort } from './client.js';
import { estimateTokens, nullToUndefined, ensureArray } from '../config/lib/response-utils.js';

// =============================================================================
// Input Schema
// =============================================================================

/**
 * IPv4 address validation regex
 * Matches valid IPv4 addresses (0.0.0.0 to 255.255.255.255)
 */
const IPV4_REGEX = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;

const InputSchema = z.object({
  ip: z
    .string()
    .regex(IPV4_REGEX, 'Must be a valid IPv4 address')
    .describe('IPv4 address to lookup'),
  history: z
    .boolean()
    .optional()
    .describe('Include historical host information'),
  minify: z
    .boolean()
    .optional()
    .describe('Return minified response'),
});

// =============================================================================
// Raw Response Schema (from API)
// =============================================================================

const RawResponseSchema = z.object({
  ip_str: z.string(),
  ports: z.array(z.number()).optional(),
  os: z.string().nullable().optional(),
  org: z.string().nullable().optional(),
  asn: z.string().nullable().optional(),
  hostnames: z.array(z.string()).nullable().optional(),
  domains: z.array(z.string()).nullable().optional(),
  vulns: z.array(z.string()).nullable().optional(),
  // Internal fields that will be omitted: _shodan, opts, location, data
});

// =============================================================================
// Filtered Output Schema (token-optimized)
// =============================================================================

const FilteredOutputSchema = z.object({
  ip: z.string(),
  ports: z.array(z.number()).optional(),
  os: z.string().optional(),
  org: z.string().optional(),
  asn: z.string().optional(),
  hostnames: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
  vulns: z.array(z.string()).optional(),
  estimatedTokens: z.number(),
});

// =============================================================================
// Wrapper Implementation
// =============================================================================

export const hostInfo = {
  name: 'shodan.host_info',
  inputSchema: InputSchema,
  outputSchema: FilteredOutputSchema,

  async execute(
    input: z.infer<typeof InputSchema>,
    client?: HTTPPort
  ): Promise<z.infer<typeof FilteredOutputSchema>> {
    // Validate input
    const validated = InputSchema.parse(input);

    // Create client if not provided
    const httpClient = client ?? await createShodanClientAsync();

    // Build query parameters
    const searchParams: Record<string, boolean> = {};
    if (validated.history !== undefined) {
      searchParams.history = validated.history;
    }
    if (validated.minify !== undefined) {
      searchParams.minify = validated.minify;
    }

    // Call Shodan API (path without leading slash for Ky prefixUrl)
    const result = await httpClient.request<z.infer<typeof RawResponseSchema>>(
      'get',
      `shodan/host/${validated.ip}`,
      { searchParams }
    );

    // Handle errors
    if (!result.ok) {
      throw new Error(`Shodan API error: ${result.error.message}`);
    }

    // Filter response for token efficiency
    const filtered = filterResponse(result.data);

    // Validate output
    return FilteredOutputSchema.parse(filtered);
  },
};

/**
 * Filter raw Shodan response for token efficiency
 *
 * Applies patterns from optimizing-llm-api-responses skill:
 * - Field selection (keep essential, omit internal)
 * - Null to undefined conversion
 * - Array normalization
 *
 * Target: 80-95% token reduction vs raw API response
 */
function filterResponse(
  raw: z.infer<typeof RawResponseSchema>
): z.infer<typeof FilteredOutputSchema> {
  const filtered = {
    ip: raw.ip_str,
    ports: ensureArray(raw.ports).length > 0 ? ensureArray(raw.ports) : undefined,
    os: nullToUndefined(raw.os),
    org: nullToUndefined(raw.org),
    asn: nullToUndefined(raw.asn),
    hostnames: raw.hostnames && raw.hostnames.length > 0 ? raw.hostnames : undefined,
    domains: raw.domains && raw.domains.length > 0 ? raw.domains : undefined,
    vulns: raw.vulns && raw.vulns.length > 0 ? raw.vulns : undefined,
  };

  // Remove undefined fields for cleaner output
  const cleaned = Object.fromEntries(
    Object.entries(filtered).filter(([_, v]) => v !== undefined)
  ) as Omit<z.infer<typeof FilteredOutputSchema>, 'estimatedTokens'>;

  return {
    ...cleaned,
    estimatedTokens: estimateTokens(cleaned),
  };
}

// =============================================================================
// Type Exports
// =============================================================================

export type HostInfoInput = z.infer<typeof InputSchema>;
export type HostInfoOutput = z.infer<typeof FilteredOutputSchema>;
