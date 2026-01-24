---
description: Natural language interface for Linear - just describe what you want, no syntax to memorize!
argument-hint: <describe your operation naturally>
allowed-tools: Bash, Read, Skill
---

# Linear Issue Management

## REQUIRED: Use Natural Language

This is the PRIMARY interface for all Linear operations. Describe what you want naturally - the command handles parsing, routing, and execution for you.

**DO**: Describe your intent in plain language after `/linear`
**DON'T**: Execute MCP wrappers directly via Bash or create custom scripts

> **Note**: The `mcp-tools-linear` skill contains low-level MCP wrapper implementations.
> Use THIS command instead - it wraps that complexity and handles edge cases for you.

---

## Team Selection Flow

When creating issues, the command needs a team. The team selector provides an intelligent flow:

### Step 1: Check for Saved Default

Before prompting, check if user has a saved default team:

```bash
npx tsx -e "import { getDefaultTeam } from './.claude/tools/linear/lib/team-selector.js'; import { PreferenceManager } from './.claude/tools/config/lib/preference-manager.js'; const manager = new PreferenceManager('linear'); getDefaultTeam(manager).then(r => console.log(JSON.stringify(r)))"
```

### Step 2: Confirm or Select Team

**If result.ok && result.value exists** (has default team):
- Use AskUserQuestion with options:
  - "Use default: {result.value.name}"
  - "Choose different team"

**If result.value === null or undefined** (no default):
- Proceed to Step 3

### Step 3: Fetch Teams with Hierarchy

```bash
npx tsx -e "import { fetchTeamsWithHierarchy } from './.claude/tools/linear/lib/team-selector.js'; import { listTeams } from './.claude/tools/linear/list-teams.js'; fetchTeamsWithHierarchy(() => listTeams.execute({})).then(r => console.log(JSON.stringify(r)))"
```

### Step 4: Organize and Present Teams

```bash
npx tsx -e "import { organizeTeamHierarchy } from './.claude/tools/linear/lib/team-selector.js'; import { fetchTeamsWithHierarchy } from './.claude/tools/linear/lib/team-selector.js'; import { listTeams } from './.claude/tools/linear/list-teams.js'; (async () => { const result = await fetchTeamsWithHierarchy(() => listTeams.execute({})); if (result.ok) { const hierarchy = organizeTeamHierarchy(result.value); console.log(JSON.stringify(hierarchy)); } })();"
```

Use AskUserQuestion to:
- Present hierarchy.parents as parent team options
- If user selects a parent with sub-teams, use getSiblingSubTeams() to show sub-team options
- Continue drill-down until final team selected

### Step 5: Save as Default (Optional)

After team selection, ask user if they want to save as default:

```bash
npx tsx -e "import { setDefaultTeam } from './.claude/tools/linear/lib/team-selector.js'; import { PreferenceManager } from './.claude/tools/config/lib/preference-manager.js'; const manager = new PreferenceManager('linear'); setDefaultTeam(manager, { id: 'TEAM_ID', name: 'TEAM_NAME' }).then(r => console.log(JSON.stringify(r)))"
```

---

## Examples

### Creating Issues

```
/linear create issue titled "Fix auth bug" with description "needs OAuth migration"
/linear make a new issue about performance regression in dashboard
/linear create task: implement rate limiting, description: add Redis-based rate limiter
/linear new issue for the memory leak in worker pool
```

### Getting Issues

```
/linear get CHARIOT-1234
/linear show me issue CHARIOT-1234
/linear what's the status of CHARIOT-1234
```

### Listing Issues

```
/linear list all issues
/linear show recent 20 issues
/linear list issues limit 100
```

### Updating Issues

```
/linear update CHARIOT-1234 status to In Progress
/linear change CHARIOT-1234 priority to urgent
/linear set CHARIOT-1234 assignee to @user
```


---

## Quick Operations

**Quick operations** (this command handles directly):
- Create/get/list/update issues
- Add comments, change status, assign users

---

## Template Auto-Apply Rule (MANDATORY)

**When creating issues for a project, ALWAYS include `autoApplyProjectTemplate: true`.**

This applies when:
- User says "create issue for project X"
- User says "add issue to project X"
- User says "create sub-issue in project X"
- Any issue creation that mentions a project name/ID

**Example:**
```typescript
await createIssue.execute({
  title: 'Issue title',
  team: 'Engineering',
  project: 'Development Agentification',
  autoApplyProjectTemplate: true  // ALWAYS when project specified
});
```

This ensures project-specific templates (title prefix, description structure, default labels/state) are applied automatically. If no template is associated with the project, the issue is created normally.

---

## Tips for Best Results

- **Be specific**: "create issue for auth bug" > "make issue"
- **Include context**: "with description X" helps with issue content
- **Use issue IDs**: CHARIOT-1234 format for get/update operations
- **Natural variations work**: The parser handles different phrasings

---

## When Something Fails

If you encounter an error with this interface:

1. **State the error**: "The /linear command returned: [exact error message]"
2. **Show what you tried**: Include the natural language command you used
3. **Ask the user**: "Should I debug the interface or try a different approach?"
4. **Wait for response**: Do not silently fall back to low-level execution or create workarounds

This ensures the user knows what happened and can guide next steps.

---

## How It Works

1. **You describe** your intent naturally
2. **Command routes** to appropriate skill (`mcp-tools-linear`)
3. **Command parses** your input and executes the operation
4. **Command displays** results with ticket URLs

---

## STOP: Technical Reference (Debugging Only)

**This section is for debugging interface failures, not normal operation.**

If you haven't tried the natural language interface above, go back and use it. The patterns below are low-level implementation details that the `/linear` command wraps for you.

Only proceed if:
- The natural language interface failed with an error
- You are debugging why the interface isn't working
- The user explicitly asked you to use direct execution

### Get Issue (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getIssue } = await import('$ROOT/.claude/tools/linear/get-issue.ts');
  const result = await getIssue.execute({ id: 'CHARIOT-1301' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>&1 | grep -v "^\[" | grep -v "^No credentials"
```

### List Issues (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { listIssues } = await import('$ROOT/.claude/tools/linear/list-issues.ts');
  const result = await listIssues.execute({ limit: 20 });
  console.log(JSON.stringify(result, null, 2));
})();" 2>&1 | grep -v "^\[" | grep -v "^No credentials"
```

### Error Handling Notes

- Filter debug output with `grep -v "^\[" | grep -v "^No credentials"`
- Validate issue IDs match pattern `[A-Z]+-[0-9]+`
- Handle network errors and provide retry guidance
