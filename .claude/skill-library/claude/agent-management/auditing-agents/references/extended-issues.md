## Extended Structural Issues

These are **quality warnings** that help improve agent selection and maintainability. They don't prevent agent from working but are recommended best practices.

### Issue 6: Missing "Use when" Trigger (Warning)

**Symptom:**

```
⚠️  Missing "Use when" trigger (line 5)
  Description should start with "Use when [trigger] - [capabilities]"
```

**Cause:**

```yaml
---
description: Frontend development specialist for React applications
---
```

**Fix:**

```yaml
---
description: Use when developing React frontend - components, UI bugs, performance, API integration
---
```

**Why:** The "Use when" pattern helps Claude's attention mechanism match user intent to agent purpose.

### Issue 7: No Examples in Description (Warning)

**Symptom:**

```
⚠️  No examples in description (line 5)
  Add <example> blocks to improve agent selection
```

**Fix:**

```yaml
---
description: Use when developing React frontend - components, UI bugs, performance.\n\n<example>\nContext: User needs dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>
---
```

**Why:** Examples train Claude on when to select this agent vs similar agents.

### Issue 8: Line Count Exceeded (Failure)

**Symptom:**

```
❌ Line count exceeded: 425/400 (architecture agent)
  Agent is too verbose - delegate patterns to skills
```

**Cause:** Agent body contains detailed patterns, code examples, or documentation that belongs in skills.

**Fix:**

1. Identify verbose sections (patterns, examples, documentation)
2. Extract to skill library
3. Replace with skill references in agent body
4. Agent should say "For X, use skill Y" instead of embedding patterns

**Target:**

- Most agents: ≤300 lines
- Architecture/orchestrator: ≤400 lines

**Why:** Lean agents = more context for actual work. Detailed patterns load on-demand from skills.

### Issue 9: Missing Gateway Skill (Warning)

**Symptom:**

```
⚠️  Missing gateway skill (frontmatter)
  Consider adding: skills: gateway-frontend
```

**Fix:**

```yaml
---
name: react-developer
skills: gateway-frontend # ← Add gateway for progressive loading
---
```

**Relevant gateways:**

- `gateway-frontend` - React, UI, state management, testing
- `gateway-backend` - Go, AWS, infrastructure, APIs
- `gateway-testing` - Unit, integration, E2E, mocking
- `gateway-mcp-tools` - External APIs (Linear, CLI, Context7)

**Why:** Gateways enable progressive skill loading, reducing per-spawn token cost.

### Issue 10: Missing Output Format (Warning)

**Symptom:**

```
⚠️  No Output Format section (body)
  Add standardized JSON output structure
```

**Fix:** Add this section to agent body:

````markdown
## Output Format (Standardized)

Return results as structured JSON:

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "1-2 sentence description",
  "files_modified": ["paths"],
  "verification": {
    "tests_passed": true,
    "build_success": true
  },
  "handoff": {
    "recommended_agent": "agent-name",
    "context": "what to do next"
  }
}
```
````

```

**Why:** Standardized output enables clean agent coordination and handoffs.

### Issue 11: Missing Escalation Protocol (Warning)

**Symptom:**
```

⚠️ No Escalation Protocol section (body)
Define when to stop and which agent to recommend

````

**Fix:** Add this section to agent body:
```markdown
## Escalation Protocol

**Stop and escalate if**:
- [Condition 1] → Recommend `agent-name`
- [Condition 2] → Recommend `agent-name`
- Blocked by unclear requirements → Use AskUserQuestion tool
````

**Why:** Clear boundaries prevent agents from wandering outside their expertise.

### Issue 12: Missing Skill Loading Protocol (Critical - Phase 9)

**Symptom:**

Agent has `skills:` in frontmatter but lacks REQUIRED Skill Loading Protocol components:

- Missing Tiered Skill Loading Protocol section (Tier 1/2/3 structure)
- Missing Anti-Bypass section
- Missing `skills_read` field in output format JSON

This is a **CRITICAL** issue that must be fixed before deployment.

**Impact:**

- Agents with skills: frontmatter but no loading protocol have ~20% skill usage rate
- With Tiered Skill Loading Protocol, compliance increases to 80%+

**Detection:**

```bash
# Check for skills: field
grep '^skills:' .claude/agents/{type}/{name}.md

# Check for Skill Loading Protocol
grep '## Skill Loading Protocol' .claude/agents/{type}/{name}.md
```

**Fix (3 Required Components):**

**Component 1: Skill Loading Protocol Section**

Add this section after frontmatter with Tier 1/2/3 structure:

```markdown
## Skill Loading Protocol

Use Read() for ALL skills. Do NOT use Skill tool. Do NOT rely on training data.

### Tier 1: Always Read (Every Task)
```

Read('.claude/skills/gateway-{domain}/SKILL.md')
Read('.claude/skills/developing-with-tdd/SKILL.md')

```

### Tier 2: Multi-Step Tasks
If task has ≥2 steps:
```

Read('.claude/skills/using-todowrite/SKILL.md')

```

### Tier 3: Triggered by Task Type
| Trigger | Read Path |
|---------|-----------|
| [task type] | `.claude/skill-library/.../SKILL.md` |
```

**Component 2: Anti-Bypass Section**

Add this section immediately after Skill Loading Protocol:

```markdown
## Anti-Bypass

Do NOT rationalize skipping skill reads:

- 'Simple task' → Tier 1 skills always apply
- 'I already know this' → Training data is stale
- 'No time' → Reading skills prevents bugs
```

**Component 3: Output Format with skills_read**

Ensure output format JSON includes `skills_read` field:

```json
{
  "status": "success|error",
  "skills_read": ["skill-name-1", "skill-name-2"],
  "result": { ... }
}
```

**All three components are MANDATORY** for agents with `skills:` frontmatter.

