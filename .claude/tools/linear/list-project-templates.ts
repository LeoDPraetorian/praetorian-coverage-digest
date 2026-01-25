/**
 * list_project_templates - Linear GraphQL Wrapper
 *
 * List project templates from Linear workspace via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (template list, filtered)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * IMPORTANT: Linear API uses 'templates' field (NOT 'projectTemplates')
 * Returns direct array (NOT paginated with nodes/pageInfo)
 *
 * INPUT FIELDS:
 * - type: enum (optional) - Filter by template type: 'project' (default), 'issue', or 'all'
 * - limit: number (optional) - Max templates to return (1-250, default 50, client-side limit)
 * - fullDescription: boolean (optional) - Return full description without truncation
 * - includeContent: boolean (optional) - Include parsed template content with all fields
 * - projectId: string (optional) - Filter templates by associated project ID
 *
 * OUTPUT (after filtering):
 * - templates: array of template objects
 *   - id: string - Template UUID
 *   - name: string - Template display name
 *   - description: string (optional) - Template description (truncated to 200 chars by default)
 *   - type: string - Template type ('project' or 'issue')
 *   - projectId: string (optional) - Associated project ID from templateData
 *   - teamId: string (optional) - Associated team ID from templateData
 *   - content: object (optional) - Parsed template content (only when includeContent: true)
 *     - title: string (optional)
 *     - descriptionData: object (optional) - ProseMirror format
 *     - descriptionText: string (optional) - Plain text
 *     - stateId: string (optional)
 *     - statusId: string (optional)
 *     - priority: number (optional)
 *     - labelIds: string[] (optional)
 *     - initiativeIds: string[] (optional)
 *     - memberIds: string[] (optional)
 *     - teamIds: string[] (optional)
 *     - projectMilestones: array (optional)
 *     - initialIssues: array (optional)
 *   - createdAt: string (optional) - ISO timestamp
 *   - updatedAt: string (optional) - ISO timestamp
 * - totalTemplates: number - Count of returned templates
 *
 * Edge cases discovered:
 * - API returns ALL templates (project + issue) - filtering is client-side
 * - No pagination support - API returns all templates at once
 * - Description truncated to 200 chars by default for token efficiency
 * - Empty templates returns empty array, not null
 *
 * @example
 * ```typescript
 * // List all project templates (default)
 * await listProjectTemplates.execute({});
 *
 * // List issue templates
 * await listProjectTemplates.execute({ type: 'issue' });
 *
 * // List all templates with full descriptions
 * await listProjectTemplates.execute({ type: 'all', fullDescription: true });
 *
 * // List templates with full content
 * await listProjectTemplates.execute({ type: 'issue', includeContent: true });
 *
 * // Limit results
 * await listProjectTemplates.execute({ limit: 10 });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { HTTPPort } from '../config/lib/http-client.js';
import { validateNoControlChars } from '../config/lib/sanitize.js';

/**
 * GraphQL query for listing templates
 * Note: The 'templates' field returns a direct array (not paginated)
 * Filtering by type is done client-side
 */
const LIST_TEMPLATES_QUERY = `
  query Templates {
    templates {
      id
      name
      description
      type
      templateData
      createdAt
      updatedAt
    }
  }
`;

/**
 * Input validation schema
 * Maps to list_project_templates params
 */
export const listProjectTemplatesParams = z.object({
  // Type filter - what kind of templates to return
  type: z.enum(['project', 'issue', 'all'])
    .default('project')
    .optional()
    .describe('Template type to filter: "project" (default), "issue", or "all"'),

  // Limit for client-side truncation (API returns all templates)
  limit: z.number()
    .min(1)
    .max(250)
    .default(50)
    .optional()
    .describe('Maximum templates to return (client-side limit)'),

  // Full description flag for token control
  fullDescription: z.boolean()
    .default(false)
    .optional()
    .describe('Return full description without truncation (default: false for token efficiency)'),

  // Include parsed template content
  includeContent: z.boolean()
    .default(false)
    .optional()
    .describe('Include parsed template content with all fields (default: false for token efficiency)'),

  // Project ID filter for template-project associations
  projectId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Filter templates by associated project ID from templateData')
});

export type ListProjectTemplatesInput = z.infer<typeof listProjectTemplatesParams>;

/**
 * Output schema - minimal essential fields
 */
export const listProjectTemplatesOutput = z.object({
  templates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string(),
    projectId: z.string().optional(),
    teamId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    content: z.object({
      title: z.string().optional(),
      descriptionData: z.unknown().optional(),
      descriptionText: z.string().optional(),
      stateId: z.string().optional(),
      statusId: z.string().optional(),
      priority: z.number().optional(),
      labelIds: z.array(z.string()).optional(),
      initiativeIds: z.array(z.string()).optional(),
      memberIds: z.array(z.string()).optional(),
      teamIds: z.array(z.string()).optional(),
      projectMilestones: z.array(z.unknown()).optional(),
      initialIssues: z.array(z.unknown()).optional()
    }).optional()
  })),
  totalTemplates: z.number(),
  estimatedTokens: z.number()
});

