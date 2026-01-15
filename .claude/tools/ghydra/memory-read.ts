/**
 * Ghydra MCP Wrapper: memory-read
 * P0 CRITICAL SECURITY (CVSS 9.3) - Read bytes from memory with SECRET DETECTION
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { HexAddressSchema, PortSchema } from './shared-schemas.js';

const SECRET_PATTERNS = [
  { type: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/g },
  { type: 'jwt_token', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g },
  { type: 'private_key', pattern: /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/g },
  { type: 'password', pattern: /password[=:\s]+\S+/gi },
  { type: 'api_key', pattern: /(api[_-]?key|apikey)[=:\s]+[a-zA-Z0-9]{20,}/gi },
  { type: 'bearer_token', pattern: /bearer\s+[a-zA-Z0-9]{20,}/gi },
  { type: 'github_token', pattern: /gh[pousr]_[a-zA-Z0-9]{36,}/g },
  { type: 'slack_token', pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/g },
  { type: 'stripe_key', pattern: /(sk|pk)_(test|live)_[a-zA-Z0-9]{24,}/g },
  { type: 'openai_key', pattern: /sk-[a-zA-Z0-9]{48,}/g },
  { type: 'aws_secret', pattern: /(aws_secret_access_key|aws_secret)[=:\s]+[a-zA-Z0-9+/]{40}/gi },
  { type: 'generic_secret', pattern: /(secret|token|key)[=:\s]+[a-zA-Z0-9]{20,}/gi },
];

function detectSecrets(content: string): Array<{ type: string; match: string; index: number }> {
  const detected: Array<{ type: string; match: string; index: number }> = [];
  for (const { type, pattern } of SECRET_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[0] && match.index !== undefined) {
        detected.push({ type, match: match[0], index: match.index });
      }
    }
  }
  return detected;
}

function maskContent(content: string): { masked: string; secretsDetected: Array<{ type: string }> } {
  let masked = content;
  const secretsDetected: Array<{ type: string }> = [];

  for (const { type, pattern } of SECRET_PATTERNS) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      if (match[0]) {
        masked = masked.replace(match[0], `[REDACTED:${type}]`);
        secretsDetected.push({ type });
      }
    }
  }

  return { masked, secretsDetected };
}

const InputSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{1,16}$/, 'Must be hex address format'),
  length: z.number().int().min(1).max(4096).default(16).optional(),
  format: z.enum(['hex', 'base64', 'string']).default('hex').optional(),
  port: PortSchema,
});

interface MemoryReadOutput {
  address: string;
  length: number;
  format: string;
  hexBytes: string;
  rawBytes?: string;
  stringValue?: string;
  security: {
    secretsRedacted: number;
    secretTypes: string[];
    contentModified: boolean;
    warnings: string[];
  };
  audit: {
    timestamp: string;
    address: string;
    lengthRequested: number;
    lengthReturned: number;
    format: string;
    secretsDetected: boolean;
    operationId: string;
  };
  estimatedTokens: number;
}

function filterResponse(raw: any, input: z.infer<typeof InputSchema>): MemoryReadOutput {
  const hexBytes = raw?.hexBytes || '';
  let stringValue: string | undefined;

  if (input.format === 'string' && hexBytes) {
    const buffer = Buffer.from(hexBytes, 'hex');
    stringValue = buffer.toString('utf-8');
    const { masked, secretsDetected } = maskContent(stringValue);
    stringValue = masked;

    const result = {
      address: input.address,
      length: buffer.length,
      format: input.format,
      hexBytes,
      stringValue,
      security: {
        secretsRedacted: secretsDetected.length,
        secretTypes: [...new Set(secretsDetected.map(s => s.type))],
        contentModified: secretsDetected.length > 0,
        warnings: secretsDetected.length > 0 ? ['Secrets detected and masked'] : [],
      },
      audit: {
        timestamp: new Date().toISOString(),
        address: input.address,
        lengthRequested: input.length || 16,
        lengthReturned: buffer.length,
        format: input.format || 'hex',
        secretsDetected: secretsDetected.length > 0,
        operationId: crypto.randomUUID(),
      },
      estimatedTokens: 0,
    };
    result.estimatedTokens = estimateTokens(result);
    return result;
  }

  const result = {
    address: input.address,
    length: hexBytes ? Buffer.from(hexBytes, 'hex').length : 0,
    format: input.format || 'hex',
    hexBytes,
    security: {
      secretsRedacted: 0,
      secretTypes: [],
      contentModified: false,
      warnings: [],
    },
    audit: {
      timestamp: new Date().toISOString(),
      address: input.address,
      lengthRequested: input.length || 16,
      lengthReturned: hexBytes ? Buffer.from(hexBytes, 'hex').length : 0,
      format: input.format || 'hex',
      secretsDetected: false,
      operationId: crypto.randomUUID(),
    },
    estimatedTokens: 0,
  };
  result.estimatedTokens = estimateTokens(result);
  return result;
}

export const memoryRead = {
  name: 'ghydra.memory_read',
  description: 'Read bytes from process memory with secret detection (P0 SECURITY)',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<MemoryReadOutput> {
    const validated = InputSchema.parse(input);

    try {
      const raw = await callMCPTool('ghydra', 'memory_read', {
        address: validated.address,
        length: validated.length,
        format: validated.format,
        ...(validated.port && { port: validated.port }),
      });

      if (raw === null || raw === undefined) {
        return filterResponse({}, validated);
      }

      return filterResponse(raw, validated);
    } catch (error) {
      throw error;
    }
  },
};

export type MemoryReadInput = z.infer<typeof InputSchema>;
export type { MemoryReadOutput };
export default memoryRead;
