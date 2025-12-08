# Agent Update Workflow

> **⚠️ DEPRECATION NOTICE (December 2024)**
>
> **This workflow documents ARCHIVED CLI commands (`npm run update`).**
>
> **For agent updates, use the instruction-based skill instead:**
> ```
> skill: "updating-agents"
> ```
>
> **Why the change?** Analysis showed Edit tool + instructions achieve the same result as TypeScript code with more flexibility. The instruction-based workflow provides:
> - Simplified 6-phase TDD (RED-GREEN with optional REFACTOR)
> - Minimal diff approach using Edit tool
> - Conditional pressure testing for major changes
> - Fast iteration (~20 min for minor updates)
>
> **See:** `.claude/skills/updating-agents/SKILL.md` for the current workflow
>
> ---
>
> **The content below is kept for historical reference only.**

## Overview (ARCHIVED)

Updating an agent follows a TDD workflow to ensure changes don't break existing functionality:
1. **RED**: Document current state and desired changes
2. **GREEN**: Apply minimal changes
3. **REFACTOR**: Re-audit and verify

## Quick Start

```bash
# Update with change description
npm run --silent update -- react-developer "Add support for React 19 features"

# Get improvement suggestions
npm run --silent update -- react-developer --suggest

# Create backup before changes
npm run --silent update -- react-developer "Major refactoring" --backup
```

## Command Reference

```bash
npm run --silent update -- <name> "<changes>"
npm run --silent update -- <name> --suggest
npm run --silent update -- <name> "<changes>" --backup
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Agent name to update |
| `changes` | Yes (unless --suggest) | Description of changes |
| `--suggest` | No | Show audit-based suggestions |
| `--backup` | No | Create backup before changes |

## TDD Workflow

### Phase 1: RED - Document Current State

The update command shows:
- Current line count
- Description status
- Gateway skill presence
- Output format presence
- Escalation protocol presence

```bash
npm run --silent update -- react-developer "Add support for new patterns"

# Output:
# ═══ TDD Phase: RED ═══
# Current agent state:
#   Lines: 336
#   Description Status: valid
#   Has Gateway Skill: ✅
#   Has Output Format: ✅
#   Has Escalation: ✅
#
# Requested changes: Add support for new patterns
```

### Phase 2: GREEN - Apply Minimal Changes

1. Open the agent file
2. Make the requested changes
3. Keep changes minimal and focused

**Key principle**: Only change what's necessary. Don't refactor unrelated code.

### Phase 3: REFACTOR - Re-audit and Verify

```bash
# Run audit after changes
npm run --silent audit -- react-developer

# Test discovery
npm run --silent test -- react-developer
```

## Improvement Suggestions

Use `--suggest` to see audit-based improvements:

```bash
npm run --silent update -- react-developer --suggest

# Output:
# ═══ Suggested Improvements ═══
# Found 6 potential improvements:
#
# Phase 3: Prompt Efficiency
#   [MANUAL] phase3-trim: Extract patterns to skills
#     → Agent is 336 lines (target: <300)
#
# Phase 4: Skill Integration
#   [AUTO] phase4-gateway: Add gateway-frontend to skills
```

## Backup Strategy

For significant changes, use `--backup`:

```bash
npm run --silent update -- react-developer "Major restructuring" --backup

# Creates: react-developer.backup-1234567890.md
```

Backups are stored alongside the original file.

## Common Update Scenarios

### Adding a New Responsibility

1. Document what gap exists
2. Add to Core Responsibilities section
3. Add relevant skill reference
4. Update escalation if needed
5. Re-audit

### Reducing Line Count

1. Use `npm run --silent update -- <name> --suggest`
2. Identify embedded patterns
3. Move patterns to skill files
4. Replace with skill references
5. Re-audit to verify <300 lines

### Fixing Block Scalar

```bash
# Identify the issue
npm run --silent test -- <name>

# Fix automatically
npm run --silent fix -- <name> --apply phase1-description
```

### Adding Gateway Skill

```bash
# Fix automatically
npm run --silent fix -- <name> --apply phase4-gateway

# Or manually add to frontmatter:
# skills: gateway-frontend
```

### Updating Description

1. Keep single-line format
2. Start with "Use when"
3. Include capabilities
4. Add examples with `\n\n<example>...\n</example>`

## Update Checklist

Before completing an update:

- [ ] Changes are minimal and focused
- [ ] No regressions introduced
- [ ] Line count still within limits
- [ ] `npm run --silent audit -- <name>` passes
- [ ] `npm run --silent test -- <name>` passes
- [ ] Discovery works in new session

## Example: Updating an Agent

```bash
# 1. Check current state
npm run --silent update -- react-developer --suggest

# 2. Document changes
npm run --silent update -- react-developer "Add React 19 concurrent features support"

# 3. Open file and make changes (manual step)
# - Add concurrent features to responsibilities
# - Add skill reference for react-19-patterns
# - Update escalation for React 19 edge cases

# 4. Re-audit
npm run --silent audit -- react-developer

# 5. Test
npm run --silent test -- react-developer

# 6. Verify in new session
```

## Handling Warnings vs Errors

**Errors** (must fix):
- Block scalar in description
- Line count > 400
- Missing required fields

**Warnings** (should fix):
- Line count > 250
- No gateway skill
- Missing examples
- No output format

## References

- [Fix Workflow](./fix-workflow.md)
- [Audit Phases](./audit-phases.md)
- [Lean Agent Template](./lean-agent-template.md)
