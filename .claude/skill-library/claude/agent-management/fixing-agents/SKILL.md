---
name: fixing-agents
description: Use when fixing agent compliance issues - interactive remediation for critical issues (block scalars, name mismatches, missing descriptions) with auto-fixes and manual guidance.
allowed-tools: Read, Edit, Bash, AskUserQuestion, TodoWrite, Skill
---

# Fixing Agents

**Interactive compliance remediation for critical agent issues.**

> **MANDATORY**: You MUST use TodoWrite to track fix progress when handling multiple issues.

---

## What This Skill Does

Fixes critical agent issues discovered by `auditing-agents`:
- **Auto-fixes:** Deterministic issues (block scalars, name mismatches)
- **Manual guidance:** Issues requiring user input (missing/empty descriptions)
- **Interactive:** User chooses which fixes to apply via AskUserQuestion
- **Verified:** Re-audits after fixes to confirm success

---

## When to Use

- After `auditing-agents` reports failures
- When agent has critical compliance issues
- Before committing agent changes
- As part of create/update workflows

**NOT for:**
- Creating new agents (use `creating-agents`)
- Updating agent logic (use `updating-agents`)
- Testing agent behavior (use `testing-agent-skills`)

---

## Quick Reference

| Fix Type | Auto | Manual | Example |
|----------|------|--------|---------|
| Block scalar | ✅ | - | Convert `\|` to single-line |
| Name mismatch | ✅ | - | Update frontmatter name |
| Missing description | - | ✅ | Ask user for content |
| Empty description | - | ✅ | Ask user for content |

---

## Workflow

### Complete Fix Workflow

Copy this checklist and track progress with TodoWrite:

```
Fix Progress:
- [ ] Step 1: Run audit to identify issues
- [ ] Step 2: Read agent file
- [ ] Step 3: Create backup before changes
- [ ] Step 4: Categorize fixes (auto vs manual)
- [ ] Step 5: Present options via AskUserQuestion
- [ ] Step 6: Apply auto-fixes with Edit tool
- [ ] Step 7: Guide manual fixes with user input
- [ ] Step 8: Re-audit to verify all fixes worked
- [ ] Step 9: Update changelog
- [ ] Step 10: Report final status
```

### Step 1: Run Audit

Always audit first to get current issues:

```
skill: "auditing-agents"
```

**Why:** Ensures you're fixing actual problems, not guessing.

**Success (no fixes needed):**
```
✅ Critical audit passed
  Checked 1 agent(s)
  No critical issues found
```
→ **Action:** No fixes needed, skip to Step 10

**Failure (fixes needed):**
```
❌ Critical audit failed

react-developer:
  Block scalar pipe detected (line 5)
  Name mismatch (line 3): frontmatter="react-dev", filename="react-developer"

Checked 1 agent(s)
Found 2 critical issue(s)
```
→ **Action:** Proceed to Step 2

### Step 2: Read Agent File

Read the agent to understand context and prepare fixes:

```
Read `.claude/agents/{category}/{agent-name}.md`
```

**What to note:**
- Current frontmatter structure
- Description location and content (if exists)
- Name field value
- Overall agent purpose

### Step 3: Create Backup

**Before making any changes**, create a backup:

```bash
# Create backup directory if needed
mkdir -p .claude/agents/{category}/.local

# Backup current agent
cp .claude/agents/{category}/{agent-name}.md \
   .claude/agents/{category}/.local/{agent-name}.md.backup.$(date +%Y%m%d_%H%M%S)
```

**Why:** Enables rollback if fixes cause issues.

**To rollback:**
```bash
# Find latest backup
ls -la .claude/agents/{category}/.local/

# Restore
cp .claude/agents/{category}/.local/{agent-name}.md.backup.{timestamp} \
   .claude/agents/{category}/{agent-name}.md
```

### Step 4: Categorize Fixes

Based on audit output, categorize each issue:

**AUTO-FIXABLE (Apply with Edit tool):**
- Block scalar → Single-line conversion
- Name mismatch → Update frontmatter name

**MANUAL (Require user input):**
- Missing description → Need content from user
- Empty description → Need content from user

### Step 5: Present Options

Use AskUserQuestion to let user choose fixes:

```typescript
AskUserQuestion({
  questions: [{
    question: "Which issues should I fix in {agent-name}?",
    header: "Fix Selection",
    multiSelect: true,
    options: [
      {
        label: "Block scalar (auto-fix)",
        description: "Convert | to single-line format"
      },
      {
        label: "Name mismatch (auto-fix)",
        description: "Update frontmatter name to match filename"
      },
      {
        label: "Empty description (manual)",
        description: "I'll guide you to write a description"
      }
    ]
  }]
})
```

