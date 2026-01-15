/**
 * Ghydra MCP Wrapper: functions-get
 *
 * Gets detailed information about a specific function by name or address.
 * Implements token reduction by filtering to essential fields.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema, HexAddressSchema } from './shared-schemas.js';
import {
  sanitizeName,
  sanitizeAddress,
  sanitizeSize,
  sanitizeSignature,
  sanitizeComment,
  sanitizeCount,
  getIdentifier,
  addTokenEstimation,
  handleMCPError,
  validateObjectResponse,
} from './utils.js';

const InputSchema = z
  .object({
    name: SymbolNameSchema.optional(),
    address: HexAddressSchema.optional(),
    port: PortSchema,
  })
  .strict()
  .refine((data) => data.name || data.address, {
    message: 'Either name or address must be provided',
  });

export type FunctionsGetInput = z.infer<typeof InputSchema>;

export interface FunctionsGetOutput {
  name: string;
  address: string;
  size: number;
  signature: string | null;
  parameterCount: number;
  instructionCount: number;
  comment: string | null;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown): FunctionsGetOutput {
  const raw = validateObjectResponse(rawData, 'functions-get');

  return addTokenEstimation({
    name: sanitizeName(raw.name),
    address: sanitizeAddress(raw.address),
    size: sanitizeSize(raw.size),
    signature: sanitizeSignature(raw.signature),
    parameterCount: sanitizeCount(raw.parameterCount),
    instructionCount: sanitizeCount(raw.instructionCount),
    comment: sanitizeComment(raw.comment),
  });
}

export const functionsGet = {
  name: 'ghydra.functions-get',
  description: 'Get detailed information about a function by name or address',
  inputSchema: InputSchema,

  async execute(input: FunctionsGetInput): Promise<FunctionsGetOutput> {
    const validated = InputSchema.parse(input);
    const identifier = getIdentifier(validated);

    try {
      const params: any = {};
      if (identifier.type === 'name') params.name = identifier.value;
      if (identifier.type === 'address') params.address = identifier.value;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'functions_get', params);
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'functions-get');
    }
  },
};

export default functionsGet;
