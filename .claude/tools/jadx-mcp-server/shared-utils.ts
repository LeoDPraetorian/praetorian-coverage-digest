/**
 * JADX-specific shared utilities and constants
 *
 * Truncation limits and helpers specific to JADX MCP wrappers.
 */

/**
 * JADX-specific truncation limits for token optimization
 * Based on architecture-shared.md Section 1.1
 */
export const JadxTruncationLimits = {
  CODE_PREVIEW: 500,      // Truncated code in simple_fetch
  CODE_FULL: 3000,        // Full code when explicitly requested
  MANIFEST_EXCERPT: 1000, // AndroidManifest.xml excerpt
  SMALI_PREVIEW: 500,     // Smali bytecode preview (aggressive - Smali is very verbose)
  RESOURCE_PREVIEW: 500,  // Resource file content
  LIST_CODE_ITEM: 300,    // Code per class in paginated_list_code
} as const;

/**
 * Warning threshold for large text selections
 * Used in get-selected-text to warn about context consumption
 */
export const LARGE_SELECTION_THRESHOLD = 5000;
