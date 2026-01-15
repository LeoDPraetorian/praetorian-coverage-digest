/**
 * Ghydra MCP Wrapper: functions-rename
 *
 * Renames a function.
 * Implements token reduction by returning only essential rename confirmation.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema, HexAddressSchema } from './shared-schemas.js';
import {
  sanitizeName,
  sanitizeAddress,
  getIdentifier,
  getTimestamp,
  addTokenEstimation,
  handleMCPError,
  validateObjectResponse,
} from './utils.js';

const InputSchema = z
  .object({
    old_name: SymbolNameSchema.optional(),
    address: HexAddressSchema.optional(),
    new_name: SymbolNameSchema,
    port: PortSchema,
  })
  .strict()
  .refine((data) => data.old_name || data.address, {
    message: 'Either old_name or address must be provided',
  });

export type FunctionsRenameInput = z.infer<typeof InputSchema>;

export interface FunctionsRenameOutput {
  success: boolean;
  oldName: string;
  newName: string;
  address: string;
  operation: 'renamed';
  timestamp: string;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown, input: FunctionsRenameInput): FunctionsRenameOutput {
  const raw = validateObjectResponse(rawData, 'functions-rename');

  return addTokenEstimation({
    success: raw.success !== false,
    oldName: sanitizeName(raw.oldName || raw.function?.oldName || input.old_name),
    newName: input.new_name,
    address: sanitizeAddress(raw.address || raw.function?.address || input.address),
    operation: 'renamed' as const,
    timestamp: getTimestamp(),
  });
}

export const functionsRename = {
  name: 'ghydra.functions-rename',
  description: 'Rename a function',
  inputSchema: InputSchema,

  async execute(input: FunctionsRenameInput): Promise<FunctionsRenameOutput> {
    const validated = InputSchema.parse(input);
    const identifier = getIdentifier({ name: validated.old_name, address: validated.address });

    try {
      const params: any = {
        new_name: validated.new_name,
      };
      if (identifier.type === 'name') params.old_name = identifier.value;
      if (identifier.type === 'address') params.address = identifier.value;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'functions_rename', params);
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'functions-rename');
    }
  },
};

export default functionsRename;
