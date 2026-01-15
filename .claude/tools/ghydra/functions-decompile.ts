/**
 * Ghydra MCP Wrapper: functions-decompile
 *
 * Gets decompiled code for a function.
 * Implements token reduction by optionally including syntax tree.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema, HexAddressSchema } from './shared-schemas.js';
import {
  sanitizeName,
  sanitizeAddress,
  getIdentifier,
  addTokenEstimation,
  handleMCPError,
  validateObjectResponse,
} from './utils.js';

const InputSchema = z
  .object({
    name: SymbolNameSchema.optional(),
    address: HexAddressSchema.optional(),
    syntax_tree: z.boolean().default(false),
    style: z.enum(['normalize', 'raw', 'compact']).default('normalize'),
    port: PortSchema,
  })
  .strict()
  .refine((data) => data.name || data.address, {
    message: 'Either name or address must be provided',
  });

export type FunctionsDecompileInput = z.infer<typeof InputSchema>;

export interface FunctionsDecompileOutput {
  name: string;
  address: string;
  code: string;
  language: string;
  syntaxTree?: any;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown, input: FunctionsDecompileInput): FunctionsDecompileOutput {
  const raw = validateObjectResponse(rawData, 'functions-decompile');

  const result: Omit<FunctionsDecompileOutput, 'estimatedTokens'> = {
    name: sanitizeName(raw.name || raw.functionName),
    address: sanitizeAddress(raw.address || raw.entryPoint),
    code: (raw.code || raw.decompiled || raw.c || '// No decompiled code available').trim(),
    language: raw.language || 'C',
  };

  if (input.syntax_tree && raw.syntaxTree) {
    result.syntaxTree = raw.syntaxTree;
  }

  return addTokenEstimation(result);
}

export const functionsDecompile = {
  name: 'ghydra.functions-decompile',
  description: 'Get decompiled code for a function',
  inputSchema: InputSchema,

  async execute(input: FunctionsDecompileInput): Promise<FunctionsDecompileOutput> {
    const validated = InputSchema.parse(input);
    const identifier = getIdentifier(validated);

    try {
      const params: any = {
        syntax_tree: validated.syntax_tree,
        style: validated.style,
      };
      if (identifier.type === 'name') params.name = identifier.value;
      if (identifier.type === 'address') params.address = identifier.value;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'functions_decompile', params);
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'functions-decompile');
    }
  },
};

export default functionsDecompile;
