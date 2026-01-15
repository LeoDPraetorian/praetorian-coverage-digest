/**
 * Ghydra MCP Wrapper: xrefs-list
 *
 * Lists cross-references with filtering and pagination.
 * Implements token reduction by filtering to essential fields.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, HexAddressSchema } from './shared-schemas.js';
import {
  sanitizeAddress,
  sanitizeCount,
  addTokenEstimation,
  handleMCPError,
  validateArrayResponse,
} from './utils.js';

const InputSchema = z
  .object({
    to_addr: HexAddressSchema.optional(),
    from_addr: HexAddressSchema.optional(),
    type: z.string().optional(),
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(1000).default(100),
    port: PortSchema,
  })
  .strict();

export type XrefsListInput = z.infer<typeof InputSchema>;

interface FilteredXref {
  from: string;
  to: string;
  type: string;
}

interface PaginationInfo {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface XrefsListOutput {
  xrefs: FilteredXref[];
  pagination: PaginationInfo;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown, input: XrefsListInput): XrefsListOutput {
  let total = 0;
  let rawXrefs: any[] = [];

  if (typeof rawData === 'object' && rawData !== null) {
    if ('xrefs' in rawData && Array.isArray((rawData as any).xrefs)) {
      rawXrefs = (rawData as any).xrefs;
      total = typeof (rawData as any).total === 'number' ? (rawData as any).total : rawXrefs.length;
    } else if ('references' in rawData && Array.isArray((rawData as any).references)) {
      rawXrefs = (rawData as any).references;
      total = typeof (rawData as any).total === 'number' ? (rawData as any).total : rawXrefs.length;
    } else {
      rawXrefs = validateArrayResponse(rawData);
      total = rawXrefs.length;
    }
  } else {
    rawXrefs = validateArrayResponse(rawData);
  }

  const xrefs: FilteredXref[] = rawXrefs.map((xref) => ({
    from: sanitizeAddress(xref.from || xref.fromAddress),
    to: sanitizeAddress(xref.to || xref.toAddress),
    type: (xref.type || xref.referenceType || 'UNKNOWN').toUpperCase(),
  }));

  const hasMore = input.offset + xrefs.length < total;

  return addTokenEstimation({
    xrefs,
    pagination: {
      offset: input.offset,
      limit: input.limit,
      total,
      hasMore,
    },
  });
}

export const xrefsList = {
  name: 'ghydra.xrefs-list',
  description: 'List cross-references with filtering and pagination',
  inputSchema: InputSchema,

  async execute(input: XrefsListInput): Promise<XrefsListOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = {
        offset: validated.offset,
        limit: validated.limit,
      };
      if (validated.to_addr) params.to_addr = validated.to_addr;
      if (validated.from_addr) params.from_addr = validated.from_addr;
      if (validated.type) params.type = validated.type;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'xrefs_list', params);
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'xrefs-list');
    }
  },
};

export default xrefsList;
