/**
 * JADX MCP Wrapper: rename-class
 * Pattern: write_operations
 * SECURITY CRITICAL: Modifies project state
 *
 * Features:
 * - User confirmation required before execution
 * - Audit logging for all operations
 * - 6-layer defense-in-depth validation
 * - Java reserved word blacklist
 * - Read-only mode support
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { handleMCPError, addTokenEstimation, getTimestamp } from './utils.js';
import { validateRenameInputs, logWriteOperation } from './security-utils.js';
import { JavaClassNameSchema, NewNameSchema } from './shared-schemas.js';

// ============================================================================
// Input Schema
// ============================================================================

/**
 * Input schema with confirmation flag
 *
 * Workflow:
 * 1. First call WITHOUT confirmed=true returns preview
 * 2. Second call WITH confirmed=true executes rename
 */
const InputSchema = z.object({
  /**
   * Fully qualified Java class name to rename
   * Example: "com.facetec.urcodes.sdk.internal.cr"
   */
  class_name: JavaClassNameSchema,

  /**
   * New class name (simple name, not qualified)
   * Example: "HashUtil"
   *
   * Note: Package path is preserved, only the simple class name changes
   */
  new_name: NewNameSchema,

  /**
   * Explicit confirmation flag
   * If false or missing, returns preview without executing
   * If true, executes the rename operation
   */
  confirmed: z.boolean().optional().default(false),
}).strict();

export type RenameClassInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interfaces
// ============================================================================

/**
 * Output schema for successful rename execution
 */
export interface RenameClassOutput {
  /** Whether rename succeeded */
  success: boolean;

  /** Original class name (fully qualified) */
  oldName: string;

  /** New class name (fully qualified with preserved package) */
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

/**
 * Preview response (when confirmation required)
 */
export interface RenameClassPreview {
  /** Always false for preview */
  success: false;

  /** Indicates confirmation required */
  requiresConfirmation: true;

  /** Preview of operation */
  preview: {
    oldName: string;
    newName: string;
  };

  /** Confirmation message */
  message: string;

  /** Token count for this response */
  estimatedTokens: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract simple class name from fully qualified name
 * @param fullyQualified - e.g., "com.example.app.MainActivity"
 * @returns Simple name - e.g., "MainActivity"
 */
function extractSimpleName(fullyQualified: string): string {
  const parts = fullyQualified.split('.');
  return parts[parts.length - 1];
}

/**
 * Build new fully qualified name with preserved package
 * @param oldFullyQualified - e.g., "com.example.app.MainActivity"
 * @param newSimpleName - e.g., "MainScreen"
 * @returns New fully qualified name - e.g., "com.example.app.MainScreen"
 */
function buildNewFullyQualifiedName(oldFullyQualified: string, newSimpleName: string): string {
  const parts = oldFullyQualified.split('.');
  parts[parts.length - 1] = newSimpleName;
  return parts.join('.');
}

/**
 * Filter and map raw MCP response to structured output
 */
function filterResponse(rawData: unknown, input: RenameClassInput): RenameClassOutput {
  const raw = rawData as { success?: boolean; oldName?: string; newName?: string; message?: string };

  return addTokenEstimation({
    success: raw.success !== false,
    oldName: raw.oldName ?? input.class_name,
    newName: raw.newName ?? buildNewFullyQualifiedName(input.class_name, input.new_name),
    message: raw.message ?? 'Class renamed successfully',
    operation: 'renamed' as const,
    timestamp: getTimestamp(),
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const renameClass = {
  name: 'jadx.rename-class',
  description: 'Rename a class to a more meaningful name - WRITE OPERATION (requires confirmation)',
  inputSchema: InputSchema,

  async execute(input: RenameClassInput): Promise<RenameClassOutput | RenameClassPreview> {
    // Layer 1: Zod schema validation
    const validated = InputSchema.parse(input);

    // Layer 3: Extra security validation for write operations
    validateRenameInputs(
      validated.class_name,
      validated.new_name,
      'rename-class'
    );

    // Preview mode (no confirmation)
    if (!validated.confirmed) {
      return addTokenEstimation({
        success: false,
        requiresConfirmation: true,
        preview: {
          oldName: validated.class_name,
          newName: buildNewFullyQualifiedName(validated.class_name, validated.new_name),
        },
        message: `Please confirm rename: class '${extractSimpleName(validated.class_name)}' -> '${validated.new_name}'`,
      }) as RenameClassPreview;
    }

    // Execute rename (confirmed)
    try {
      const raw = await callMCPTool('jadx-mcp-server', 'rename_class', {
        class_name: validated.class_name,
        new_name: validated.new_name,
      });

      const result = filterResponse(raw, validated);

      // Audit log success
      logWriteOperation({
        timestamp: result.timestamp,
        tool: 'rename-class',
        operation: 'rename',
        oldValue: validated.class_name,
        newValue: result.newName,
        success: true,
      });

      return result;
    } catch (error) {
      // Audit log failure
      logWriteOperation({
        timestamp: getTimestamp(),
        tool: 'rename-class',
        operation: 'rename',
        oldValue: validated.class_name,
        newValue: buildNewFullyQualifiedName(validated.class_name, validated.new_name),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      handleMCPError(error, 'rename-class');
    }
  },
};

export default renameClass;
