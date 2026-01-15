/**
 * Ghydra MCP Wrapper: data-delete
 * Deletes data at the specified address.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema } from './shared-schemas.js';
import { normalizeHexAddress, getTimestamp, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ address: HexAddressSchema, port: PortSchema }).strict();

export type DataDeleteInput = z.infer<typeof InputSchema>;

export interface DataDeleteOutput { success: boolean; address: string; operation: 'deleted'; timestamp: string; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: DataDeleteInput): DataDeleteOutput {
  const raw = validateObjectResponse(rawData, 'data-delete');
  return addTokenEstimation({ success: raw.success !== false, address: normalizeHexAddress(input.address), operation: 'deleted' as const, timestamp: getTimestamp() });
}

export const dataDelete = { name: 'ghydra.data-delete', description: 'Delete data at the specified address', inputSchema: InputSchema,
  async execute(input: DataDeleteInput): Promise<DataDeleteOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { address: normalizeHexAddress(validated.address) };
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'data_delete', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'data-delete'); }
  }
};

export default dataDelete;
