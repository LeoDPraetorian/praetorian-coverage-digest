# Integration Section Guidance

## Overview

Every skill MUST include an Integration section documenting dependencies. This is validated by Phase 28 of the audit.

Based on [obra/superpowers](https://github.com/obra/superpowers) analysis, skills with explicit Integration sections are never orphaned, have clear dependencies, and form traceable workflow chains.

## Required Structure (Bullet List Format)

```markdown
## Integration

### Called By

- `gateway-name` (CORE) - Purpose description
- `skill-name` (LIBRARY) - Purpose
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

### Requires (invoke before starting)

- **`skill-name`** (LIBRARY) - When condition
  - Purpose: What this skill provides
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None - entry point skill'

### Calls (during execution)

- **`skill-name`** (LIBRARY) - Phase/Step N
  - Purpose: What this skill does
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None - terminal skill'

### Pairs With (conditional)

- **`skill-name`** (LIBRARY) - Trigger condition
  - Purpose: Why paired
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None'
```

## Skill Reference Validation (MANDATORY)

Before adding ANY skill reference to Integration, validate its location:

```bash
SKILL_NAME='skill-to-reference'
if [ -f '.claude/skills/$SKILL_NAME/SKILL.md' ]; then
  echo 'CORE: Use `$SKILL_NAME` (CORE) - no Read() path needed'
elif find .claude/skill-library -type f -path "*/$SKILL_NAME/SKILL.md" 2>/dev/null | grep -q .; then
  PATH=$(find .claude/skill-library -type f -path "*/$SKILL_NAME/SKILL.md" | head -1)
  echo 'LIBRARY: Use `$SKILL_NAME` (LIBRARY) with Read() path on sub-bullet'
  echo "  - \`Read(\"$PATH\")\`"
else
  echo 'NOT FOUND: Do not add - skill does not exist'
fi
```

**Format rules:**

- CORE skills: `skill-name` (CORE) - Purpose (no Read() path)
- LIBRARY skills: `skill-name` (LIBRARY) - Purpose, then Read() path on indented sub-bullet

**If no dependencies**: Include section with 'None - standalone skill' or 'None - terminal skill'

## Related Skills Section is OBSOLETE

Do NOT create a '## Related Skills' section. All skill relationships belong in the Integration section:

- Skills that call this one → Called By
- Prerequisites → Requires
- Skills invoked during execution → Calls
- Conditional pairings → Pairs With

If migrating an existing skill with Related Skills, move content to Integration and delete Related Skills.

## Deprecated: Table Format

Table format for Integration sections is deprecated. If you encounter existing skills using tables:

- They will be flagged as WARNING during audit
- Convert to bullet list format when updating

## Integration Subsection Guidance

### Called By

List all skills, commands, or agents that invoke this skill:

- Gateway skills (CORE) that route to this skill
- Parent orchestrator skills (LIBRARY) that spawn this skill
- Slash commands that execute this skill
- Agent types that reference this skill

If nothing invokes this skill (orphaned), document why and consider:

- Adding to appropriate gateway
- Creating documentation references
- Verifying this is truly an entry point skill

### Requires (invoke before starting)

List skills that must be loaded/invoked BEFORE this skill starts:

- Configuration or setup skills
- Prerequisite validation skills
- Context-gathering skills

Use 'None - entry point skill' if this skill has no prerequisites.

### Calls (during execution)

List skills invoked DURING this skill's execution:

- Delegated sub-tasks
- Validation skills
- Helper utilities

Document the Phase/Step where each skill is called.

Use 'None - terminal skill' if this skill performs all work directly without delegating.

### Pairs With (conditional)

List skills that work alongside this one in specific scenarios:

- Alternative approaches for different conditions
- Complementary skills for related workflows
- Recovery or fallback skills

Document the trigger condition that determines when pairing occurs.

Use 'None' if this skill operates independently without conditional pairings.

## Examples

### Example 1: Entry Point Orchestrator

```markdown
## Integration

### Called By

- `/feature` command - Complete feature development workflow
- `gateway-frontend` (CORE) - Routes frontend feature requests

### Requires (invoke before starting)

None - entry point skill

### Calls (during execution)

- **`brainstorming`** (CORE) - Phase 1
  - Purpose: Refine requirements and explore alternatives
- **`discovering-codebases-for-planning`** (CORE) - Phase 2
  - Purpose: Exhaustive codebase discovery
- **`writing-plans`** (CORE) - Phase 3
  - Purpose: Create implementation plan
- **`frontend-developer`** (AGENT) - Phase 4
  - Purpose: Implement plan via agent
- **`frontend-reviewer`** (AGENT) - Phase 5
  - Purpose: Code review via agent
- **`frontend-tester`** (AGENT) - Phase 6
  - Purpose: Test implementation via agent

### Pairs With (conditional)

- **`debugging-systematically`** (CORE) - When Phase 4+ fails
  - Purpose: Root cause analysis for failures
- **`verifying-before-completion`** (CORE) - Before claiming complete
  - Purpose: Final validation checklist
```

### Example 2: Library Utility Skill

```markdown
## Integration

### Called By

- **`orchestrating-feature-development`** (CORE) - Phase 2 discovery
- **`orchestrating-integration-development`** (LIBRARY) `Read(".claude/skill-library/development/integrations/orchestrating-integration-development/SKILL.md")` - Phase 2 discovery
- **`orchestrating-capability-development`** (LIBRARY) `Read(".claude/skill-library/development/capabilities/orchestrating-capability-development/SKILL.md")` - Phase 2 discovery

### Requires (invoke before starting)

None - standalone utility

### Calls (during execution)

None - terminal skill

### Pairs With (conditional)

- **`discovering-reusable-code`** (CORE) - After discovery complete
  - Purpose: Reusability analysis of discovered patterns
  - `Read('.claude/skills/discovering-reusable-code/SKILL.md')`
```

### Example 3: Gateway Router

```markdown
## Integration

### Called By

- `/skill-manager` command - All skill management operations
- User direct invocation via `skill: "managing-skills"`

### Requires (invoke before starting)

None - entry point router

### Calls (during execution)

- **`creating-skills`** (LIBRARY) - When user creates
  - Purpose: Delegates skill creation
  - `Read('.claude/skill-library/claude/skill-management/creating-skills/SKILL.md')`
- **`updating-skills`** (LIBRARY) - When user updates
  - Purpose: Delegates skill updates
  - `Read('.claude/skill-library/claude/skill-management/updating-skills/SKILL.md')`
- **`auditing-skills`** (LIBRARY) - When user audits
  - Purpose: Delegates compliance audit
  - `Read('.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md')`

### Pairs With (conditional)

- **`debugging-systematically`** (CORE) - When operations fail
  - Purpose: Root cause analysis
```
