# Claude-Automated Fix Instructions

**Detailed procedures for Claude-Automated phases (1, 3, 6, 9, 14, 15).**

Claude applies these fixes directly using Edit tool. No human confirmation needed - these require semantic understanding but have clear correct outcomes.

---

## Phase 1: PermissionMode Alignment

**When:** PermissionMode doesn't match agent type

**Process:**

1. Read agent `type:` field
2. Check expected permissionMode:
   - `architecture`, `quality`, `analysis` → `plan` (read-only)
   - All others (`development`, `testing`, `orchestrator`) → `default`
3. If mismatch, update with Edit tool:

   ```yaml
   # Before (security risk)
   type: architecture
   permissionMode: default

   # After (correct)
   type: architecture
   permissionMode: plan
   ```

**Why automated:** Type mapping is deterministic, but requires understanding agent purpose.

---

## Phase 3: Tool Validation

**When:** Missing required tools or forbidden tools present

**Process:**

1. Read agent `type:` and `tools:` fields
2. Check required tools by type:
   - `development` → Must have: `Edit`, `Write`, `Bash`
   - `testing` → Must have: `Bash`
3. Check forbidden tools by type:
   - `quality`, `analysis` → Must NOT have: `Edit`, `Write` (read-only)
4. Add missing required tools or remove forbidden tools with Edit tool

**Example fix:**

```yaml
# Before (quality agent with Edit/Write)
type: quality
tools: Read, Glob, Grep, Edit, Write, TodoWrite

# After (read-only as required)
type: quality
tools: Read, Glob, Grep, TodoWrite
```

**Why automated:** Tool rules are clear per agent type.

---

## Phase 6: Pattern Delegation

**When:** Agent embeds >200 chars of TDD/debugging/verification patterns

**Process:**

1. Search agent body for embedded workflow patterns:
   - TDD workflow (RED-GREEN-REFACTOR keywords)
   - Debugging steps (Reproduce-Isolate-Fix-Verify keywords)
   - Verification checklists (>5 checklist items)
2. If >200 chars of pattern content found:
   - Remove embedded pattern from agent body
   - Add skill reference in Tier 3 (if Skill Loading Protocol exists)
   - Or add to frontmatter `skills:` field (if no protocol)

**Example fix:**

```markdown
# Before (embedded TDD workflow in agent)

## Development Workflow

When implementing features:

1. Write failing test first (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while tests pass (REFACTOR)
   [... 15 more lines ...]

# After (delegates to skill)

### Tier 3: Triggered by Task Type

| Trigger               | Read Path                                     |
| --------------------- | --------------------------------------------- |
| Implementing features | `.claude/skills/developing-with-tdd/SKILL.md` |
```

**Why automated:** Pattern detection requires semantic understanding, but removal is straightforward once detected.

---

## Phase 8: Core Responsibilities

**When:** Agent lacks "## Core Responsibilities" section defining its primary duties

**Process:**

1. Check if agent has "## Core Responsibilities" section
2. If missing:
   - Create section with 2-4 subsections based on agent type
   - Define specific responsibilities for each area
   - Insert before "## Skill Loading Protocol" section
   - Use agent description and type to guide content

**Template Structure:**

```markdown
## Core Responsibilities

### [Primary Area 1]

- [Specific responsibility 1]
- [Specific responsibility 2]
- [Specific responsibility 3]

### [Primary Area 2]

- [Specific responsibility 1]
- [Specific responsibility 2]

### [Primary Area 3]

- [Specific responsibility 1]
- [Specific responsibility 2]
```

**Examples by Agent Type:**

