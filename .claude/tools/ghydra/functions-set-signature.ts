/**
 * Ghydra MCP Wrapper: functions-set-signature
 *
 * Sets function signature/prototype.
 * Implements token reduction by returning only essential update confirmation.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { PortSchema, SymbolNameSchema, HexAddressSchema } from './shared-schemas.js';
import {
  sanitizeName,
  sanitizeAddress,
  sanitizeSignature,
  getIdentifier,
  getTimestamp,
  addTokenEstimation,
  handleMCPError,
  validateObjectResponse,
} from './utils.js';

const InputSchema = z
  .object({
    name: SymbolNameSchema.optional(),
    address: HexAddressSchema.optional(),
    signature: z.string().min(1, 'Signature cannot be empty').max(512, 'Signature too long'),
    port: PortSchema,
  })
  .strict()
  .refine((data) => data.name || data.address, {
    message: 'Either name or address must be provided',
  });

export type FunctionsSetSignatureInput = z.infer<typeof InputSchema>;

export interface FunctionsSetSignatureOutput {
  success: boolean;
  name: string;
  address: string;
  oldSignature: string | null;
  newSignature: string;
  operation: 'signature_updated';
  timestamp: string;
  estimatedTokens: number;
}

function filterResponse(rawData: unknown, input: FunctionsSetSignatureInput): FunctionsSetSignatureOutput {
  const raw = validateObjectResponse(rawData, 'functions-set-signature');

  return addTokenEstimation({
    success: raw.success !== false,
    name: sanitizeName(raw.name || raw.function?.name),
    address: sanitizeAddress(raw.address || raw.function?.address),
    oldSignature: sanitizeSignature(raw.oldSignature || raw.function?.oldSignature),
    newSignature: input.signature,
    operation: 'signature_updated' as const,
    timestamp: getTimestamp(),
  });
}

export const functionsSetSignature = {
  name: 'ghydra.functions-set-signature',
  description: 'Set function signature/prototype',
  inputSchema: InputSchema,

  async execute(input: FunctionsSetSignatureInput): Promise<FunctionsSetSignatureOutput> {
    const validated = InputSchema.parse(input);
    const identifier = getIdentifier(validated);

    try {
      const params: any = {
        signature: validated.signature,
      };
      if (identifier.type === 'name') params.name = identifier.value;
      if (identifier.type === 'address') params.address = identifier.value;
      if (validated.port) params.port = validated.port;

      const raw = await callMCPTool('ghydra', 'functions_set_signature', params);
      return filterResponse(raw, validated);
    } catch (error) {
      handleMCPError(error, 'functions-set-signature');
    }
  },
};

export default functionsSetSignature;
