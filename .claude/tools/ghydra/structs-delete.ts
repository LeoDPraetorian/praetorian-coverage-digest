import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema } from './shared-schemas.js';
import { getTimestamp, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ name: SymbolNameSchema, port: PortSchema }).strict();
export type StructsDeleteInput = z.infer<typeof InputSchema>;
export interface StructsDeleteOutput { success: boolean; name: string; operation: 'deleted'; timestamp: string; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: StructsDeleteInput): StructsDeleteOutput {
  const raw = validateObjectResponse(rawData, 'structs-delete');
  return addTokenEstimation({ success: raw.success !== false, name: input.name, operation: 'deleted' as const, timestamp: getTimestamp() });
}

export const structsDelete = { name: 'ghydra.structs-delete', description: 'Delete a struct data type', inputSchema: InputSchema,
  async execute(input: StructsDeleteInput): Promise<StructsDeleteOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { name: validated.name };
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'structs_delete', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'structs-delete'); }
  }
};

export default structsDelete;
