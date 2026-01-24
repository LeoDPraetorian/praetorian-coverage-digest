---
name: mcp-tools-linear
description: Use when accessing Linear API - 57 exported GraphQL wrappers covering issues, projects, initiatives, cycles, teams, users, comments, labels, attachments, workflow states, reactions, archive operations, subscribers, favorites, documents, and issue relations via OAuth 2.0. Note 7 additional wrappers exist but not exported (roadmaps, special utilities).
allowed-tools: Read, Bash
skills: []
---

# Linear GraphQL HTTP Client

**Direct GraphQL API access with OAuth 2.0 support. No MCP server dependency.**

## Purpose

Enable Linear operations through direct GraphQL HTTP calls with OAuth 2.0 authentication.

**Architecture Change:** This skill uses **Direct GraphQL HTTP Client** (not MCP server).

## Authentication

**OAuth 2.0 ONLY.** API keys are NOT supported.

### OAuth 2.0 Benefits

- Short-lived tokens with automatic refresh
- Explicit user consent flow
- Secure storage outside repository (~/.claude-oauth/)
- Auto-expires if leaked (vs manual revocation for API keys)

### Setup Instructions

1. **Create OAuth app** at https://linear.app/settings/api/applications
   - Name: "Claude Code"
   - Redirect URI: `http://localhost:3847/callback`
   - Copy the Client ID

2. **Add to credentials.json:**

   ```json
   {
     "linear": {
       "clientId": "your-oauth-client-id"
     }
   }
   ```

3. **First API call triggers browser authorization**
   - Browser opens automatically
   - Authorize Linear access
   - Tokens saved to `~/.claude-oauth/linear.json`

4. **Tokens refresh automatically** (5 minutes before expiry)

**Token storage:**

```bash
~/.claude-oauth/linear.json  # Tokens (outside repository)
```

**To re-authorize:**

```bash
rm ~/.claude-oauth/linear.json
# Next API call will open browser for auth
```

## GraphQL vs MCP Architecture

### Why Direct GraphQL?

| Aspect            | Direct GraphQL HTTP (New)     | MCP Server (Old)      |
| ----------------- | ----------------------------- | --------------------- |
| **Startup**       | 0ms (no server spawn)         | ~2-5s per spawn       |
| **Auth**          | OAuth 2.0 + API key           | OAuth via mcp-remote  |
| **Dependencies**  | None (native fetch)           | mcp-remote package    |
| **Token Storage** | `~/.claude-oauth/`            | `~/.mcp-auth/`        |
| **Complexity**    | Simple HTTP client            | MCP protocol overhead |
| **Token Control** | Direct access, manual refresh | Handled by mcp-remote |

### Migration Benefits

1. **Faster:** No server spawn delay
2. **Simpler:** Direct HTTP calls, no protocol wrapper
3. **More Control:** Direct token management
4. **Backward Compatible:** API key fallback preserved

## Available Operations (Exported in index.ts)

These operations are exported and ready to use via the Linear wrapper index.

### Issues

| Wrapper        | Purpose                 | Key Parameters                                            |
| -------------- | ----------------------- | --------------------------------------------------------- |
| `create-issue` | Create new issue        | `title`, `team`, `description`, `assignee`, `priority`, `project`, `templateId`, `autoApplyProjectTemplate` |
| `get-issue`    | Get issue by ID         | `id` (e.g., "ENG-1234")                               |
| `find-issue`   | Search issues           | `query`, `limit`                                          |
| `list-issues`  | List recent issues      | `limit` (default: 20)                                     |
| `update-issue` | Update issue fields     | `id`, `title`, `state`, `priority`, `assignee`, `project` |

#### Template Auto-Apply for Issues

When creating issues for a project, use `autoApplyProjectTemplate: true` to automatically apply the project's associated template:

```typescript
await createIssue.execute({
  title: 'Implement feature X',
  team: 'Engineering',
  project: 'Development Agentification',
  autoApplyProjectTemplate: true  // Looks up and applies project template
});
```

**Parameters:**
- `templateId` - Direct template ID (optional, overrides auto-apply)
- `autoApplyProjectTemplate` - Boolean, auto-find template for project (default: false)

