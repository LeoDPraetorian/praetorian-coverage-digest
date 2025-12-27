# Complete Fix Examples

Reference file for fixing-agents - complete examples of fix workflows.

---

## Example 1: Auto-Fix Block Scalar

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

---

## Example 2: Auto-Fix Name Mismatch

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

---

## Example 3: Manual-Fix Missing Description

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

---

## Example 4: Interactive Multi-Fix

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

---

## Example 5: Partial Fix (User Skips Some)

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

**creating-agents (Phase 9):**

```
Phase 9: Compliance
  → skill: "auditing-agents"
  → If failures: skill: "fixing-agents"
  → Re-audit until passes
```

**updating-agents (Phase 5):**

```
Phase 5: Compliance
  → skill: "auditing-agents"
  → If new issues: skill: "fixing-agents"
```
