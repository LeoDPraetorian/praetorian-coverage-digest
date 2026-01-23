/**
 * JADX MCP Wrapper: rename-field
 * Pattern: write_operations
 * SECURITY CRITICAL: Modifies project state
 *
 * Features:
 * - User confirmation required before execution
 * - Audit logging for all operations
 * - 4-layer defense-in-depth validation
 * - Java reserved word blacklist
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import { handleMCPError, addTokenEstimation, getTimestamp } from './utils.js';
import { validateRenameFieldInputs, logWriteOperation } from './security-utils.js';
import { JavaClassNameSchema, JavaIdentifierSchema, NewNameSchema } from './shared-schemas.js';

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
   * Fully qualified Java class containing the field
   * Example: "com.facetec.urcodes.sdk.internal.HashUtil"
   */
  class_name: JavaClassNameSchema,

  /**
   * Current field name to rename
   * Example: "c", "mContext", "INSTANCE"
   */
  field_name: JavaIdentifierSchema,

  /**
   * New name for the field (must be valid Java identifier)
   * Example: "HEX_CHARS", "context", "instance"
   */
  new_name: NewNameSchema,

  /**
   * Explicit confirmation flag
   * If false or missing, returns preview without executing
   * If true, executes the rename operation
   */
  confirmed: z.boolean().optional().default(false),
}).strict();

export type RenameFieldInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interfaces
// ============================================================================

/**
 * Output schema for successful rename execution
 */
export interface RenameFieldOutput {
  /** Whether rename succeeded */
  success: boolean;

  /** Original field name (simple name, not qualified) */
  oldName: string;

  /** New field name */
  newName: string;

  /** Containing class (for context) */
  className: string;

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
export interface RenameFieldPreview {
  /** Always false for preview */
  success: false;

  /** Indicates confirmation required */
  requiresConfirmation: true;

  /** Preview of operation */
  preview: {
    className: string;
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
 * Filter and map raw MCP response to structured output
 */
function filterResponse(rawData: unknown, input: RenameFieldInput): RenameFieldOutput {
  const raw = rawData as { success?: boolean; oldName?: string; newName?: string; message?: string };

  return addTokenEstimation({
    success: raw.success !== false,
    oldName: raw.oldName ?? input.field_name,
    newName: raw.newName ?? input.new_name,
    className: input.class_name,
    message: raw.message ?? 'Field renamed successfully',
    operation: 'renamed' as const,
    timestamp: getTimestamp(),
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const renameField = {
  name: 'jadx.rename-field',
  description: 'Rename a field to a more meaningful name - WRITE OPERATION (requires confirmation)',
  inputSchema: InputSchema,

  async execute(input: RenameFieldInput): Promise<RenameFieldOutput | RenameFieldPreview> {
    // Layer 1: Zod schema validation
    const validated = InputSchema.parse(input);

    // Layer 3: Extra security validation for write operations
    validateRenameFieldInputs(
      validated.class_name,
      validated.field_name,
      validated.new_name,
      'rename-field'
    );

    // Preview mode (no confirmation)
    if (!validated.confirmed) {
      return addTokenEstimation({
        success: false,
        requiresConfirmation: true,
        preview: {
          className: validated.class_name,
          oldName: validated.field_name,
          newName: validated.new_name,
        },
        message: `Please confirm rename: field '${validated.field_name}' -> '${validated.new_name}' in class ${extractSimpleName(validated.class_name)}`,
      }) as RenameFieldPreview;
    }

    // Execute rename (confirmed)
    try {
      const raw = await callMCPTool('jadx-mcp-server', 'rename_field', {
        class_name: validated.class_name,
        field_name: validated.field_name,
        new_name: validated.new_name,
      });

      const result = filterResponse(raw, validated);

      // Audit log success
      logWriteOperation({
        timestamp: result.timestamp,
        tool: 'rename-field',
        operation: 'rename',
        oldValue: `${validated.class_name}.${validated.field_name}`,
        newValue: `${validated.class_name}.${validated.new_name}`,
        success: true,
      });

      return result;
    } catch (error) {
      // Audit log failure
      logWriteOperation({
        timestamp: getTimestamp(),
        tool: 'rename-field',
        operation: 'rename',
        oldValue: `${validated.class_name}.${validated.field_name}`,
        newValue: `${validated.class_name}.${validated.new_name}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      handleMCPError(error, 'rename-field');
    }
  },
};

export default renameField;
