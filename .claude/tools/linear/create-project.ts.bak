/**
 * create_project - Linear MCP Wrapper
 *
 * Create a new project in Linear via MCP server
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (creation response)
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - name: string (required) - Project name
 * - description: string (optional) - Full project description (Markdown)
 * - summary: string (optional) - Concise plaintext summary (max 255 chars)
 * - team: string (required) - Team name or ID
 * - lead: string (optional) - User ID, name, email, or "me"
 * - state: string (optional) - State of the project
 * - startDate: string (optional) - Start date (ISO format)
 * - targetDate: string (optional) - Target date (ISO format)
 * - priority: number (optional) - 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
 * - labels: array (optional) - Label names or IDs
 *
 * OUTPUT (after filtering):
 * - success: boolean - Whether creation succeeded
 * - project: object - Created project details
 *   - id: string - Project UUID
 *   - name: string - Project display name
 *   - url: string - Linear URL for the project
 *
 * Edge cases discovered:
 * - MCP returns { success: true, project: {...} } on success
 * - Team must exist or error is thrown
 * - Lead can be "me" to assign current user
 *
 * @example
 * ```typescript
 * // Create simple project
 * await createProject.execute({ name: 'Q2 2025 Auth Overhaul', team: 'Engineering' });
 *
 * // Create with full details
 * await createProject.execute({
 *   name: 'Q3 2025 Performance Improvements',
 *   description: 'Detailed project description...',
 *   team: 'Engineering',
 *   lead: 'me',
 *   startDate: '2025-07-01',
 *   targetDate: '2025-09-30',
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
 * Maps to create_project params
 */
export const createProjectParams = z.object({
  // User content - control chars only
  name: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .describe('Project name'),
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
  team: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Team name or ID'),
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

export type CreateProjectInput = z.infer<typeof createProjectParams>;

/**
 * Output schema - minimal essential fields
 */
export const createProjectOutput = z.object({
  success: z.boolean(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string()
  })
});

export type CreateProjectOutput = z.infer<typeof createProjectOutput>;

/**
 * Create a new project in Linear using MCP wrapper
 *
 * @example
 * ```typescript
 * import { createProject } from './.claude/tools/linear';
 *
 * // Create simple project
 * const result = await createProject.execute({
 *   name: 'Q2 2025 Auth Overhaul',
 *   team: 'Engineering'
 * });
 *
 * // Create with full details
 * const result2 = await createProject.execute({
 *   name: 'Q3 2025 Performance Improvements',
 *   description: 'Detailed project description...',
 *   team: 'Engineering',
 *   lead: 'me',
 *   startDate: '2025-07-01',
 *   targetDate: '2025-09-30',
 *   priority: 1
 * });
 * ```
 */
export const createProject = {
  name: 'linear.create_project',
  description: 'Create a new project in Linear',
  parameters: createProjectParams,

  async execute(input: CreateProjectInput): Promise<CreateProjectOutput> {
    // Validate input
    const validated = createProjectParams.parse(input);

    // Call MCP tool
    const rawData = await callMCPTool(
      'linear',
      'create_project',
      validated
    );

    if (!rawData?.success) {
      throw new Error('Failed to create project');
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
    return createProjectOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