**Behavior:**
1. If `autoApplyProjectTemplate: true` and `project` is specified:
   - Resolves project name → ID
   - Queries templates with matching `projectId` in `templateData`
   - Passes `templateId` to Linear's `issueCreate` mutation
2. Linear applies template: prefills description structure, labels, state
3. If no template found, issue created normally (graceful fallback)

### Projects

| Wrapper                        | Purpose                      | Key Parameters                                                                  |
| ------------------------------ | ---------------------------- | ------------------------------------------------------------------------------- |
| `create-project`               | Create new project           | `name`, `description`, `teamId`, `leadId`                                       |
| `get-project`                  | Get project by ID            | `id`, `fullContent` (optional, default: false)                                  |
| `list-projects`                | List all projects            | `fullContent` (optional, default: false)                                        |
| `update-project`               | Update project               | `id`, `name`, `description`, `state`, `targetDate`                              |
| `list-project-templates`       | List project templates       | `limit`, `includeArchived`, `fullDescription`                                   |
| `create-project-from-template` | Create project from template | `templateId`, `name`, `team`, `description`, `lead`, `startDate`, `targetDate` |

#### Understanding Project Description vs Content

Linear Projects have TWO distinct text fields:

| Field | Purpose | Where It Appears | Example |
|-------|---------|------------------|---------|
| `description` | Short summary/tagline (NON_NULL) | Project cards, lists, hover tooltips | 'Maintain >=90% customer retention through proactive engagement' |
| `content` | Full markdown content (String) | Project Overview tab | Full markdown with ### headers, bullet lists, tables |

**API Field Types (from GraphQL introspection):**

```graphql
# Project type
description: String!  # Short summary (NON_NULL)
content: String       # Full markdown content (nullable)

# ProjectCreateInput / ProjectUpdateInput
description: String   # Short summary
content: String       # Full markdown content
```

**When to Use Each Field:**

- **`description`** → Short summary for project cards and lists
- **`content`** → Full markdown for Overview/Strategy/Metrics sections with headers, lists, tables

**Anti-Pattern to Avoid:**

```typescript
// ❌ WRONG: Putting full markdown in description
create-project {
  description: "### Overview\n\nThis is a long markdown document..."
}

// ✅ RIGHT: Short summary in description, full markdown in content
create-project {
  description: "Improve NRR by 2% through Professional Services expansion",
  content: "### Overview\n\nIncrease Professional Services revenue..."
}
```

**Content Truncation:**

- `get-project`: Returns both fields, `content` truncated to 1000 chars by default
- `list-projects`: Returns both fields, `content` truncated to 500 chars by default
- Use `fullContent: true` parameter to get untruncated content

**Project Template Usage:**

When creating project templates, the `templateData` JSON should include BOTH keys:

```json
{
  "description": "Short summary for project card",
  "content": "### Overview\n\nFull markdown content with headers..."
}
```

### Initiatives

| Wrapper                      | Purpose                     | Key Parameters              |
| ---------------------------- | --------------------------- | --------------------------- |
| `create-initiative`          | Create strategic initiative | `name`, `description`       |
| `get-initiative`             | Get initiative by ID        | `id`                        |
| `list-initiatives`           | List all initiatives        | None                        |
| `update-initiative`          | Update initiative           | `id`, `name`, `description` |
| `delete-initiative`          | Delete initiative           | `id`                        |
| `link-project-to-initiative` | Link project to initiative  | `projectId`, `initiativeId` |

### Teams & Users

| Wrapper      | Purpose              | Key Parameters    |
| ------------ | -------------------- | ----------------- |
| `get-team`   | Get team info        | `teamId`          |
| `list-teams` | List all teams       | None              |
| `find-user`  | Search for user      | `email` or `name` |
| `list-users` | List workspace users | None              |

### Comments

| Wrapper          | Purpose             | Key Parameters    |
| ---------------- | ------------------- | ----------------- |
| `create-comment` | Add issue comment   | `issueId`, `body` |
| `list-comments`  | List issue comments | `issueId`         |

### Labels

