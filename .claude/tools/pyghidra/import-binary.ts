/**
 * PyGhidra import_binary wrapper - HIGHEST SECURITY RISK
 *
 * Imports a binary from a file system path into the current Ghidra project.
 *
 * Security layers:
 * 1. Zod schema validation (6 refinements)
 * 2. Runtime path validation (realpath, isFile, access)
 * 3. Audit logging (all attempts)
 *
 * Note: All directories are allowed. Users must manually inspect and approve paths before import.
 */

import { z } from 'zod';
import * as path from 'path';
import { realpath, stat, access, constants } from 'fs/promises';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { ValidationError, ImportError, parseMcpError } from './lib/errors.js';
import { estimateOperationTime, formatDuration } from './lib/time-estimator.js';
import { getAnalysisPoller } from './lib/analysis-poller.js';

// ==========================
// Input Schema - 6 Security Refinements
// ==========================

/**
 * Custom path traversal validator (excludes ~ check)
 * The validateNoPathTraversal function includes ~ in its patterns,
 * but we want to check ~ separately with a different error message.
 */
function validateNoPathTraversalWithoutTilde(input: string): boolean {
  const patterns = [
    /\.\.\//,              // Unix path traversal ../
    /\.\.\\/,              // Windows path traversal ..\
    /\.\.$/,               // Ends with ..
    /^\.\.$/,              // Just ..
  ];
  return !patterns.some(pattern => pattern.test(input));
}

export const importBinaryInputSchema = z.object({
  binary_path: z
    .string()
    .min(1, 'Binary path is required')
    .max(4096, 'Path too long (max 4096 characters)')
    // Layer 1a: Control character prevention (null byte injection)
    .refine(validateNoControlChars, {
      message: 'Control characters not allowed in path',
    })
    // Layer 1b: Path traversal prevention (without ~ check)
    .refine(validateNoPathTraversalWithoutTilde, {
      message: 'Path traversal sequences not allowed (..)',
    })
    // Layer 1c: Command injection prevention
    .refine(validateNoCommandInjection, {
      message: 'Invalid characters detected in path',
    })
    // Layer 1d: Protocol handler prevention
    .refine((p) => !p.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/), {
      message: 'Protocol handlers not allowed (file://, http://, etc.)',
    })
    // Layer 1e: Home directory expansion prevention
    .refine((p) => !p.includes('~'), {
      message: 'Home directory expansion (~) not allowed',
    })
    // Layer 1f: Double slash prevention (path confusion)
    .refine((p) => !p.includes('//'), {
      message: 'Double slashes not allowed',
    })
    .describe('Absolute path to the binary file to import'),

  wait_for_analysis: z
    .boolean()
    .optional()
    .default(false)
    .describe('Wait for analysis to complete before returning'),

  timeout_ms: z
    .number()
    .int()
    .min(5000, 'Timeout must be at least 5 seconds')
    .max(1800000, 'Timeout must not exceed 30 minutes')
    .optional()
    .default(120000)
    .describe('Maximum time to wait for analysis completion (if wait_for_analysis=true)'),
});

export type ImportBinaryInput = z.infer<typeof importBinaryInputSchema>;

// ==========================
// Output Types
// ==========================

interface ImportBinaryOutput {
  binary_name: string;
  message: string;
  size_bytes?: number;
  estimated_analysis_time?: string;
  analysis_complete?: boolean;
  analysis_wait_time_ms?: number;
}

interface PyghidraError {
  message: string;
  code: string;
}

interface ImportBinarySuccess {
  ok: true;
  data: ImportBinaryOutput;
  meta: {
    estimatedTokens: number;
    durationMs: number;
  };
}

interface ImportBinaryFailure {
  ok: false;
  error: PyghidraError;
  meta?: {
    durationMs: number;
  };
}

type ImportBinaryResponse = ImportBinarySuccess | ImportBinaryFailure;

// ==========================
// Runtime Validation
// ==========================

/**
 * Validate and resolve binary path with comprehensive security checks
 *
 * Note: No directory whitelist is enforced. Users must manually inspect paths before import.
 *
 * @param inputPath - User-provided path (already schema-validated)
 * @returns Resolved absolute path that is safe to use
 * @throws PyghidraError with appropriate error code
 */
