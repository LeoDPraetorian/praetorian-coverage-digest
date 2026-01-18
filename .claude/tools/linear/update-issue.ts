/**
 * update_issue - Linear GraphQL Wrapper
 *
 * Update an existing issue in Linear via GraphQL API
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (update response)
 * - vs MCP: Consistent behavior, no server dependency
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with Praetorian workspace):
 *
 * INPUT FIELDS:
 * - id: string (required) - Issue ID or identifier (e.g., ENG-1234 or UUID)
 * - title: string (optional) - New title for the issue
 * - description: string (optional) - New description in Markdown
 * - assignee: string (optional) - User ID, name, email, or "me"
 * - state: string (optional) - State type, name, or ID
 * - priority: number (optional) - 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
 * - project: string | null (optional) - Project name or ID (set to null to remove from project)
 * - labels: string[] (optional) - Label names or IDs
 * - dueDate: string (optional) - Due date in ISO format
 * - parentId: string (optional) - Parent issue ID for sub-issues
 * - cycle: string (optional) - Cycle (sprint) ID to assign issue to
 *
 * OUTPUT (after filtering):
 * - id: string - Linear internal UUID
 * - identifier: string - Human-readable ID (e.g., ENG-1234)
 * - title: string - Issue title (updated or original)
 * - url: string - Direct link to the issue
 * - estimatedTokens: number - Token usage estimate
 *
 * Edge cases discovered:
 * - GraphQL returns {success, issue} structure via issueUpdate mutation
 * - Issue ID can be identifier (ENG-1234) or UUID
 * - Assignee "me" resolves to authenticated user (mapped to assigneeId)
 * - Only provided fields are updated; omitted fields remain unchanged
 * - Invalid issue ID returns descriptive error from Linear API
 * - Field names must be mapped (assignee → assigneeId, state → stateId, etc.)
 *
 * @example
 * ```typescript
 * // Update assignee
 * await updateIssue.execute({
 *   id: 'ENG-1366',
 *   assignee: 'me'
 * });
 *
 * // Update state and priority
 * await updateIssue.execute({
 *   id: 'ENG-1366',
 *   state: 'In Progress',
 *   priority: 1
 * });
 *
 * // Remove issue from project
 * await updateIssue.execute({
 *   id: 'ENG-1366',
 *   project: null
 * });
 * ```
 */

import { z } from 'zod';
import { createLinearClient } from './client.js';
import { executeGraphQL } from './graphql-helpers.js';
import {
  validateNoControlChars,
  validateNoControlCharsAllowWhitespace,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { HTTPPort } from '../config/lib/http-client.js';
import { resolveStateId, resolveAssigneeId, resolveProjectId } from './lib/resolve-ids.js';

/**
 * GraphQL query to fetch issue team (needed for state resolution)
 */
const GET_ISSUE_TEAM_QUERY = `
  query IssueTeam($id: String!) {
    issue(id: $id) {
      team {
        id
      }
    }
  }
`;

/**
 * GraphQL mutation for updating an issue
 */
const UPDATE_ISSUE_MUTATION = `
  mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        identifier
        title
        url
      }
    }
  }
`;

/**
 * Input validation schema
 * Maps to update_issue params
 */
export const updateIssueParams = z.object({
  // ID field - full validation for identifier references
  id: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID or identifier'),
  // Title and description are user content - only block control chars
  title: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('New title'),
  description: z.string()
    .refine(validateNoControlCharsAllowWhitespace, 'Dangerous control characters not allowed')
    .optional()
    .describe('New description (Markdown)'),
  // Reference fields - full validation
  assignee: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('User ID, name, email, or "me"'),
  state: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('State type, name, or ID'),
  priority: z.number().min(0).max(4).optional().describe('0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low'),
  project: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .nullable()
    .optional()
    .describe('Project name or ID (set to null to remove issue from project)'),
  labels: z.array(z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
  ).optional().describe('Label names or IDs'),
  dueDate: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .optional()
    .describe('Due date (ISO format)'),
  parentId: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Parent issue ID for sub-issues'),
  cycle: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Cycle (sprint) ID to assign issue to')
});

export type UpdateIssueInput = z.infer<typeof updateIssueParams>;

/**
 * Output schema - minimal essential fields
 * Returns flattened structure (no nested issue wrapper)
 */
export const updateIssueOutput = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  url: z.string(),
  estimatedTokens: z.number()
});

