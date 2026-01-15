/**
 * Ghydra MCP Wrapper: instances-current
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { GhydraWrapperError } from './errors.js';
import { validateNoXSS, validateNoControlChars } from '../config/lib/sanitize.js';

const InputSchema = z.object({});

export type InstancesCurrentInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  port: z.number(),
  url: z.string(),
  program: z.string().nullable(),
  status: z.enum(['connected', 'disconnected', 'error']),
  estimatedTokens: z.number(),
});

export type InstancesCurrentOutput = z.infer<typeof OutputSchema>;

interface RawInstanceCurrent {
  port: number;
  url?: string;
  host?: string;
  program?: string;
  programPath?: string;
  status?: string;
  connected?: boolean;
  [key: string]: unknown;
}

function normalizeStatus(status?: string, connected?: boolean): 'connected' | 'disconnected' | 'error' {
  if (status === 'error' || status === 'Error') return 'error';
  if (status === 'connected' || status === 'Connected' || connected === true) return 'connected';
  return 'disconnected';
}

function extractProgramName(program?: string, programPath?: string): string | null {
  if (!program && !programPath) return null;
  if (program === '' || program === '(none)') return null;
  let value = program || programPath;
  if (!value) return null;
  value = value.replace(/\x00/g, '');
  if (value.includes('..')) {
    const parts = value.split(/[/\\]/);
    value = parts[parts.length - 1] || '';
    if (!value) return null;
  }
  if (value.includes('/') || value.includes('\\')) {
    const parts = value.split(/[/\\]/);
    value = parts[parts.length - 1] || '';
  }
  return value || null;
}

function sanitizeUrl(url: string, host?: string, port?: number): string {
  if (!validateNoXSS(url)) {
    if (host && port) return `http://${host}:${port}`;
    return `http://localhost:${port || 18489}`;
  }
  if (!validateNoControlChars(url)) {
    url = url.replace(/[\x00-\x1F\x7F]/g, '');
  }
  if (url.length > 1000) {
    url = url.substring(0, 997) + '...';
  }
  return url;
}

function filterResponse(raw: RawInstanceCurrent): InstancesCurrentOutput {
  const status = normalizeStatus(raw.status, raw.connected);
  const program = extractProgramName(raw.program, raw.programPath);
  let url = raw.url || `http://${raw.host || 'localhost'}:${raw.port}`;
  url = sanitizeUrl(url, raw.host, raw.port);
  const filtered = { port: raw.port, url, program, status };
  return { ...filtered, estimatedTokens: estimateTokens(filtered) };
}

function isNoInstanceError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('no current') || msg.includes('no instance') || msg.includes('not set') || msg.includes('not selected');
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('timeout') || msg.includes('timed out') || msg.includes('etimedout');
}

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('econnrefused') || msg.includes('connection refused');
}

export const instancesCurrent = {
  name: 'ghydra.instances-current',
  description: 'Get the currently active Ghidra instance',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input: InstancesCurrentInput): Promise<InstancesCurrentOutput> {
    InputSchema.parse(input);
    try {
      const raw = await callMCPTool<RawInstanceCurrent>('ghydra', 'instances_current', {});
      if (!raw || raw === null || Object.keys(raw).length === 0) {
        throw new GhydraWrapperError({ type: 'not_found', message: 'No current Ghidra instance. Use instances-use to select one.', retryable: false }, 'instances-current');
      }
      return filterResponse(raw);
    } catch (error) {
      if (error instanceof GhydraWrapperError) throw error;
      if (isNoInstanceError(error)) {
        throw new GhydraWrapperError({ type: 'not_found', message: 'No current Ghidra instance. Use instances-use to select one.', retryable: false }, 'instances-current');
      }
      if (isTimeoutError(error)) {
        throw new GhydraWrapperError({ type: 'timeout', message: 'Timeout connecting to Ghidra. Verify instance is running.', retryable: true }, 'instances-current');
      }
      if (isConnectionError(error)) {
        throw new GhydraWrapperError({ type: 'connection', message: 'Cannot connect to Ghidra. Verify instance is running.', retryable: true }, 'instances-current');
      }
      throw error;
    }
  },
};

export default instancesCurrent;