async function validateAndResolveBinaryPath(inputPath: string): Promise<string> {
  // Runtime Layer 0: Check for relative paths (must be absolute)
  if (!path.isAbsolute(inputPath)) {
    throw new ValidationError('binary_path', 'Path must be absolute (no relative paths)');
  }

  // Runtime Layer 1: Resolve to absolute path (follows symlinks)
  let resolvedPath: string;
  try {
    resolvedPath = await realpath(inputPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      // Use PyghidraError with NOT_FOUND code instead of ValidationError
      const err = new Error(`File not found: ${inputPath}`) as PyghidraError & Error;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (code === 'EACCES') {
      // Use PyghidraError with PERMISSION_DENIED code instead of ValidationError
      const err = new Error(`Permission denied: ${inputPath}`) as PyghidraError & Error;
      err.code = 'PERMISSION_DENIED';
      throw err;
    }
    throw new ValidationError('binary_path', `Cannot resolve path: ${inputPath}`);
  }

  // Runtime Layer 2: Verify file exists and is a regular file
  const fileStat = await stat(resolvedPath);
  if (!fileStat.isFile()) {
    throw new ValidationError('binary_path', 'Path must be a regular file');
  }

  // Runtime Layer 3: Verify file is readable
  try {
    await access(resolvedPath, constants.R_OK);
  } catch {
    throw new ValidationError('binary_path', `File is not readable: ${inputPath}`);
  }

  return resolvedPath;
}

// ==========================
// Audit Logging
// ==========================

interface AuditEntry {
  inputPath: string;
  resolvedPath?: string;
  result: 'success' | 'validation_error' | 'not_found' | 'permission_denied' | 'error';
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Log import attempt to stderr (captured by MCP infrastructure)
 * Sanitizes paths to prevent leaking full user home paths
 */
function auditImportAttempt(entry: AuditEntry): void {
  const sanitized = {
    timestamp: new Date().toISOString(),
    operation: 'import_binary',
    ...entry,
    inputPath: entry.inputPath
      .replace(/^\/Users\/[^/]+\//, '~/')
      .replace(/^\/home\/[^/]+\//, '~/'),
    resolvedPath: entry.resolvedPath
      ?.replace(/^\/Users\/[^/]+\//, '~/')
      .replace(/^\/home\/[^/]+\//, '~/'),
  };
  console.error(`[AUDIT] ${JSON.stringify(sanitized)}`);
}

// ==========================
// Main Execute Function
// ==========================

export async function execute(rawInput: unknown): Promise<ImportBinaryResponse> {
  const startTime = Date.now();

  // Step 1: Validate input (Zod schema with 6 refinements)
  const parseResult = importBinaryInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    const message = firstError?.message || 'Validation failed';

    // Audit validation failure
    auditImportAttempt({
      inputPath: String((rawInput as any)?.binary_path || 'unknown'),
      result: 'validation_error',
      errorCode: 'VALIDATION_ERROR',
      errorMessage: message,
    });

    return {
      ok: false,
      error: {
        message,
        code: 'VALIDATION_ERROR',
      },
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  }

  const input = parseResult.data;

  // Step 2: Runtime path validation (3 layers: realpath, isFile, access)
  let resolvedPath: string;
  try {
    resolvedPath = await validateAndResolveBinaryPath(input.binary_path);
  } catch (error) {
    // Determine error code from the error object
    const errorCode = (error as any).code || 'INTERNAL_ERROR';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Audit runtime validation failure
    auditImportAttempt({
      inputPath: input.binary_path,
      result:
        errorCode === 'NOT_FOUND'
          ? 'not_found'
          : errorCode === 'PERMISSION_DENIED'
            ? 'permission_denied'
            : errorCode === 'VALIDATION_ERROR'
              ? 'validation_error'
              : 'error',
      errorCode,
      errorMessage,
    });

    return {
      ok: false,
      error: {
        message: errorMessage,
        code: errorCode,
      },
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  }

  // Get binary size and estimate analysis time
  let binarySize: number | undefined;
  let estimatedTime: string | undefined;
  try {
    const fileStat = await stat(resolvedPath);
    binarySize = fileStat.size;

    // Estimate timing if size is available
    const timing = estimateOperationTime(binarySize);
    estimatedTime = formatDuration(timing.totalMs / 1000);
  } catch {
    // Optional - continue without size/estimation if this fails
  }

  // Step 3: Call MCP to import binary
  try {
    const rawResponse = await callMCPTool<string>('pyghidra', 'import_binary', {
      binary_path: resolvedPath,
    });

    const binaryName = path.basename(resolvedPath);

    // Audit successful import
    auditImportAttempt({
      inputPath: input.binary_path,
      resolvedPath,
      result: 'success',
    });

    // Wait for analysis if requested
    let analysisComplete: boolean | undefined;
    let analysisWaitTime: number | undefined;

    if (input.wait_for_analysis) {
      const analysisStart = Date.now();
      const poller = getAnalysisPoller();

      try {
        await poller.waitForBinary(binaryName, {
          timeoutMs: input.timeout_ms,
        });
        analysisComplete = true;
        analysisWaitTime = Date.now() - analysisStart;
      } catch (error) {
        // Timeout or error - partial success (import worked, analysis pending)
        analysisComplete = false;
        analysisWaitTime = Date.now() - analysisStart;
      }
    }

    // Build output with new optional fields
    const output: ImportBinaryOutput = {
      binary_name: binaryName,
      message: analysisComplete
        ? `Successfully imported and analyzed ${binaryName}`
        : `Successfully imported ${binaryName}`,
      ...(binarySize !== undefined && { size_bytes: binarySize }),
      ...(estimatedTime !== undefined && { estimated_analysis_time: estimatedTime }),
      ...(analysisComplete !== undefined && { analysis_complete: analysisComplete }),
      ...(analysisWaitTime !== undefined && { analysis_wait_time_ms: analysisWaitTime }),
    };

    return {
      ok: true,
      data: output,
      meta: {
        estimatedTokens: estimateTokens(output),
        durationMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    // Audit MCP error
    auditImportAttempt({
      inputPath: input.binary_path,
      resolvedPath,
      result: 'error',
      errorCode: 'IMPORT_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    const parsedError = parseMcpError(error);

    return {
      ok: false,
      error: {
        message: parsedError.message,
        code: parsedError.code,
      },
      meta: {
        durationMs: Date.now() - startTime,
      },
    };
  }
}

export const importBinary = {
  name: 'pyghidra.import_binary',
  description: 'Imports a binary from a file path into the current Ghidra project',
  parameters: importBinaryInputSchema,
  execute,
};
