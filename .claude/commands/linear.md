---
description: Natural language interface for Linear - just describe what you want, no syntax to memorize!
argument-hint: <describe your operation naturally>
allowed-tools: Bash, Read
---

# Linear Issue Management

**Speak naturally!** Just describe what you want after `/linear` - I'll figure it out.

## Natural Language Examples

### Creating Issues
```bash
# All of these work:
/linear create issue for fixing auth bug with description needs OAuth migration
/linear make a new issue about performance regression in dashboard
/linear create task: implement rate limiting, description: add Redis-based rate limiter
/linear new issue for the memory leak in worker pool
```

### Getting Issues
```bash
# Any of these work:
/linear get CHARIOT-1234
/linear show me issue CHARIOT-1234
/linear fetch CHARIOT-1234
/linear what's the status of CHARIOT-1234
```

### Listing Issues
```bash
# Multiple ways to ask:
/linear list all issues
/linear show recent 20 issues
/linear give me the last 50 issues
/linear list issues limit 100
```

### Updating Issues
```bash
# Natural variations:
/linear update CHARIOT-1234 status to In Progress
/linear change CHARIOT-1234 priority to urgent
/linear set CHARIOT-1234 assignee to @user
```

## How It Works

1. **You describe** your intent naturally (no rigid syntax required)
2. **I read** the Linear skill for context and available operations
3. **I parse** your input to extract operation, parameters, and intent
4. **I execute** the appropriate wrapper with your parameters
5. **I display** clean results back to you

**No memorization needed!** Just tell me what you need in plain language.

## Implementation

When you invoke this command, I will:

1. Read the Linear MCP tools skill for available operations and examples:
```bash
Read: .claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md
```

2. Parse your natural language input to identify:
   - **Operation**: create, get, list, update, etc.
   - **Parameters**: title, description, issue ID, limit, etc.
   - **Context**: any additional details or preferences

3. Execute the matching wrapper operation from the skill's documentation

4. Format and display the results in a user-friendly way

## What You Can Do

Based on the Linear skill, common operations include:

- **Create issues**: Provide title and optional description
- **Get issue**: Provide issue ID (e.g., CHARIOT-1234)
- **List issues**: Optionally specify limit (default 20)
- **Update issues**: Change status, priority, assignee, or other fields
- **Search issues**: Find issues by title, description, or labels
- **Comment on issues**: Add comments to existing issues

The skill will show me exactly how to execute your request!

## Tips for Best Results

- **Be specific**: "create issue for auth bug" is better than "make issue"
- **Include context**: "with description X" helps me understand what you want
- **Use issue IDs**: CHARIOT-1234 format helps me identify exact issues
- **Natural language is fine**: I'll parse variations and figure it out

---

## Technical Reference

For developers or debugging, here are the underlying wrapper patterns:

### Get Issue (Direct Execution)
```bash
npx tsx -e "(async () => {
  const { getIssue } = await import('./.claude/tools/linear/get-issue.ts');
  const result = await getIssue.execute({ id: 'CHARIOT-1301' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>&1 | grep -v "^\[" | grep -v "^No credentials"
```

### List Issues (Direct Execution)
```bash
npx tsx -e "(async () => {
  const { listIssues } = await import('./.claude/tools/linear/list-issues.ts');
  const result = await listIssues.execute({ limit: 20 });
  console.log(JSON.stringify(result, null, 2));
})();" 2>&1 | grep -v "^\[" | grep -v "^No credentials"
```

### Error Handling
- Filter out debug output with `grep -v "^\[" | grep -v "^No credentials"`
- Validate issue IDs match pattern `[A-Z]+-[0-9]+`
- Handle network errors and provide retry guidance
- Display clean JSON results to user
