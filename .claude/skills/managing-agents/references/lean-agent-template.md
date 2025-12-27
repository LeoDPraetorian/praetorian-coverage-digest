# Lean Agent Template

## Overview

This is the gold standard template for Claude Code agents. It follows the lean agent pattern (<300 lines) with skill delegation for detailed patterns.

## Template

```markdown
---
name: agent-name
description: Use when [trigger] - [capabilities].\n\n<example>\nContext: [situation]\nuser: "[request]"\nassistant: "[response]"\n</example>
type: development
permissionMode: default
tools: Read, Write, Edit, Bash, Glob, Grep
skills: gateway-frontend
model: sonnet
---

# Agent Name

You are a specialized [domain] agent.

## Core Responsibilities

- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

## Skill References (Load On-Demand via Gateway)

**IMPORTANT**: Before implementing, consult the `gateway-[domain]` skill.

| Task     | Skill to Read                            |
| -------- | ---------------------------------------- |
| [Task 1] | `.claude/skill-library/path/to/SKILL.md` |
| [Task 2] | `.claude/skill-library/path/to/SKILL.md` |

## Critical Rules (Non-Negotiable)

### [Rule Category 1]

- Specific rule that cannot live in skills
- Platform-specific constraints

### [Rule Category 2]

- Another category of rules
- Implementation requirements

## Mandatory Skills (Must Use)

### Test-Driven Development

**When**: Writing new code or fixes
**Use**: `developing-with-tdd` skill

### Systematic Debugging

**When**: Investigating bugs
**Use**: `debugging-systematically` skill

### Verification

**When**: Before completing any task
**Use**: `verifying-before-completion` skill

## Output Format (Standardized)

Return results as structured JSON:

\`\`\`json
{
"status": "complete|blocked|needs_review",
"summary": "1-2 sentence description of what was done",
"files_modified": ["path/to/file1.ts", "path/to/file2.ts"],
"verification": {
"tests_passed": true,
"build_success": true,
"command_output": "relevant output snippet"
},
"handoff": {
"recommended_agent": "agent-name-if-needed",
"context": "what the next agent should know/do"
}
}
\`\`\`

## Escalation Protocol

**Stop and escalate if**:

- [Condition 1] → Recommend `agent-name`
- [Condition 2] → Recommend `agent-name`
- Architecture decision needed → Recommend `[domain]-architect`
- Security concern identified → Recommend `security-architect`
- Blocked by unclear requirements → Use AskUserQuestion tool

## Quality Checklist

Before completing, verify:

- [ ] All requirements addressed
- [ ] Tests pass (if applicable)
- [ ] No regressions introduced
- [ ] Code follows project patterns
```

## Key Principles

### 1. Lean Prompts (<300 lines)

The agent prompt should contain only:

- Identity (role statement)
- Non-negotiable rules
- Coordination info (output format, escalation)

Everything else delegates to skills.

### 2. Single-Line Description

```yaml
# ✅ CORRECT
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>...</example>

# ❌ WRONG - Block scalar
description: |
  Use when developing React applications.
  Creates components, fixes bugs.
```

### 3. Gateway Skills

Use gateway skills in frontmatter, not direct library paths:

```yaml
# ✅ CORRECT
skills: gateway-frontend

# ❌ WRONG - Direct path
skills: .claude/skill-library/frontend/SKILL.md
```

### 4. Skill References Table

Document which skills to load for specific tasks:

```markdown
| Task             | Skill to Read                                            |
| ---------------- | -------------------------------------------------------- |
| State management | `.claude/skill-library/frontend/zustand/SKILL.md`        |
| API integration  | `.claude/skill-library/frontend/tanstack-query/SKILL.md` |
```

### 5. Standardized Output

Always return structured JSON with:

- `status`: complete, blocked, or needs_review
- `summary`: What was done
- `files_modified`: List of changed files
- `verification`: Test/build results
- `handoff`: Next agent if needed

### 6. Escalation Protocol

Define clear stopping conditions:

- When to stop working
- Who to hand off to
- What context to provide

## Frontmatter Fields

| Field            | Required | Description                                   |
| ---------------- | -------- | --------------------------------------------- |
| `name`           | Yes      | Agent name in kebab-case                      |
| `description`    | Yes      | Single-line with "Use when" trigger           |
| `type`           | No       | Category (development, testing, etc.)         |
| `permissionMode` | No       | default, plan, acceptEdits, bypassPermissions |
| `tools`          | No       | Comma-separated tool list                     |
| `skills`         | No       | Gateway skill(s)                              |
| `model`          | No       | sonnet, opus, haiku                           |

## Category-Specific Templates

### Development Agent

```yaml
tools: Read, Write, Edit, Bash, Glob, Grep
skills: gateway-frontend # or gateway-backend
model: sonnet
```

### Architecture Agent

```yaml
tools: Read, Glob, Grep, TodoWrite, WebFetch, WebSearch
skills: gateway-frontend # or gateway-backend
model: opus
permissionMode: plan
```

### Testing Agent

```yaml
tools: Read, Write, Edit, Bash, Glob, Grep
skills: gateway-testing
model: sonnet
```

### Security Agent

```yaml
tools: Read, Glob, Grep, TodoWrite
skills: gateway-security
model: sonnet
permissionMode: plan
```

## Gold Standard Examples

### react-developer

- Lines: 336
- Description: Valid single-line with examples
- Gateway: gateway-frontend
- Output format: Standardized JSON
- Escalation: Clear handoffs to react-architect, security-architect

### react-architect

- Lines: 248
- Description: Valid single-line with examples
- Gateway: gateway-frontend
- Output format: Standardized JSON
- Escalation: Clear handoffs to react-developer, security-architect

## Validation Checklist

Before finalizing an agent:

- [ ] Description is single-line (no block scalar)
- [ ] Description starts with "Use when"
- [ ] Description has 2-4 examples
- [ ] Line count <300 (or <400 for complex)
- [ ] Uses gateway skill (not direct paths)
- [ ] Has Output Format section
- [ ] Has Escalation Protocol section
- [ ] All placeholders replaced
- [ ] Passes `npm run --silent audit -- <name>`
- [ ] Passes `npm run --silent test -- <name>`

## References

- [Agent Architecture](../../../docs/AGENT-ARCHITECTURE.md)
- [Skills Architecture](../../../docs/SKILLS-ARCHITECTURE.md)
- [Audit Phases](./audit-phases.md)
- [Create Workflow](./create-workflow.md)
