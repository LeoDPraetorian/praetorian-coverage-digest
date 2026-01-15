/**
 * Ghydra MCP Wrapper: functions-create
 *
 * Creates a new function at the specified address.
 * Implements token reduction by returning only essential creation confirmation.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema } from './shared-schemas.js';
import {
  normalizeHexAddress,
  sanitizeName,
  getTimestamp,
  addTokenEstimation,
  handleMCPError,
  validateObjectResponse,
} from './utils.js';

const InputSchema = z
  .object({
    address: HexAddressSchema,
    port: PortSchema,
  })
  .strict();

export type FunctionsCreateInput = z.infer<typeof InputSchema>;

export interface FunctionsCreateOutput {
  success: boolean;
  address: string;
  name: string | null;
  operation: 'created';
  timestamp: string;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown, address: string): FunctionsCreateOutput {
  const raw = validateObjectResponse(rawData, 'functions-create');

  return addTokenEstimation({
    success: raw.success !== false,
    address: normalizeHexAddress(address),
    name: raw.name || raw.function?.name || null,
    operation: 'created' as const,
    timestamp: getTimestamp(),
  });
}

export const functionsCreate = {
  name: 'ghydra.functions-create',
  description: 'Create a new function at the specified address',
  inputSchema: InputSchema,

  async execute(input: FunctionsCreateInput): Promise<FunctionsCreateOutput> {
    const validated = InputSchema.parse(input);

    try {
      const params: any = {
        address: normalizeHexAddress(validated.address),
      };
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'functions_create', params);
      return filterResponse(raw, validated.address);
    } catch (error) {
      handleMCPError(error, 'functions-create');
    }
  },
};

export default functionsCreate;