export type ListProjectTemplatesOutput = z.infer<typeof listProjectTemplatesOutput>;

/**
 * GraphQL response type
 * Note: templates returns a direct array, not paginated nodes
 */
interface TemplatesResponse {
  templates?: Array<{
    id: string;
    name: string;
    description?: string | null;
    type?: string | null;
    templateData?: unknown;
    createdAt?: string | null;
    updatedAt?: string | null;
  }> | null;
}

interface ParsedTemplateData {
  projectId?: string;
  teamId?: string;
  title?: string;
  descriptionData?: unknown;
  descriptionText?: string;
  stateId?: string;
  statusId?: string;
  priority?: number;
  labelIds?: string[];
  initiativeIds?: string[];
  memberIds?: string[];
  teamIds?: string[];
  projectMilestones?: unknown[];
  initialIssues?: unknown[];
  [key: string]: unknown;
}

/**
 * Parse templateData field which can be JSON string or object
 */
function parseTemplateData(raw: unknown): ParsedTemplateData | null {
  if (!raw) return null;

  // Handle JSON string
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ParsedTemplateData;
    } catch {
      return null;
    }
  }

  // Handle object
  if (typeof raw === 'object') {
    return raw as ParsedTemplateData;
  }

  return null;
}

/**
 * List project templates from Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { listProjectTemplates } from './.claude/tools/linear';
 *
 * // List all templates
 * const templates = await listProjectTemplates.execute({});
 *
 * // List with full descriptions
 * const fullTemplates = await listProjectTemplates.execute({ fullDescription: true });
 *
 * // List with full content
 * const fullContent = await listProjectTemplates.execute({ includeContent: true });
 *
 * // With test token
 * const templates2 = await listProjectTemplates.execute({}, 'Bearer test-token');
 * ```
 */
export const listProjectTemplates = {
  name: 'linear.list_project_templates',
  description: 'List project templates from Linear workspace',
  parameters: listProjectTemplatesParams,

  async execute(
    input: ListProjectTemplatesInput,
    testToken?: string
  ): Promise<ListProjectTemplatesOutput> {
    // Validate input
    const validated = listProjectTemplatesParams.parse(input);

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Execute GraphQL query (no variables - API doesn't support them)
    const response = await executeGraphQL<TemplatesResponse>(
      client,
      LIST_TEMPLATES_QUERY,
      {}
    );

    // Extract templates array (handle null/undefined)
    let templates = response.templates || [];

    // Apply type filter (client-side)
    const typeFilter = validated.type ?? 'project';
    if (typeFilter !== 'all') {
      templates = templates.filter(t => t.type === typeFilter);
    }

    // Parse templateData and extract projectId/teamId
    const templatesWithParsedData = templates.map(template => {
      const parsedData = parseTemplateData(template.templateData);
      return {
        ...template,
        projectId: parsedData?.projectId,
        teamId: parsedData?.teamId,
        parsedData  // Keep for later use
      };
    });

    // Apply projectId filter if specified
    const projectIdFilter = validated.projectId;
    const filteredTemplates = projectIdFilter
      ? templatesWithParsedData.filter(t => t.projectId === projectIdFilter)
      : templatesWithParsedData;

    // Apply client-side limit
    const limit = validated.limit ?? 50;
    const limitedTemplates = filteredTemplates.slice(0, limit);

    // Apply defaults
    const fullDescription = validated.fullDescription ?? false;
    const includeContent = validated.includeContent ?? false;

    // Filter to essential fields
    const baseData = {
      templates: limitedTemplates.map((template) => {
        const parsedData = template.parsedData;

        // Base template fields
        const templateObj: any = {
          id: template.id,
          name: template.name,
          description: fullDescription
            ? template.description || undefined
            : template.description?.substring(0, 200) || undefined,
          type: template.type || 'unknown',
          projectId: template.projectId || undefined,
          teamId: template.teamId || undefined,
          createdAt: template.createdAt || undefined,
          updatedAt: template.updatedAt || undefined
        };

        // Optionally include parsed content
        if (includeContent && parsedData) {
          templateObj.content = {
            title: parsedData.title,
            descriptionData: parsedData.descriptionData,
            descriptionText: parsedData.descriptionText,
            stateId: parsedData.stateId,
            statusId: parsedData.statusId,
            priority: parsedData.priority,
            labelIds: parsedData.labelIds,
            initiativeIds: parsedData.initiativeIds,
            memberIds: parsedData.memberIds,
            teamIds: parsedData.teamIds,
            projectMilestones: parsedData.projectMilestones,
            initialIssues: parsedData.initialIssues
          };
        }

        return templateObj;
      }),
      totalTemplates: limitedTemplates.length
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return listProjectTemplatesOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};
