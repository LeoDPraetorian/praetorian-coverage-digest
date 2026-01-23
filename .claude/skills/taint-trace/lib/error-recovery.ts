/**
 * Error Recovery Prompts and Actions
 *
 * Provides interactive recovery options for decompilation failures,
 * timeouts, and server crashes during taint analysis.
 */

export interface DecompilationFailurePrompt {
  functionName: string;
  errorMessage: string;
  options: string[];
}

export interface CrossReferenceTimeoutPrompt {
  functionName: string;
  xrefCount: number;
  options: string[];
}

export interface ServerCrashPrompt {
  functionsAnalyzed: number;
  totalFunctions: number;
  options: string[];
}

export interface SkipFunctionResult {
  skipped: boolean;
  function: string;
}

export interface DisassemblyFallbackResult {
  code: string;
  confidence: 'low';
}

/**
 * Format recovery prompt for decompilation failures
 */
export function formatDecompilationFailurePrompt(
  functionName: string,
  errorMessage: string
): string {
  return `⚠️  Decompilation failed for function: ${functionName}

Error: ${errorMessage}

Recovery options:
A) Continue with disassembly
B) Skip this function
C) Retry decompilation
D) Abort analysis

Your choice (A/B/C/D):`;
}

/**
 * Format recovery prompt for cross-reference timeout
 */
export function formatCrossReferenceTimeoutPrompt(
  functionName: string,
  xrefCount: number
): string {
  return `⏱️  Cross-reference enumeration timed out for: ${functionName}

Found ${xrefCount} references so far (enumeration incomplete)

Recovery options:
A) Continue with partial results
B) Increase timeout
C) Skip
D) Abort

Your choice (A/B/C/D):`;
}

/**
 * Format recovery prompt for server crash
 */
export function formatServerCrashPrompt(
  functionsAnalyzed: number,
  totalFunctions: number
): string {
  return `💥 MCP server crashed during analysis

Progress: ${functionsAnalyzed} of ${totalFunctions} functions analyzed

Recovery options:
A) Restart server and resume
B) Restart from beginning
C) Abort and show partial results

Your choice (A/B/C):`;
}

/**
 * Parse user choice input and validate
 */
export function parseUserChoice(input: string): string {
  const normalized = input.trim().toUpperCase();

  if (!normalized || !['A', 'B', 'C', 'D'].includes(normalized)) {
    throw new Error('Invalid choice');
  }

  return normalized;
}

/**
 * Execute disassembly fallback when decompilation fails
 * TODO: Integrate with actual disassembly tool
 */
export async function executeDisassemblyFallback(
  binaryPath: string,
  functionName: string
): Promise<DisassemblyFallbackResult> {
  // Placeholder implementation - returns mock disassembly data
  // In real implementation, this would call objdump or similar tool
  return {
    code: `; Disassembly fallback for ${functionName} in ${binaryPath}
; TODO: Implement actual disassembly extraction
; This is a placeholder for disassembly output`,
    confidence: 'low',
  };
}

/**
 * Execute skip function action
 * Marks a function as skipped in the analysis
 */
export function executeSkipFunction(functionName: string): SkipFunctionResult {
  return {
    skipped: true,
    function: functionName,
  };
}