**Template:** See [Skill Loading Protocol](../../../../../skills/managing-agents/references/patterns/skill-loading-protocol.md)

### Issue 13: Deprecated Skills Usage (Warning - Phase 8)

**Symptom:**

```
⚠️  Deprecated skill reference found (line 42)
  skill: "react-patterns" is deprecated
  Migration: Use "using-modern-react-patterns" instead
```

**What Phase 8 Checks:**

This phase detects references to skills that have been deprecated, archived, or renamed. Deprecated skills often exist temporarily to allow gradual migration but will eventually be removed.

**The Problem:**

Using deprecated skills leads to:

- **Technical debt**: References that need updating before cleanup
- **Broken functionality**: When deprecated skills are removed
- **Confusing errors**: Skills work today but fail after cleanup
- **Hidden dependencies**: Unknown which agents rely on old skills

**Detection Method:**

Phase 8 uses instruction-based checking:

a. **Grep for skill references:**

```bash
grep -o 'skill: "[^"]*"' .claude/agents/{category}/{agent-name}.md
grep -o 'gateway-[a-z-]*' .claude/agents/{category}/{agent-name}.md
```

b. **Check against deprecation registries:**

```bash
# Check archived directories
find .claude/skills/.archived -name "{skill-name}" -type d
find .claude/skill-library/.archived -name "{skill-name}" -type d

# Check deprecation registry (if available)
cat .claude/deprecated-skills.json | jq '.deprecated[] | select(.name == "{skill-name}")'
```

c. **Known deprecated patterns:**

- Old naming: `react-patterns` → `using-modern-react-patterns`
- Renamed skills: Check .claude/deprecated-skills.json for mappings
- Moved skills: Skills relocated to different categories

**Cause Examples:**

```markdown
# Agent references deprecated skill

Use skill: "react-patterns" for component development
```

```yaml
# Agent frontmatter uses deprecated gateway
---
skills: gateway-react # ← Renamed to gateway-frontend
---
```

**Fix Patterns:**

**Pattern 1: Direct skill reference**

```markdown
# Before

Use skill: "react-patterns" for component patterns

# After

Use skill: "using-modern-react-patterns" for React 19 patterns
```

**Pattern 2: Gateway reference**

```yaml
# Before
---
skills: gateway-react
---
# After
---
skills: gateway-frontend
---
```

**Pattern 3: Skill no longer needed (obsolete)**

```markdown
# Before

Use skill: "old-deployment-patterns" for deployment

# After (if skill is obsolete)

Use Bash tool to run deployment commands
```

**Migration Suggestions:**

When deprecated skill found, provide:

1. **Current replacement**: What skill to use instead
2. **Migration guide**: How to update the reference
3. **Rationale**: Why skill was deprecated

**Example Output:**

```
Phase 8: Deprecated Skills Detection
Referenced skills: debugging-systematically, react-patterns, gateway-frontend
✅ debugging-systematically - Active
⚠️ react-patterns - DEPRECATED (found in .claude/skill-library/.archived/)
   Migration: Use 'using-modern-react-patterns' instead
   Rationale: Updated for React 19 patterns (useOptimistic, Suspense)
✅ gateway-frontend - Active
Result: WARNING (1 deprecated skill found)
```

**Why Manual?**

Simple grep + directory/file existence checks that Claude can perform by:

1. Grepping agent body for skill references
2. Checking if skill exists in `.archived/` directories
3. Checking `.claude/deprecated-skills.json` (if available)
4. Reporting findings with migration paths

No complex regex or parsing required.

**Why Important?**

Early detection of deprecated skill usage prevents:

- **Runtime failures**: When deprecated skills are eventually removed
- **Technical debt**: Accumulation of references requiring batch updates
- **Breaking changes**: Agents failing after skill cleanup
- **Lost functionality**: Features depending on removed skills

**Deprecation Registry:**

If `.claude/deprecated-skills.json` exists, it provides structured migration info:

```json
{
  "deprecated": [
    {
      "name": "react-patterns",
      "replacement": "using-modern-react-patterns",
      "deprecatedDate": "2025-01-01",
      "removalDate": "2025-03-01",
      "reason": "Updated for React 19 patterns"
    }
  ]
}
```

**Testing After Fix:**

1. Run Phase 8 check again
2. Verify no deprecated skill references remain
3. Test agent invocation to confirm replacement skill works

**Reference:** Pattern matches systematic technical debt detection used in code deprecation workflows.

---

### Issue 14: Frontmatter Field Order (Warning - Phase 2)

**Symptom:**

```
⚠️  Frontmatter fields out of order (Phase 2)
  Expected order: name, description, type, permissionMode, tools, skills, model, color
  Actual: name, type, description, tools
```

**What Phase 2 Checks:**

This phase verifies that frontmatter fields appear in canonical order to reduce merge conflicts and improve maintainability.

**Canonical Field Order:**

1. `name:`
2. `description:`
3. `type:`
4. `permissionMode:`
5. `tools:`
6. `skills:`
7. `model:`
8. `color:`

**The Problem:**

Inconsistent field ordering causes:

- **Merge conflicts**: Different agents with different orderings conflict
- **Harder reviews**: Reviewers must scan entire frontmatter
- **Missing fields**: Easy to miss when order is inconsistent
- **Maintenance burden**: No standard to follow

**Detection Method:**

Phase 2 uses line-by-line parsing:

a. **Extract frontmatter section:**

```bash
sed -n '/^---$/,/^---$/p' .claude/agents/{category}/{agent-name}.md
```

b. **Record field order:**

- Read each line
- Identify field names (before `:` character)
- Compare against canonical order

**Cause Examples:**

```yaml
# Out of order - type before description
---
name: frontend-developer
type: development
description: Use when developing React frontend
tools: Read, Write, Edit
---
```

```yaml
# Out of order - skills before tools
---
name: backend-developer
description: Use when developing Go backend
type: development
skills: gateway-backend
tools: Read, Write, Edit
---
```

