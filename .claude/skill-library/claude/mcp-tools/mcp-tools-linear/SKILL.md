---
name: mcp-tools-linear
description: Use when accessing Linear services - provides 40+ GraphQL HTTP wrappers with OAuth 2.0 support. Direct API access, no MCP server dependency. Supports initiatives, issue relations, cycles, roadmaps, and more.
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

## Available Wrappers (40+ GraphQL Tools)

### Issues

| Wrapper            | Purpose                 | Key Parameters                                            |
| ------------------ | ----------------------- | --------------------------------------------------------- |
| `create-issue`     | Create new issue        | `title`, `team`, `description`, `assignee`, `priority`    |
| `get-issue`        | Get issue by ID         | `id` (e.g., "CHARIOT-1234")                               |
| `find-issue`       | Search issues           | `query`, `limit`                                          |
| `list-issues`      | List recent issues      | `limit` (default: 20)                                     |
| `update-issue`     | Update issue fields     | `id`, `title`, `state`, `priority`, `assignee`, `project` |
| `check-full-issue` | Get complete issue data | `id`                                                      |

### Issue Relations

| Wrapper                 | Purpose                  | Key Parameters                      |
| ----------------------- | ------------------------ | ----------------------------------- |
| `create-issue-relation` | Link two issues          | `issueId`, `relatedIssueId`, `type` |
| `list-issue-relations`  | List issue relationships | `issueId`                           |
| `delete-issue-relation` | Remove issue link        | `relationId`                        |

### Projects

| Wrapper          | Purpose            | Key Parameters                                     |
| ---------------- | ------------------ | -------------------------------------------------- |
| `create-project` | Create new project | `name`, `description`, `teamId`, `leadId`          |
| `get-project`    | Get project by ID  | `id`                                               |
| `list-projects`  | List all projects  | None                                               |
| `update-project` | Update project     | `id`, `name`, `description`, `state`, `targetDate` |
| `delete-project` | Delete project     | `id`                                               |

### Initiatives

| Wrapper                      | Purpose                     | Key Parameters              |
| ---------------------------- | --------------------------- | --------------------------- |
| `create-initiative`          | Create strategic initiative | `name`, `description`       |
| `get-initiative`             | Get initiative by ID        | `id`                        |
| `list-initiatives`           | List all initiatives        | None                        |
| `update-initiative`          | Update initiative           | `id`, `name`, `description` |
| `delete-initiative`          | Delete initiative           | `id`                        |
| `link-project-to-initiative` | Link project to initiative  | `projectId`, `initiativeId` |

### Cycles

| Wrapper        | Purpose             | Key Parameters                         |
| -------------- | ------------------- | -------------------------------------- |
| `create-cycle` | Create sprint/cycle | `teamId`, `name`, `startsAt`, `endsAt` |
| `get-cycle`    | Get cycle by ID     | `id`                                   |
| `list-cycles`  | List team cycles    | `teamId`                               |
| `update-cycle` | Update cycle        | `id`, `name`, `startsAt`, `endsAt`     |

### Roadmaps

| Wrapper          | Purpose                | Key Parameters              |
| ---------------- | ---------------------- | --------------------------- |
| `create-roadmap` | Create product roadmap | `name`, `description`       |
| `get-roadmap`    | Get roadmap by ID      | `id`                        |
| `list-roadmaps`  | List all roadmaps      | None                        |
| `update-roadmap` | Update roadmap         | `id`, `name`, `description` |

### Documents

| Wrapper           | Purpose            | Key Parameters           |
| ----------------- | ------------------ | ------------------------ |
| `create-document` | Create doc page    | `title`, `content`       |
| `get-document`    | Get document by ID | `id`                     |
| `list-documents`  | List documents     | None                     |
| `update-document` | Update document    | `id`, `title`, `content` |

### Comments

| Wrapper          | Purpose             | Key Parameters    |
| ---------------- | ------------------- | ----------------- |
| `create-comment` | Add issue comment   | `issueId`, `body` |
| `list-comments`  | List issue comments | `issueId`         |

### Teams & Users

| Wrapper      | Purpose              | Key Parameters    |
| ------------ | -------------------- | ----------------- |
| `get-team`   | Get team info        | `teamId`          |
| `list-teams` | List all teams       | None              |
| `find-user`  | Search for user      | `email` or `name` |
| `list-users` | List workspace users | None              |

### Special Tools

| Wrapper           | Purpose                      | Key Parameters                 |
| ----------------- | ---------------------------- | ------------------------------ |
| `create-bug`      | Create bug (preset priority) | `title`, `team`, `description` |
| `create-jira-bug` | Create bug with Jira import  | `title`, `team`, `jiraUrl`     |

## Usage Examples

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

### Common Operations

**Create Issue:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { createIssue } = await import('$ROOT/.claude/tools/linear/create-issue.ts');
  const result = await createIssue.execute({
    title: 'Add OAuth support to Linear client',
    description: 'Implement OAuth 2.0 PKCE flow with token refresh',
    team: 'Chariot',  // Team name OR team UUID
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
    id: 'CHARIOT-1234',
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

**Create Issue Relations:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { createIssueRelation } = await import('$ROOT/.claude/tools/linear/create-issue-relation.ts');
  const result = await createIssueRelation.execute({
    issueId: 'issue-uuid-1',
    relatedIssueId: 'issue-uuid-2',
    type: 'blocks'  // blocks, blocked, related, duplicate
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Create Cycle:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { createCycle } = await import('$ROOT/.claude/tools/linear/create-cycle.ts');
  const result = await createCycle.execute({
    teamId: 'team-uuid-here',
    name: 'Sprint 24',
    startsAt: '2026-01-06',
    endsAt: '2026-01-20'
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

## Related Skills

- **mcp-tools-registry** - Execution patterns for other MCP tools
- **gateway-mcp-tools** - MCP tools gateway routing

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