| Wrapper        | Purpose            | Key Parameters                    |
| -------------- | ------------------ | --------------------------------- |
| `create-label` | Create issue label | `name`, `color`, `description`    |
| `get-label`    | Get label by ID    | `id`                              |
| `list-labels`  | List all labels    | None                              |
| `update-label` | Update label       | `id`, `name`, `color`, `description` |
| `delete-label` | Delete label       | `id`                              |

### Archive Operations

| Wrapper           | Purpose         | Key Parameters |
| ----------------- | --------------- | -------------- |
| `archive-issue`   | Archive issue   | `id`           |
| `unarchive-issue` | Unarchive issue | `id`           |
| `archive-project` | Archive project | `id`           |

### Workflow States

| Wrapper                  | Purpose                  | Key Parameters                           |
| ------------------------ | ------------------------ | ---------------------------------------- |
| `create-workflow-state`  | Create custom state      | `teamId`, `name`, `color`, `type`        |
| `get-workflow-state`     | Get workflow state by ID | `id`                                     |
| `list-workflow-states`   | List team workflow states | `teamId`                                |
| `update-workflow-state`  | Update workflow state    | `id`, `name`, `color`, `position`        |

### Attachments

| Wrapper              | Purpose              | Key Parameters                  |
| -------------------- | -------------------- | ------------------------------- |
| `create-attachment`  | Attach file to issue | `issueId`, `url`, `title`       |
| `list-attachments`   | List issue attachments | `issueId`                     |
| `update-attachment`  | Update attachment    | `id`, `title`, `subtitle`       |
| `delete-attachment`  | Delete attachment    | `id`                            |

### Reactions

| Wrapper           | Purpose              | Key Parameters        |
| ----------------- | -------------------- | --------------------- |
| `create-reaction` | Add emoji reaction   | `commentId`, `emoji`  |
| `delete-reaction` | Remove emoji reaction | `id`                 |

### Subscribers

| Wrapper                  | Purpose                 | Key Parameters |
| ------------------------ | ----------------------- | -------------- |
| `subscribe-to-issue`     | Watch issue for updates | `issueId`      |
| `unsubscribe-from-issue` | Stop watching issue     | `issueId`      |

### Favorites

| Wrapper           | Purpose                | Key Parameters                |
| ----------------- | ---------------------- | ----------------------------- |
| `create-favorite` | Star item (issue, project, etc.) | `issueId` or `projectId` |
| `delete-favorite` | Unstar item            | `id`                          |

### Cycles

| Wrapper        | Purpose             | Key Parameters                           |
| -------------- | ------------------- | ---------------------------------------- |
| `create-cycle` | Create sprint/cycle | `teamId`, `name`, `startsAt`, `endsAt`   |
| `get-cycle`    | Get cycle by ID     | `id`                                     |
| `list-cycles`  | List team cycles    | `teamId` (optional)                      |
| `update-cycle` | Update cycle        | `id`, `name`, `startsAt`, `endsAt`       |

### Documents

| Wrapper           | Purpose            | Key Parameters                    |
| ----------------- | ------------------ | --------------------------------- |
| `create-document` | Create doc page    | `title`, `content`                |
| `get-document`    | Get document by ID | `id`                              |
| `list-documents`  | List documents     | None                              |
| `update-document` | Update document    | `id`, `title`, `content`          |

### Issue Relations

| Wrapper                 | Purpose                  | Key Parameters                           |
| ----------------------- | ------------------------ | ---------------------------------------- |
| `create-issue-relation` | Link two issues          | `issueId`, `relatedIssueId`, `type`      |
| `list-issue-relations`  | List issue relationships | `issueId`                                |
| `delete-issue-relation` | Remove issue link        | `id`                                     |

## Wrappers Exist But Not Exported

These wrappers exist in `.claude/tools/linear/` but are not yet exported in `index.ts`. To use them, you must import directly from the file (not from the index).

### Roadmaps (4 wrappers)

| Wrapper          | File                 | Purpose                |
| ---------------- | -------------------- | ---------------------- |
| `create-roadmap` | `create-roadmap.ts`  | Create product roadmap |
| `get-roadmap`    | `get-roadmap.ts`     | Get roadmap by ID      |
| `list-roadmaps`  | `list-roadmaps.ts`   | List all roadmaps      |
| `update-roadmap` | `update-roadmap.ts`  | Update roadmap         |

