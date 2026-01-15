/**
 * Ghydra MCP Wrapper: functions-disassemble
 *
 * Gets disassembly for a function.
 * Implements token reduction by returning assembly text only.
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

export type FunctionsDisassembleInput = z.infer<typeof InputSchema>;

export interface FunctionsDisassembleOutput {
  name: string;
  address: string;
  disassembly: string;
  instructionCount: number;
  estimatedTokens: number;
}

function countInstructions(asm: string): number {
  if (!asm) return 0;
  const lines = asm.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('//');
  });
  return lines.length;
}

function filterResponse(rawData: unknown): FunctionsDisassembleOutput {
  const raw = validateObjectResponse(rawData, 'functions-disassemble');
  const disassembly = (raw.disassembly || raw.assembly || raw.asm || '').trim();

  return addTokenEstimation({
    name: sanitizeName(raw.name || raw.functionName),
    address: sanitizeAddress(raw.address || raw.entryPoint),
    disassembly,
    instructionCount: sanitizeCount(raw.instructionCount) || countInstructions(disassembly),
  });
}

export const functionsDisassemble = {
  name: 'ghydra.functions-disassemble',
  description: 'Get disassembly for a function',
  inputSchema: InputSchema,

  async execute(input: FunctionsDisassembleInput): Promise<FunctionsDisassembleOutput> {
    const validated = InputSchema.parse(input);
    const identifier = getIdentifier(validated);

    try {
      const params: any = {};
      if (identifier.type === 'name') params.name = identifier.value;
      if (identifier.type === 'address') params.address = identifier.value;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'functions_disassemble', params);
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'functions-disassemble');
    }
  },
};

export default functionsDisassemble;
