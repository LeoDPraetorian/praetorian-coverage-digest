// .claude/tools/linear/list-labels.ts
/**
 * list_labels - Linear GraphQL Wrapper
 *
 * List issue labels from Linear workspace via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (filtered response)
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS (all optional):
 * - teamId: string - Filter by team UUID
 * - limit: number - Number of results (default 100)
 * - includeArchived: boolean - Include archived labels
 *
 * OUTPUT fields per label:
 * - id: string (required)
 * - name: string (required)
 * - description: string | null
 * - color: string (hex color)
 * - isGroup: boolean
 * - parentId: string | null
 *
 * @example
 * ```typescript
 * const labels = await listLabels.execute({});
 * const teamLabels = await listLabels.execute({ teamId: 'team-uuid' });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';

const LIST_LABELS_QUERY = `
  query IssueLabels($first: Int, $filter: IssueLabelFilter) {
    issueLabels(first: $first, filter: $filter) {
      nodes {
        id
        name
        description
        color
        isGroup
        parent { id }
        team { id }
      }
    }
  }
`;

export const listLabelsParams = z.object({
  teamId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Filter by team ID'),
  limit: z.number().min(1).max(250).optional().default(100).describe('Number of results'),
  includeArchived: z.boolean().default(false).optional()
});

export type ListLabelsInput = {
  limit?: number;
  teamId?: string;
  includeArchived?: boolean;
};

export const listLabelsOutput = z.object({
  labels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    color: z.string(),
    isGroup: z.boolean().optional(),
    parentId: z.string().optional(),
    teamId: z.string().optional()
  })),
  totalLabels: z.number(),
  estimatedTokens: z.number()
});

export type ListLabelsOutput = z.infer<typeof listLabelsOutput>;

interface IssueLabelsResponse {
  issueLabels: {
    nodes: Array<{
      id: string;
      name: string;
      description?: string | null;
      color: string;
      isGroup?: boolean;
      parent?: { id: string } | null;
      team?: { id: string } | null;
    }>;
  };
}

export const listLabels = {
  name: 'linear.list_labels',
  description: 'List issue labels from Linear',
  parameters: listLabelsParams,

  async execute(
    input: ListLabelsInput,
    testToken?: string
  ): Promise<ListLabelsOutput> {
    const validated = listLabelsParams.parse(input);
    const client = await createLinearClient(testToken);

    const filter: Record<string, unknown> = {};
    if (validated.teamId) {
      filter.team = { id: { eq: validated.teamId } };
    }

    const response = await executeGraphQL<IssueLabelsResponse>(
      client,
      LIST_LABELS_QUERY,
      { first: validated.limit, filter: Object.keys(filter).length ? filter : undefined }
    );

    const labels = response.issueLabels?.nodes || [];

    const baseData = {
      labels: labels.map(label => ({
        id: label.id,
        name: label.name,
        description: label.description || undefined,
        color: label.color,
        isGroup: label.isGroup,
        parentId: label.parent?.id,
        teamId: label.team?.id
      })),
      totalLabels: labels.length
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    return listLabelsOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
