---
name: fixing-agents
description: Use when fixing agent compliance issues - interactive remediation for critical issues (block scalars, name mismatches, missing descriptions) with auto-fixes and manual guidance.
allowed-tools: Read, Edit, Bash, AskUserQuestion, TodoWrite, Skill
---

# Fixing Agents

**Interactive compliance remediation for critical agent issues.**

> **IMPORTANT**: Use TodoWrite to track fix progress when handling multiple issues.

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
- [ ] Step 3: Categorize fixes (auto vs manual)
- [ ] Step 4: Present options via AskUserQuestion
- [ ] Step 5: Apply auto-fixes with Edit tool
- [ ] Step 6: Guide manual fixes with user input
- [ ] Step 7: Re-audit to verify all fixes worked
- [ ] Step 8: Report final status
```

### Step 1: Run Audit

Always audit first to get current issues:

```
skill: "auditing-agents"
```

**Why:** Ensures you're fixing actual problems, not guessing.

**Audit output examples:**

**Success (no fixes needed):**
```
✅ Critical audit passed
  Checked 1 agent(s)
  No critical issues found
```
→ **Action:** No fixes needed, skip to Step 8

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

```bash
# Determine category first (architecture, development, testing, etc.)
# Then read the agent file

Read `.claude/agents/{category}/{agent-name}.md`
```

**What to note:**
- Current frontmatter structure
- Description location and content (if exists)
- Name field value
- Overall agent purpose

### Step 3: Categorize Fixes

Based on audit output, categorize each issue:

**AUTO-FIXABLE (Apply with Edit tool):**
- Block scalar → Single-line conversion
- Name mismatch → Update frontmatter name

**MANUAL (Require user input):**
- Missing description → Need content from user
- Empty description → Need content from user

**Example categorization:**
```
Issues found:
  1. Block scalar pipe (line 5) [AUTO]
  2. Name mismatch (line 3) [AUTO]
  3. Empty description (line 4) [MANUAL]

Auto-fixes: 2
Manual fixes: 1
```

### Step 4: Present Options

Use AskUserQuestion to let user choose fixes:

```typescript
AskUserQuestion({
  questions: [{
    question: "Which issues should I fix in react-developer?",
    header: "Fix Selection",
    multiSelect: true,
    options: [
      {
        label: "Block scalar (auto-fix)",
        description: "Convert | to single-line format - applies automatically"
      },
      {
        label: "Name mismatch (auto-fix)",
        description: "Update name: react-dev → react-developer"
      },
      {
        label: "Empty description (manual)",
        description: "I'll guide you to write a description"
      }
    ]
  }]
})
```

**User selects:** Block scalar, Name mismatch

### Step 5: Apply Auto-Fixes

For each selected auto-fix, use Edit tool:

#### Fix 1: Block Scalar → Single-Line

**Read current description:**
```yaml
description: |
  Use when developing React applications.
  Handles components, UI bugs, and performance.
```

**Convert to single-line:**
```yaml
description: Use when developing React applications - components, UI bugs, performance.
```

**Apply with Edit:**
```typescript
Edit({
  file_path: ".claude/agents/development/react-developer.md",
  old_string: "description: |\n  Use when developing React applications.\n  Handles components, UI bugs, and performance.",
  new_string: 'description: Use when developing React applications - components, UI bugs, performance.'
})
```

#### Fix 2: Name Mismatch → Update Frontmatter

**Current:**
```yaml
name: react-dev  # Doesn't match filename: react-developer.md
```

**Fix:**
```yaml
name: react-developer  # Now matches filename
```

**Apply with Edit:**
```typescript
Edit({
  file_path: ".claude/agents/development/react-developer.md",
  old_string: "name: react-dev",
  new_string: "name: react-developer"
})
```

### Step 6: Guide Manual Fixes

For issues requiring user input:

#### Fix: Missing/Empty Description

**Prompt user:**
```
The agent needs a description. Based on the agent's content, I suggest:

"Use when developing React applications - components, UI bugs, performance, API integration."

Would you like to:
1. Use this suggestion
2. Provide your own description
```

**If user provides description:**
```typescript
// User: "Use when building React frontends - TypeScript, hooks, testing"

Edit({
  file_path: ".claude/agents/development/react-developer.md",
  old_string: "description:",  // or "description: |" or existing content
  new_string: 'description: Use when building React frontends - TypeScript, hooks, testing.'
})
```

### Step 7: Re-Audit

After applying all fixes:

```
skill: "auditing-agents"
```

**Expected:** All issues resolved, audit passes

**If still failing:**
- Report remaining issues
- Explain what still needs fixing
- Offer to fix again

### Step 8: Report Results

**Success:**
```
✅ All issues fixed in react-developer

