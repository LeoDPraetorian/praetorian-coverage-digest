/**
 * Ghydra MCP Wrapper: data-create
 *
 * Defines a new data item at the specified address.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema, DataTypeSchema } from './shared-schemas.js';
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
    data_type: DataTypeSchema,
    size: z.number().int().min(1).max(65536).optional(),
    port: PortSchema,
  })
  .strict();

export type DataCreateInput = z.infer<typeof InputSchema>;

export interface DataCreateOutput {
  success: boolean;
  address: string;
  type: string;
  size: number | null;
  operation: 'data_created';
  timestamp: string;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown, input: DataCreateInput): DataCreateOutput {
  const raw = validateObjectResponse(rawData, 'data-create');

  return addTokenEstimation({
    success: raw.success !== false,
    address: normalizeHexAddress(input.address),
    type: input.data_type,
    size: input.size || raw.size || null,
    operation: 'data_created' as const,
    timestamp: getTimestamp(),
  });
}

export const dataCreate = {
  name: 'ghydra.data-create',
  description: 'Define a new data item at the specified address',
  inputSchema: InputSchema,

  async execute(input: DataCreateInput): Promise<DataCreateOutput> {
    const validated = InputSchema.parse(input);

    try {
      const params: any = {
        address: normalizeHexAddress(validated.address),
        data_type: validated.data_type,
      };
      if (validated.size) params.size = validated.size;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'data_create', params);
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'data-create');
    }
  },
};

export default dataCreate;
