/**
 * resolve-ids - ID Resolution Layer for Linear GraphQL Wrappers
 *
 * Converts human-readable values (state names, "me", user names/emails)
 * to UUIDs required by Linear GraphQL API.
 *
 * Problem: Linear GraphQL requires UUIDs for reference fields (stateId, assigneeId, etc.)
 *          but users pass human-readable names ("Done", "me", "john@example.com")
 *
 * Solution: Resolution layer that queries Linear API to convert names → UUIDs
 *
 * @example
 * ```typescript
 * // Resolve state name to UUID
 * const stateId = await resolveStateId(client, teamId, 'Done');
 *
 * // Resolve "me" to current user UUID
 * const assigneeId = await resolveAssigneeId(client, 'me');
 *
 * // Resolve email to user UUID
 * const userId = await resolveAssigneeId(client, 'john@example.com');
 * ```
 */

import { executeGraphQL } from '../graphql-helpers.js';
import type { HTTPPort } from '../../config/lib/http-client.js';

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if string is a valid UUID
 */
export function isUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

/**
 * GraphQL query to fetch workflow states for a team
 */
const WORKFLOW_STATES_QUERY = `
  query WorkflowStates($teamId: ID!) {
    workflowStates(filter: { team: { id: { eq: $teamId } } }) {
      nodes {
        id
        name
        type
      }
    }
  }
`;

/**
 * GraphQL query to fetch current viewer (authenticated user)
 */
const VIEWER_QUERY = `
  query Viewer {
    viewer {
      id
    }
  }
`;

/**
 * GraphQL query to fetch projects for resolution (minimal fields)
 */
const PROJECTS_FOR_RESOLUTION_QUERY = `
  query ProjectsForResolution {
    projects(first: 250, includeArchived: false) {
      nodes {
        id
        name
      }
    }
  }
`;

/**
 * GraphQL response types
 */
interface WorkflowStatesResponse {
  workflowStates: {
    nodes: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  };
}

interface ViewerResponse {
  viewer: {
    id: string;
  };
}

interface UsersResponse {
  users: {
    nodes: Array<{
      id: string;
      name: string;
      email: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      active?: boolean | null;
      admin?: boolean | null;
      createdAt?: string | null;
    }>;
  };
}

interface ProjectsForResolutionResponse {
  projects: {
    nodes: Array<{
      id: string;
      name: string;
    }>;
  };
}

interface TeamsResponse {
  teams: {
    nodes: Array<{
      id: string;
      name: string;
      key?: string | null;
    }>;
  };
}

/**
 * GraphQL query to fetch teams for resolution
 */
const TEAMS_QUERY = `
  query TeamsForResolution {
    teams(first: 250) {
      nodes {
        id
        name
        key
      }
    }
  }
`;

/**
 * Resolve team name to team UUID
 *
 * @param client - GraphQL client
 * @param teamNameOrId - Team name or UUID
 * @returns Team UUID
 * @throws Error if team not found, includes available teams
 *
 * @example
 * ```typescript
 * // Resolve by name
 * const teamId = await resolveTeamId(client, 'Engineering');
 *
 * // UUID pass-through
 * const teamId = await resolveTeamId(client, '550e8400-...');
 * ```
 */
export async function resolveTeamId(
  client: HTTPPort,
  teamNameOrId: string
): Promise<string> {
  // If already a UUID, return as-is
  if (isUUID(teamNameOrId)) {
    return teamNameOrId;
  }

  // Query all teams
  const response = await executeGraphQL<TeamsResponse>(
    client,
    TEAMS_QUERY,
    {}
  );

  const teams = response.teams?.nodes || [];

  // Find matching team (case-insensitive)
  const team = teams.find(
    (t) => t.name.toLowerCase() === teamNameOrId.toLowerCase()
  );

  if (!team) {
    const availableTeams = teams.map(t => t.name).join(', ');
    throw new Error(
      `Team not found: ${teamNameOrId}\n\n` +
      `Available teams: ${availableTeams || '(none)'}\n\n` +
      `Tip: Team names are case-insensitive but must match exactly.`
    );
  }

  return team.id;
}