**Fix Pattern:**

```yaml
# Before (out of order)
---
name: frontend-developer
type: development
description: Use when developing React frontend
tools: Read, Write, Edit
skills: gateway-frontend
---
# After (canonical order)
---
name: frontend-developer
description: Use when developing React frontend
type: development
tools: Read, Write, Edit
skills: gateway-frontend
---
```

**Benefits:**

1. **Reduced merge conflicts**: Standard order means fewer conflicts
2. **Faster reviews**: Predictable field locations
3. **Easier maintenance**: Clear standard to follow
4. **Missing field detection**: Gaps more obvious in canonical order

**Example Output:**

```
Phase 2: Frontmatter Organization
Canonical order: name, description, type, permissionMode, tools, skills, model, color

Actual order:
1. name ✅
2. type ⚠️ (expected: description)
3. description ⚠️ (expected: type)
4. tools ✅
5. skills ✅

Result: WARNING - Fields out of order (type and description swapped)

Recommended fix:
Move 'description' before 'type' to match canonical order
```

**Why Manual?**

Simple line-by-line parsing that Claude can perform by:

1. Reading raw frontmatter section
2. Extracting field names in order
3. Comparing against canonical list
4. Reporting mismatches

No complex YAML parsing required.

**Why Important?**

Consistency reduces maintenance burden and merge conflicts. Canonical ordering is a convention that improves codebase health over time.

**Testing After Fix:**

1. Run Phase 2 check again
2. Verify all fields in canonical order
3. Commit changes with clear message about standardization

**Reference:** Based on YAML best practices and merge conflict reduction patterns.

---

### Issue 15: Frontmatter Skill Location (Error - Phase 5)

**Symptom:**

```
❌ Library skill in frontmatter (Phase 5)
  skill: using-modern-react-patterns
  Path: .claude/skill-library/development/frontend/using-modern-react-patterns/
  Suggested gateway: gateway-frontend
```

**What Phase 5 Checks:**

This phase verifies that frontmatter `skills:` field contains ONLY core or gateway skills, NOT library skills. This enforces progressive loading architecture.

**The Problem:**

Library skills in frontmatter defeat progressive loading:

- **Session start cost**: Frontmatter skills load at session start (expensive)
- **Token waste**: Library skills can be 500-2000 tokens each
- **Architecture bypass**: Defeats gateway pattern designed to load on-demand

**Architectural Intent:**

- **Core skills (~25)**: Universal workflows (TDD, debugging) - always available
- **Gateway skills (6)**: Domain entry points - load library skills on-demand
- **Library skills (~120)**: Specialized patterns - load progressively via gateways

**Example:**

```yaml
# ❌ WRONG: Library skill in frontmatter (loads at session start)
---
name: frontend-architect
description: Use when designing React architecture
skills: using-modern-react-patterns # 1500 tokens loaded immediately
---
# ✅ CORRECT: Gateway skill in frontmatter (loads on-demand)
---
name: frontend-architect
description: Use when designing React architecture
skills: gateway-frontend # 200 tokens, loads library skills when needed
---
```

**Detection Method:**

Phase 5 uses directory existence checks:

a. **Read agent frontmatter skills: field:**

```bash
grep '^skills:' .claude/agents/{category}/{agent-name}.md
```

b. **Extract skill names from comma-separated list:**

- Example: `skills: debugging-systematically, gateway-frontend, using-modern-react-patterns`
- Extracted: `['debugging-systematically', 'gateway-frontend', 'using-modern-react-patterns']`

c. **Categorize each skill:**

```bash
# 1. Gateway skill? (starts with 'gateway-')
if [[ "$skill_name" =~ ^gateway- ]]; then
  echo "✅ Gateway skill"
fi

# 2. Core skill? (exists in .claude/skills/)
if [ -d ".claude/skills/$skill_name" ]; then
  echo "✅ Core skill"
fi

# 3. Library skill? (exists in .claude/skill-library/)
if find .claude/skill-library -name "$skill_name" -type d | grep -q .; then
  echo "❌ Library skill (ERROR)"
fi
```

**Gateway Mapping:**

| Library Category             | Appropriate Gateway    |
| ---------------------------- | ---------------------- |
| `development/frontend/*`     | `gateway-frontend`     |
| `development/backend/*`      | `gateway-backend`      |
| `testing/*`                  | `gateway-testing`      |
| `security/*`                 | `gateway-security`     |
| `claude/mcp-tools/*`         | `gateway-mcp-tools`    |
| `development/integrations/*` | `gateway-integrations` |

**Fix Pattern:**

```yaml
# Before (library skill in frontmatter)
---
name: frontend-developer
description: Use when developing React frontend
skills: using-modern-react-patterns, frontend-tanstack-query
---
# After (gateway skill in frontmatter)
---
name: frontend-developer
description: Use when developing React frontend
skills: gateway-frontend
---
```

**Benefits:**

1. **Lower session start cost**: Gateway skills ~200 tokens vs library skills 500-2000 tokens
2. **Progressive loading**: Load library skills only when needed
3. **Architectural compliance**: Respects gateway pattern design
4. **Token efficiency**: Maximum context available for actual work

**Example Output:**

```
Phase 5: Frontmatter Skill Location
skills: debugging-systematically, gateway-frontend, using-modern-react-patterns

✅ debugging-systematically - Core skill (.claude/skills/debugging-systematically/)
✅ gateway-frontend - Gateway skill
❌ using-modern-react-patterns - Library skill (ERROR)
   Path: .claude/skill-library/development/frontend/using-modern-react-patterns/
   Suggested gateway: gateway-frontend

Result: ERROR - Replace 'using-modern-react-patterns' with 'gateway-frontend'
```

**Key Distinction from Phase 4:**

