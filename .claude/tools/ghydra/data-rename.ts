/**
 * Ghydra MCP Wrapper: data-rename
 * Renames a data item.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema, SymbolNameSchema } from './shared-schemas.js';
import { normalizeHexAddress, sanitizeName, getTimestamp, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ address: HexAddressSchema, name: SymbolNameSchema, port: PortSchema }).strict();

export type DataRenameInput = z.infer<typeof InputSchema>;

export interface DataRenameOutput { success: boolean; address: string; oldName: string; newName: string; operation: 'renamed'; timestamp: string; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: DataRenameInput): DataRenameOutput {
  const raw = validateObjectResponse(rawData, 'data-rename');
  return addTokenEstimation({ success: raw.success !== false, address: normalizeHexAddress(input.address), oldName: sanitizeName(raw.oldName || raw.data?.oldName), newName: input.name, operation: 'renamed' as const, timestamp: getTimestamp() });
}

export const dataRename = { name: 'ghydra.data-rename', description: 'Rename a data item', inputSchema: InputSchema,
  async execute(input: DataRenameInput): Promise<DataRenameOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { address: normalizeHexAddress(validated.address), name: validated.name };
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'data_rename', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'data-rename'); }
  }
};

export default dataRename;
