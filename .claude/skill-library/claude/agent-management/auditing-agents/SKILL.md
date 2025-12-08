---
name: auditing-agents
description: Use when auditing agents for critical issues - validates description syntax, detects block scalars, checks name consistency. Quick validation in 30-60 seconds.
allowed-tools: Bash, Read, TodoWrite
---

# Auditing Agents

**Critical validation of agent files before committing or deploying.**

> **IMPORTANT**: Use TodoWrite to track audit progress when checking multiple agents.

---

## What This Skill Does

Audits agents for **CRITICAL issues** that break agent discovery:
- **Block scalar descriptions** (`|` or `>`) - Makes agents invisible to Claude
- **Name mismatches** - Frontmatter name ≠ filename
- **Missing/empty descriptions** - Discovery metadata absent

**Why this is critical:** These issues prevent Claude from seeing or selecting the agent. An agent with a block scalar description is completely invisible to the Task tool.

---

## When to Use

- After editing any agent file
- Before committing agent changes
- When debugging agent discovery issues ("Why can't Claude find my agent?")
- As part of create/update workflows (automatic)

**Automatically invoked by:**
- `creating-agents` (Phase 7: Audit compliance)
- `updating-agents` (Phase 5: Verify no regressions)

---

## Quick Reference

| Command | Purpose | Time |
|---------|---------|------|
| Audit single agent | Validate one agent | 30 sec |
| Audit all agents | Validate entire repository | 1-2 min |

---

## How to Use

### Audit Single Agent

**Setup:**
```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude/skills/agent-manager/scripts"
```

**Execute:**
```bash
npm run audit-critical -- <agent-name>
```

**Example:**
```bash
npm run audit-critical -- frontend-developer
```

### Audit All Agents

**Execute:**
```bash
npm run audit-critical
```

**What it does:** Recursively checks all `.md` files in `.claude/agents/`

---

## Interpreting Results

### ✅ Success (Exit Code 0)

```
✅ Critical audit passed
  Checked 1 agent(s)
  No critical issues found
```

**Action:** Agent is ready to commit.

### ❌ Failure (Exit Code 1)

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

**Action:**
1. Read the error report carefully
2. Note which agent(s) have issues
3. Note the specific problems (line numbers provided)
4. Fix each issue
5. Re-audit to verify

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

## Common Issues & Fixes

### Issue 1: Block Scalar Pipe (`|`)

**Symptom:**
```
Block scalar pipe detected (line 5)
  Description uses | (pipe) - Claude sees literal "|", not content
```

**Cause:**
```yaml
# BROKEN - Claude sees description as literally "|"
description: |
  Use when developing React applications.
```

**Fix:**
```yaml
# WORKING - Claude sees the full description
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>\nContext: User needs dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>
```

**How to fix:**
1. Read agent file
2. Find description with `|`
3. Convert to single-line with `\n` escapes
4. Use Edit tool to replace
5. Re-audit to verify

### Issue 2: Block Scalar Folded (`>`)

**Symptom:**
```
Block scalar folded detected (line 5)
  Description uses > (folded) - Claude sees literal ">", not content
```

**Cause:**
```yaml
# BROKEN - Claude sees description as literally ">"
description: >
  Use when developing React applications.
```

**Fix:** Same as Issue 1 - convert to single-line format.

### Issue 3: Name Mismatch

**Symptom:**
```
Name mismatch (line 3)
  Frontmatter name: "frontend-dev"
  Filename: "frontend-developer"
```

**Cause:**
```yaml
# File: frontend-developer.md
---
name: frontend-dev  # ← Doesn't match filename
---
```

**Fix options:**
1. **Update frontmatter** (preferred):
   ```yaml
   name: frontend-developer  # ← Now matches
   ```

2. **Rename file** (if frontmatter name is better):
   ```bash
   mv frontend-developer.md frontend-dev.md
   ```

### Issue 4: Missing Description

**Symptom:**
```
Missing description field
  No description field found in frontmatter
```

**Cause:**
```yaml
---
name: my-agent
tools: Read, Write
# ← No description field
---
```

**Fix:**
```yaml
---
name: my-agent
description: Use when [trigger] - [capabilities]
tools: Read, Write
---
```

### Issue 5: Empty Description

**Symptom:**
```
Empty description (line 4)
  Description field exists but is empty
```

**Cause:**
```yaml
---
name: my-agent
description:   # ← Empty value
tools: Read, Write
---
```

**Fix:**
```yaml
---
name: my-agent
description: Use when [specific trigger] - [specific capabilities]
tools: Read, Write
---
```

---

## Workflow

### Step-by-Step Audit Process

1. **Run Audit:**
   ```bash
   REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
   REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
   cd "$REPO_ROOT/.claude/skills/agent-manager/scripts"
   npm run audit-critical -- <agent-name>
   ```