- **Phase 4**: Checks for syntax violations (paths with `/`, `.claude/`, `.md`)
- **Phase 5**: Checks for location category violations (library skills referenced by NAME)

**Why Manual?**

Simple directory existence checks that Claude can perform by:

1. Extracting skill names from frontmatter
2. Checking if skill starts with `gateway-`
3. Checking if directory exists in `.claude/skills/` (core)
4. Checking if directory exists in `.claude/skill-library/` (library)
5. Reporting violations with appropriate gateway suggestions

No complex logic required.

**Why Critical?**

Library skills in frontmatter completely bypass progressive loading architecture, wasting 1000-5000+ tokens at session start that should be available for actual work.

**Testing After Fix:**

1. Run Phase 5 check again
2. Verify all frontmatter skills are core or gateway
3. Test agent invocation to confirm gateway loads library skills on-demand
4. Verify token savings: Compare session start cost before/after fix

**Empirical Data:**

- Average library skill: 800 tokens
- Average gateway skill: 200 tokens
- Savings per library → gateway conversion: ~600 tokens
- Typical agent with 3 library skills: ~1800 tokens wasted

**Reference:** Based on progressive loading architecture design and token efficiency optimization patterns.

---

### Issue 16: Deprecated Pattern Duplication (Error/Warning - Phase 13)

**Symptom:**

```
❌ <EXTREMELY_IMPORTANT> block found (lines 12-89) - ERROR
⚠️ "Mandatory Skills (Must Use)" section found (lines 189-332) - WARNING
⚠️ "Rationalization Table" section found (lines 333-346) - WARNING
⚠️ Duplicate skill trigger mappings found - WARNING

Deletable duplication: 77 + 144 + 14 + 41 = 276 lines
```

**What Phase 13 Checks:**

This phase detects obsolete agent patterns that predate the Tiered Skill Loading Protocol and cause massive duplication.

**The Problem:**

Agents accumulate multiple deprecated patterns that duplicate modern protocol content:

1. **`<EXTREMELY_IMPORTANT>` blocks** - Pre-Tiered Skill Loading Protocol pattern explaining mandatory skills with old `skill: "name"` invocation style

2. **"Mandatory Skills (Must Use)" sections** - Duplicate Tier 1/2/3 skill explanations in separate section instead of Protocol

3. **"Rationalization Table" sections** - Duplicate Anti-Bypass rationalization warnings in separate table

4. **Duplicate skill trigger tables** - Same triggers listed in multiple sections (Protocol Tier 3, Skill References, Architecture-Specific Routing)

**Impact:**

- **File bloat**: Agents become 3-4x larger than necessary (512 vs 130 line gold standard)
- **Maintenance burden**: Same content exists in multiple locations, hard to keep synchronized
- **Confusion**: Multiple sources of truth for same information
- **Technical debt**: Deprecated patterns persist instead of being cleaned up

**Example (frontend-architect vs frontend-developer):**

| Agent                                   | Lines | Has Protocol | Has `<EXTREMELY_IMPORTANT>` | Has "Mandatory Skills" | Has "Rationalization Table" | Duplicate Triggers |
| --------------------------------------- | ----- | ------------ | --------------------------- | ---------------------- | --------------------------- | ------------------ |
| **frontend-developer** (gold standard)  | 130   | ✅           | ❌                          | ❌                     | ❌                          | ❌                 |
| **frontend-architect** (before cleanup) | 512   | ✅           | ✅ (77 lines)               | ✅ (144 lines)         | ✅ (14 lines)               | ✅ (41 lines)      |
| **frontend-architect** (after cleanup)  | 236   | ✅           | ❌                          | ❌                     | ❌                          | ❌                 |

**Detection Method:**

Phase 13 uses grep pattern matching:

```bash
# Check for <EXTREMELY_IMPORTANT> blocks
grep -n '<EXTREMELY_IMPORTANT>' agent.md
grep -n '</EXTREMELY_IMPORTANT>' agent.md

# Check for duplicate sections
grep -n '## Mandatory Skills (Must Use)' agent.md
grep -n '## Rationalization Table' agent.md

# Check for multiple trigger table sections
grep -n '## Skill Loading Protocol' agent.md
grep -n '## Skill References' agent.md
grep -n '## Architecture-Specific Skill Routing' agent.md
```

**Fix Pattern:**

```markdown
# Before (512 lines with duplication)

---

## name: frontend-architect

<EXTREMELY_IMPORTANT>
You MUST invoke mandatory skills...
**brainstorming:**

- Trigger: Before ANY architecture
- Invocation: skill: "brainstorming"
  ...
  </EXTREMELY_IMPORTANT>

## Skill Loading Protocol

### Tier 1: Always Read

...

## Skill References (Load On-Demand via Gateway)

[Duplicate trigger table]
...

## Mandatory Skills (Must Use)

**brainstorming:**
[Duplicate explanation]
...

## Rationalization Table

[Duplicate Anti-Bypass content]
...

# After (236 lines, clean)

---

## name: frontend-architect

## Skill Loading Protocol

### Tier 1: Always Read

### Tier 2: Multi-Step Tasks

### Tier 3: Triggered by Task Type

## Anti-Bypass

[Concise rationalization warnings]

## [Platform] Rules

## Output Format

## Escalation
```

**Consolidation Guidelines:**

1. **Delete `<EXTREMELY_IMPORTANT>` entirely** - Content belongs in Protocol sections
2. **Delete "Mandatory Skills (Must Use)"** - Tier 1 skills go in Protocol, not separate section
3. **Consolidate "Rationalization Table" into Anti-Bypass** - Keep 5-10 concise bullet points
4. **Keep ONE trigger table** - Only in "### Tier 3: Triggered by Task Type", delete other trigger sections

**Why Manual?**

Simple grep pattern matching with context awareness. Requires human judgment to consolidate content correctly.

**Why Critical?**