export type UpdateIssueOutput = z.infer<typeof updateIssueOutput>;

/**
 * GraphQL response types
 */
interface IssueTeamResponse {
  issue: {
    team: {
      id: string;
    };
  };
}

interface IssueUpdateResponse {
  issueUpdate: {
    success: boolean;
    issue?: {
      id: string;
      identifier: string;
      title: string;
      url: string;
    };
  };
}

/**
 * Update an existing issue in Linear using GraphQL API
 *
 * @example
 * ```typescript
 * import { updateIssue } from './.claude/tools/linear';
 *
 * // Update assignee
 * const result = await updateIssue.execute({
 *   id: 'ENG-1366',
 *   assignee: 'me'
 * });
 *
 * // Update state and priority
 * const result2 = await updateIssue.execute({
 *   id: 'ENG-1366',
 *   state: 'In Progress',
 *   priority: 1
 * });
 * ```
 */
export const updateIssue = {
  name: 'linear.update_issue',
  description: 'Update an existing issue in Linear',
  parameters: updateIssueParams,

  async execute(
    input: UpdateIssueInput,
    testToken?: string
  ): Promise<UpdateIssueOutput> {
    // Validate input
    const validated = updateIssueParams.parse(input);

    // Extract id from input
    const { id, ...updateFields } = validated;

    // Create client (with optional test token)
    const client = await createLinearClient(testToken);

    // Fetch issue team if state resolution is needed
    let teamId: string | undefined;
    if (updateFields.state) {
      const teamResponse = await executeGraphQL<IssueTeamResponse>(
        client,
        GET_ISSUE_TEAM_QUERY,
        { id }
      );
      teamId = teamResponse.issue.team.id;
    }

    // Build GraphQL input - map field names to Linear API format
    const mutationInput: {
      title?: string;
      description?: string;
      assigneeId?: string;
      stateId?: string;
      priority?: number;
      projectId?: string | null;
      labelIds?: string[];
      dueDate?: string;
      parentId?: string;
      cycleId?: string;
    } = {};

    // Add optional fields if present
    if (updateFields.title) {
      mutationInput.title = updateFields.title;
    }
    if (updateFields.description) {
      mutationInput.description = updateFields.description;
    }
    if (updateFields.assignee) {
      // Resolve assignee name/email/"me" to UUID
      mutationInput.assigneeId = await resolveAssigneeId(client, updateFields.assignee);
    }
    if (updateFields.state && teamId) {
      // Resolve state name to UUID (requires teamId)
      mutationInput.stateId = await resolveStateId(client, teamId, updateFields.state);
    }
    if (updateFields.priority !== undefined) {
      mutationInput.priority = updateFields.priority;
    }
    if (updateFields.project !== undefined) {
      if (updateFields.project === null) {
        // Explicitly remove issue from project
        mutationInput.projectId = null;
      } else {
        // Resolve project name to UUID
        mutationInput.projectId = await resolveProjectId(client, updateFields.project);
      }
    }
    if (updateFields.labels) {
      mutationInput.labelIds = updateFields.labels; // labels → labelIds
    }
    if (updateFields.dueDate) {
      mutationInput.dueDate = updateFields.dueDate;
    }
    if (updateFields.parentId) {
      mutationInput.parentId = updateFields.parentId;
    }
    if (updateFields.cycle) {
      mutationInput.cycleId = updateFields.cycle; // cycle → cycleId
    }

    // Execute GraphQL mutation
    const response = await executeGraphQL<IssueUpdateResponse>(
      client,
      UPDATE_ISSUE_MUTATION,
      { id, input: mutationInput }
    );

    if (!response.issueUpdate?.success || !response.issueUpdate?.issue) {
      throw new Error('Failed to update issue');
    }

    // Filter to essential fields (flattened structure)
    const baseData = {
      id: response.issueUpdate.issue.id,
      identifier: response.issueUpdate.issue.identifier,
      title: response.issueUpdate.issue.title,
      url: response.issueUpdate.issue.url
    };

    const filtered = {
      ...baseData,
      estimatedTokens: estimateTokens(baseData)
    };

    // Validate output
    return updateIssueOutput.parse(filtered);
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '99%'
  }
};
