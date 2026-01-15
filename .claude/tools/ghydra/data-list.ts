/**
 * Ghydra MCP Wrapper: data-list
 *
 * Lists defined data items with filtering and pagination.
 * Implements token reduction by filtering to essential fields.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema, SymbolNameSchema } from './shared-schemas.js';
import {
  sanitizeName,
  sanitizeAddress,
  sanitizeSize,
  addTokenEstimation,
  handleMCPError,
  validateArrayResponse,
} from './utils.js';

const InputSchema = z
  .object({
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(1000).default(100),
    addr: HexAddressSchema.optional(),
    name: SymbolNameSchema.optional(),
    name_contains: z.string().optional(),
    type: z.string().optional(),
    port: PortSchema,
  })
  .strict();

export type DataListInput = z.infer<typeof InputSchema>;

interface FilteredDataItem {
  name: string;
  address: string;
  type: string;
  size: number;
}

interface PaginationInfo {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface DataListOutput {
  data: FilteredDataItem[];
  pagination: PaginationInfo;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown, input: DataListInput): DataListOutput {
  let total = 0;
  let rawItems: any[] = [];

  if (typeof rawData === 'object' && rawData !== null) {
    if ('data' in rawData && Array.isArray((rawData as any).data)) {
      rawItems = (rawData as any).data;
      total = typeof (rawData as any).total === 'number' ? (rawData as any).total : rawItems.length;
    } else {
      rawItems = validateArrayResponse(rawData);
      total = rawItems.length;
    }
  } else {
    rawItems = validateArrayResponse(rawData);
  }

  const data: FilteredDataItem[] = rawItems.map((item) => ({
    name: sanitizeName(item.name || item.label),
    address: sanitizeAddress(item.address || item.addr),
    type: sanitizeName(item.type || item.dataType, 'undefined'),
    size: sanitizeSize(item.size || item.length),
  }));

  const hasMore = input.offset + data.length < total;

  return addTokenEstimation({
    data,
    pagination: {
      offset: input.offset,
      limit: input.limit,
      total,
      hasMore,
    },
  });
}

export const dataList = {
  name: 'ghydra.data-list',
  description: 'List defined data items with filtering and pagination',
  inputSchema: InputSchema,

  async execute(input: DataListInput): Promise<DataListOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = {
        offset: validated.offset,
        limit: validated.limit,
      };
      if (validated.addr) params.addr = validated.addr;
      if (validated.name) params.name = validated.name;
      if (validated.name_contains) params.name_contains = validated.name_contains;
      if (validated.type) params.type = validated.type;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'data_list', params);
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'data-list');
    }
  },
};

export default dataList;
