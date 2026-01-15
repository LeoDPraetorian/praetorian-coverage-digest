/**
 * Ghydra MCP Wrapper: instances-list
 *
 * Lists all registered Ghidra instances with their connection status.
 * Implements 80% token reduction by filtering to essential fields only.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { validateNoPathTraversal } from '../config/lib/sanitize.js';
import { GhydraWrapperError } from './errors.js';

const InputSchema = z.object({}).strict();

export type InstancesListInput = z.infer<typeof InputSchema>;

interface RawInstance {
  host?: string;
  port?: number;
  url?: string;
  status?: string;
  program?: string | null;
  current?: boolean;
  lastConnected?: string;
  version?: string;
  pid?: number;
  uptime?: number;
  capabilities?: string[];
}

interface FilteredInstance {
  port: number;
  status: string;
  program: string | null;
  current: boolean;
}

interface InstancesSummary {
  total: number;
  connected: number;
  activePort: number | null;
}

export interface InstancesListOutput {
  instances: FilteredInstance[];
  summary: InstancesSummary;
  estimatedTokens: number;
}

function sanitizeStatus(status: string | undefined): string {
  if (!status) return 'unknown';
  const VALID_STATUSES = ['connected', 'disconnected', 'connecting', 'error'];
  const normalized = status.toLowerCase().trim();
  if (VALID_STATUSES.includes(normalized)) return normalized;
  if (/<|>|script|alert|onerror/i.test(status)) {
    console.warn('[ghydra.instances-list] Suspicious status value detected:', status);
    return 'unknown';
  }
  return 'unknown';
}

function sanitizeProgram(program: string | null | undefined): string | null {
  if (!program) return null;
  if (!validateNoPathTraversal(program)) {
    console.warn('[ghydra.instances-list] Path traversal detected in program name:', program);
    return '[sanitized]';
  }
  const basename = program.split(/[/\\]/).pop() || program;
  return basename;
}

function sanitizePort(port: number | undefined): number {
  if (typeof port !== 'number') return 0;
  if (port < 1 || port > 65535) return 0;
  if (!Number.isInteger(port)) return 0;
  return port;
}

function filterInstancesResponse(rawData: unknown): InstancesListOutput {
  let rawInstances: RawInstance[] = [];

  if (rawData === null || rawData === undefined) {
    rawInstances = [];
  } else if (Array.isArray(rawData)) {
    rawInstances = rawData;
  } else if (typeof rawData === 'object' && 'instances' in rawData) {
    rawInstances = Array.isArray((rawData as any).instances) ? (rawData as any).instances : [];
  } else if (typeof rawData === 'string') {
    console.warn('[ghydra.instances-list] Received string response, expected array/object');
    rawInstances = [];
  } else {
    console.warn('[ghydra.instances-list] Unexpected response format:', typeof rawData);
    rawInstances = [];
  }

  const instances: FilteredInstance[] = rawInstances
    .map((instance) => ({
      port: sanitizePort(instance.port),
      status: sanitizeStatus(instance.status),
      program: sanitizeProgram(instance.program),
      current: Boolean(instance.current ?? false),
    }))
    .filter((instance) => instance.port > 0);

  const connectedCount = instances.filter((i) => i.status === 'connected').length;
  const activeInstance = instances.find((i) => i.current);

  const filtered: InstancesListOutput = {
    instances,
    summary: {
      total: instances.length,
      connected: connectedCount,
      activePort: activeInstance?.port ?? null,
    },
    estimatedTokens: 0,
  };

  filtered.estimatedTokens = estimateTokens(filtered);
  return filtered;
}

function handleMCPError(error: unknown, tool: string): never {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes('ECONNREFUSED') || message.includes('connect ECONNREFUSED') || message.includes('Cannot connect')) {
      throw new GhydraWrapperError({ type: 'connection', message: 'Cannot connect to Ghydra MCP server. Is it running?', retryable: true }, tool);
    }
    if (message.includes('timeout') || message.includes('timed out') || message.includes('ETIMEDOUT')) {
      throw new GhydraWrapperError({ type: 'timeout', message: 'Request timed out. Ghydra instance may be busy.', retryable: true }, tool);
    }
    if (message.includes('ZodError') || message.includes('validation')) {
      throw new GhydraWrapperError({ type: 'validation', message: `Validation error: ${message}`, retryable: false }, tool);
    }
  }
  throw error;
}

export const instancesList = {
  name: 'ghydra.instances-list',
  description: 'List all registered Ghidra instances and their connection status',
  inputSchema: InputSchema,

  async execute(input: InstancesListInput): Promise<InstancesListOutput> {
    InputSchema.parse(input);
    try {
      const raw = await callMCPTool('ghydra', 'instances_list', {});
      return filterInstancesResponse(raw);
    } catch (error) {
      handleMCPError(error, 'instances-list');
    }
  },
};

export default instancesList;
