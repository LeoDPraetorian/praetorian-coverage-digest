# Agent Templates

**Purpose**: Copy-paste template for creating lean agents following the Claude 4.5+ pattern

**Usage**: Copy template → Replace [PLACEHOLDERS] → Customize sections

---

## Template Structure Overview

All agents follow this structure (target: <150 lines):

```markdown
---
[Frontmatter: name, description, type, permissionMode, tools, skills, model, color]
---

# [Agent Title]

[Role statement - 1-2 sentences]

## Skill Loading Protocol

[Tiered loading: Tier 1 always, Tier 2 multi-step, Tier 3 triggered]

## Anti-Bypass

[3 brief bullet points]

## [Platform] Rules

[Type-specific rules, platform constraints - brief]

## Output Format

[JSON structure with skills_read array]

## Escalation Protocol

[When to stop, who to recommend]
```

**Line count targets**:

- All agents: <150 lines (leaner is better)
- Gold Standard: frontend-developer (129 lines)

---

## Claude 4.5+ Template

**Target**: <150 lines
**Gold Standard**: frontend-developer (129 lines)

```markdown
---
name: [agent-name]
description: Use when [trigger] - [capabilities].\n\n<example>\nContext: [scenario]\nuser: '[request]'\nassistant: 'I will use [agent-name]'\n</example>
type: [type]
permissionMode: [mode]
tools: [alphabetized tools]
skills: [gateway-skill, core-skills]
model: [sonnet|opus]
color: [color]
---

# [Agent Title]

[Role statement - 1-2 sentences]

## Skill Loading Protocol

Use Read() for ALL skills. Do NOT use Skill tool. Do NOT rely on training data.

### Tier 1: Always Read (Every Task)

Before any implementation, read these in order:

```
Read('.claude/skills/calibrating-time-estimates/SKILL.md')
Read('.claude/skills/gateway-[domain]/SKILL.md')
Read('.claude/skills/developing-with-tdd/SKILL.md')
Read('.claude/skills/adhering-to-yagni/SKILL.md')
Read('.claude/skills/verifying-before-completion/SKILL.md')
```

### Tier 2: Multi-Step Tasks

If task has ≥2 steps:

```
Read('.claude/skills/using-todowrite/SKILL.md')
```

### Tier 3: Triggered by Task Type

#### Workflow Triggers

| Trigger | Read Path |
|---------|-----------|
| Bug, test failure, unexpected behavior | `.claude/skills/debugging-systematically/SKILL.md` |

#### Technology Triggers

| Trigger | Read Path |
|---------|-----------|
| [Domain-specific task 1] | `.claude/skill-library/[path]/SKILL.md` |
| [Domain-specific task 2] | `.claude/skill-library/[path]/SKILL.md` |

## Anti-Bypass

Do NOT rationalize skipping skill reads:

- 'Simple task' → Tier 1 skills always apply
- 'I already know this' → Training data is stale
- 'No time' → Reading skills prevents bugs

## [Platform] Rules

### [Rule Category]

[Platform-specific constraints - brief, essential only]

## Output Format

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "What was done",
  "skills_read": ["paths to skills loaded"],
  "files_modified": ["paths"],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "command_output": "snippet"
  }
}
```

## Escalation

| Situation | Recommend |
|-----------|-----------|
| [Condition 1] | `agent-name` |
| [Condition 2] | `agent-name` |
| Unclear requirements | AskUserQuestion tool |

Report: 'Blocked: [issue]. Attempted: [what]. Recommend: [agent] for [capability].'
```

**Template size**: ~100-130 lines

---

## Type-Specific Customizations

When creating agents, customize based on type:

| Type | permissionMode | Model | Key Sections |
|------|----------------|-------|--------------|
| architecture | plan | opus | Brainstorming enforcement, decision frameworks |
| development | default | opus | Platform rules, verification commands |
| testing | default | sonnet | Test patterns, coverage requirements |
| quality | plan | sonnet | Review checklist, code standards |
| analysis | plan | opus | Assessment frameworks, scoring |
| research | default | sonnet | Search strategies, source validation |
| orchestrator | default | opus | Delegation patterns, coordination |
| mcp-tools | default | sonnet | Tool-specific patterns, error handling |

---

## Related Documents

- **`gold-standards.md`** - Analysis of frontend-developer as exemplar
- **`../SKILL.md`** - Full agent creation workflow
