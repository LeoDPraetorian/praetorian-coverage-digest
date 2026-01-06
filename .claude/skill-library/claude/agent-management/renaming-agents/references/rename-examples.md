# Rename Examples

Reference file for renaming-agents - complete examples of rename workflows.

---

## Example 1: Simple Rename

```
User: "Rename test-agent to testing-agent"

You (following 7-step workflow):

1. Validate source:
   Glob: .claude/agents/**/test-agent.md
   Found: .claude/agents/development/test-agent.md ✅

2. Validate target:
   Glob: .claude/agents/**/testing-agent.md
   Not found ✅ (good - no conflict)

3. Confirm with user:
   AskUserQuestion:
   "Rename test-agent → testing-agent?
    Found 0 references to update.
    Proceed?"

   User: Yes

4. Update frontmatter:
   Edit(old: "name: test-agent",
        new: "name: testing-agent")
   ✅

5. Move file:
   mv test-agent.md testing-agent.md
   ✅

6. Find references:
   Grep -rw "test-agent" .claude/
   Result: No references found (new agent)

7. Verify integrity:
   Grep -rw "test-agent" .claude/
   Result: 0 matches ✅

8. Report:
   "✅ Renamed test-agent → testing-agent
    No references to update (new agent)
    Ready to commit"
```

---

## Example 2: Rename with References

```
User: "Rename frontend-developer to frontend-react-developer"

You:

1. Validate source: ✅ Found
2. Validate target: ✅ Available

3. Find references (preview):
   Grep -rw "frontend-developer" .claude/

   Found in:
   - agent-manager/SKILL.md (5 matches)
   - frontend-orchestrator.md (3 matches)
   - creating-agents/examples/complex.md (1 match)
   - 7 other files

   Total: 25 references across 10 files

4. Confirm with user:
   "Rename frontend-developer → frontend-react-developer?
    Will update 25 references in 10 files.
    Proceed?"

   User: Yes

5. Update frontmatter: ✅
6. Move file: ✅

7. Update references (each file):
   File 1: agent-manager/SKILL.md
     Grep → found 5 matches
     Edit(replace_all: true) → updated all 5

   File 2: frontend-orchestrator.md
     Grep → found 3 matches
     Edit(replace_all: true) → updated all 3

   [Continue for all 10 files...]

8. Verify integrity:
   Grep -rw "frontend-developer" .claude/
   Result: 0 matches ✅

9. Report:
   "✅ Renamed frontend-developer → frontend-react-developer
    Updated 25 references across 10 files
    Verification: Complete ✅"
```

---

## Example 3: Conflict Detection

```
User: "Rename test-engineer to testing-engineer"

You:

1. Validate source:
   Glob: .claude/agents/**/test-engineer.md
   Found: ✅

2. Validate target:
   Glob: .claude/agents/**/testing-engineer.md
   Found: .claude/agents/testing/testing-engineer.md ❌

3. Report conflict:
   "❌ Cannot rename: Conflict detected

    Source: test-engineer (exists ✅)
    Target: testing-engineer (ALREADY EXISTS ❌)

    Existing agent:
      Path: .claude/agents/testing/testing-engineer.md
      Type: testing

    Options:
    1. Choose different name (test-specialist, test-expert)
    2. Delete existing testing-engineer first (if duplicate)
    3. Consolidate both agents into one

    Rename cancelled."

→ STOP, do not proceed with rename
```

---

## Example 4: Dry Run (Preview Only)

```
User: "Show me what would change if I rename backend-developer to backend-go-developer"

You:

1. Validate both names: ✅
2. Find references:
   Grep -rw "backend-developer" .claude/

   Found in 8 files:
   - agent-manager/SKILL.md (2 refs)
   - backend-orchestrator.md (4 refs)
   - go-architect.md (1 ref)
   - creating-agents/templates/development.md (1 ref)
   - 4 other files

   Total: 15 references

3. Preview changes:
   "Preview: Rename backend-developer → backend-go-developer

    Will update:
    ┌─────────────────────────────────────────┬──────┐
    │ File                                     │ Refs │
    ├─────────────────────────────────────────┼──────┤
    │ agent-manager/SKILL.md                   │ 2    │
    │ backend-orchestrator.md                  │ 4    │
    │ go-architect.md                          │ 1    │
    │ creating-agents/templates/development.md │ 1    │
    │ [4 other files]                          │ 7    │
    └─────────────────────────────────────────┴──────┘

    Total: 15 references in 8 files

    Apply this rename? (use AskUserQuestion)"

4. Wait for user decision (don't apply yet)
```

---

## Advanced Scenarios

### Scenario 1: Rename with Category Change

```
User: "Rename and move backend-developer from development/ to architecture/"

You:
"⚠️ This requires TWO operations:

1. Rename: backend-developer → backend-architect (semantic change)
2. Move: development/ → architecture/ (category change)

Recommendation:
- Use this skill to rename: backend-developer → backend-architect
- Manually move file to architecture/ after
- OR keep in development/ if architecture role isn't primary

Proceed with rename only (no category move)?"
```

**Note:** This skill handles rename only, not category moves. Category moves are manual.

### Scenario 2: Rename with Consolidation

```
User: "Rename old-agent to existing-agent (consolidate functionality)"

You:
1. Detect conflict: existing-agent already exists
2. Ask: "Consolidation detected. Options:

   A. Merge functionality into existing-agent (manual)
   B. Delete old-agent without rename (manual)
   C. Choose different target name (continue rename)

   Which approach?"

3. If user chooses A or B:
   → Explain this is manual operation
   → This skill only handles straightforward renames

4. If user chooses C:
   → Ask for new target name
   → Continue with rename workflow
```

---

## Integration Patterns

### Used Standalone

```
User: "Rename agent X to Y"

Direct invocation:
skill: "renaming-agents"
```

### Used with Other Skills

**After auditing (if name needs fixing):**

```
Audit → Name mismatch detected
  ↓
Options:
A. Fix frontmatter (use fixing-agents)
B. Rename file (use renaming-agents)
```

**During consolidation:**

```
1. Create new consolidated agent (creating-agents)
2. Rename old agents with prefix (renaming-agents)
3. Update references gradually
4. Archive old agents
```