### Step 6: Apply Auto-Fixes

For each selected auto-fix, use Edit tool.

**For detailed fix patterns and algorithms, read:**
```
Read references/fix-patterns.md
```

#### Block Scalar → Single-Line

```yaml
# BEFORE
description: |
  Use when developing React applications.

# AFTER
description: Use when developing React applications - components, UI bugs, performance.
```

#### Name Mismatch → Update Frontmatter

```yaml
# BEFORE (file: react-developer.md)
name: react-dev

# AFTER
name: react-developer
```

### Step 7: Guide Manual Fixes

For issues requiring user input (missing/empty description):

1. Analyze agent file to understand purpose
2. Suggest description based on name, tools, body content
3. Ask user to confirm or provide their own
4. Apply with Edit tool

**For detailed manual fix patterns, read:**
```
Read references/fix-patterns.md
```

### Step 8: Re-Audit

After applying all fixes:

```
skill: "auditing-agents"
```

**Expected:** All issues resolved, audit passes

**If still failing:**
- Report remaining issues
- Explain what still needs fixing
- Offer to fix again

### Step 9: Update Changelog

**Document fixes applied:**

```bash
mkdir -p .claude/agents/{category}/.history
cat >> .claude/agents/{category}/.history/{agent-name}-CHANGELOG << 'EOF'

## [$(date +%Y-%m-%d)] - Fixes Applied

### Fixed
- {List each fix applied}

### Method
- Auto-fix / Manual fix

### Verification
- Re-audit: PASSED
EOF
```

### Step 10: Report Results

**Success:**
```
✅ All issues fixed in {agent-name}

Applied fixes:
  - Block scalar → single-line (line 5)
  - Name mismatch → updated frontmatter (line 3)

Verification:
  - Re-audit passed
  - Changelog updated
  - Ready to commit
```

**Partial:**
```
⚠️ Some issues fixed, some remain in {agent-name}

Applied fixes:
  - Block scalar → single-line (line 5)

Remaining issues:
  - Empty description (line 4) - needs user input

Next: Provide description content to complete fixes.
```

---

## Quick Fix Examples

### Auto-Fix Block Scalar (Quick)

```
1. skill: "auditing-agents" → Block scalar detected
2. Read agent file
3. Create backup
4. Edit: "description: |..." → "description: Use when..."
5. skill: "auditing-agents" → Passed
6. Update changelog
7. Report: "✅ Fixed"
```

### Auto-Fix Name Mismatch (Quick)

```
1. skill: "auditing-agents" → Name mismatch detected
2. Read agent file
3. Create backup
4. Edit: "name: wrong-name" → "name: correct-name"
5. skill: "auditing-agents" → Passed
6. Update changelog
7. Report: "✅ Fixed"
```

**For complete detailed examples, read:**
```
Read references/complete-examples.md
```

---

## Error Handling

### Agent Not Found

```
Audit output:
⚠️  No agent found matching: unknown-agent

Action:
- Report: "Agent 'unknown-agent' not found"
- Suggest: Use `searching-agents` to find correct name
- Do NOT proceed with fixes
```

### Fix Fails

```
Edit tool returns error (old_string not found)

Action:
- Report: "Failed to apply fix for [issue]"
- Explain: File content may have changed
- Suggest: Re-read agent file and try again
- Do NOT mark as fixed
```

### Re-Audit Still Fails

```
After fixes, audit still reports issues

Action:
- Report: "Applied fixes but audit still failing"
- List remaining issues
- Explain possible causes:
  - Manual fixes not completed
  - User skipped some fixes
  - New issues introduced
- Offer: "Run fixing-agents again to address remaining issues"
```

---

## Tips

1. **Always audit first** - Don't guess what's wrong
2. **Present all options** - Let user choose which fixes
3. **Verify after fixes** - Always re-audit to confirm
4. **Use TodoWrite** - Track progress for multiple issues
5. **Create backup** - Always backup before changes

---

## See Also

- `auditing-agents` - Identify issues before fixing
- `creating-agents` - Full creation workflow (includes fixing)
- `updating-agents` - Update workflow (includes fixing)
- `agent-manager` - Routes fix operations to this skill

**Reference files:**
- `references/fix-patterns.md` - Detailed fix patterns and algorithms
- `references/complete-examples.md` - Complete workflow examples
