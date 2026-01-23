/**
 * PyGhidra list_project_binaries wrapper
 *
 * Lists all binary files in the current Ghidra project along with their analysis status.
 * This is the simplest pyghidra tool - NO input parameters required.
 *
 * Returns array of binaries with { name: string, analyzed: boolean } structure.
 */

import { callMCPTool } from '../config/lib/mcp-client.js';

// ==========================
// Output Types
// ==========================

/**
 * Binary entry with name and analysis status
 */
interface Binary {
  name: string;
  analyzed: boolean;
}

/**
 * Success response with array of binaries
 */
interface ListProjectBinariesSuccess {
  ok: true;
  value: Binary[];
}

/**
 * Error response
 */
interface ListProjectBinariesFailure {
  ok: false;
  error: string;
}

type ListProjectBinariesResponse = ListProjectBinariesSuccess | ListProjectBinariesFailure;

// ==========================
// Main Execute Function
// ==========================

/**
 * Execute list_project_binaries
 *
 * @param _input - Unused (tool has no input parameters, but accepts empty object, undefined, or extraneous params)
 * @returns Result with binaries array or error
 */
export async function execute(_input?: unknown): Promise<ListProjectBinariesResponse> {
  try {
    // Call MCP tool (no parameters needed)
    const rawResponse = await callMCPTool<{ binaries: Binary[] }>('pyghidra',
      'list_project_binaries',
      {}, // Empty params object
      {} // No special options needed
    );

    // Validate response structure
    if (!rawResponse || typeof rawResponse !== 'object') {
      return {
        ok: false,
        error: 'Invalid response: Expected object response from MCP server',
      };
    }

    if (!('binaries' in rawResponse)) {
      return {
        ok: false,
        error: 'Invalid response: Missing binaries field in MCP response',
      };
    }

    const { binaries } = rawResponse;

    // Validate binaries is an array
    if (!Array.isArray(binaries)) {
      return {
        ok: false,
        error: 'Invalid response: binaries field must be an array',
      };
    }

    // Return success with binaries array (filter out any metadata fields)
    return {
      ok: true,
      value: binaries,
    };
  } catch (error) {
    // Handle MCP errors gracefully
    const message = error instanceof Error ? error.message : String(error);

    // Sanitize error messages (remove internal paths from stack traces)
    const sanitized = message
      .split('\n')[0] // Take only first line (error message, not stack trace)
      .replace(/\/[^\s]+\/(internal|home|Users)\/[^\s]+/g, '[path]'); // Remove absolute paths

    // Classify error for meaningful messages
    let errorMessage = sanitized;

    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('connection refused') || lowerMessage.includes('econnrefused')) {
      errorMessage = `Connection refused: PyGhidra MCP server not reachable. ${sanitized}`;
    } else if (lowerMessage.includes('timeout')) {
      errorMessage = `Timeout: list_project_binaries operation timed out. ${sanitized}`;
    } else if (lowerMessage.includes('unauthorized')) {
      errorMessage = `Unauthorized: Invalid credentials for PyGhidra MCP server. ${sanitized}`;
    } else if (lowerMessage.includes('json')) {
      errorMessage = `Invalid response: ${sanitized}`;
    }

    return {
      ok: false,
      error: errorMessage,
    };
  }
}

/**
 * Tool metadata export
 */
export const listProjectBinaries = {
  name: 'pyghidra.list_project_binaries',
  description: 'Lists all binary files in the current Ghidra project with their analysis status',
  execute,
};
