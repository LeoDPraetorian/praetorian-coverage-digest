/**
 * Pyghidra read_bytes wrapper
 *
 * Reads raw bytes from memory at a specified address in a Ghidra binary.
 * Returns hex-encoded data with minimal transformation (LOW token risk tool).
 *
 * Key features:
 * - Address normalization (adds 0x prefix, converts to lowercase)
 * - DoS prevention via 8192 byte size limit (FUNCTIONAL requirement)
 * - Input validation (binary_name, address format, size bounds)
 *
 * Test Plan: .claude/.output/mcp-wrappers/2026-01-15-102902-pyghidra/tools/read_bytes/test-plan.md
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { BinaryNameSchema, AddressSchema, ReadBytesSizeSchema } from './lib/schemas.js';

// ============================================================================
// Input Schema with Address Normalization
// ============================================================================

export const readBytesInputSchema = z.object({
  binary_name: BinaryNameSchema,
  address: AddressSchema.transform((addr) => {
    // Normalize address: lowercase and ensure 0x prefix
    const lower = addr.toLowerCase();
    return lower.startsWith('0x') ? lower : `0x${lower}`;
  }),
  size: ReadBytesSizeSchema,
});

export type ReadBytesInput = z.input<typeof readBytesInputSchema>;

// ============================================================================
// Output Types
// ============================================================================

export interface ReadBytesData {
  hex_data: string;
  bytes_read: number;
}

export interface ReadBytesSuccess {
  ok: true;
  data: ReadBytesData;
}

export type ReadBytesResponse = ReadBytesSuccess;

// ============================================================================
// MCP Response Type
// ============================================================================

interface RawReadBytesResponse {
  hex_data: string;
  bytes_read: number;
}

// ============================================================================
// Execute Function
// ============================================================================

async function execute(rawInput: unknown): Promise<ReadBytesResponse> {
  // Validate and parse input (Zod will throw on validation errors)
  const validated = readBytesInputSchema.parse(rawInput);

  try {
    // Call MCP tool with normalized parameters
    const raw = await callMCPTool<RawReadBytesResponse>('pyghidra', 'read_bytes', {
      binary_name: validated.binary_name,
      address: validated.address,
      size: validated.size,
    });

    // Return success result with minimal transformation
    return {
      ok: true,
      data: {
        hex_data: raw.hex_data,
        bytes_read: raw.bytes_read,
      },
    };
  } catch (error) {
    // Propagate MCP errors (binary not found, invalid address, timeout, etc.)
    throw error;
  }
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const readBytes = {
  name: 'pyghidra.read_bytes',
  description: 'Read raw bytes from memory at a specified address (max 8192 bytes)',
  parameters: readBytesInputSchema,
  execute,
};