These patterns cause 2-4x file bloat and maintenance nightmares. The Tiered Skill Loading Protocol was specifically designed to replace these obsolete patterns.

**Testing After Fix:**

1. Run Phase 13 check again
2. Verify no `<EXTREMELY_IMPORTANT>` blocks remain
3. Verify only ONE section with skill explanations (Protocol)
4. Verify only ONE trigger table (Tier 3)
5. Check line count reduction (should be 40-60% smaller)
6. Verify agent still functions correctly

**Reference:** Comparison of frontend-developer (gold standard, 130 lines) vs agents with deprecated patterns showing 2-4x bloat.

---

### Issue 17: Invalid Library Skill Paths (Error - Phase 14)

**Symptom:**

```
❌ Invalid library skill path (line 114):
  .claude/skill-library/development/frontend/state/frontend-tanstack-query/SKILL.md
  File not found - skill was renamed to 'using-tanstack-query'

  Correct path: .claude/skill-library/development/frontend/state/using-tanstack-query/SKILL.md
```

**What Phase 14 Checks:**

This phase validates that all library skill paths referenced in agent bodies actually exist and haven't been renamed.

**The Problem:**

Agents reference library skills using full paths in:

- Read() calls in Tier 3 trigger tables
- Documentation and examples
- Skill routing sections

When skills are renamed or moved, these paths become invalid, but agents aren't automatically updated.

**Common Renamed Skills (not yet in deprecation registry):**

| Old Path                       | New Path                | Status             |
| ------------------------------ | ----------------------- | ------------------ |
| `frontend-tanstack-query`      | `using-tanstack-query`  | Renamed ✅         |
| `frontend-tanstack-table`      | `using-tanstack-table`  | Renamed ✅         |
| `frontend-tanstack-router`     | `using-tanstack-router` | Renamed ✅         |
| `frontend-react-hook-form-zod` | May be removed          | Needs verification |
| `frontend-shadcn-ui`           | May be removed          | Needs verification |
| `frontend-architecture`        | May be removed/renamed  | Needs verification |

**Detection Method:**

Phase 14 uses file existence checks:

```bash
# Extract all library skill paths from agent
grep -oE '\.claude/skill-library/[^)]+/SKILL\.md' agent.md | sort -u

# For each path, check if file exists
for path in $paths; do
  if [ ! -f "$path" ]; then
    echo "❌ ERROR: Invalid path - $path"
    # Try to find skill by name (parameter expansion - basename/dirname not in sandbox)
    temp="${path%/SKILL.md}"; skill_name="${temp##*/}"
    find .claude/skill-library -name "$skill_name" -type d
  fi
done
```

**Fix Pattern:**

```markdown
# Before (invalid path)

| TanStack Query patterns | `.claude/skill-library/development/frontend/state/frontend-tanstack-query/SKILL.md` |

# After (correct path)

| TanStack Query patterns | `.claude/skill-library/development/frontend/state/using-tanstack-query/SKILL.md` |
```

**Fix Procedure:**

1. **For renamed skills:**

   ```bash
   # Find correct location
   find .claude/skill-library -name "using-tanstack-query" -type d

   # Update all references in agent
   Edit agent.md:
     old: frontend-tanstack-query
     new: using-tanstack-query
   ```

2. **For removed skills:**

   ```bash
   # Check deprecation registry
   cat .claude/skill-library/lib/deprecation-registry.json | grep "skill-name"

   # If replaced: Update to replacement skill
   # If removed: Remove reference from agent
   ```

**Why Manual?**

File existence checks and path resolution require filesystem access. Automated tools can detect issues, but human judgment needed to determine correct replacement paths.

**Why Critical?**

Agents will fail at runtime when trying to read non-existent skills. Broken skill loading leads to incomplete guidance and unexpected behavior.

**Testing After Fix:**

1. Run Phase 15 check again
2. Verify all library skill paths resolve to existing files
3. Test agent invocation to confirm skill loading works
4. Verify Read() calls succeed for all referenced skills

**Reference:** Based on progressive loading architecture and skill rename tracking patterns.

---

## Issue 19: Missing Recommended Skills (Phase 13)

**Symptom:** Agent is missing skills that would improve its effectiveness based on type, domain, or content triggers.

**Severity:**

- ⚠️ **WARNING** for universal skills (`verifying-before-completion`, `calibrating-time-estimates`) - MANDATORY for all agents
- ⚠️ INFO for type/domain skills (suggestions, not blocking)

**Example:**

```yaml
# Agent missing recommended skills
---
name: backend-developer
type: development
skills: gateway-backend, adhering-to-yagni
---
# ⚠️ WARNING: Missing verifying-before-completion (MANDATORY for all agents)
# ⚠️ WARNING: Missing calibrating-time-estimates (MANDATORY for all agents)
# ⚠️ INFO: Missing developing-with-tdd (required for development agents)
# ⚠️ INFO: Missing adhering-to-dry (required for development agents)
```

**Cause:**

Phase 13 (Skill Gap Analysis) checks for:

1. **MANDATORY universal skills** - `verifying-before-completion` and `calibrating-time-estimates` are required for ALL agents
2. **Type-based required skills** - Skills that agents of this type should have
3. **Domain-based gateways** - Gateway skills based on agent name/purpose
4. **Body trigger patterns** - Skills mentioned in body but not in frontmatter

**Detection Logic:**

