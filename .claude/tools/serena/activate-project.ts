/**
 * Serena activate_project wrapper
 *
 * Activates a project by name or path.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { validateNoPathTraversal, validateNoControlChars } from '../config/lib/sanitize.js';

const InputSchema = z.object({
  /** Project name or path to activate */
  project: z
    .string()
    .min(1, 'project cannot be empty')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoControlChars, 'Invalid characters in project'),

  /** Semantic context for module routing in super-repos */
  semanticContext: z.string().optional(),
});

interface ActivateProjectResult {
  success: boolean;
  project: string;
  message: string;
}

export const activateProject = {
  name: 'serena.activate_project',
  description: 'Activates a project by name or path',
  inputSchema: InputSchema,

  async execute(input: z.infer<typeof InputSchema>): Promise<ActivateProjectResult> {
    const validated = InputSchema.parse(input);

    const response = await callMCPTool<string>('serena', 'activate_project', {
      project: validated.project,
    }, {
      semanticContext: validated.semanticContext,
    });

    return {
      success: true,
      project: validated.project,
      message: typeof response === 'string' ? response : 'Project activated',
    };
  },
};

export default activateProject;