2. **Check Exit Code:**
   - 0 = Success ✅
   - 1 = Issues found ❌
   - 2 = Tool error ⚠️

3. **If Issues Found:**
   - Read error report line by line
   - Identify each issue type
   - Note line numbers
   - Plan fixes

4. **Fix Each Issue:**
   - Use Edit tool for changes
   - Follow fix patterns above
   - Make minimal changes

5. **Re-Audit:**
   ```bash
   npm run audit-critical -- <agent-name>
   ```

6. **Verify Success:**
   - Exit code 0
   - "No critical issues found"
   - Ready to proceed

---

## Examples

### Example 1: Audit After Edit

```
User: "I just updated the react-developer agent description. Audit it."

You:
1. cd .claude/skills/agent-manager/scripts
2. npm run audit-critical -- react-developer
3. Interpret results:
   - Exit code 0 → "✅ No critical issues found. Ready to commit."
   - Exit code 1 → "❌ Found issues: [list them with line numbers and fixes]"
   - Exit code 2 → "⚠️ Agent not found. Check name spelling."
```

### Example 2: Pre-Commit Check

```
User: "Audit all agents before I commit."

You:
1. cd .claude/skills/agent-manager/scripts
2. npm run audit-critical
3. Report results:
   - "Checked 49 agents"
   - If success: "✅ All agents passed"
   - If failures: "❌ Found issues in 3 agents: [list them]"
4. If failures:
   - List each agent with its issues
   - Provide fix recommendations
   - Offer to fix automatically (using fixing-agents skill)
```

### Example 3: Debug Discovery Issue

```
User: "Why can't Claude find my new-agent?"

You:
1. cd .claude/skills/agent-manager/scripts
2. npm run audit-critical -- new-agent
3. Look for:
   - Block scalar (makes agent invisible)
   - Name mismatch (Claude can't match name)
   - Missing description (no discovery metadata)
4. Explain which issue is causing invisibility
5. Provide specific fix
```

### Example 4: Batch Audit with Failures

```
User: "Audit all agents and show me any problems."

You:
1. npm run audit-critical
2. Example output with issues:

   ✗ Critical issues found

   react-developer.md:
     Block scalar pipe detected (line 5)
       Fix: Convert to single-line with \n escapes

   go-architect.md:
     Name mismatch (line 3)
       Frontmatter name: "golang-architect"
       Filename: "go-architect"
       Fix: Update name to "go-architect"

   Checked 49 agent(s)
   Found 2 critical issue(s)

3. Summarize: "Found issues in 2 agents (react-developer, go-architect)"
4. Ask: "Would you like me to fix these automatically?"
```

---

## Integration with Other Skills

### Used During Creation

`creating-agents` (Phase 7):
```
Phase 7: Audit Compliance
  → skill: "auditing-agents"
  → Validates agent before proceeding
```

### Used During Updates

`updating-agents` (Phase 5):
```
Phase 5: Verify No Regressions
  → skill: "auditing-agents"
  → Ensures update didn't break discovery
```

### Triggers Fixing

If issues found:
```
Audit → Reports issues
  ↓
Fix → Use skill: "fixing-agents"
  ↓
Re-audit → Verify fixes worked
```

---

## Why CLI Is Needed

From the CLI source code (audit-critical.ts:5-8):

```typescript
/**
 * This is the ONLY audit that remains as code because:
 * 1. Block scalars make agents invisible to Claude (high impact)
 * 2. Detection requires complex regex patterns (hard for Claude)
 * 3. Failure rate was 8/10 agents before enforcement (proven need)
 */
```

**The skill wraps the CLI** to:
- Provide user-friendly interface
- Interpret results clearly
- Integrate with workflows
- Follow Router Pattern

**The CLI provides:**
- Complex regex detection (hard for LLMs)
- Accurate line number reporting
- Fast execution (<1 second)
- Deterministic results

---

## Technical Details

### What CLI Checks

**1. Block Scalar Detection:**
```typescript
const pipePattern = /^description:\s*\|[-+]?\s*$/m;
const foldedPattern = /^description:\s*>[-+]?\s*$/m;
```

Detects YAML block scalars that break agent discovery.

**2. Description Validation:**
- Field exists in frontmatter
- Field has content (not empty string)
- Field is readable

**3. Name Consistency:**
- Frontmatter `name:` field
- Filename (without `.md` extension)
- Must match exactly (case-sensitive)

### Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | All checks passed | Proceed with commit |
| 1 | Issues found | Fix issues and re-audit |
| 2 | Tool error | Check agent exists, verify path |

---

## See Also

- `creating-agents` - Full creation workflow (includes audit)
- `updating-agents` - Update workflow (includes audit)
- `fixing-agents` - Fix issues found by audit
- `agent-manager` - Routes audit operations to this skill
