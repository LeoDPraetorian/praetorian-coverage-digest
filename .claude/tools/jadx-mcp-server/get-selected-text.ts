/**
 * JADX MCP Wrapper: get-selected-text
 *
 * Pattern: simple_fetch (no input parameters)
 * Purpose: Fetches the currently selected text in JADX GUI
 * Security: LOW (no user input parameters)
 *
 * This tool returns selected text without truncation, with warnings for large selections.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';
import { LARGE_SELECTION_THRESHOLD } from './shared-utils.js';

// ============================================================================
// Input Schema
// ============================================================================

/**
 * Input schema for get-selected-text (no parameters)
 */
const InputSchema = z.object({}).strict();

export type GetSelectedTextInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

/**
 * Response structure for get-selected-text
 */
export interface GetSelectedTextOutput {
  /** Selected text from JADX GUI */
  text: string;
  /** Whether any text is selected */
  hasSelection: boolean;
  /** Character count of selected text */
  charCount: number;
  /** Estimated token count for LLM context awareness */
  estimatedTokens: number;
  /** Warning message for large selections */
  warning?: string;
}

// ============================================================================
// Response Filtering
// ============================================================================

/**
 * Filter and transform raw MCP response
 */
function filterResponse(rawData: unknown): GetSelectedTextOutput {
  const raw = validateObjectResponse(rawData, 'get-selected-text');

  const text = raw.text ?? '';
  const charCount = text.length;
  const hasSelection = charCount > 0;

  // Add warning for large selections
  const warning = charCount > LARGE_SELECTION_THRESHOLD
    ? 'Large selection may consume significant context.'
    : undefined;

  return addTokenEstimation({
    text,
    hasSelection,
    charCount,
    ...(warning && { warning }),
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getSelectedText = {
  name: 'jadx.get-selected-text',
  description: 'Fetches the currently selected text in JADX GUI. Returns full text without truncation.',
  inputSchema: InputSchema,

  async execute(input: GetSelectedTextInput): Promise<GetSelectedTextOutput> {
    // Validate input (empty object)
    InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_selected_text', {});
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'get-selected-text');
    }
  },
};

export default getSelectedText;
