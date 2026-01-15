/**
 * Ghydra instances-discover wrapper
 *
 * Discovers available Ghidra instances on the network with optional host filtering.
 * Achieves 75% token reduction by filtering to essential fields.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoControlChars } from '../config/lib/sanitize.js';
import { estimateTokens, truncate } from '../config/lib/response-utils.js';
import { GhydraWrapperError } from './errors.js';

function isValidHostname(host: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(host)) {
    const octets = host.split('.').map(Number);
    return octets.every(o => o >= 0 && o <= 255);
  }
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  if (ipv6Pattern.test(host)) return true;
  const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnamePattern.test(host);
}

function countBy<T>(items: T[], fn: (item: T) => string): Record<string, number> {
  return items.reduce((acc, item) => {
    const key = fn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

const InputSchema = z.object({
  host: z.string()
    .max(253, 'Hostname too long (max 253 characters)')
    .refine((val) => validateNoControlChars(val), { message: 'Control characters not allowed in hostname' })
    .refine((val) => isValidHostname(val), { message: 'Invalid hostname or IP address format' })
    .optional()
    .describe('Target host to scan (defaults to localhost)'),
});

export type InstancesDiscoverInput = z.infer<typeof InputSchema>;

interface RawDiscoveredInstance {
  host: string;
  port: number;
  url: string;
  status: 'running' | 'stopped' | 'unknown';
  program?: string | null;
  programPath?: string | null;
  version?: string | null;
  lastSeen?: string | null;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
  internalId?: string;
  __typename?: string;
}

interface FilteredInstance {
  host: string;
  port: number;
  url: string;
  status: string;
  program?: string;
}

interface InstancesDiscoverOutput {
  summary: {
    totalDiscovered: number;
    returned?: number;
    hasMore?: boolean;
    byStatus: Record<string, number>;
    scannedHost: string;
  };
  instances: FilteredInstance[];
  estimatedTokens: number;
}

const MAX_INSTANCES = 50;

function filterInstance(raw: RawDiscoveredInstance): FilteredInstance {
  return {
    host: raw.host || 'unknown',
    port: raw.port || 0,
    url: raw.url || `http://${raw.host}:${raw.port}`,
    status: raw.status || 'unknown',
    program: raw.program ? truncate(raw.program, 100) : undefined,
  };
}

function filterResponse(rawInstances: RawDiscoveredInstance[], scannedHost: string): InstancesDiscoverOutput {
  const truncated = rawInstances.slice(0, MAX_INSTANCES);
  const filtered = truncated.map(filterInstance);
  const result: InstancesDiscoverOutput = {
    summary: {
      totalDiscovered: rawInstances.length,
      byStatus: countBy(rawInstances, i => i.status || 'unknown'),
      scannedHost,
    },
    instances: filtered,
    estimatedTokens: 0,
  };
  if (rawInstances.length > MAX_INSTANCES) {
    result.summary.returned = filtered.length;
    result.summary.hasMore = true;
  }
  result.estimatedTokens = estimateTokens(result);
  return result;
}

export const instancesDiscover = {
  name: 'ghydra.instances_discover',
  description: 'Discover available Ghidra instances on the network. Scans localhost by default, or a specific host if provided.',
  inputSchema: InputSchema,

  async execute(input: InstancesDiscoverInput): Promise<InstancesDiscoverOutput> {
    const validated = InputSchema.parse(input);
    try {
      const raw = await callMCPTool('ghydra', 'instances_discover', { host: validated.host });
      const rawInstances = Array.isArray(raw) ? raw : [];
      return filterResponse(rawInstances, validated.host || 'localhost');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('connection refused')) {
          throw new GhydraWrapperError({ type: 'connection', message: `Cannot reach host: ${validated.host || 'localhost'}`, retryable: true }, 'instances-discover', validated);
        }
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
          throw new GhydraWrapperError({ type: 'connection', message: `Host not found: ${validated.host}`, retryable: false }, 'instances-discover', validated);
        }
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT') || error.message.includes('timed out')) {
          throw new GhydraWrapperError({ type: 'timeout', message: 'Network scan timed out', retryable: true }, 'instances-discover', validated);
        }
      }
      throw error;
    }
  },
};

export type { InstancesDiscoverOutput };
export default instancesDiscover;