```bash
# MANDATORY universal skills (WARNING severity)
for skill in verifying-before-completion calibrating-time-estimates; do
  if ! grep -q "$skill" agent.md; then
    echo "⚠️ WARNING: Missing $skill (MANDATORY for all agents)"
  fi
done

# Type-based (development agents) - INFO severity
if [ "$type" = "development" ]; then
  for skill in developing-with-tdd adhering-to-yagni adhering-to-dry; do
    if ! grep -q "$skill" agent.md; then
      echo "⚠️ INFO: Missing $skill (required for development agents)"
    fi
  done
fi

# Domain-based - INFO severity
if [[ "$agent_name" =~ (frontend|react|ui) ]]; then
  if ! grep -q "gateway-frontend" agent.md; then
    echo "⚠️ INFO: Frontend agent missing gateway-frontend"
  fi
fi

# Body triggers (expanded - 13 patterns)
if grep -qi "TDD\|test-first\|RED-GREEN" agent.md; then
  if ! grep -q "developing-with-tdd" agent.md; then
    echo "⚠️ INFO: Agent mentions TDD but missing developing-with-tdd"
  fi
fi

if grep -qi "brainstorm\|explore alternatives\|design options" agent.md; then
  if ! grep -q "brainstorming" agent.md; then
    echo "⚠️ INFO: Agent mentions brainstorming but missing brainstorming"
  fi
fi

if grep -qi "plan\|implementation steps\|task breakdown" agent.md; then
  if ! grep -q "writing-plans" agent.md; then
    echo "⚠️ INFO: Agent mentions planning but missing writing-plans"
  fi
fi

if grep -qi "parallel\|concurrent\|multiple agents" agent.md; then
  if ! grep -q "dispatching-parallel-agents" agent.md; then
    echo "⚠️ INFO: Agent mentions parallel execution but missing dispatching-parallel-agents"
  fi
fi

if grep -qi "security\|vulnerability\|OWASP\|auth" agent.md; then
  if ! grep -q "gateway-security" agent.md; then
    echo "⚠️ INFO: Agent mentions security but missing gateway-security"
  fi
fi

if grep -qi "todo\|checklist\|track progress" agent.md; then
  if ! grep -q "using-todowrite" agent.md; then
    echo "⚠️ INFO: Agent mentions progress tracking but missing using-todowrite"
  fi
fi

if grep -qi "refactor\|clean code\|DRY" agent.md; then
  if ! grep -q "adhering-to-dry" agent.md; then
    echo "⚠️ INFO: Agent mentions refactoring but missing adhering-to-dry"
  fi
fi

if grep -qi "scope\|minimal\|YAGNI" agent.md; then
  if ! grep -q "adhering-to-yagni" agent.md; then
    echo "⚠️ INFO: Agent mentions scope control but missing adhering-to-yagni"
  fi
fi

if grep -qi "state management\|zustand\|redux" agent.md; then
  if ! grep -q "gateway-frontend" agent.md; then
    echo "⚠️ INFO: Agent mentions state management but missing gateway-frontend"
  fi
fi

if grep -qi "API\|endpoint\|REST\|GraphQL" agent.md; then
  if ! grep -q "gateway-backend" agent.md; then
    echo "⚠️ INFO: Agent mentions API development but missing gateway-backend"
  fi
fi
```

**Type → Required Skills Mapping:**

| Agent Type    | Required Skills                                               |
| ------------- | ------------------------------------------------------------- |
| `development` | `developing-with-tdd`, `adhering-to-yagni`, `adhering-to-dry` |
| `quality`     | `analyzing-cyclomatic-complexity` (Tier 3)                    |
| `testing`     | `developing-with-tdd`                                         |
| `All types`   | `verifying-before-completion`, `calibrating-time-estimates`   |

**Domain → Gateway Mapping:**

| Agent Name Contains       | Recommended Gateway |
| ------------------------- | ------------------- |
| `frontend`, `react`, `ui` | `gateway-frontend`  |
| `backend`, `go`, `api`    | `gateway-backend`   |
| `test`                    | `gateway-testing`   |
| `security`                | `gateway-security`  |

**Fix Pattern:**

```yaml
# Before (missing recommended skills)
---
name: backend-developer
type: development
skills: gateway-backend, adhering-to-yagni
---
# After (with recommended skills added)
---
name: backend-developer
type: development
skills: adhering-to-dry, adhering-to-yagni, calibrating-time-estimates, developing-with-tdd, gateway-backend, verifying-before-completion
---
```

**Fix Procedure:**

1. **MANDATORY: Add universal skills (WARNING)** - Add `verifying-before-completion` and `calibrating-time-estimates` to ALL agents. These are not optional.
2. **Review INFO suggestions** - Evaluate type-based and domain-based suggestions
3. **Add relevant skills to frontmatter** - Update `skills:` field (alphabetically sorted)
4. **Update Skill Loading Protocol** - Add universal skills to Tier 1, others to Tier 1 or Tier 3 as appropriate
5. **Re-audit** - Verify WARNING issues resolved (universal skills present)

**Why Manual?**

Type/domain skill necessity is context-dependent. However, universal skills (`verifying-before-completion`, `calibrating-time-estimates`) are ALWAYS required - no exceptions.

**Why Important?**

- **Universal skills (MANDATORY)**: Prevent incomplete work and time estimation errors
- **Type/domain skills (INFO)**: Ensures agents have access to methodology skills (TDD, verification, debugging)
- Promotes consistency across similar agent types
- Improves agent effectiveness by suggesting beneficial skills

**Testing After Fix:**

1. Run Phase 13 check again
2. Verify added skills are appropriate for agent type/purpose
3. Test agent invocation to confirm new skills load correctly
4. Verify Skill Loading Protocol references new skills

**Reference:** Based on agent type classification system and skill usage patterns across existing agents.

---

## Issue 20: Markdown Table Formatting (Warning - Phase 16)

**Symptom:**

```
⚠️  Inconsistent markdown table formatting (Phase 16)
  Table at line 42: Column count mismatch (header: 3, row 2: 4)
  Table at line 89: Missing proper separator row (should use |---|---|)
  Table at line 156: Inconsistent pipe alignment
```

**What Phase 16 Checks:**

This phase validates markdown table formatting consistency across agent documentation. Well-formatted tables improve readability and maintainability.

**The Problem:**

