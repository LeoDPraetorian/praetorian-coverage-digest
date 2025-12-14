## Interpreting Results

### ✅ Success (Exit Code 0)

```
✅ Critical audit passed
  Checked 1 agent(s)
  No critical issues found
```

**Action:** Agent is ready to commit.

### ❌ Failure (Exit Code 1)

#### Critical Issues Only

```
✗ Critical issues found

frontend-developer.md:
  Block scalar pipe detected (line 5)
    Description uses | (pipe) - Claude sees literal "|", not content
    Fix: Convert to single-line with \n escapes
    Example: description: "Use when...\n\n<example>...\n</example>"

  Name mismatch (line 3)
    Frontmatter name: "frontend-dev"
    Filename: "frontend-developer"
    Fix: Update name field to "frontend-developer" OR rename file


Checked 1 agent(s)
Found 2 critical issue(s)
```

#### Extended Structural Warnings

After critical checks pass, you may see additional warnings:

```
✅ Critical audit passed
  Checked 1 agent(s)
  No critical issues found

⚠️  Extended structural checks (recommended fixes):

frontend-developer.md:
  ⚠️  Missing "Use when" trigger (line 5)
    Description should start with "Use when [trigger] - [capabilities]"

  ⚠️  No examples in description (line 5)
    Add <example> blocks to improve agent selection

  ⚠️  Missing gateway skill (frontmatter)
    Consider adding: skills: gateway-frontend

  ⚠️  No Output Format section (body)
    Add standardized JSON output structure

  ⚠️  No Escalation Protocol section (body)
    Define when to stop and which agent to recommend

  ⚠️  No Explicit Skill Invocation block (body)
    Add EXTREMELY_IMPORTANT block with mandatory skill enforcement
```

#### Line Count Failure

Line count exceeding limits will **fail** the audit:

```
✗ Critical issues found

go-architect.md:
  ❌ Line count exceeded: 425/400 (architecture agent)
    Agent is too verbose - delegate patterns to skills
    Target: 300 lines (400 for architecture/orchestrator)
    Fix: Extract detailed patterns to skill library

Checked 1 agent(s)
Found 1 critical issue(s)
```

**Action:**
1. Read the error report carefully
2. Note which agent(s) have issues
3. Note the specific problems (line numbers provided)
4. Fix critical issues first (block scalars, name mismatches, line count)
5. Address warnings as time permits (quality improvements)
6. Re-audit to verify

### ⚠️ Tool Error (Exit Code 2)

```
⚠️  No agent found matching: test-agent
  Check that the agent name is correct and exists in .claude/agents/
```

**Causes:**
- Agent name typo
- Agent doesn't exist
- Wrong directory (not in repo root)

**Action:** Verify agent exists and name is correct.

---

