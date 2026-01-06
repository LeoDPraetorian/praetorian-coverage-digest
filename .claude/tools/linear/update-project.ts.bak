/**
 * update_project - Linear MCP Wrapper
 *
 * Update an existing project in Linear via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (update response)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Project UUID to update
 * - name: string (optional) - New project name
 * - description: string (optional) - Full project description (Markdown)
 * - summary: string (optional) - Concise plaintext summary (max 255 chars)
 * - lead: string (optional) - User ID, name, email, or "me"
 * - state: string (optional) - State of the project
 * - startDate: string (optional) - Start date (ISO format)
 * - targetDate: string (optional) - Target date (ISO format)
 * - priority: number (optional) - 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
 * - labels: array (optional) - Label names or IDs
 *
 * OUTPUT (after filtering):
 * - success: boolean - Whether update succeeded
 * - project: object - Updated project details
 *   - id: string - Project UUID
 *   - name: string - Project display name
 *   - url: string - Linear URL for the project
 *
 * Edge cases discovered:
 * - MCP returns { success: true, project: {...} } on success
 * - Only provided fields are updated; omitted fields remain unchanged
 * - Project must exist or error is thrown
 *
 * @example
 * ```typescript
 * // Update target date
 * await updateProject.execute({ id: 'abc123...', targetDate: '2025-12-31' });
 *
 * // Update state and priority
 * await updateProject.execute({
 *   id: 'abc123...',
 *   state: 'In Progress',
 *   priority: 1
 * });
 * ```
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

/**
 * Input validation schema
 * Maps to update_project params
 */
export const updateProjectParams = z.object({
  // Reference field - full validation
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Project ID'),
  // User content - control chars only
  name: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('New name'),
  // User content - control chars only
  description: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Full project description (Markdown)'),
  // User content - control chars only
  summary: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Concise plaintext summary (max 255 chars)'),
  // Reference field - full validation
  lead: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('User ID, name, email, or "me"'),
  // Reference field - full validation
  state: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('State of the project'),
  // Date field - control chars only
  startDate: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Start date (ISO format)'),
  // Date field - control chars only
  targetDate: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Target date (ISO format)'),
  priority: z.number().min(0).max(4).optional().describe('0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low'),
  // Reference fields - full validation on each
  labels: z.array(z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
  ).optional().describe('Label names or IDs')
});

export type UpdateProjectInput = z.infer<typeof updateProjectParams>;

/**
 * Output schema - minimal essential fields
 */
export const updateProjectOutput = z.object({
  success: z.boolean(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string()
  })
});

export type UpdateProjectOutput = z.infer<typeof updateProjectOutput>;

/**
 * Update an existing project in Linear using MCP wrapper
 *
 * @example
 * ```typescript
 * import { updateProject } from './.claude/tools/linear';
 *
 * // Update target date
 * const result = await updateProject.execute({
 *   id: 'abc123...',
 *   targetDate: '2025-12-31'
 * });
 *
 * // Update state and priority
 * const result2 = await updateProject.execute({
 *   id: 'abc123...',
 *   state: 'In Progress',
 *   priority: 1
 * });
 * ```
 */
export const updateProject = {
  name: 'linear.update_project',
  description: 'Update an existing project in Linear',
  parameters: updateProjectParams,

  async execute(input: UpdateProjectInput): Promise<UpdateProjectOutput> {
    // Validate input
    const validated = updateProjectParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'update_project',
      validated
    );

    if (!rawData?.success) {
      throw new Error('Failed to update project');
    }

    // Filter to essential fields
    const filtered = {
      success: rawData.success,
      project: {
        id: rawData.project?.id,
        name: rawData.project?.name,
        url: rawData.project?.url
      }
    };

    // Validate output
    return updateProjectOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