Poorly formatted markdown tables cause:

- **Readability issues**: Inconsistent column counts confuse readers
- **Rendering problems**: Some markdown parsers break on malformed tables
- **Maintenance burden**: Hard to update tables with inconsistent structure
- **Documentation quality**: Tables with misaligned pipes look unprofessional

**Common Table Formatting Issues:**

1. **Inconsistent Column Counts**

   ```markdown
   | Phase | Name  | Status |
   | ----- | ----- | ------ | ----- |
   | 1     | Check | Pass   | Extra |
   ```

   Header has 3 columns, separator has 2, data row has 4 - inconsistent!

2. **Malformed Header Separators**

   ```markdown
   | Phase | Name | Status |
   | ----- | ---- | ------ |
   ```

   Should use at least three dashes: `|---|---|---|`

3. **Missing Trailing Pipes**

   ```markdown
   | Phase | Name | Status |
   | ----- | ---- | ------ |
   ```

   Header row missing trailing pipe (though some parsers accept this)

4. **Inconsistent Pipe Alignment**
   ```markdown
   | Phase | Name  | Status |
   | ----- | ----- | ------ |
   | 1     | Check | Pass   |
   ```
   Mixing styles makes tables hard to read in source

**Detection Method:**

Phase 16 uses line-by-line table parsing:

a. **Identify table blocks:**

```bash
# Find markdown table patterns
grep -n '^\|' .claude/agents/{category}/{agent-name}.md
```

b. **For each table, extract:**

- Header row: Count columns (cells between pipes)
- Separator row: Verify format (`|---|---|...`)
- Data rows: Count columns in each row

c. **Validate consistency:**

```bash
# Pseudo-algorithm
for table in tables:
  header_cols = count_columns(table.header)
  separator_cols = count_columns(table.separator)

  # Check separator format
  if not separator.matches(/^\|[\s-]+(\|[\s-]+)+\|?$/):
    warn("Malformed separator")

  # Check each data row
  for row in table.data_rows:
    row_cols = count_columns(row)
    if row_cols != header_cols:
      warn(f"Column mismatch: header {header_cols}, row {row_cols}")
```

**Example Issues:**

**Issue 1: Column Count Mismatch**

```markdown
# Before (inconsistent)

| Tool  | Purpose       | Required |
| ----- | ------------- | -------- | --------- |
| Read  | File access   | Yes      |
| Write | File creation | Yes      | Sometimes |
```

**Issue 2: Malformed Separator**

```markdown
# Before (too short)

| Phase | Name  | Status |
| ----- | ----- | ------ |
| 1     | Check | Pass   |
```

**Issue 3: Mixed Formatting**

```markdown
# Before (inconsistent spacing)

| Phase | Name  | Status |
| ----- | ----- | ------ |
| 1     | Check | Pass   |
```

**Fix Patterns:**

**Pattern 1: Standardize Column Counts**

```markdown
# Before (inconsistent - 3/3/4 columns)

| Tool | Purpose     | Required |
| ---- | ----------- | -------- | --------- |
| Read | File access | Yes      | Sometimes |

# After (consistent - 4/4/4 columns)

| Tool | Purpose     | Required | Notes     |
| ---- | ----------- | -------- | --------- |
| Read | File access | Yes      | Sometimes |
```

**Pattern 2: Fix Separator Format**

```markdown
# Before (separator too short)

| Phase | Name | Status |
| ----- | ---- | ------ |

# After (proper separator with 3+ dashes)

| Phase | Name | Status |
| ----- | ---- | ------ |
```

**Pattern 3: Standardize Alignment**

Choose one style and stick with it:

```markdown
# Style 1: Compact (acceptable)

| Phase | Name  | Status |
| ----- | ----- | ------ |
| 1     | Check | Pass   |

# Style 2: Padded (preferred for readability)

| Phase | Name  | Status |
| ----- | ----- | ------ |
| 1     | Check | Pass   |

# Style 3: Minimum spacing (acceptable)

| Phase | Name  | Status |
| ----- | ----- | ------ |
| 1     | Check | Pass   |
```

**Manual Check Procedure:**

1. **Find all tables in agent file:**

   ```bash
   grep -n '^\|' .claude/agents/{category}/{agent-name}.md
   ```

2. **For each table:**
   - Count columns in header row
   - Verify separator row uses `|---|---|` pattern (3+ dashes per cell)
   - Check each data row has same column count as header
   - Verify consistent pipe spacing style

3. **Report findings:**
   - ✅ **PASS**: All tables properly formatted
   - ⚠️ **WARNING**: Formatting inconsistencies found

4. **Example output:**

   ```
   Phase 16: Markdown Table Formatting
   Tables found: 5

   Table 1 (line 42):
   ✅ Header: 3 columns
   ✅ Separator: Proper format |---|---|---|
   ✅ Data rows: All have 3 columns

   Table 2 (line 89):
   ✅ Header: 4 columns
   ⚠️  Separator: Uses single dash | - | - | - | - | (should be |---|---|---|---|)
   ✅ Data rows: All have 4 columns

   Table 3 (line 156):
   ⚠️  Header: 3 columns but missing trailing pipe
   ⚠️  Separator: 2 columns (header/separator mismatch)
   ⚠️  Row 2: 4 columns (header/data mismatch)

   Result: WARNING (2 tables with formatting issues)
   ```

**Why Manual?**

Table parsing requires context-aware analysis:

- Distinguishing table blocks from inline pipes
- Handling edge cases (escaped pipes, code blocks)
- Evaluating whether trailing pipes are required (parser-dependent)

Claude can perform this analysis with line-by-line reading and pattern matching.

**Why Important?**

- **Documentation quality**: Professional, consistent tables improve credibility
- **Maintainability**: Consistent structure easier to update
- **Parser compatibility**: Some parsers strict about table format
- **Readability**: Well-formatted tables easier to read in both source and rendered views

