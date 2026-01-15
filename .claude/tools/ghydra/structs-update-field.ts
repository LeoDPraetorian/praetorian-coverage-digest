import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema, DataTypeSchema } from './shared-schemas.js';
import { getTimestamp, addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';

const InputSchema = z.object({ struct_name: SymbolNameSchema, field_name: SymbolNameSchema.optional(), field_offset: z.number().int().min(0).optional(), new_name: SymbolNameSchema.optional(), new_type: DataTypeSchema.optional(), new_comment: z.string().max(500).optional(), port: PortSchema }).strict().refine((data) => data.field_name || data.field_offset !== undefined, { message: 'Either field_name or field_offset must be provided' });
export type StructsUpdateFieldInput = z.infer<typeof InputSchema>;
export interface StructsUpdateFieldOutput { success: boolean; structName: string; operation: 'field_updated'; timestamp: string; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: StructsUpdateFieldInput): StructsUpdateFieldOutput {
  const raw = validateObjectResponse(rawData, 'structs-update-field');
  return addTokenEstimation({ success: raw.success !== false, structName: input.struct_name, operation: 'field_updated' as const, timestamp: getTimestamp() });
}

export const structsUpdateField = { name: 'ghydra.structs-update-field', description: 'Update an existing field in a struct', inputSchema: InputSchema,
  async execute(input: StructsUpdateFieldInput): Promise<StructsUpdateFieldOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = { struct_name: validated.struct_name };
      if (validated.field_name) params.field_name = validated.field_name;
      if (validated.field_offset !== undefined) params.field_offset = validated.field_offset;
      if (validated.new_name) params.new_name = validated.new_name;
      if (validated.new_type) params.new_type = validated.new_type;
      if (validated.new_comment) params.new_comment = validated.new_comment;
      if (validated.port) params.port = validated.port;
      const raw = await callMCPTool('ghydra', 'structs_update_field', params);
      return filterResponse(raw, validated);
    } catch (error) { handleMCPError(error, 'structs-update-field'); }
  }
};

export default structsUpdateField;
