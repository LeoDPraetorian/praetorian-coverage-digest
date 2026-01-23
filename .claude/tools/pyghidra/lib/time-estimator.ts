/**
 * Time estimation utilities for PyGhidra analysis operations
 *
 * Provides empirically-derived time estimates for binary import and analysis
 * based on file size. Formulas derived from observed performance characteristics.
 */

/**
 * Time estimate for a PyGhidra operation
 */
export interface TimeEstimate {
  /** Estimated duration in seconds */
  estimatedSeconds: number;
  /** Estimated duration in minutes */
  estimatedMinutes: number;
  /** Human-readable duration string (e.g., "30 seconds", "2.5 minutes") */
  humanReadable: string;
  /** Confidence level based on binary size and empirical variance */
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Detailed timing breakdown for import and analysis operations
 */
export interface OperationTiming {
  /** Import operation time in milliseconds */
  importMs: number;
  /** Analysis operation time in milliseconds */
  analysisMs: number;
  /** Total operation time in milliseconds */
  totalMs: number;
  /** Confidence level */
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Estimate total analysis time for a binary based on size
 *
 * @param sizeBytes - Binary file size in bytes
 * @returns Time estimate with confidence level
 *
 * @example
 * ```typescript
 * const estimate = estimateAnalysisTime(1048576); // 1MB
 * console.log(estimate.humanReadable); // "35 seconds"
 * console.log(estimate.confidence); // "medium"
 * ```
 */
export function estimateAnalysisTime(sizeBytes: number): TimeEstimate {
  const timing = estimateOperationTime(sizeBytes);
  const totalSeconds = timing.totalMs / 1000;

  return {
    estimatedSeconds: Math.round(totalSeconds),
    estimatedMinutes: parseFloat((totalSeconds / 60).toFixed(1)),
    humanReadable: formatDuration(totalSeconds),
    confidence: timing.confidence,
  };
}

/**
 * Estimate detailed timing breakdown for import and analysis
 *
 * Formula:
 * - Import: Constant ~2 seconds (project operations, file handling)
 * - Analysis: ~500ms per MB, bounded between 5s and 30 minutes
 *
 * Confidence levels:
 * - High (<1MB): Consistent, low variance in observed timings
 * - Medium (1-10MB): Moderate variance, generally predictable
 * - Low (>10MB): High variance due to complexity factors beyond size
 *
 * @param sizeBytes - Binary file size in bytes
 * @returns Detailed timing breakdown
 *
 * @example
 * ```typescript
 * const timing = estimateOperationTime(5242880); // 5MB
 * console.log(`Import: ${timing.importMs}ms, Analysis: ${timing.analysisMs}ms`);
 * // Import: 2000ms, Analysis: 2500ms
 * ```
 */
export function estimateOperationTime(sizeBytes: number): OperationTiming {
  // Import is relatively constant regardless of size
  const importMs = 2000;

  // Analysis scales with binary size
  // ~500ms per MB, empirically observed
  const sizeMB = sizeBytes / (1024 * 1024);
  const baseAnalysisMs = sizeMB * 500;

  // Bound analysis time between 5s (minimum) and 30 minutes (maximum)
  const analysisMs = Math.max(5000, Math.min(1800000, baseAnalysisMs));

  // Determine confidence based on size
  // Smaller binaries have more consistent timing
  let confidence: 'low' | 'medium' | 'high';
  if (sizeMB < 1) {
    confidence = 'high'; // Very consistent for small binaries
  } else if (sizeMB < 10) {
    confidence = 'medium'; // Moderate variance
  } else {
    confidence = 'low'; // Large binaries have high variance due to complexity
  }

  return {
    importMs,
    analysisMs,
    totalMs: importMs + analysisMs,
    confidence,
  };
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "30 seconds", "2.5 minutes", "1.2 hours")
 *
 * @example
 * ```typescript
 * formatDuration(45); // "45 seconds"
 * formatDuration(90); // "1.5 minutes"
 * formatDuration(3720); // "1.0 hours"
 * ```
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  } else if (seconds < 3600) {
    const minutes = (seconds / 60).toFixed(1);
    return `${minutes} minutes`;
  } else {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours} hours`;
  }
}