/**
 * Resolve state name (e.g., "Done", "In Progress") to state UUID
 *
 * @param client - GraphQL client
 * @param teamId - Team UUID (required for workflow state query)
 * @param stateNameOrId - State name, type, or UUID
 * @returns State UUID
 * @throws Error if state not found
 *
 * @example
 * ```typescript
 * // Resolve by name
 * const stateId = await resolveStateId(client, teamId, 'Done');
 *
 * // Resolve by type
 * const stateId = await resolveStateId(client, teamId, 'completed');
 *
 * // UUID pass-through
 * const stateId = await resolveStateId(client, teamId, '550e8400-...');
 * ```
 */
export async function resolveStateId(
  client: HTTPPort,
  teamId: string,
  stateNameOrId: string
): Promise<string> {
  // If already a UUID, return as-is
  if (isUUID(stateNameOrId)) {
    return stateNameOrId;
  }

  // Query workflow states for the team
  const response = await executeGraphQL<WorkflowStatesResponse>(
    client,
    WORKFLOW_STATES_QUERY,
    { teamId }
  );

  // Find matching state by name or type (case-insensitive)
  const state = response.workflowStates.nodes.find(
    (s) =>
      s.name.toLowerCase() === stateNameOrId.toLowerCase() ||
      s.type.toLowerCase() === stateNameOrId.toLowerCase()
  );

  if (!state) {
    throw new Error(`State not found: ${stateNameOrId}`);
  }

  return state.id;
}

/**
 * Resolve assignee ("me", email, name) to user UUID
 *
 * @param client - GraphQL client
 * @param assigneeNameOrId - "me", email, name, or UUID
 * @returns User UUID
 * @throws Error if user not found
 *
 * @example
 * ```typescript
 * // Resolve "me"
 * const userId = await resolveAssigneeId(client, 'me');
 *
 * // Resolve by email
 * const userId = await resolveAssigneeId(client, 'john@example.com');
 *
 * // UUID pass-through
 * const userId = await resolveAssigneeId(client, '550e8400-...');
 * ```
 */
export async function resolveAssigneeId(
  client: HTTPPort,
  assigneeNameOrId: string
): Promise<string> {
  // Handle "me" special case (case-insensitive)
  if (assigneeNameOrId.toLowerCase() === 'me') {
    const viewer = await executeGraphQL<ViewerResponse>(client, VIEWER_QUERY, {});
    return viewer.viewer.id;
  }

  // If already a UUID, return as-is
  if (isUUID(assigneeNameOrId)) {
    return assigneeNameOrId;
  }

  // Use users query to resolve name/email to UUID
  // Note: We inline the findUser logic here to avoid circular dependency
  // and to maintain consistency with the resolution pattern
  const FIND_USER_QUERY = `
    query Users($filter: UserFilter) {
      users(filter: $filter, first: 1) {
        nodes {
          id
          name
          email
          displayName
          avatarUrl
          active
          admin
          createdAt
        }
      }
    }
  `;

  const response = await executeGraphQL<UsersResponse>(
    client,
    FIND_USER_QUERY,
    {
      filter: {
        or: [
          { email: { containsIgnoreCase: assigneeNameOrId } },
          { name: { containsIgnoreCase: assigneeNameOrId } },
          { displayName: { containsIgnoreCase: assigneeNameOrId } }
        ]
      }
    }
  );

  const users = response.users?.nodes || [];

  if (users.length === 0) {
    throw new Error(`User not found: ${assigneeNameOrId}`);
  }

  return users[0].id;
}

/**
 * Resolve project name to project UUID
 *
 * @param client - GraphQL client
 * @param projectNameOrId - Project name or UUID
 * @returns Project UUID
 * @throws Error if project not found
 *
 * @example
 * ```typescript
 * // Resolve by name
 * const projectId = await resolveProjectId(client, 'Internal Attack Capabilities');
 *
 * // UUID pass-through
 * const projectId = await resolveProjectId(client, '550e8400-...');
 * ```
 */
export async function resolveProjectId(
  client: HTTPPort,
  projectNameOrId: string
): Promise<string> {
  // If already a UUID, return as-is
  if (isUUID(projectNameOrId)) {
    return projectNameOrId;
  }

  // Query all active projects
  const response = await executeGraphQL<ProjectsForResolutionResponse>(
    client,
    PROJECTS_FOR_RESOLUTION_QUERY,
    {}
  );

  // Find matching project by name (case-insensitive, exact match)
  const project = response.projects.nodes.find(
    (p) => p.name.toLowerCase() === projectNameOrId.toLowerCase()
  );

  if (!project) {
    throw new Error(`Project not found: ${projectNameOrId}`);
  }

  return project.id;
}
