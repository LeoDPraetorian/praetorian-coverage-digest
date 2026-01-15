/**
 * Ghydra MCP Wrapper: functions-get-variables
 *
 * Gets variables for a function.
 * Implements token reduction by filtering to essential variable information.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema, HexAddressSchema } from './shared-schemas.js';
import {
  sanitizeName,
  sanitizeAddress,
  sanitizeCount,
  getIdentifier,
  addTokenEstimation,
  handleMCPError,
  validateObjectResponse,
} from './utils.js';

const InputSchema = z
  .object({
    name: SymbolNameSchema.optional(),
    address: HexAddressSchema.optional(),
    port: PortSchema,
  })
  .strict()
  .refine((data) => data.name || data.address, {
    message: 'Either name or address must be provided',
  });

export type FunctionsGetVariablesInput = z.infer<typeof InputSchema>;

interface FilteredVariable {
  name: string;
  type: string;
  offset: number;
}

export interface FunctionsGetVariablesOutput {
  functionName: string;
  functionAddress: string;
  variables: FilteredVariable[];
  totalCount: number;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown): FunctionsGetVariablesOutput {
  const raw = validateObjectResponse(rawData, 'functions-get-variables');

  let rawVariables: any[] = [];
  if (Array.isArray(raw.variables)) {
    rawVariables = raw.variables;
  } else if (Array.isArray(raw.locals)) {
    rawVariables = raw.locals;
  }

  const variables: FilteredVariable[] = rawVariables.map((v) => ({
    name: sanitizeName(v.name),
    type: sanitizeName(v.type || v.dataType, 'unknown'),
    offset: sanitizeCount(v.offset || v.stackOffset),
  }));

  return addTokenEstimation({
    functionName: sanitizeName(raw.name || raw.functionName),
    functionAddress: sanitizeAddress(raw.address || raw.functionAddress),
    variables,
    totalCount: variables.length,
  });
}

export const functionsGetVariables = {
  name: 'ghydra.functions-get-variables',
  description: 'Get variables for a function',
  inputSchema: InputSchema,

  async execute(input: FunctionsGetVariablesInput): Promise<FunctionsGetVariablesOutput> {
    const validated = InputSchema.parse(input);
    const identifier = getIdentifier(validated);

    try {
      const params: any = {};
      if (identifier.type === 'name') params.name = identifier.value;
      if (identifier.type === 'address') params.address = identifier.value;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'functions_get_variables', params);
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'functions-get-variables');
    }
  },
};

export default functionsGetVariables;
