/**
 * Analysis polling utilities for PyGhidra operations
 *
 * Provides mechanisms to wait for binary analysis completion and query
 * overall analysis status across the Ghidra project.
 */

import { callMCPTool } from '../../config/lib/mcp-client.js';

// ==========================
// Types
// ==========================

/**
 * Binary metadata returned by analysis operations
 */
export interface BinaryMetadata {
  /** Binary name (may include path prefix like /path/to/binary) */
  name: string;
  /** Whether analysis is complete */
  analyzed: boolean;
}

/**
 * Overall analysis status for the project
 */
export interface AnalysisStatus {
  /** Total number of binaries in project */
  total: number;
  /** Number of analyzed binaries */
  analyzed: number;
  /** Number of pending (not yet analyzed) binaries */
  pending: number;
  /** List of all binaries with their status */
  binaries: BinaryMetadata[];
}

/**
 * Configuration options for polling operations
 */
export interface PollerOptions {
  /** Maximum number of polling attempts (default: 24 = 2 minutes at 5s intervals) */
  maxAttempts?: number;
  /** Maximum total wait time in milliseconds (default: 120000 = 2 minutes) */
  timeoutMs?: number;
  /** Interval between poll attempts in milliseconds (default: 5000 = 5 seconds) */
  pollIntervalMs?: number;
}

/**
 * Error thrown when analysis polling times out
 */
export class AnalysisTimeoutError extends Error {
  constructor(binaryName: string, elapsedMs: number) {
    super(`Analysis did not complete for '${binaryName}' within ${elapsedMs}ms`);
    this.name = 'AnalysisTimeoutError';
  }
}

/**
 * Error thrown when binary is not found in project
 */
export class BinaryNotFoundError extends Error {
  constructor(binaryName: string) {
    super(`Binary '${binaryName}' not found in project`);
    this.name = 'BinaryNotFoundError';
  }
}

// ==========================
// Helper Functions
// ==========================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find binary by name with partial matching support
 *
 * Matches binaries where the name contains the search string.
 * Example: searching "updatemgr" matches "/path/to/updatemgr-e100d8"
 *
 * @param binaries - List of binaries to search
 * @param searchName - Name or partial name to search for
 * @returns Matching binary or undefined
 */
function findBinaryByName(binaries: BinaryMetadata[], searchName: string): BinaryMetadata | undefined {
  // Try exact match first
  const exactMatch = binaries.find((b) => b.name === searchName);
  if (exactMatch) {
    return exactMatch;
  }

  // Try partial match (case-insensitive)
  const lowerSearch = searchName.toLowerCase();
  return binaries.find((b) => b.name.toLowerCase().includes(lowerSearch));
}

/**
 * Fetch current project binaries from MCP server
 */
async function fetchProjectBinaries(): Promise<BinaryMetadata[]> {
  interface ListBinariesResponse {
    binaries: BinaryMetadata[];
  }

  const response = await callMCPTool<ListBinariesResponse>(
    'pyghidra',
    'list_project_binaries',
    {}
  );

  return response.binaries || [];
}

// ==========================
// Analysis Poller Implementation
// ==========================

/**
 * Interface for analysis polling operations
 */
export interface AnalysisPoller {
  /**
   * Check if analysis is complete for a specific binary
   *
   * @param binaryName - Binary name (supports partial matching)
   * @returns True if analysis complete, false otherwise
   * @throws BinaryNotFoundError if binary not in project
   */
  isAnalysisComplete(binaryName: string): Promise<boolean>;

  /**
   * Wait for binary analysis to complete
   *
   * Polls until analysis completes or timeout is reached.
   *
   * @param binaryName - Binary name (supports partial matching)
   * @param options - Polling configuration
   * @returns Binary metadata when analysis complete
   * @throws BinaryNotFoundError if binary not in project
   * @throws AnalysisTimeoutError if timeout reached before completion
   */
  waitForBinary(binaryName: string, options?: PollerOptions): Promise<BinaryMetadata>;

  /**
   * Get overall analysis status for the project
   *
   * @returns Status summary with counts and binary list
   */
  getAnalysisStatus(): Promise<AnalysisStatus>;
}

/**
 * Default polling configuration
 */
const DEFAULT_OPTIONS: Required<PollerOptions> = {
  maxAttempts: 24, // 2 minutes at 5s intervals
  timeoutMs: 120000, // 2 minutes
  pollIntervalMs: 5000, // 5 seconds
};

/**
 * Implementation of AnalysisPoller
 */
class AnalysisPollerImpl implements AnalysisPoller {
  async isAnalysisComplete(binaryName: string): Promise<boolean> {
    const binaries = await fetchProjectBinaries();
    const binary = findBinaryByName(binaries, binaryName);

    if (!binary) {
      throw new BinaryNotFoundError(binaryName);
    }

    return binary.analyzed;
  }

  async waitForBinary(binaryName: string, options: PollerOptions = {}): Promise<BinaryMetadata> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let attempts = 0;

    while (attempts < opts.maxAttempts) {
      const elapsedMs = Date.now() - startTime;

      // Check timeout
      if (elapsedMs >= opts.timeoutMs) {
        throw new AnalysisTimeoutError(binaryName, elapsedMs);
      }

      // Fetch current binaries
      const binaries = await fetchProjectBinaries();
      const binary = findBinaryByName(binaries, binaryName);

      // Binary not found
      if (!binary) {
        throw new BinaryNotFoundError(binaryName);
      }

      // Analysis complete
      if (binary.analyzed) {
        return binary;
      }

      // Wait before next attempt (unless this is the last attempt)
      attempts++;
      if (attempts < opts.maxAttempts) {
        await sleep(opts.pollIntervalMs);
      }
    }

    // Max attempts reached
    const elapsedMs = Date.now() - startTime;
    throw new AnalysisTimeoutError(binaryName, elapsedMs);
  }

  async getAnalysisStatus(): Promise<AnalysisStatus> {
    const binaries = await fetchProjectBinaries();

    const analyzed = binaries.filter((b) => b.analyzed).length;
    const total = binaries.length;
    const pending = total - analyzed;

    return {
      total,
      analyzed,
      pending,
      binaries,
    };
  }
}

// ==========================
// Public API
// ==========================

/**
 * Get singleton instance of AnalysisPoller
 *
 * @returns AnalysisPoller instance
 *
 * @example
 * ```typescript
 * const poller = getAnalysisPoller();
 *
 * // Check if binary is analyzed
 * const isComplete = await poller.isAnalysisComplete('my-binary');
 *
 * // Wait for analysis to complete
 * const binary = await poller.waitForBinary('my-binary', {
 *   timeoutMs: 60000, // 1 minute
 * });
 *
 * // Get overall status
 * const status = await poller.getAnalysisStatus();
 * console.log(`${status.analyzed}/${status.total} binaries analyzed`);
 * ```
 */
export function getAnalysisPoller(): AnalysisPoller {
  return new AnalysisPollerImpl();
}
