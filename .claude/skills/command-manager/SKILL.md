---
name: command-manager
description: Use when creating, auditing, fixing, or listing slash commands - enforces Router Pattern (commands delegate to skills), validates frontmatter compliance, detects Tool/Logic Leakage
allowed-tools: Bash, Edit, Glob, Grep, Read, Write
---

# Command Manager

## Overview

Unified command lifecycle management with Router Pattern enforcement.

**Core principle:** Commands are "Dumb Routers" — they parse arguments, validate inputs, and delegate to Skills. They contain ZERO business logic.

**MANDATORY:** You MUST use TodoWrite before starting to track all steps in the audit/fix workflow.

## Quick Reference

| Operation | Command                               | Description                            |
| --------- | ------------------------------------- | -------------------------------------- |
| Create    | `npm run create -- <name> ["desc"]`   | Create new command with Router Pattern |
| Audit     | `npm run audit -- [name]`             | Validate command compliance (8 checks) |
| Audit     | `npm run audit -- <name> --phase N`   | Run specific audit phase (1-8)         |
| Fix       | `npm run fix -- <name> [--dry-run]`   | Auto-fix compliance issues             |
| List      | `npm run list`                        | Show all commands with status          |

**CLI Location:** `.claude/skills/command-manager/scripts/`

## Router Pattern

### What Is It?

Commands should delegate to Skills, not execute logic directly.

**Router Pattern command:**
```yaml
---
description: Create and audit slash commands
allowed-tools: Skill, AskUserQuestion
skills: command-manager
---

Invoke the `command-manager` skill.
**Output:** Display the tool output verbatim.
```

**Direct command (only when no skill exists):**
```yaml
---
description: Show git status
allowed-tools: Bash(git:*)
---

Execute: !`git status`
```

### Why It Matters

| Aspect | Without Router Pattern | With Router Pattern |
|--------|----------------------|---------------------|
| Token usage | Commands loaded every invocation | Skills loaded on-demand |
| Safety | LLM can work around failures | Forced to report failures |
| Maintainability | Logic scattered | Logic centralized in skills |

**Details:** [references/router-pattern.md](references/router-pattern.md)

## Operations

### Create Command

**Usage:**
```bash
cd .claude/skill-library/claude/commands/command-manager/scripts
npm run create -- my-command "Brief description"
```

**Workflow:**
1. Prompts for command details
2. Detects if backing skill exists → uses Router Pattern template
3. Generates command file with proper frontmatter
4. Runs immediate audit to validate

**Output:** Command file created at `.claude/commands/my-command.md`

### Audit Command

**Usage:**
```bash
# Audit specific command
npm run audit -- my-command

# Audit all commands
npm run audit
```

**8-Check Protocol:**
1. Frontmatter presence
2. Required fields (description)
3. Optional recommended fields
4. Argument handling patterns
5. Tool permission declarations
6. Documentation quality
7. Structure best practices
8. **Router Pattern compliance**

**Output:** Compliance report with severity ratings

### Fix Command

**Usage:**
```bash
# Dry run (show what would change)
npm run fix -- my-command --dry-run

# Apply fixes
npm run fix -- my-command
```

**Auto-fixes:**
- Removes unnecessary tools from `allowed-tools`
- Adds verbatim output directive
- Optimizes description to < 120 chars
- Adds `argument-hint` if missing

**Output:** Fix report with before/after

### List Commands

**Usage:**
```bash
npm run list
```

**Output:** Table showing all commands with compliance status

| Command | Description | Status |
|---------|-------------|--------|
| agent-manager | Agent management | ⚠️ WARN |
| skill-manager | Skill management | ✅ PASS |
| plan-execute | Execute plans | ✅ PASS |

## Tool Restrictions

### When to Allow Which Tools

| Scenario | Allowed Tools | Rationale |
|----------|---------------|-----------|
| Delegates to skill | `Skill, AskUserQuestion` | Skill has all tools it needs |
| Direct git commands | `Bash(git:*)` | No skill exists for raw git |
| File listing | `Bash(ls:*)`, `Glob` | Simple system utility |
| Complex logic | NONE in command | Move to skill |

**Decision tree:** [references/tool-restrictions.md](references/tool-restrictions.md)

## Compliance Checks

### Check 8: Router Pattern (CRITICAL)

**Violations detected:**

| Issue | Severity | Fix |
|-------|----------|-----|
| Has `skills:` + extra tools | CRITICAL | Remove extra tools |
| Vague instructions | CRITICAL | Use imperative language |
| Missing verbatim output | WARNING | Add directive |
| Command > 50 lines | WARNING | Move logic to skill |
| No argument mapping | WARNING | Add explicit mapping |

**Example violation:**
```yaml
# BAD: Tool Leakage
---
allowed-tools: Skill, Bash, Read, AskUserQuestion
skills: my-skill
---
```

**Fixed:**
```yaml
# GOOD: Router Pattern
---
allowed-tools: Skill, AskUserQuestion
skills: my-skill
---
```

## Command Lifecycle

```
┌──────────┐     ┌───────┐     ┌─────┐     ┌──────┐
│  Create  │────▶│ Audit │────▶│ Fix │────▶│ Test │
└──────────┘     └───────┘     └─────┘     └──────┘
                     │                         │
                     ▼                         ▼
                 PASS? ──────────────────▶ Deploy
```

**Details:** [references/command-lifecycle.md](references/command-lifecycle.md)

## CLI Integration

### Setup

```bash
cd .claude/skill-library/claude/commands/command-manager/scripts
npm install
```

### Commands

```bash
# Create new command
npm run create -- <name> [description]

# Audit command(s)
npm run audit -- [name] [--phase N]

# Fix command issues
npm run fix -- <name> [--dry-run]

# List all commands
npm run list
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (audit passed, fix applied) |
| 1 | Issues found (audit failed, fix needed) |
| 2 | Tool error (file not found, invalid args) |

## Templates

| Template | Use Case |
|----------|----------|
| [router-command.md](templates/router-command.md) | Commands delegating to skills |
| [system-command.md](templates/system-command.md) | Direct system utilities |
| [audit-report.md](templates/audit-report.md) | Compliance report format |

## Examples

| Example | Description |
|---------|-------------|
| [good-router.md](examples/good-router.md) | Perfect Router Pattern |
| [bad-leakage.md](examples/bad-leakage.md) | Tool/Logic Leakage anti-patterns |

## Migration

### From Fragmented Skills

This skill consolidates:
- `claude-command-fix-references` → use `npm run fix`
- `claude-command-audit-references` → use `npm run audit`
- `claude-command-rename` → use `npm run fix -- <old> --rename <new>`

### Updating Existing Commands

1. Run `npm run audit` to identify violations
2. Run `npm run fix -- <name> --dry-run` to preview fixes
3. Run `npm run fix -- <name>` to apply
4. Re-run `npm run audit -- <name>` to verify

## Key Principles

1. **Commands are routers** — no business logic
2. **Skills do the work** — testable, versioned, reusable
3. **Minimize tools** — only `Skill, AskUserQuestion` for delegations
4. **Verbatim output** — pass through skill output exactly
5. **Imperative instructions** — "Invoke..." not "Help..."
6. **Explicit mapping** — map $1, $2 to skill args
