/**
 * Ghydra MCP Wrapper: data-list-strings
 *
 * Lists all defined strings in the binary with their memory addresses.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema } from './shared-schemas.js';
import { sanitizeAddress, sanitizeSize, addTokenEstimation, handleMCPError, validateArrayResponse } from './utils.js';

const InputSchema = z.object({ offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(5000).default(2000), filter: z.string().optional(), port: PortSchema }).strict();

export type DataListStringsInput = z.infer<typeof InputSchema>;

interface FilteredString { address: string; value: string; length: number; }

export interface DataListStringsOutput { strings: FilteredString[]; pagination: { offset: number; limit: number; total: number; hasMore: boolean; }; estimatedTokens: number; }

function filterResponse(rawData: unknown, input: DataListStringsInput): DataListStringsOutput {
  let total = 0; let rawStrings: any[] = [];
  if (typeof rawData === 'object' && rawData !== null) {
    if ('strings' in rawData && Array.isArray((rawData as any).strings)) { rawStrings = (rawData as any).strings; total = typeof (rawData as any).total === 'number' ? (rawData as any).total : rawStrings.length; }
    else { rawStrings = validateArrayResponse(rawData); total = rawStrings.length; }
  } else { rawStrings = validateArrayResponse(rawData); }
  const strings: FilteredString[] = rawStrings.map((s) => ({ address: sanitizeAddress(s.address || s.addr), value: (s.value || s.string || s.data || '').substring(0, 512), length: sanitizeSize(s.length || s.size) }));
  const hasMore = input.offset + strings.length < total;
  return addTokenEstimation({ strings, pagination: { offset: input.offset, limit: input.limit, total, hasMore } });
}

export const dataListStrings = { name: 'ghydra.data-list-strings', description: 'List all defined strings in the binary', inputSchema: InputSchema, async execute(input: DataListStringsInput): Promise<DataListStringsOutput> {
  const validated = InputSchema.parse(input); try { const params: any = { offset: validated.offset, limit: validated.limit }; if (validated.filter) params.filter = validated.filter; if (validated.port) params.port = validated.port;
  const raw = await callMCPTool('ghydra', 'data_list_strings', params); return filterResponse(raw, validated); } catch (error) { handleMCPError(error, 'data-list-strings'); } } };

export default dataListStrings;
