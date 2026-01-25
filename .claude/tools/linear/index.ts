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
 * const issue = await getIssue.execute({ id: 'ENG-1366' });
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
export { listProjectTemplates, type ListProjectTemplatesInput, type ListProjectTemplatesOutput } from './list-project-templates';
export { getTemplate, type GetTemplateInput, type GetTemplateOutput } from './get-template';
export { createProjectFromTemplate, type CreateProjectFromTemplateInput, type CreateProjectFromTemplateOutput } from './create-project-from-template';
export { deleteProject, type DeleteProjectInput, type DeleteProjectOutput } from './delete-project';

// Cycle operations
export { listCycles, type ListCyclesInput, type ListCyclesOutput } from './list-cycles';
export { getCycle, type GetCycleInput, type GetCycleOutput } from './get-cycle';
export { createCycle, type CreateCycleInput, type CreateCycleOutput } from './create-cycle';
export { updateCycle, type UpdateCycleInput, type UpdateCycleOutput } from './update-cycle';

// Team operations
export { listTeams, type ListTeamsInput, type ListTeamsOutput } from './list-teams';
export { getTeam, type GetTeamInput, type GetTeamOutput } from './get-team';

// User operations
export { listUsers, type ListUsersInput, type ListUsersOutput } from './list-users';
export { findUser, type FindUserInput, type FindUserOutput } from './find-user';

// Comment operations
export { listComments, type ListCommentsInput, type ListCommentsOutput } from './list-comments';
export { createComment, type CreateCommentInput, type CreateCommentOutput } from './create-comment';

// Label operations
export { listLabels, type ListLabelsInput, type ListLabelsOutput } from './list-labels';
export { getLabel, type GetLabelInput, type GetLabelOutput } from './get-label';
export { createLabel, type CreateLabelInput, type CreateLabelOutput } from './create-label';
export { updateLabel, type UpdateLabelInput, type UpdateLabelOutput } from './update-label';
export { deleteLabel, type DeleteLabelInput, type DeleteLabelOutput } from './delete-label';

// Archive operations
export { archiveIssue, type ArchiveIssueInput, type ArchiveIssueOutput } from './archive-issue';
export { unarchiveIssue, type UnarchiveIssueInput, type UnarchiveIssueOutput } from './unarchive-issue';
export { archiveProject, type ArchiveProjectInput, type ArchiveProjectOutput } from './archive-project';

// Workflow State operations
export { listWorkflowStates, type ListWorkflowStatesInput, type ListWorkflowStatesOutput } from './list-workflow-states';
export { getWorkflowState, type GetWorkflowStateInput, type GetWorkflowStateOutput } from './get-workflow-state';
export { createWorkflowState, type CreateWorkflowStateInput, type CreateWorkflowStateOutput } from './create-workflow-state';
export { updateWorkflowState, type UpdateWorkflowStateInput, type UpdateWorkflowStateOutput } from './update-workflow-state';

// Attachment operations
export { listAttachments, type ListAttachmentsInput, type ListAttachmentsOutput } from './list-attachments';
export { createAttachment, type CreateAttachmentInput, type CreateAttachmentOutput } from './create-attachment';
export { updateAttachment, type UpdateAttachmentInput, type UpdateAttachmentOutput } from './update-attachment';
export { deleteAttachment, type DeleteAttachmentInput, type DeleteAttachmentOutput } from './delete-attachment';

// Reaction operations
export { createReaction, type CreateReactionInput, type CreateReactionOutput } from './create-reaction';
export { deleteReaction, type DeleteReactionInput, type DeleteReactionOutput } from './delete-reaction';

// Subscriber operations
export { subscribeToIssue, type SubscribeToIssueInput, type SubscribeToIssueOutput } from './subscribe-to-issue';
export { unsubscribeFromIssue, type UnsubscribeFromIssueInput, type UnsubscribeFromIssueOutput } from './unsubscribe-from-issue';

// Favorite operations
export { createFavorite, type CreateFavoriteInput, type CreateFavoriteOutput } from './create-favorite';
export { deleteFavorite, type DeleteFavoriteInput, type DeleteFavoriteOutput } from './delete-favorite';

// Initiative operations
export { createInitiative, type CreateInitiativeInput, type CreateInitiativeOutput } from './create-initiative';
export { getInitiative, type GetInitiativeInput, type GetInitiativeOutput } from './get-initiative';
export { listInitiatives, type ListInitiativesInput, type ListInitiativesOutput } from './list-initiatives';
export { updateInitiative, type UpdateInitiativeInput, type UpdateInitiativeOutput } from './update-initiative';
export { deleteInitiative, type DeleteInitiativeInput, type DeleteInitiativeOutput } from './delete-initiative';
export { linkProjectToInitiative, type LinkProjectToInitiativeInput, type LinkProjectToInitiativeOutput } from './link-project-to-initiative';

// Document operations
export { listDocuments, type ListDocumentsInput, type ListDocumentsOutput } from './list-documents';
export { getDocument, type GetDocumentInput, type GetDocumentOutput } from './get-document';
export { createDocument, type CreateDocumentInput, type CreateDocumentOutput } from './create-document';
export { updateDocument, type UpdateDocumentInput, type UpdateDocumentOutput } from './update-document';

// Issue Relation operations
export { listIssueRelations, type ListIssueRelationsInput, type ListIssueRelationsOutput } from './list-issue-relations';
export { createIssueRelation, type CreateIssueRelationInput, type CreateIssueRelationOutput } from './create-issue-relation';
export { deleteIssueRelation, type DeleteIssueRelationInput, type DeleteIssueRelationOutput } from './delete-issue-relation';

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
