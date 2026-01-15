/**
 * Ghydra MCP Wrapper: functions-list
 *
 * Lists functions with filtering and pagination.
 * Implements 80% token reduction by filtering to essential fields only.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema } from './shared-schemas.js';
import {
  sanitizeName,
  sanitizeAddress,
  sanitizeSize,
  sanitizeSignature,
  addTokenEstimation,
  handleMCPError,
} from './utils.js';

const InputSchema = z
  .object({
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(1000).default(100),
    name_contains: z.string().optional(),
    name_matches_regex: z.string().optional(),
    port: PortSchema,
  })
  .strict();

export type FunctionsListInput = z.infer<typeof InputSchema>;

interface RawFunction {
  name?: string;
  address?: string;
  size?: number;
  signature?: string;
  // ... many other fields excluded for token reduction
}

interface FilteredFunction {
  name: string;
  address: string;
  size: number;
  signature: string | null;
}

interface PaginationInfo {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface FunctionsListOutput {
  functions: FilteredFunction[];
  pagination: PaginationInfo;
  estimatedTokens: number;
}

function filterFunctionsResponse(rawData: unknown, input: FunctionsListInput): FunctionsListOutput {
  let rawFunctions: RawFunction[] = [];
  let total = 0;

  // Handle various response formats
  if (rawData === null || rawData === undefined) {
    rawFunctions = [];
  } else if (Array.isArray(rawData)) {
    rawFunctions = rawData;
    total = rawData.length;
  } else if (typeof rawData === 'object' && 'functions' in rawData) {
    const data = rawData as any;
    rawFunctions = Array.isArray(data.functions) ? data.functions : [];
    total = typeof data.total === 'number' ? data.total : rawFunctions.length;
  } else if (typeof rawData === 'string') {
    console.warn('[ghydra.functions-list] Received string response, expected array/object');
    rawFunctions = [];
  } else {
    console.warn('[ghydra.functions-list] Unexpected response format:', typeof rawData);
    rawFunctions = [];
  }

  // Filter to essential fields and sanitize
  const functions: FilteredFunction[] = rawFunctions.map((func) => ({
    name: sanitizeName(func.name),
    address: sanitizeAddress(func.address),
    size: sanitizeSize(func.size),
    signature: sanitizeSignature(func.signature),
  }));

  const hasMore = input.offset + functions.length < total;

  // Build response with token estimation
  return addTokenEstimation({
    functions,
    pagination: {
      offset: input.offset,
      limit: input.limit,
      total,
      hasMore,
    },
  });
}

export const functionsList = {
  name: 'ghydra.functions-list',
  description: 'List functions with filtering and pagination',
  inputSchema: InputSchema,

  async execute(input: FunctionsListInput): Promise<FunctionsListOutput> {
    const validated = InputSchema.parse(input);
    try {
      const params: any = {
        offset: validated.offset,
        limit: validated.limit,
      };
      if (validated.name_contains) params.name_contains = validated.name_contains;
      if (validated.name_matches_regex) params.name_matches_regex = validated.name_matches_regex;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'functions_list', params);
      return filterFunctionsResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'functions-list');
    }
  },
};

export default functionsList;
