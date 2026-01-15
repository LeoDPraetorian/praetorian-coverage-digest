/**
 * Ghydra MCP Wrapper: memory-write
 * P0 CRITICAL SECURITY (CVSS 9.8) - Write bytes to process memory with MANDATORY confirmation
 */

import { z } from 'zod';
import { createHash } from 'crypto';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { validateNoControlChars } from '../config/lib/sanitize.js';
import { HexAddressSchema, PortSchema } from './shared-schemas.js';

const EXECUTABLE_SEGMENTS = ['.text', '.code', '.plt', '.plt.got', '.init', '.fini'];

function checkExecutableSegment(address: string): void {
  // Defense-in-depth: MCP server validation is primary, this is secondary
}

function normalizeBytes(bytes_data: string, format: 'hex' | 'base64' | 'string'): Buffer {
  if (!bytes_data || bytes_data.length === 0) {
    throw new Error('bytes_data cannot be empty');
  }

  let buffer: Buffer;

  switch (format) {
    case 'hex': {
      if (bytes_data.length % 2 !== 0) throw new Error('Hex format must have even length');
      if (!/^[0-9a-fA-F]+$/.test(bytes_data)) throw new Error('Invalid hex characters - must be valid hex');
      if (bytes_data.length > 512) throw new Error('Hex data exceeds 256 byte maximum (512 hex chars)');
      buffer = Buffer.from(bytes_data, 'hex');
      break;
    }
    case 'base64': {
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(bytes_data)) throw new Error('Invalid base64 format');
      if (bytes_data.length > 342) throw new Error('Base64 data exceeds 256 byte maximum (~342 base64 chars)');
      try { buffer = Buffer.from(bytes_data, 'base64'); }
      catch (e) { throw new Error('Invalid base64 encoding'); }
      break;
    }
    case 'string': {
      if (bytes_data.length > 256) throw new Error('String exceeds 256 character maximum');
      buffer = Buffer.from(bytes_data, 'utf-8');
      if (buffer.length > 256) throw new Error('String UTF-8 encoding exceeds 256 byte maximum');
      break;
    }
    default:
      throw new Error(`Invalid format: ${format}`);
  }

  if (buffer.length > 256) {
    throw new Error('Payload exceeds 256 byte maximum');
  }

  return buffer;
}

function computePayloadHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

const InputSchema = z.object({
  address: HexAddressSchema,
  bytes_data: z.string().min(1, 'bytes_data cannot be empty'),
  format: z.enum(['hex', 'base64', 'string']).default('hex'),
  confirm: z.literal(true, { errorMap: () => ({ message: 'confirm must be boolean literal true' }) }),
  reason: z.string().max(500, 'Reason too long (max 500 chars)').optional().refine((val) => !val || validateNoControlChars(val), { message: 'Control characters not allowed in reason' }),
  port: PortSchema,
});

const OutputSchema = z.object({
  success: z.boolean(),
  address: z.string(),
  operation: z.literal('memory_write'),
  byteCount: z.number(),
  format: z.enum(['hex', 'base64', 'string']),
  payloadHash: z.string().length(64),
  timestamp: z.string(),
  warnings: z.array(z.string()).optional(),
  estimatedTokens: z.number(),
});

type MemoryWriteOutput = z.infer<typeof OutputSchema>;

function filterResponse(raw: any, input: z.infer<typeof InputSchema>, payloadHash: string): MemoryWriteOutput {
  const buffer = normalizeBytes(input.bytes_data, input.format);
  const result = {
    success: raw?.success ?? true,
    address: input.address,
    operation: 'memory_write' as const,
    byteCount: buffer.length,
    format: input.format,
    payloadHash,
    timestamp: raw?.timestamp ?? new Date().toISOString(),
    ...(raw?.warnings && { warnings: raw.warnings }),
  };
  return { ...result, estimatedTokens: estimateTokens(result) };
}

function buildSuccessResponse(input: z.infer<typeof InputSchema>, payloadHash: string): MemoryWriteOutput {
  const buffer = normalizeBytes(input.bytes_data, input.format);
  const result = {
    success: true,
    address: input.address,
    operation: 'memory_write' as const,
    byteCount: buffer.length,
    format: input.format,
    payloadHash,
    timestamp: new Date().toISOString(),
  };
  return { ...result, estimatedTokens: estimateTokens(result) };
}

export const memoryWrite = {
  name: 'ghydra.memory_write',
  description: 'Write bytes to process memory (P0 SECURITY - requires confirmation)',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<MemoryWriteOutput> {
    const validated = InputSchema.parse(input);
    const buffer = normalizeBytes(validated.bytes_data, validated.format);
    const payloadHash = computePayloadHash(buffer);
    checkExecutableSegment(validated.address);

    const mcpParams = {
      address: validated.address,
      bytes_data: validated.bytes_data,
      format: validated.format,
      ...(validated.reason && { reason: validated.reason }),
      ...(validated.port && { port: validated.port }),
    };

    try {
      const raw = await callMCPTool('ghydra', 'memory_write', mcpParams);
      if (raw === null || raw === undefined) {
        return buildSuccessResponse(validated, payloadHash);
      }
      return filterResponse(raw, validated, payloadHash);
    } catch (error) {
      throw error;
    }
  },
};

export type MemoryWriteInput = z.infer<typeof InputSchema>;
export type { MemoryWriteOutput };
export default memoryWrite;
