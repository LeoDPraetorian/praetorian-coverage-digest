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
| Trigger | Read Path |
|---------|-----------|
| Implementing features | `.claude/skills/developing-with-tdd/SKILL.md` |
```

**Why automated:** Pattern detection requires semantic understanding, but removal is straightforward once detected.

---

## Phase 9: Skill Loading Protocol

**When:** Agent has `skills:` frontmatter but no Tiered Skill Loading Protocol section

**Process:**
1. Check if agent has `skills:` in frontmatter
2. If yes but no "## Skill Loading Protocol" section found:
   - Generate complete protocol with Tier 1/2/3 structure
   - Add Anti-Bypass section
   - Add skills_read output requirement
   - Insert before "## See Also" or at end of file

**Template:**
```markdown
## Skill Loading Protocol

### Tier 1: Always Load (Session Start)

Core skills in frontmatter:
- `verifying-before-completion` - Final validation before claiming complete
- `calibrating-time-estimates` - Prevent 10-24x time overestimates
- `gateway-frontend` - Progressive loading of React/TypeScript patterns

### Tier 2: Conditional Loading

**When task requires ≥2 steps** (uses TodoWrite or detects multi-phase workflow):

Read `.claude/skills/using-todowrite/SKILL.md` for:
- Mandatory TodoWrite usage for ≥2 step workflows
- Prevents skipped steps in multi-phase work

### Tier 3: Triggered by Task Type

| Trigger | Read Path |
|---------|-----------|
| [Add task-specific triggers here] | [Path to skill] |

## Anti-Bypass

**Common rationalizations that indicate you're about to skip required skills:**
- "This is simple, don't need TodoWrite" → WRONG, ≥2 steps always needs tracking
- "Just a quick fix" → WRONG, verify before claiming complete
- "This will only take a minute" → WRONG, calibrate time estimates

**Output Format:**

All agent responses must include:
```json
{
  "status": "success|in_progress|blocked",
  "summary": "What was accomplished",
  "skills_read": ["skill-name-1", "skill-name-2"],
  "next_steps": ["What to do next"]
}
```
```

**Generation logic:**
1. Extract all skills from frontmatter `skills:` field
2. Add to Tier 1 with brief descriptions
3. Add Tier 2 for using-todowrite (MANDATORY for all agents)
4. Create empty Tier 3 table (user adds task-specific triggers)
5. Add standard Anti-Bypass rationalizations
6. Add skills_read output format

**Why automated:** Template-based generation from frontmatter skills.

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
```

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
