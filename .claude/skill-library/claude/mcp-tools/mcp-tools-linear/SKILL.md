---
name: mcp-tools-linear
description: Use when accessing linear services - provides 19 tools for create-bug, create-comment, create-issue, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Linear MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent linear access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides linear-specific tool catalog.

## Purpose

Enable granular agent access control for linear operations.

**Include this skill when:** Agent needs linear access
**Exclude this skill when:** Agent should NOT access linear

## Authentication: OAuth (No API Key)

Linear uses **OAuth 2.0 via mcp-remote** - more secure than API keys:

| Aspect | How It Works |
|--------|--------------|
| **Storage** | Tokens in `~/.mcp-auth/` (outside repo) |
| **Lifetime** | 7-day tokens with automatic refresh |
| **Scopes** | `read,write,issues:create,admin` |
| **First-time** | Browser opens for explicit consent |

**First-time setup**: On first MCP call, browser opens for Linear OAuth authorization.

**Re-authentication**: If tokens expire or you need to re-auth:
```bash
rm -rf ~/.mcp-auth/mcp-remote-*/*linear*
# Then run any Linear wrapper - will prompt for OAuth
```

**No credentials.json entry needed** - OAuth is handled entirely by mcp-remote.

## Available Tools (Auto-discovered: 19 wrappers)

### create-bug
- **Purpose:** MCP wrapper for create-bug
- **Import:** `import { createBug } from './.claude/tools/linear/create-bug.ts'`
- **Token cost:** ~unknown tokens

### create-comment
- **Purpose:** MCP wrapper for create-comment
- **Import:** `import { createComment } from './.claude/tools/linear/create-comment.ts'`
- **Token cost:** ~unknown tokens

### create-issue
- **Purpose:** MCP wrapper for create-issue
- **Import:** `import { createIssue } from './.claude/tools/linear/create-issue.ts'`
- **Token cost:** ~unknown tokens

### create-jira-bug
- **Purpose:** MCP wrapper for create-jira-bug
- **Import:** `import { createJiraBug } from './.claude/tools/linear/create-jira-bug.ts'`
- **Token cost:** ~unknown tokens

### create-project
- **Purpose:** MCP wrapper for create-project
- **Import:** `import { createProject } from './.claude/tools/linear/create-project.ts'`
- **Token cost:** ~unknown tokens

### find-issue
- **Purpose:** MCP wrapper for find-issue
- **Import:** `import { findIssue } from './.claude/tools/linear/find-issue.ts'`
- **Token cost:** ~unknown tokens

### find-user
- **Purpose:** MCP wrapper for find-user
- **Import:** `import { findUser } from './.claude/tools/linear/find-user.ts'`
- **Token cost:** ~unknown tokens

### get-issue
- **Purpose:** MCP wrapper for get-issue
- **Import:** `import { getIssue } from './.claude/tools/linear/get-issue.ts'`
- **Token cost:** ~unknown tokens

### get-project
- **Purpose:** MCP wrapper for get-project
- **Import:** `import { getProject } from './.claude/tools/linear/get-project.ts'`
- **Token cost:** ~unknown tokens

### get-team
- **Purpose:** MCP wrapper for get-team
- **Import:** `import { getTeam } from './.claude/tools/linear/get-team.ts'`
- **Token cost:** ~unknown tokens

### list-comments
- **Purpose:** MCP wrapper for list-comments
- **Import:** `import { listComments } from './.claude/tools/linear/list-comments.ts'`
- **Token cost:** ~unknown tokens

### list-cycles
- **Purpose:** MCP wrapper for list-cycles
- **Import:** `import { listCycles } from './.claude/tools/linear/list-cycles.ts'`
- **Token cost:** ~unknown tokens

### list-issues
- **Purpose:** MCP wrapper for list-issues
- **Import:** `import { listIssues } from './.claude/tools/linear/list-issues.ts'`
- **Token cost:** ~unknown tokens

### list-projects
- **Purpose:** MCP wrapper for list-projects
- **Import:** `import { listProjects } from './.claude/tools/linear/list-projects.ts'`
- **Token cost:** ~unknown tokens

### list-teams
- **Purpose:** MCP wrapper for list-teams
- **Import:** `import { listTeams } from './.claude/tools/linear/list-teams.ts'`
- **Token cost:** ~unknown tokens

### list-users
- **Purpose:** MCP wrapper for list-users
- **Import:** `import { listUsers } from './.claude/tools/linear/list-users.ts'`
- **Token cost:** ~unknown tokens

### update-cycle
- **Purpose:** MCP wrapper for update-cycle
- **Import:** `import { updateCycle } from './.claude/tools/linear/update-cycle.ts'`
- **Token cost:** ~unknown tokens

### update-issue
- **Purpose:** MCP wrapper for update-issue
- **Import:** `import { updateIssue } from './.claude/tools/linear/update-issue.ts'`
- **Token cost:** ~unknown tokens

### update-project
- **Purpose:** MCP wrapper for update-project
- **Import:** `import { updateProject } from './.claude/tools/linear/update-project.ts'`
- **Token cost:** ~unknown tokens


## Common Operations with Parameters

### Create Issue
```bash
npx tsx -e "(async () => {
  const { createIssue } = await import('./.claude/tools/linear/create-issue.ts');
  const result = await createIssue.execute({
    title: 'Issue title here',
    description: 'Optional description in Markdown',
    team: 'Chariot'  // Team name OR team ID works
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Key parameters:**
- `title` (required) - Issue title string
- `description` (optional) - Markdown description
- `team` (required) - **Team name like "Chariot"** OR team UUID
- `assignee` (optional) - User ID, name, email, or "me"
- `priority` (optional) - 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low
- `state` (optional) - State name or ID
- `labels` (optional) - Array of label names or IDs

### Get Issue
```bash
npx tsx -e "(async () => {
  const { getIssue } = await import('./.claude/tools/linear/get-issue.ts');
  const result = await getIssue.execute({
    id: 'CHARIOT-1234'  // Issue identifier
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### List Issues
```bash
npx tsx -e "(async () => {
  const { listIssues } = await import('./.claude/tools/linear/list-issues.ts');
  const result = await listIssues.execute({
    limit: 20  // Optional, defaults to 20
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Update Issue
```bash
npx tsx -e "(async () => {
  const { updateIssue } = await import('./.claude/tools/linear/update-issue.ts');
  const result = await updateIssue.execute({
    id: 'CHARIOT-1234',
    title: 'Updated title',  // Optional
    state: 'In Progress',    // Optional
    priority: 1              // Optional
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Quick Reference

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Generic inline execution:**
```bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { toolName } = await import('./.claude/tools/linear/tool-name.ts');
  const result = await toolName.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