Applied fixes:
  - Block scalar → single-line (line 5)
  - Name mismatch → updated frontmatter (line 3)

Verification:
  - Re-audit passed
  - No remaining issues
  - Ready to commit
```

**Partial:**
```
⚠️ Some issues fixed, some remain in react-developer

Applied fixes:
  - Block scalar → single-line (line 5)

Remaining issues:
  - Empty description (line 4) - needs user input

Next: Provide description content to complete fixes.
```

---

## Fix Types & Patterns

### Auto-Fix 1: Block Scalar to Single-Line

**Detection:** Audit reports "Block scalar pipe/folded detected"

**Pattern:**

```yaml
# BEFORE (BROKEN)
description: |
  Use when developing React applications.
  Handles components and UI bugs.

# AFTER (FIXED)
description: Use when developing React applications - components, UI bugs.
```

**Algorithm:**
1. Find description field in frontmatter
2. Check if it uses `|` or `>`
3. Read the multiline content after the block scalar
4. Convert newlines to single line:
   - Join lines with spaces or dashes
   - Preserve paragraph breaks with `\n\n`
5. Replace with single-line format using Edit tool

**Example conversion:**
```yaml
# Content after |:
  Use when developing React applications.
  Handles components, UI bugs, and performance.

  <example>
  user: "Create dashboard"
  </example>

# Converted to:
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>\nuser: "Create dashboard"\n</example>
```

**Edge cases:**
- Preserve `<example>` blocks with `\n` escapes
- Preserve intent of paragraph breaks
- Remove excessive whitespace
- Keep content semantically equivalent

### Auto-Fix 2: Name Mismatch

**Detection:** Audit reports "Name mismatch: frontmatter has X, filename is Y"

**Pattern:**

```yaml
# File: frontend-developer.md

# BEFORE (BROKEN)
name: frontend-dev

# AFTER (FIXED)
name: frontend-developer
```

**Algorithm:**
1. Extract filename (without `.md` extension)
2. Read frontmatter name field
3. If different, update frontmatter to match filename
4. Use Edit tool to replace

**Why update frontmatter (not rename file):**
- Filename is the source of truth (used by file system)
- Renaming file requires updating all references
- Updating frontmatter is simpler and safer

**Example:**
```typescript
Edit({
  file_path: ".claude/agents/development/frontend-developer.md",
  old_string: "name: frontend-dev",
  new_string: "name: frontend-developer"
})
```

### Manual-Fix 1: Missing Description

**Detection:** Audit reports "Missing description field"

**Current state:**
```yaml
---
name: my-agent
tools: Read, Write
# ← No description field at all
---
```

**Workflow:**
1. Analyze agent file to understand purpose
2. Suggest description based on:
   - Agent name
   - Tools used
   - Body content (if any)
3. AskUserQuestion for description:
   ```
   "The agent needs a description. Based on the file, I suggest:

    'Use when [inferred purpose] - [inferred capabilities]'

    Use this description, or provide your own?"
   ```
4. Insert description field in frontmatter
5. Use Edit tool to add

**Example:**
```typescript
// User provides: "Use when analyzing code complexity - metrics, reports, recommendations"

Edit({
  file_path: ".claude/agents/analysis/my-agent.md",
  old_string: "---\nname: my-agent\ntools: Read, Write",
  new_string: "---\nname: my-agent\ndescription: Use when analyzing code complexity - metrics, reports, recommendations.\ntools: Read, Write"
})
```

### Manual-Fix 2: Empty Description

**Detection:** Audit reports "Empty description"

**Current state:**
```yaml
---
name: my-agent
description:   # ← Field exists but empty
tools: Read, Write
---
```

**Workflow:** Same as Missing Description
1. Suggest description based on context
2. Get user input
3. Update empty field with content
4. Use Edit tool to replace

**Example:**
```typescript
Edit({
  file_path: ".claude/agents/development/my-agent.md",
  old_string: "description:",
  new_string: "description: Use when developing backend APIs - Go, REST, DynamoDB."
})
```

---

## Complete Examples

### Example 1: Auto-Fix Block Scalar

```
User: "Fix the block scalar in react-developer"

You:
1. Run audit:
   skill: "auditing-agents"

   Result:
   ❌ Block scalar pipe detected (line 5)

2. Read agent file:
   Read .claude/agents/development/react-developer.md

   Found:
   description: |
     Use when developing React applications.

3. Convert to single-line:
   description: Use when developing React applications - components, UI bugs, performance.

4. Apply fix:
   Edit(old: "description: |\n  Use when...",
        new: "description: Use when...")

5. Re-audit:
   skill: "auditing-agents"

   Result:
   ✅ Critical audit passed

