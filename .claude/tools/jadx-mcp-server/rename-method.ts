/**
 * JADX MCP Wrapper: rename-method
 * Pattern: write_operations
 * SECURITY CRITICAL: Modifies project state
 *
 * Features:
 * - 4-layer defense-in-depth validation
 * - Audit logging for all operations
 * - Java reserved word blacklist
 * - Full method path validation (package.class.method)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { handleMCPError, addTokenEstimation, getTimestamp } from './utils.js';
import { validateRenameMethodInputs } from './security-utils.js';
import { FullMethodPathSchema, NewNameSchema } from './shared-schemas.js';

// ============================================================================
// Input Schema
// ============================================================================

/**
 * Input schema for rename-method
 *
 * CRITICAL: No confirmation flag - methods are lower risk than classes
 * (changing a method name doesn't affect external APIs as much as class names)
 */
const InputSchema = z.object({
  /**
   * Full method path to rename
   * Format: package.class.method
   * Example: "com.facetec.urcodes.sdk.internal.HashUtil.c"
   */
  method_name: FullMethodPathSchema,

  /**
   * New name for the method (must be valid Java identifier)
   * Example: "sha256ToHexString", "calculateHash", "initializeState"
   */
  new_name: NewNameSchema,
}).strict();

export type RenameMethodInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

/**
 * Output schema for rename-method execution
 */
export interface RenameMethodOutput {
  /** Whether rename succeeded */
  success: boolean;

  /** Original full method path */
  oldName: string;

  /** New method name (simple name only) */
  newName: string;

  /** Human-readable message */
  message: string;

  /** Operation type (always 'renamed') */
  operation: 'renamed';

  /** ISO timestamp for audit logging */
  timestamp: string;

  /** Token count for this response */
  estimatedTokens: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Log audit entry for rename operation
 */
function logAudit(entry: {
  operation: string;
  oldName: string;
  newName: string;
  success: boolean;
  errorMessage?: string;
}): void {
  console.log('[JADX-AUDIT]', JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  }));
}

/**
 * Filter and map raw MCP response to structured output
 */
function filterResponse(rawData: unknown, input: RenameMethodInput): RenameMethodOutput {
  const raw = rawData as { success?: boolean; oldName?: string; newName?: string; message?: string };

  return addTokenEstimation({
    success: raw.success !== false,
    oldName: raw.oldName ?? input.method_name,
    newName: raw.newName ?? input.new_name,
    message: raw.message ?? 'Method renamed successfully',
    operation: 'renamed' as const,
    timestamp: getTimestamp(),
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const renameMethod = {
  name: 'jadx.rename-method',
  description: 'Rename a method to a more meaningful name - WRITE OPERATION (modifies project state)',
  inputSchema: InputSchema,

  async execute(input: RenameMethodInput): Promise<RenameMethodOutput> {
    // Layer 1: Zod schema validation
    const validated = InputSchema.parse(input);

    // Layer 3: Extra security validation for write operations
    validateRenameMethodInputs(
      validated.method_name,
      validated.new_name,
      'rename-method'
    );

    // Execute rename
    try {
      const raw = await callMCPTool('jadx-mcp-server', 'rename_method', {
        method_name: validated.method_name,
        new_name: validated.new_name,
      });

      const result = filterResponse(raw, validated);

      // Audit log success
      logAudit({
        operation: 'rename-method',
        oldName: validated.method_name,
        newName: validated.new_name,
        success: true,
      });

      return result;
    } catch (error) {
      // Audit log failure
      logAudit({
        operation: 'rename-method',
        oldName: validated.method_name,
        newName: validated.new_name,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      handleMCPError(error, 'rename-method');
    }
  },
};

export default renameMethod;
