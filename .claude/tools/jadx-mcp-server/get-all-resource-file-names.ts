/**
 * JADX MCP Wrapper: get-all-resource-file-names
 *
 * Pattern: simple_fetch (array variant)
 * Purpose: Lists all resource file names in the APK
 * Security: LOW (no user input parameters)
 *
 * Token optimization: Truncates list to 100 items for large APKs
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';
import { JadxWrapperError } from './errors.js';

// ============================================================================
// Constants
// ============================================================================

const MAX_RESOURCE_FILES = 100; // Truncate large lists for token efficiency

// ============================================================================
// Input Schema
// ============================================================================

/**
 * Input schema for get-all-resource-file-names (no parameters)
 */
const InputSchema = z.object({}).strict();

export type GetAllResourceFileNamesInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interface
// ============================================================================

/**
 * Response structure for get-all-resource-file-names
 */
export interface GetAllResourceFileNamesOutput {
  /** Array of resource file paths */
  resourceFiles: string[];
  /** Total count of resources (before truncation) */
  totalCount: number;
  /** Whether the list was truncated */
  resourceFilesTruncated: boolean;
  /** Estimated token count for LLM context awareness */
  estimatedTokens: number;
}

// ============================================================================
// Response Filtering
// ============================================================================

/**
 * Filter and transform raw MCP response
 */
function filterResponse(rawData: unknown): GetAllResourceFileNamesOutput {
  const raw = validateObjectResponse(rawData, 'get-all-resource-file-names');

  // Validate result field exists and is an array
  if (!('result' in raw) || !Array.isArray(raw.result)) {
    throw new JadxWrapperError(
      {
        type: 'operation',
        message: 'Invalid response format: expected result array',
        retryable: false,
      },
      'get-all-resource-file-names'
    );
  }

  const allFiles = raw.result as string[];
  const totalCount = allFiles.length;

  // Truncate to MAX_RESOURCE_FILES if needed (token optimization)
  const resourceFiles = allFiles.slice(0, MAX_RESOURCE_FILES);
  const resourceFilesTruncated = totalCount > MAX_RESOURCE_FILES;

  return addTokenEstimation({
    resourceFiles,
    totalCount,
    resourceFilesTruncated,
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getAllResourceFileNames = {
  name: 'jadx.get-all-resource-file-names',
  description: 'Lists all resource file names in the APK. Truncates to 100 items for large apps.',
  inputSchema: InputSchema,

  async execute(input: GetAllResourceFileNamesInput): Promise<GetAllResourceFileNamesOutput> {
    // Validate input (empty object)
    InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_all_resource_file_names', {});
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'get-all-resource-file-names');
    }
  },
};

export default getAllResourceFileNames;
