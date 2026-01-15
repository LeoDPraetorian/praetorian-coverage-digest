/**
 * Ghydra MCP Wrapper: data-set-type
 * Sets the data type of a data item.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema, DataTypeSchema } from './shared-schemas.js';
import { normalizeHexAddress, sanitizeName, getTimestamp, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ address: HexAddressSchema, data_type: DataTypeSchema, port: PortSchema }).strict();

export type DataSetTypeInput = z.infer<typeof InputSchema>;

export interface DataSetTypeOutput { success: boolean; address: string; oldType: string; newType: string; operation: 'type_updated'; timestamp: string; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: DataSetTypeInput): DataSetTypeOutput {
  const raw = validateObjectResponse(rawData, 'data-set-type');
  return addTokenEstimation({ success: raw.success !== false, address: normalizeHexAddress(input.address), oldType: sanitizeName(raw.oldType || raw.data?.oldType, 'undefined'), newType: input.data_type, operation: 'type_updated' as const, timestamp: getTimestamp() });
}

export const dataSetType = { name: 'ghydra.data-set-type', description: 'Set the data type of a data item', inputSchema: InputSchema,
  async execute(input: DataSetTypeInput): Promise<DataSetTypeOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { address: normalizeHexAddress(validated.address), data_type: validated.data_type };
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'data_set_type', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'data-set-type'); }
  }
};

export default dataSetType;
