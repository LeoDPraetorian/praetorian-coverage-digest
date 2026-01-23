/**
 * JADX MCP Wrapper: fetch-current-class
 *
 * Pattern: simple_fetch (no input parameters)
 * Purpose: Fetches the currently selected class and its decompiled code from JADX GUI
 * Security: LOW (no user input parameters)
 *
 * Token optimization: Truncates content to 500 chars (88-98% reduction)
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';
import { JadxTruncationLimits } from './shared-utils.js';
import { truncateWithIndicator } from '../config/lib/response-utils.js';
import { JadxWrapperError } from './errors.js';

// ============================================================================
// Input Schema
// ============================================================================

/**
 * Input schema for fetch-current-class (no parameters)
 */
const InputSchema = z.object({}).strict();

export type FetchCurrentClassInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

/**
 * Response structure for fetch-current-class
 */
export interface FetchCurrentClassOutput {
  /** Full class name (package + class) */
  name: string;
  /** Content type (always "code/java") */
  type: string;
  /** Decompiled Java source code (truncated to 500 chars) */
  content: string;
  /** Whether content was truncated */
  contentTruncated: boolean;
  /** Estimated token count for LLM context awareness */
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

/**
 * Filter and transform raw MCP response
 */
function filterResponse(rawData: unknown): FetchCurrentClassOutput {
  const raw = validateObjectResponse(rawData, 'fetch-current-class');

  const name = raw.name ?? '';
  const type = raw.type ?? 'code/java';
  const rawContent = raw.content ?? '';

  // Check if no class is selected (empty name or null content)
  if (!name || rawContent === null) {
    throw new JadxWrapperError(
      { type: 'not_found', message: 'No class currently selected in JADX GUI', retryable: false },
      'fetch-current-class'
    );
  }

  // Truncate content to CODE_PREVIEW limit (500 chars)
  const content = truncateWithIndicator(rawContent, JadxTruncationLimits.CODE_PREVIEW) ?? '';
  const contentTruncated = rawContent.length > JadxTruncationLimits.CODE_PREVIEW;

  return addTokenEstimation({
    name,
    type,
    content,
    contentTruncated,
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const fetchCurrentClass = {
  name: 'jadx.fetch-current-class',
  description: 'Fetches the currently selected class and its decompiled code from JADX GUI. Content truncated to 500 chars.',
  inputSchema: InputSchema,

  async execute(input: FetchCurrentClassInput): Promise<FetchCurrentClassOutput> {
    // Validate input (empty object)
    InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'fetch_current_class', {});
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'fetch-current-class');
    }
  },
};

export default fetchCurrentClass;
