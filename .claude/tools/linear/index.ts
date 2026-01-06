/**
 * Linear MCP Wrappers
 *
 * Custom tools that wrap Linear MCP server for 99% token reduction.
 *
 * Architecture:
 * - Filesystem discovery (0 tokens at session start)
 * - MCP calls only when imported and used
 * - Shared MCP client for independent connections
 * - Token reduction: 46,000 → 0 at start, ~500-1000 when used
 *
 * Usage:
 * ```typescript
 * import { listIssues, getIssue, createIssue, findIssue } from './.claude/tools/linear';
 *
 * // List my issues
 * const myIssues = await listIssues.execute({ assignee: 'me' });
 *
 * // Get specific issue (exact ID required)
 * const issue = await getIssue.execute({ id: 'CHARIOT-1366' });
 *
 * // Smart find - handles partial IDs and searches with disambiguation
 * const result = await findIssue.execute({ query: '1366' });
 * // Returns: { status: 'found', issue: {...} }
 * // or: { status: 'disambiguation_needed', candidates: [...], hint: '...' }
 *
 * // Create new issue
 * const createResult = await createIssue.execute({
 *   title: 'Fix bug',
 *   team: 'Engineering'
 * });
 * ```
 */

// Issue operations
export { listIssues, type ListIssuesInput, type ListIssuesOutput } from './list-issues';
export { getIssue, type GetIssueInput, type GetIssueOutput } from './get-issue';
export { createIssue, type CreateIssueInput, type CreateIssueOutput } from './create-issue';
export { updateIssue, type UpdateIssueInput, type UpdateIssueOutput } from './update-issue';
export {
  findIssue,
  type FindIssueInput,
  type FindIssueOutput,
  type IssueCandidate,
  type DisambiguationResult,
  type FoundResult,
  type NotFoundResult
} from './find-issue';

// Project operations
export { listProjects, type ListProjectsInput, type ListProjectsOutput } from './list-projects';
export { getProject, type GetProjectInput, type GetProjectOutput } from './get-project';
export { createProject, type CreateProjectInput, type CreateProjectOutput } from './create-project';
export { updateProject, type UpdateProjectInput, type UpdateProjectOutput } from './update-project';

// Team operations
export { listTeams, type ListTeamsInput, type ListTeamsOutput } from './list-teams';
export { getTeam, type GetTeamInput, type GetTeamOutput } from './get-team';

// User operations
export { listUsers, type ListUsersInput, type ListUsersOutput } from './list-users';
export { findUser, type FindUserInput, type FindUserOutput } from './find-user';

// Comment operations
export { listComments, type ListCommentsInput, type ListCommentsOutput } from './list-comments';
export { createComment, type CreateCommentInput, type CreateCommentOutput } from './create-comment';

// Initiative operations
export { createInitiative, type CreateInitiativeInput, type CreateInitiativeOutput } from './create-initiative';
export { getInitiative, type GetInitiativeInput, type GetInitiativeOutput } from './get-initiative';
export { listInitiatives, type ListInitiativesInput, type ListInitiativesOutput } from './list-initiatives';
export { updateInitiative, type UpdateInitiativeInput, type UpdateInitiativeOutput } from './update-initiative';
export { deleteInitiative, type DeleteInitiativeInput, type DeleteInitiativeOutput } from './delete-initiative';
export { linkProjectToInitiative, type LinkProjectToInitiativeInput, type LinkProjectToInitiativeOutput } from './link-project-to-initiative';

/**
 * Token Reduction Summary
 *
 * Without Custom Tools (Direct MCP):
 * - Session start: 46,000 tokens per MCP server
 * - When used: Same 46,000 tokens
 * - Total: 46,000 tokens
 *
 * With Custom Tools (MCP Wrappers):
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: 500-1000 tokens per tool
 * - Total: ~1000 tokens per tool used
 *
 * Reduction: 99% (46,000 → 0 at start)
 */