**Non-Blocking (WARNING):**

This is a quality check, not a critical failure. Agents function with poorly formatted tables, but documentation quality suffers.

**Testing After Fix:**

1. Run Phase 16 check again
2. Verify all tables have consistent column counts
3. Verify separators use proper format (3+ dashes)
4. Verify chosen alignment style is consistent throughout file

**Reference:** Based on GitHub Flavored Markdown table specification and documentation best practices.

---

## Issue 21: Skill Content Duplication (Warning - Phase 17)

**Symptom:**

```
⚠️  Content duplication detected (Phase 17)
  Lines 89-145: "React Component Patterns" section duplicates using-modern-react-patterns skill
  Lines 167-198: "TDD Workflow" section duplicates developing-with-tdd skill

  Suggested fix: Delete sections and add Tier 3 skill triggers instead
```

**What Phase 17 Checks:**

This phase detects when agent body content duplicates information that is already covered by existing skills. Agents should be lean coordinators that reference skills, not embed duplicate copies of skill content.

**The Problem:**

When agents embed detailed patterns, workflows, or methodologies that already exist in skills:

- **Agent bloat**: Same content in multiple places increases file size
- **Maintenance nightmare**: Updates must be made in agent AND skill
- **Version drift**: Agent version may become stale while skill is updated
- **Token waste**: Loading redundant content wastes context window
- **Architecture violation**: Defeats the lean agent pattern (<300 lines)

**Common Duplication Patterns:**

| Embedded Content                               | Should Reference Skill           |
| ---------------------------------------------- | -------------------------------- |
| TDD workflow (RED-GREEN-REFACTOR)              | `developing-with-tdd`            |
| Debugging steps (Reproduce-Isolate-Fix-Verify) | `debugging-systematically`       |
| Verification checklists                        | `verifying-before-completion`    |
| Refactoring guidance                           | `adhering-to-dry`                |
| Scope discipline                               | `adhering-to-yagni`              |
| Time estimation rules                          | `calibrating-time-estimates`     |
| Planning workflow                              | `writing-plans`                  |
| Brainstorming process                          | `brainstorming`                  |
| React patterns                                 | `using-modern-react-patterns`    |
| State management patterns                      | `using-zustand-state-management` |
| Testing patterns                               | `frontend-testing-patterns`      |

**Detection Method:**

Phase 17 uses reasoning-based analysis (manual check by Claude):

a. **Read agent body sections and identify instructional content:**

- Patterns, workflows, methodologies (>100 chars)
- Step-by-step processes or rules
- Technical guidance or best practices

b. **For each substantial section, reason about skill coverage:**

- Does this explain a pattern that a skill likely covers?
- Use common duplication targets list above as reference

c. **Search for matching skills:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude"
npm run -w @chariot/auditing-skills search -- "QUERY"
```

d. **Read candidate skill SKILL.md files to confirm overlap:**

- Does the skill cover the same workflow/pattern?
- Is the agent content a subset of what the skill provides?

e. **Report duplications with:**

- Section location (line numbers)
- Overlapping skill path
- Fix suggestion (delete + add Tier 3 trigger)

**Example Issue:**

```markdown
# Agent body with embedded TDD workflow (WRONG)

## Development Workflow

When implementing features, follow TDD:

1. Write a failing test first (RED phase)
2. Write minimal code to make it pass (GREEN phase)
3. Refactor while keeping tests green (REFACTOR phase)

Always verify tests actually fail before writing implementation...
[Additional TDD guidance for 50+ lines]
```

This duplicates content from `developing-with-tdd` skill.

**Fix Pattern:**

```markdown
# Before (embedded TDD workflow - 50+ lines)

## Development Workflow

When implementing features, follow TDD:

1. Write a failing test first (RED phase)
2. Write minimal code to make it pass (GREEN phase)
3. Refactor while keeping tests green (REFACTOR phase)
   ...

# After (Tier 3 skill reference - 2 lines)

### Tier 3: Triggered by Task Type

| Trigger               | Read Path                                     |
| --------------------- | --------------------------------------------- |
| Implementing features | `.claude/skills/developing-with-tdd/SKILL.md` |
```

**Fix Procedure:**

1. **Identify duplicated sections** using Phase 17 analysis
2. **Delete the embedded content** from agent body
3. **Add skill to Tier 3** (if not already present):
   ```markdown
   ### Tier 3: Triggered by Task Type

   | Trigger                           | Read Path                            |
   | --------------------------------- | ------------------------------------ |
   | [task that triggers this content] | `.claude/skill-library/.../SKILL.md` |
   ```
4. **Verify skill is accessible** via appropriate gateway
5. **Re-audit** to confirm no remaining duplications

**Why Manual?**

This is a reasoning/judgment task that requires:

- **Semantic understanding**: What does the content "mean"?
- **Comparison**: Is it truly duplicated vs agent-specific context?
- **Skill knowledge**: Which skills cover which patterns?
- **Decision-making**: What's the appropriate fix?

Cannot be automated with simple pattern matching - requires Claude's reasoning capabilities.

**Why Important?**

The lean agent pattern (<300 lines) depends on agents being coordinators that delegate to skills, not bloated files that duplicate skill content. Content duplication is a primary cause of agent bloat:

**Empirical example:**

- `frontend-developer` (gold standard): 130 lines, no embedded patterns
- Bloated agent with duplications: 400+ lines, same functionality

Content duplication directly violates the progressive loading architecture where skills load on-demand via Tier 3 triggers.

**Testing After Fix:**

1. Run Phase 17 check again
2. Verify all instructional content either:
   - Is agent-specific (not covered by any skill)
   - Is referenced via Tier 3 (not embedded)
3. Check line count reduction (should be significant)
4. Test agent invocation to confirm skill loading works

**Reference:** Lean agent pattern and progressive loading architecture design.