### Special (3 wrappers)

| Wrapper            | File                    | Purpose                      |
| ------------------ | ----------------------- | ---------------------------- |
| `create-bug`       | `create-bug.ts`         | Create bug (preset priority) |
| `create-jira-bug`  | `create-jira-bug.ts`    | Create bug with Jira import  |
| `check-full-issue` | `check-full-issue.ts`   | Get complete issue data      |

**Total: 7 wrappers available but not exported**

## Linear APIs We Don't Wrap Yet

Based on the [Linear GraphQL API](https://linear.app/developers/graphql) and [Apollo Studio Schema](https://studio.apollographql.com/public/Linear-API/schema/reference), these APIs are not yet wrapped:

| Feature            | Operations Needed                                     | Business Value                |
| ------------------ | ----------------------------------------------------- | ----------------------------- |
| **Custom Views**   | customViewCreate, customViewUpdate, customViewDelete  | Saved filters/views           |
| **Notifications**  | list, markRead                                        | Notification management       |
| **Webhooks**       | webhookCreate, webhookUpdate, webhookDelete           | Integration hooks             |
| **Time Tracking**  | timeScheduleCreate, etc.                              | Time management               |
| **Roadmaps**       | roadmapCreate, roadmapUpdate, roadmapDelete           | Product roadmap management    |

**For API discovery and schema verification:** See `.claude/skill-library/integrations/integrating-with-linear/SKILL.md`

## Usage Examples

### Recommended: CLI Runner

For reliable execution, use the CLI runner script instead of inline tsx -e:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"

# Create issue
npx tsx "$ROOT/.claude/tools/linear/cli.ts" create-issue '{"title":"Fix bug","team":"Engineering"}'

# List issues
npx tsx "$ROOT/.claude/tools/linear/cli.ts" list-issues '{"limit":10}'

# Get issue
npx tsx "$ROOT/.claude/tools/linear/cli.ts" get-issue '{"id":"ENG-123"}'

# List teams
npx tsx "$ROOT/.claude/tools/linear/cli.ts" list-teams '{}'

# List projects
npx tsx "$ROOT/.claude/tools/linear/cli.ts" list-projects '{}'
```

**Why CLI runner?**
- Avoids tsx -e module resolution issues
- Provides consistent error handling
- Enables better debugging with stack traces
- No complex quoting/escaping for JSON params
- Reliable execution across different shell environments

### OAuth Setup (First Time)

```bash
# 1. Add clientId to credentials.json
# 2. Run any Linear command:

ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { listIssues } = await import('$ROOT/.claude/tools/linear/list-issues.ts');
  const result = await listIssues.execute({ limit: 5 });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null

# Browser will open for authorization
# After approval, tokens saved automatically
```

### Fallback: Direct Execution (Debugging Only)

**Note:** The inline tsx -e pattern below may fail due to module resolution issues.
Use the CLI runner above for production workflows.

**Create Issue:**

```bash
# Only use this for debugging or when CLI runner is unavailable
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { createIssue } = await import('$ROOT/.claude/tools/linear/create-issue.ts');
  const result = await createIssue.execute({
    title: 'Add OAuth support to Linear client',
    description: 'Implement OAuth 2.0 PKCE flow with token refresh',
    team: 'Engineering',  // Team name OR team UUID
    priority: 2,      // 0=None, 1=Urgent, 2=High, 3=Normal, 4=Low
    assignee: 'me'    // 'me', email, name, or user ID
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Update Issue:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { updateIssue } = await import('$ROOT/.claude/tools/linear/update-issue.ts');
  const result = await updateIssue.execute({
    id: 'ENG-1234',
    state: 'In Progress',
    project: 'Agentic Development'  // Project name or ID
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Create Initiative:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { createInitiative } = await import('$ROOT/.claude/tools/linear/create-initiative.ts');
  const result = await createInitiative.execute({
    name: 'Q1 2026 Platform Improvements',
    description: 'Enhance developer experience and performance'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Link Project to Initiative:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { linkProjectToInitiative } = await import('$ROOT/.claude/tools/linear/link-project-to-initiative.ts');
  const result = await linkProjectToInitiative.execute({
    projectId: 'project-uuid-here',
    initiativeId: 'initiative-uuid-here'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**List Projects:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { listProjects } = await import('$ROOT/.claude/tools/linear/index.ts');
  const result = await listProjects.execute({});
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Get Project with Full Content:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getProject } = await import('$ROOT/.claude/tools/linear/index.ts');
  const result = await getProject.execute({
    query: 'My Project',
    fullContent: true  // Returns full markdown without truncation
  });
  console.log('Description:', result.description); // Short summary
  console.log('Content:', result.content);         // Full markdown
})();" 2>/dev/null
```

**Create Project with Description and Content:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { createProject } = await import('$ROOT/.claude/tools/linear/index.ts');
  const result = await createProject.execute({
    name: 'Q1 Revenue Growth',
    description: 'Improve NRR by 2% through Professional Services expansion',
    content: '### Overview\n\nIncrease Professional Services revenue by 2% NRR improvement.\n\n### Strategy\n\n- Expand PS team capacity\n- Launch new service offerings\n\n### Metrics\n\n- Target: 92% NRR by end of Q1\n- Current: 90% NRR',
    teamId: 'team-uuid-here'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Create Comment:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { createComment } = await import('$ROOT/.claude/tools/linear/index.ts');
  const result = await createComment.execute({
    issueId: 'issue-uuid-here',
    body: 'This is a comment on the issue'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Generic Execution Pattern

```bash
# Works from any directory (including submodules)
# 2>/dev/null suppresses debug logs

ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { toolName } = await import('$ROOT/.claude/tools/linear/tool-name.ts');
  const result = await toolName.execute({ /* parameters */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Troubleshooting

### OAuth Issues

**Browser doesn't open:**

```bash
# Manual authorization - visit the URL printed in terminal
```

**"No credentials configured" error:**

```bash
# Check credentials.json has clientId OR apiKey
cat ~/.claude/tools/config/credentials.json
```

**Token refresh fails:**

```bash
# Clear tokens and re-authorize
rm ~/.claude-oauth/linear.json
# Next API call will prompt
```

### API Key Issues

**"Invalid API key" error:**

```bash
# Regenerate at https://linear.app/settings/api
# Update credentials.json with new key
```

## Rate Limits

| Auth Method | Rate Limit          |
| ----------- | ------------------- |
| OAuth       | 500 requests/hour   |
| API Key     | 1,500 requests/hour |

**Note:** API keys have higher limits but OAuth is more secure.

## Integration

### Called By

- `gateway-mcp-tools` - Routes Linear operations from core to this library skill
- Users via natural language - Direct invocation for Linear workflows

### Requires (invoke before starting)

None - This is an entry point skill for Linear operations.

### Calls (during execution)

None - Terminal skill that provides GraphQL HTTP tool execution patterns.

### Pairs With (conditional)

None - Standalone skill for Linear API operations.

## Related Skills

- **integrating-with-linear** - API discovery and schema verification (`.claude/skill-library/integrations/integrating-with-linear/SKILL.md`)
- **mcp-tools-registry** - Execution patterns for other MCP tools
- **gateway-mcp-tools** - MCP tools gateway routing

## External Documentation

- [Linear GraphQL API](https://developers.linear.app/docs/graphql/working-with-the-graphql-api) - Official Linear API documentation
- [Linear OAuth Setup](https://linear.app/settings/api/applications) - Create OAuth applications

## Implementation Details

**Architecture:**

- Direct GraphQL HTTP client (no MCP server)
- OAuth 2.0 PKCE flow with automatic token refresh
- Secure token storage in `~/.claude-oauth/`
- Graceful fallback to API key authentication

**Files:**

- Client: `.claude/tools/linear/client.ts`
- OAuth Manager: `.claude/tools/config/lib/oauth-manager.ts`
- Browser Flow: `.claude/tools/config/lib/oauth-browser-flow.ts`
- GraphQL Helpers: `.claude/tools/linear/graphql-helpers.ts`

**Token Refresh:**

- Automatic refresh 5 minutes before expiry
- Refresh token rotation supported
- Browser re-auth if refresh fails