**Development agent:**
- Plan Execution (follow architect's plans)
- Bug Fixes & Performance (debug, optimize)
- Code Quality (standards, patterns, conventions)

**Architecture agent:**
- Design Review (evaluate existing architecture)
- Architecture Design (create implementation plans)
- Pattern Validation (ensure best practices)

**Testing agent:**
- Test Creation (unit, integration, E2E)
- Test Maintenance (fix flaky tests, refactor)
- Coverage Validation (ensure thresholds met)

**Quality agent:**
- Code Review (validate implementations against plans)
- Quality Standards (check conventions, patterns)
- Feedback Delivery (constructive improvement suggestions)

**Why automated:** Template-based with clear patterns per agent type.

---

## Phase 9: Skill Loading Protocol

**When:** Agent has `skills:` frontmatter but no Skill Loading Protocol section

**Process:**

1. Check if agent has `skills:` in frontmatter
2. If yes but no "## Skill Loading Protocol" section found:
   - Add two-tier intro (core vs library skills)
   - Generate complete protocol with Step 1/2/3 structure
   - Add Anti-Bypass section (5-6 detailed points)
   - Add skills_invoked + library_skills_read output requirement
   - Insert before "## See Also" or at end of file

**Template:**

````markdown
## Skill Loading Protocol

- **Core skills** (in `.claude/skills/`): Invoke via Skill tool → `skill: "skill-name"`
- **Library skills** (in `.claude/skill-library/`): Load via Read tool → `Read("path/from/gateway")`

**Library skill paths come FROM the gateway—do NOT hardcode them.**

### Step 1: Always Invoke First

**Every [agent-type] task requires these (in order):**

| Skill                               | Why Always Invoke                                                  |
| ----------------------------------- | ------------------------------------------------------------------ |
| `calibrating-time-estimates`        | Prevents "no time to read skills" rationalization, grounds efforts |
| `gateway-[domain]`                  | Routes to mandatory + task-specific library skills                 |
| `enforcing-evidence-based-analysis` | **Prevents hallucinations** - read source before implementing      |
| `verifying-before-completion`       | Ensures outputs are verified before claiming done                  |

### Step 2: Invoke Core Skills Based on Task Context

Your `skills` frontmatter makes these core skills available. **Invoke based on semantic relevance to your task**:

| Trigger                         | Skill                               | When to Invoke                                       |
| ------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| [Add task-specific triggers]    | [skill-name]                        | [Description of when to use]                         |

### Step 3: Load Library Skills from Gateway

**DO NOT hardcode library skill paths.** Instead, read the gateway skill to discover which library skills apply to your task:

1. You already invoked `gateway-[domain]` in Step 1
2. The gateway tells you which library skills to load
3. Use Read tool with paths from gateway: `Read(".claude/skill-library/.../SKILL.md")`

## Anti-Bypass

**Common rationalizations that indicate you're about to skip required skills:**

- "This is simple, don't need skills" → WRONG. Skills prevent known mistakes. Read them.
- "Just a quick fix" → WRONG. Quick fixes create long debugging sessions. Verify first.
- "This will only take a minute" → WRONG. You're 10-24x off. Calibrate estimates.
- "I already know this pattern" → WRONG. Skills evolve. Read the current version.
- "Skills are overkill for this" → WRONG. Skills exist because simple things become complex.
- "Let me just do this one thing first" → WRONG. Check for skills BEFORE doing anything.

**Output Format:**

All agent responses must include:

```json
{
  "status": "success|in_progress|blocked",
  "summary": "What was accomplished",
  "skills_invoked": ["core-skill-1", "core-skill-2"],
  "library_skills_read": [".claude/skill-library/.../SKILL.md"],
  "next_steps": ["What to do next"]
}
```
````

````

**Generation logic:**
1. Add two-tier intro explaining core vs library skills
2. Extract all skills from frontmatter `skills:` field
3. Add to Step 1 with brief descriptions (mandatory/always-invoke skills)
4. Create Step 2 table with semantic triggers (conditional core skills)
5. Add Step 3 with gateway delegation instructions
6. Add 5-6 detailed Anti-Bypass points with explanations
7. Add skills_invoked + library_skills_read output format

**Why automated:** Template-based generation from frontmatter skills with clear structure.

---

## Phase 14: Deprecated Pattern Detection

**When:** Agent contains `<EXTREMELY_IMPORTANT>` blocks or duplicate sections

**Process:**
1. Search for deprecated patterns:
   - `<EXTREMELY_IMPORTANT>` ... `</EXTREMELY_IMPORTANT>` blocks
   - "## Mandatory Skills (Must Use)" sections (when "## Skill Loading Protocol" also exists)
   - "## Rationalization Table" sections (when "## Anti-Bypass" also exists)
   - Duplicate skill trigger tables (multiple sections with trigger mappings)
2. Delete entire deprecated blocks with Edit tool
3. Consolidate duplicates into Skill Loading Protocol

**Example:**
```markdown
# Before (duplicate pattern - 276 deletable lines)
<EXTREMELY_IMPORTANT>
Skills you must use...
</EXTREMELY_IMPORTANT>

## Mandatory Skills (Must Use)
[Duplication of Tier 1/2/3]

## Skill Loading Protocol
[Same content again]

# After (consolidated - clean)
## Skill Loading Protocol
[Single source of truth]
````

**Why automated:** Structural patterns are clear to detect. These deletions often recover 100-300 lines.

---

## Phase 15: Library Skill Path Validation

**When:** Skill paths point to renamed/moved/deleted skills

**Process:**

1. Extract all library skill paths from agent body:
   ```bash
   grep -oE '\.claude/skill-library/[^)]+/SKILL\.md' agent.md
   ```
2. For each path, verify file exists
3. For broken paths:
   - Extract skill name from path (last directory before /SKILL.md)
   - Search for skill: `find .claude/skill-library -name "{skill-name}" -type d`
   - If found elsewhere, update path
   - If not found, check common renames:
     - `frontend-tanstack-query` → `using-tanstack-query`
     - `frontend-react-patterns` → `using-modern-react-patterns`
   - Remove reference if skill deleted
4. Apply path corrections with Edit tool

**Example fix:**

```markdown
# Before (outdated path)

Read('.claude/skill-library/development/frontend/frontend-tanstack-query/SKILL.md')

# After (correct path)

Read('.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md')
```

**Why automated:** Path resolution is deterministic - either skill exists at new location or it doesn't.

---

## Summary

All 6 Claude-Automated phases share these characteristics:

- **No user confirmation** - Claude applies directly
- **Clear correct outcome** - Only one right answer
- **Semantic understanding required** - Can't be pure regex/CLI
- **Safe to apply** - Changes are reversible via backup

**For categorization of all phases, see:** [Phase Categorization](../phase-categorization.md)
