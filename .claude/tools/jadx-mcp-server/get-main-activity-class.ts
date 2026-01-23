/**
 * JADX MCP Wrapper: get-main-activity-class
 *
 * Pattern: simple_fetch (no input parameters)
 * Purpose: Retrieves the main activity class and its decompiled code
 * Security: LOW (no user input parameters)
 *
 * Token optimization: Truncates code to 500 chars (88-98% reduction)
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
 * Input schema for get-main-activity-class (no parameters)
 */
const InputSchema = z.object({}).strict();

export type GetMainActivityClassInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

/**
 * Response structure for get-main-activity-class
 */
export interface GetMainActivityClassOutput {
  /** Full class name (package + class) */
  className: string;
  /** Decompiled Java source code (truncated to 500 chars) */
  code: string;
  /** Whether code was truncated */
  codeTruncated: boolean;
  /** Estimated token count for LLM context awareness */
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

/**
 * Filter and transform raw MCP response
 */
function filterResponse(rawData: unknown): GetMainActivityClassOutput {
  const raw = validateObjectResponse(rawData, 'get-main-activity-class');

  const className = raw.className ?? '';
  const rawCode = raw.code ?? '';

  // Check if no APK is loaded (empty className or null code)
  if (!className && rawCode === null) {
    throw new JadxWrapperError(
      { type: 'not_found', message: 'No APK project loaded in JADX', retryable: false },
      'get-main-activity-class'
    );
  }

  // Truncate code to CODE_PREVIEW limit (500 chars)
  const code = truncateWithIndicator(rawCode, JadxTruncationLimits.CODE_PREVIEW) ?? '';
  const codeTruncated = rawCode.length > JadxTruncationLimits.CODE_PREVIEW;

  return addTokenEstimation({
    className,
    code,
    codeTruncated,
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getMainActivityClass = {
  name: 'jadx.get-main-activity-class',
  description: 'Retrieves the main activity class and its decompiled code. Code truncated to 500 chars.',
  inputSchema: InputSchema,

  async execute(input: GetMainActivityClassInput): Promise<GetMainActivityClassOutput> {
    // Validate input (empty object)
    InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_main_activity_class', {});
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'get-main-activity-class');
    }
  },
};

export default getMainActivityClass;