6. Report:
   "✅ Fixed block scalar in react-developer

    Changed:
      description: | → single-line format

    Verification:
      Re-audit passed ✅
      Ready to commit"
```

### Example 2: Auto-Fix Name Mismatch

```
User: "Fix name mismatch in go-developer"

You:
1. Run audit:
   skill: "auditing-agents"

   Result:
   ❌ Name mismatch: frontmatter="golang-dev", filename="go-developer"

2. Read agent file:
   Read .claude/agents/development/go-developer.md

   Found:
   name: golang-dev  # Line 3

3. Update frontmatter:
   Edit(old: "name: golang-dev",
        new: "name: go-developer")

4. Re-audit:
   skill: "auditing-agents"

   Result:
   ✅ Critical audit passed

5. Report:
   "✅ Fixed name mismatch in go-developer

    Changed:
      name: golang-dev → go-developer

    Verification:
      Re-audit passed ✅"
```

### Example 3: Manual-Fix Missing Description

```
User: "Fix missing description in new-agent"

You:
1. Run audit:
   skill: "auditing-agents"

   Result:
   ❌ Missing description field

2. Read agent file:
   Read .claude/agents/development/new-agent.md

   Found:
   ---
   name: new-agent
   tools: Read, Write, Bash
   ---

   # New Agent

   You are a development agent...

3. Analyze agent:
   - Name: new-agent
   - Tools: Read, Write, Bash
   - Category: development
   - Body suggests: general development tasks

4. Suggest description:
   "Based on the agent file, I suggest:

    'Use when developing software - general implementation tasks, file operations, build automation.'

    Use this description?"

5. User responds: "Yes, use that"

6. Insert description:
   Edit(
     old: "---\nname: new-agent\ntools:",
     new: "---\nname: new-agent\ndescription: Use when developing software - general implementation tasks, file operations, build automation.\ntools:"
   )

7. Re-audit:
   skill: "auditing-agents"

   Result:
   ✅ Critical audit passed

8. Report:
   "✅ Fixed missing description in new-agent

    Added:
      description: Use when developing software - general implementation tasks...

    Verification:
      Re-audit passed ✅"
```

### Example 4: Interactive Multi-Fix

```
User: "Fix all issues in frontend-developer"

You:
1. Run audit:
   skill: "auditing-agents"

   Result:
   ❌ Critical audit failed

   frontend-developer:
     Block scalar pipe detected (line 5)
     Name mismatch (line 3): frontmatter="frontend-dev", filename="frontend-developer"

   Found 2 critical issue(s)

2. Read agent file:
   Read .claude/agents/development/frontend-developer.md

3. Categorize:
   Auto-fixes: 2 (block scalar, name mismatch)
   Manual fixes: 0

4. AskUserQuestion:
   "Found 2 auto-fixable issues in frontend-developer:

    Which should I fix?"

   Options:
   ☑ Block scalar pipe (line 5) - Convert to single-line [AUTO]
   ☑ Name mismatch (line 3) - Update to frontend-developer [AUTO]

5. User selects: Both

6. Apply fixes:
   - Fix 1: Block scalar → single-line
   - Fix 2: Name → frontend-developer

7. Re-audit:
   skill: "auditing-agents"

   Result:
   ✅ Critical audit passed

8. Report:
   "✅ All issues fixed in frontend-developer

    Applied 2 auto-fixes:
      1. Block scalar → single-line (line 5)
      2. Name mismatch → updated frontmatter (line 3)

    Verification:
      Re-audit passed ✅
      No remaining issues"
```

### Example 5: Partial Fix (User Skips Some)

```
User: "Show me fix options for broken-agent"

You:
1. Run audit - finds 3 issues
2. Categorize - 2 auto, 1 manual
3. AskUserQuestion with all 3 options
4. User selects: Only block scalar fix

