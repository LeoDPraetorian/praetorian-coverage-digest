/**
 * get_template - Linear GraphQL Wrapper
 *
 * Get detailed information about a specific template via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~800 tokens (single template with content)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results:
 *
 * REQUIRED fields (100% presence):
 * - id: string
 * - name: string
 * - type: string ('project' | 'issue' | 'recurringIssue')
 *
 * OPTIONAL fields (<100% presence):
 * - description: string | null
 * - templateData: string | object - JSON string or object containing template content
 * - team: object | null - Associated team
 * - createdAt: string
 * - updatedAt: string
 *
 * templateData structure:
 * - title: string - Title prefix for issues/projects
 * - descriptionData: object - ProseMirror format rich text (template body)
 * - stateId: string (for issues) - Default state
 * - statusId: string (for projects) - Default status
 * - priority: number - Default priority
 * - projectId: string - Associated project
 * - teamId: string - Associated team
 * - For project templates: initiativeIds, memberIds, teamIds, projectMilestones, initialIssues, labelIds
 *
 * @example
 * ```typescript
 * // Get template by ID
 * await getTemplate.execute({ id: '0259235b-2bf0-459d-8b10-bd8039986239' });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { HTTPPort } from '../config/lib/http-client.js';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';

/**
 * GraphQL query for getting a template
 */
const GET_TEMPLATE_QUERY = `
  query Template($id: String!) {
    template(id: $id) {
      id
      name
      description
      type
      templateData
      team {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

/**
 * Input validation schema
 * Maps to get_template params
 *
 * Security: Uses individual validators for specific attack detection
 */
export const getTemplateParams = z.object({
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Template ID (UUID)')
});

export type GetTemplateInput = z.infer<typeof getTemplateParams>;

/**
 * Output schema - template with parsed content
 */
export const getTemplateOutput = z.object({
  // Required fields
  id: z.string(),
  name: z.string(),
  type: z.enum(['project', 'issue', 'recurringIssue']),

  // Optional fields
  description: z.string().optional(),

  // Parsed template content
  content: z.object({
    title: z.string().optional(),
    descriptionData: z.object({}).passthrough().optional(), // ProseMirror format
    descriptionText: z.string().optional(), // Plain text extraction
    stateId: z.string().optional(),
    statusId: z.string().optional(),
    priority: z.number().optional(),
    projectId: z.string().optional(),
    teamId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
  }),

  team: z.object({
    id: z.string(),
    name: z.string()
  }).optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
  estimatedTokens: z.number()
});

export type GetTemplateOutput = z.infer<typeof getTemplateOutput>;

/**
 * GraphQL response type
 */
interface TemplateResponse {
  template: {
    id: string;
    name: string;
    description?: string | null;
    type?: string | null;
    templateData?: unknown;
    team?: {
      id: string;
      name: string;
    } | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

/**
 * Parse templateData field which can be JSON string or object
 */
function parseTemplateData(raw: unknown): Record<string, unknown> {
  if (!raw) return {};

  // Handle JSON string
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  // Handle object
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }

  return {};
}

/**
 * Extract plain text from ProseMirror descriptionData
 */
function extractPlainText(descriptionData: unknown): string | undefined {
  if (!descriptionData || typeof descriptionData !== 'object') {
    return undefined;
  }

  const data = descriptionData as { content?: Array<{ content?: Array<{ text?: string }> }> };

  if (!data.content || !Array.isArray(data.content)) {
    return undefined;
  }

  const texts: string[] = [];

  for (const node of data.content) {
    if (node.content && Array.isArray(node.content)) {
      for (const textNode of node.content) {
        if (textNode.text) {
          texts.push(textNode.text);
        }
      }
    }
  }

  return texts.length > 0 ? texts.join('\n') : undefined;
}

/**
 * Get a Linear template by ID using GraphQL API
 *
 * @example
 * ```typescript
 * import { getTemplate } from './.claude/tools/linear';
 *
 * // Get template
 * const template = await getTemplate.execute({ id: '0259235b-2bf0-459d-8b10-bd8039986239' });
 *
 * console.log(template.name, template.type, template.content.title);
 * ```
 */
export const getTemplate = {
  name: 'linear.get_template',
  description: 'Get detailed information about a specific Linear template',
  parameters: getTemplateParams,

  async execute(
    input: GetTemplateInput,
    testClient?: HTTPPort | string
  ): Promise<GetTemplateOutput> {
    // Validate input
    const validated = getTemplateParams.parse(input);

    // Create client (with optional test client/token)
    const client = typeof testClient === 'string'
      ? await createLinearClient(testClient)
      : testClient || await createLinearClient();

    // Execute GraphQL query
    const response = await executeGraphQL<TemplateResponse>(
      client,
      GET_TEMPLATE_QUERY,
      { id: validated.id }
    );

    if (!response.template) {
      throw new Error(`Template not found: ${validated.id}`);
    }

    // Parse templateData
    const parsedData = parseTemplateData(response.template.templateData);

    // Extract plain text from descriptionData if present
    const descriptionText = parsedData.descriptionData
      ? extractPlainText(parsedData.descriptionData)
      : undefined;

    // Build content object
    const content = {
      title: typeof parsedData.title === 'string' ? parsedData.title : undefined,
      descriptionData: typeof parsedData.descriptionData === 'object' ? parsedData.descriptionData : undefined,
      descriptionText,
      stateId: typeof parsedData.stateId === 'string' ? parsedData.stateId : undefined,
      statusId: typeof parsedData.statusId === 'string' ? parsedData.statusId : undefined,
      priority: typeof parsedData.priority === 'number' ? parsedData.priority : undefined,
      projectId: typeof parsedData.projectId === 'string' ? parsedData.projectId : undefined,
      teamId: typeof parsedData.teamId === 'string' ? parsedData.teamId : undefined,
      labelIds: Array.isArray(parsedData.labelIds) ? parsedData.labelIds : undefined,
    };

    // Filter to essential fields
    const baseData = {
      id: response.template.id,
      name: response.template.name,
      type: (response.template.type || 'issue') as 'project' | 'issue' | 'recurringIssue',
      description: response.template.description || undefined,
      content,
      team: response.template.team ? {
        id: response.template.team.id,
        name: response.template.team.name
      } : undefined,
      createdAt: response.template.createdAt || '',
      updatedAt: response.template.updatedAt || ''
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return getTemplateOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 800,
    reduction: '99%'
  }
};
