---
description: Natural language interface for Linear - just describe what you want, no syntax to memorize!
argument-hint: <describe your operation naturally>
allowed-tools: Bash, Read, Skill
---

# Linear Issue Management

**Speak naturally!** Just describe what you want after `/linear` - I'll figure it out.

## Quick Operations vs Epic Creation

**For quick operations** (seconds to minutes):

- Create single issue, get issue, list issues, update fields
- Uses `mcp-tools-linear` skill

**For comprehensive epics** (2-4 hours):

- Create epic with codebase research, breakdown, detailed docs
- Uses `writing-linear-epics-stories` skill
- Example: `/linear create epic for real-time notifications with research`

I'll automatically detect which workflow you need based on your request.

---

## Natural Language Examples

### Creating Issues (Quick)

```bash
# All of these work:
/linear create issue for fixing auth bug with description needs OAuth migration
/linear make a new issue about performance regression in dashboard
/linear create task: implement rate limiting, description: add Redis-based rate limiter
/linear new issue for the memory leak in worker pool
```

### Creating Epics (Comprehensive)

```bash
# Triggers full research workflow:
/linear create epic for real-time notifications with research
/linear create epic for asset discovery automation with proper breakdown
/linear build epic for multi-factor authentication, research first
/linear create comprehensive epic for API rate limiting

# These trigger the writing-linear-epics-stories skill which will:
# 1. Research codebase (30-60 min)
# 2. Design epic/story breakdown (20-40 min)
# 3. Write detailed descriptions with diagrams (30-60 min)
# 4. Create Linear tickets (10-20 min)
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

### Step 1: Detect Workflow Type

Analyze your input for keywords:

- **Epic workflow**: "epic", "comprehensive", "with research", "with breakdown", "stories"
- **Quick operation**: "issue", "get", "list", "update", single operations

### Step 2: Route to Appropriate Skill

**If epic creation detected:**

```bash
Skill: "writing-linear-epics-stories"
```

→ Starts comprehensive workflow with research, breakdown, documentation

**If quick operation detected:**

```bash
Read: .claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md
```

→ Parse natural language and execute wrapper directly

### Step 3: Execute Workflow

**For epics:**

- Follow structured research → breakdown → documentation → creation process
- Create TodoWrite todos to track progress
- Deliver epic + sub-issues with full context

**For quick operations:**

- Parse parameters from natural language
- Execute appropriate Linear wrapper
- Display clean results

### Step 4: Confirm and Deliver

- Show created tickets with URLs
- Summarize what was accomplished

## What You Can Do

### Quick Operations (mcp-tools-linear)

- **Create issues**: Provide title and optional description
- **Get issue**: Provide issue ID (e.g., CHARIOT-1234)
- **List issues**: Optionally specify limit (default 20)
- **Update issues**: Change status, priority, assignee, or other fields
- **Search issues**: Find issues by title, description, or labels
- **Comment on issues**: Add comments to existing issues

### Epic Creation (writing-linear-epics-stories)

- **Create comprehensive epics**: With codebase research and breakdown
- **Generate detailed sub-issues**: With architecture diagrams and workflows
- **Manage dependencies**: Automatic parent/child linking
- **Rich documentation**: ASCII diagrams, code examples, success criteria

The appropriate skill will guide me through your request!

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