5. Apply selected fix:
   - Block scalar → single-line ✅
   - Name mismatch → skipped (user didn't select)
   - Empty description → skipped

6. Re-audit:
   Result:
   ❌ Still 2 issues (name mismatch, empty description)

7. Report:
   "⚠️ Partial fix applied to broken-agent

    Fixed:
      - Block scalar → single-line ✅

    Remaining issues (not fixed):
      - Name mismatch (line 3)
      - Empty description (line 4)

    Re-audit status: Still failing

    To fix remaining issues, run fixing-agents again."
```

---

## Fix Patterns (Detailed)

### Pattern 1: Block Scalar Conversion

**Input:**
```yaml
description: |
  Use when developing React applications.
  Handles components, UI bugs, and performance.

  <example>
  Context: Building dashboard
  user: "Create metrics dashboard"
  assistant: "I'll use react-developer"
  </example>
```

**Algorithm:**
1. Extract lines after `|`
2. Identify paragraphs (separated by blank lines)
3. Convert:
   - Line breaks within paragraphs → spaces or dashes
   - Paragraph breaks → `\n\n`
   - `<example>` blocks → `\n<example>\n...\n</example>`
4. Create single-line string

**Output:**
```yaml
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>\nContext: Building dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>
```

**Edge case - Folded scalar (>):**
```yaml
description: >
  Use when developing React applications.
```

Same algorithm - convert to single-line.

### Pattern 2: Name Mismatch Correction

**Filename:** `frontend-developer.md`

**Frontmatter:**
```yaml
name: frontend-dev  # WRONG
```

**Fix:**
```yaml
name: frontend-developer  # CORRECT - matches filename
```

**Why filename is authoritative:**
- File system uses filename
- Git tracks by filename
- References use filename
- Updating frontmatter is safer than renaming

### Pattern 3: Add Missing Description

**Before:**
```yaml
---
name: my-agent
tools: Read, Write
---
```

**After:**
```yaml
---
name: my-agent
description: Use when [purpose] - [capabilities].
tools: Read, Write
---
```

**Insertion point:** After `name:` field, before `tools:` or other fields

**Field order (standard):**
1. name
2. description
3. type (optional)
4. color (optional)
5. permissionMode (optional)
6. tools
7. skills
8. model

### Pattern 4: Replace Empty Description

**Before:**
```yaml
description:   # Empty
```

**After:**
```yaml
description: Use when [purpose] - [capabilities].
```

**Simpler than missing:** Just replace empty value, field already exists.

---

## Integration Workflow

### Used After Auditing

Natural workflow:
```
Audit → Reports issues
  ↓
Fix → Resolves issues
  ↓
Re-audit → Verifies success
```

**Example:**
```
User: "Audit and fix react-developer"

You:
1. skill: "auditing-agents"
2. If failures: skill: "fixing-agents"
3. Apply fixes
4. skill: "auditing-agents" (re-audit)
5. Report final status
```

### Used During Create/Update

**creating-agents (Phase 7):**
```
Phase 7: Audit Compliance
  → skill: "auditing-agents"
  → If failures: skill: "fixing-agents"
  → Re-audit until passes
```

**updating-agents (Phase 5):**
```
Phase 5: Verify No Regressions
  → skill: "auditing-agents"
  → If new issues: skill: "fixing-agents"
```

---

## Common Scenarios

### Scenario 1: Batch Fix All Auto-Fixable

```
User: "Fix everything you can automatically in react-developer"

You:
1. Audit → get issues
2. Filter to auto-fixable only
3. Apply all without asking (user said "everything")
4. Re-audit
5. Report which were fixed
```

### Scenario 2: Preview Before Applying

```
User: "Show me what would be fixed in react-developer"

You:
1. Audit → get issues
2. Read agent file
3. For each issue:
   - Show current problematic code
   - Show proposed fix
   - Explain change
4. Ask: "Apply these fixes?"
5. If yes: Apply with Edit
```

### Scenario 3: Fix Only Specific Issue

```
User: "Fix only the block scalar in react-developer, leave other issues"

You:
1. Audit → get all issues
2. Filter to block scalar only
3. Apply that fix
4. Re-audit (will still show other issues)
5. Report: "Fixed block scalar, X other issues remain"
```

---

## Error Handling

### Issue: Agent Not Found

```
Audit output:
⚠️  No agent found matching: unknown-agent

Action:
- Report: "Agent 'unknown-agent' not found"
- Suggest: Use `searching-agents` to find correct name
- Do NOT proceed with fixes
```

### Issue: Fix Fails

```
Edit tool returns error (old_string not found)

Action:
- Report: "Failed to apply fix for [issue]"
- Explain: File content may have changed
- Suggest: Re-read agent file and try again
- Do NOT mark as fixed
```

### Issue: Re-Audit Still Fails

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

### Tip 1: Always Audit First

Don't guess what's wrong. Run audit to get factual issue list:
```
skill: "auditing-agents"
```

### Tip 2: Present All Options

Let user choose - don't assume they want all fixes:
```typescript
AskUserQuestion({
  multiSelect: true,  // ← Allow multiple selections
  // ...
})
```

### Tip 3: Verify After Fixes

Always re-audit to confirm:
```
skill: "auditing-agents"
```

If still failing, report exactly what remains.

### Tip 4: Use TodoWrite for Multiple Issues

Track progress when fixing multiple issues:
```
- [ ] Fix block scalar
- [ ] Fix name mismatch
- [ ] Re-audit
```

---

## See Also

- `auditing-agents` - Identify issues before fixing
- `creating-agents` - Full creation workflow (includes fixing)
- `updating-agents` - Update workflow (includes fixing)
- `agent-manager` - Routes fix operations to this skill
