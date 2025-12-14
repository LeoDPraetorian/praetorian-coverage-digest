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
skills: gateway-frontend  # ← Add gateway for progressive loading
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
```markdown
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
```

**Why:** Standardized output enables clean agent coordination and handoffs.

### Issue 11: Missing Escalation Protocol (Warning)

**Symptom:**
```
⚠️  No Escalation Protocol section (body)
  Define when to stop and which agent to recommend
```

**Fix:** Add this section to agent body:
```markdown
## Escalation Protocol

**Stop and escalate if**:
- [Condition 1] → Recommend `agent-name`
- [Condition 2] → Recommend `agent-name`
- Blocked by unclear requirements → Use AskUserQuestion tool
```

**Why:** Clear boundaries prevent agents from wandering outside their expertise.

### Issue 12: Missing Explicit Skill Invocation (Warning - Phase 9)

**Symptom:**
```
⚠️  No Explicit Skill Invocation block (body)
  Agents with mandatory skills should enforce explicit invocation
```

**What Phase 9 Checks:**

This phase verifies that agents with `skills:` in frontmatter enforce explicit skill invocation. This is **separate from Phase 4** which validates the `skills:` frontmatter field exists.

**Key Distinction:**
- **Phase 4**: Checks `skills:` frontmatter field is present (skill availability)
- **Phase 9**: Checks agent body mandates explicit invocation (skill usage enforcement)

**The Problem:**

Having `skills: gateway-frontend` in frontmatter makes skills **available**, but does NOT make them **automatically invoked**. Agents frequently rationalize skipping workflows:
- "This is just a simple feature" → Skips TDD
- "I can implement this quickly" → Skips systematic debugging
- "The skill is overkill" → Ignores mandatory workflows

**Empirical Evidence:**

Based on obra/superpowers pattern analysis, agents without explicit enforcement bypass mandatory skills **~80% of the time** through rationalization.

**The Solution:**

Add an `EXTREMELY_IMPORTANT` block at the **top of the agent prompt** (after frontmatter, before role statement) with:

1. **"You MUST explicitly invoke"** - Absolute language (not "should" or "consider")
2. **Per-skill invocation syntax** - Shows exact Skill tool invocation
3. **Anti-rationalization patterns** - Preemptively counters common shortcuts
4. **Validation warning** - States consequences of non-compliance

**Template:**

```markdown
<EXTREMELY_IMPORTANT>
You MUST explicitly invoke mandatory skills using the Skill tool. This is not optional.

Before starting ANY implementation task:
1. Check if it matches a mandatory skill trigger
2. If yes, invoke the skill with: `skill: "skill-name"`
3. Show the invocation in your output
4. Follow the skill's instructions exactly

**Mandatory Skills:**

**developing-with-tdd:**
- Trigger: Before writing any implementation code or fixes
- Invocation: `skill: "developing-with-tdd"`
- Ensures: Tests exist and fail before implementation (RED-GREEN-REFACTOR)

**debugging-systematically:**
- Trigger: Before proposing fixes for any bug or error
- Invocation: `skill: "debugging-systematically"`
- Ensures: Root cause investigation before solutions

**verifying-before-completion:**
- Trigger: Before claiming work is complete, passing, or fixed
- Invocation: `skill: "verifying-before-completion"`
- Ensures: Verification commands run and output confirmed

Common rationalizations to avoid:
- ❌ "This is just a simple feature" → NO. Check for skills.
- ❌ "I can implement this quickly" → NO. Invoke skills first.
- ❌ "The skill is overkill" → NO. If a skill exists, use it.
- ❌ "I know the principles, don't need to invoke" → NO. Show invocation.

If you skip mandatory skill invocation, your work will fail validation.
</EXTREMELY_IMPORTANT>

# Agent Name

You are [role statement]...
```

**Key Requirements:**

1. **Placement**: After frontmatter, before role statement
2. **Absolute Language**: "MUST", "not optional", "cannot rationalize"
3. **Explicit Invocation Syntax**: Show exact `skill: "name"` for each mandatory skill
4. **Anti-Rationalization Patterns**: List common shortcuts with counters
5. **Validation Warning**: State consequences ("work will fail validation")

**Behavioral vs Process Compliance:**

- **Behavioral Compliance**: Agent follows TDD principles in implementation
- **Process Compliance**: Agent explicitly shows `skill: "developing-with-tdd"` invocation

Phase 9 checks for **process compliance** - the explicit invocation must be visible in the agent's output.

**Testing Requirements:**

After adding/updating the EXTREMELY_IMPORTANT block, test in a **fresh session** (agent metadata caches at session start):

```
Test: Ask agent to implement a feature
Expected: Agent explicitly shows skill invocation before implementation
If missing: Agent bypassed enforcement through rationalization
```

**Why This Works:**

Based on obra/superpowers analysis:
- Absolute language ("MUST", "not optional") reduces bypass rate from ~80% to ~10%
- Anti-rationalization patterns preemptively counter agent shortcuts
- Explicit validation warning establishes clear consequences
- Process compliance (showing invocation) is easier to verify than behavioral compliance

**Reference:** Based on obra/superpowers mandatory skill enforcement pattern.

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
skills: gateway-react  # ← Renamed to gateway-frontend
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
  Path: .claude/skill-library/development/frontend/patterns/using-modern-react-patterns/
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
skills: using-modern-react-patterns  # 1500 tokens loaded immediately
---

# ✅ CORRECT: Gateway skill in frontmatter (loads on-demand)
---
name: frontend-architect
description: Use when designing React architecture
skills: gateway-frontend  # 200 tokens, loads library skills when needed
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

| Library Category | Appropriate Gateway |
|------------------|---------------------|
| `development/frontend/*` | `gateway-frontend` |
| `development/backend/*` | `gateway-backend` |
| `testing/*` | `gateway-testing` |
| `security/*` | `gateway-security` |
| `claude/mcp-tools/*` | `gateway-mcp-tools` |
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
   Path: .claude/skill-library/development/frontend/patterns/using-modern-react-patterns/
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

