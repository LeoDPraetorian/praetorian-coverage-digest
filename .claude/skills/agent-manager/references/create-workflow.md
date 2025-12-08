# Agent Creation Workflow

> **⚠️ DEPRECATION NOTICE (December 2024)**
>
> **This workflow documents ARCHIVED CLI commands (`npm run create`).**
>
> **For agent creation, use the instruction-based skill instead:**
> ```
> skill: "creating-agents"
> ```
>
> **Why the change?** Analysis showed 97% of TypeScript code duplicated Claude's native capabilities. The instruction-based workflow provides:
> - Full 10-phase TDD with pressure testing (Phase 10)
> - Skill verification phase (Phase 8)
> - Interactive AskUserQuestion guidance
> - More flexibility than TypeScript code
>
> **See:** `.claude/skills/creating-agents/SKILL.md` for the current workflow
>
> ---
>
> **The content below is kept for historical reference only.**

## Overview (ARCHIVED)

Creating a new agent follows a TDD workflow:
1. **RED**: Document the gap this agent fills
2. **GREEN**: Generate from lean template
3. **REFACTOR**: Run audit and customize

## Quick Start

```bash
# Create a new agent
npm run --silent create -- my-agent "Use when [trigger] - [capabilities]" --type development

# Get description suggestions
npm run --silent create -- my-agent --suggest

# Preview without writing
npm run --silent create -- my-agent "Use when..." --type development --dry-run
```

## Command Reference

```bash
npm run --silent create -- <name> "<description>" --type <category>
npm run --silent create -- <name> --suggest
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Agent name in kebab-case |
| `description` | Yes (unless --suggest) | Must start with "Use when" |
| `--type` | No | Category (default: development) |
| `--suggest` | No | Get description suggestions |
| `--dry-run` | No | Preview without writing |

### Valid Categories

- architecture
- development
- testing
- quality
- analysis
- research
- orchestrator
- mcp-tools

## TDD Workflow

### Phase 1: RED - Document the Gap

Before creating an agent, document what gap it fills:

1. **What problem does this solve?**
   - What task is currently unhandled?
   - What user requests trigger this need?

2. **Why can't existing agents handle this?**
   - List agents you considered
   - Explain the gap

3. **What will success look like?**
   - Define the expected output
   - List verification criteria

### Phase 2: GREEN - Generate from Template

Run the create command:

```bash
npm run --silent create -- my-agent "Use when developing..." --type development
```

The template includes:
- Standard frontmatter with gateway skill
- Role statement placeholder
- Skill references table
- Critical rules section
- Mandatory skills (TDD, debugging, verification)
- Output format (standardized JSON)
- Escalation protocol
- Quality checklist

### Phase 3: REFACTOR - Customize and Verify

1. **Customize the template**:
   - Update role statement
   - Add specific responsibilities
   - Fill skill references table
   - Define critical rules
   - Specify escalation conditions

2. **Run audit**:
   ```bash
   npm run --silent audit -- my-agent
   ```

3. **Fix any issues**:
   ```bash
   npm run --silent fix -- my-agent --suggest
   ```

4. **Test discovery**:
   ```bash
   npm run --silent test -- my-agent
   ```

## Description Best Practices

### Required Pattern

```
Use when [TRIGGER] - [CAPABILITIES].
```

### With Examples (Recommended)

```yaml
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>\nContext: User needs dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>
```

### Capabilities Listing

Include comma-separated capabilities:
- Be specific (not "help with code")
- Use action verbs
- Keep it scannable

### Example Generation

Use `--suggest` to get starting points:

```bash
npm run --silent create -- data-processor --suggest

# Output:
# 1. Use when developing data-processor features - [capabilities].
# 2. Use when implementing data-processor functionality - [capabilities].
# 3. Use when working on data-processor tasks - [capabilities].
```

## Lean Template Structure

The generated template follows this structure (target: <300 lines):

```markdown
---
name: agent-name
description: Use when [trigger] - [capabilities]
type: development
permissionMode: default
tools: Read, Write, Edit, Bash, Glob, Grep
skills: gateway-frontend
model: sonnet
---

# Agent Name

You are a specialized [category] agent.

## Core Responsibilities
[3-5 bullet points]

## Skill References (Load On-Demand via Gateway)
[Table of tasks to skills]

## Critical Rules (Non-Negotiable)
[Agent-specific rules]

## Mandatory Skills (Must Use)
[TDD, debugging, verification references]

## Output Format (Standardized)
[JSON structure]

## Escalation Protocol
[Stopping conditions and handoffs]

## Quality Checklist
[Final verification items]
```

## Gateway Selection

The template auto-selects a gateway based on category:

| Category | Gateway |
|----------|---------|
| development (frontend) | gateway-frontend |
| development (backend) | gateway-backend |
| testing | gateway-testing |
| analysis | gateway-security |
| mcp-tools | gateway-mcp-tools |
| default | gateway-frontend |

## Post-Creation Checklist

After creating an agent:

- [ ] Customize all placeholder sections
- [ ] Run `npm run --silent audit -- <name>`
- [ ] Address any errors or warnings
- [ ] Run `npm run --silent test -- <name>`
- [ ] Test discovery in new Claude Code session
- [ ] Update cross-references if needed

## Example: Creating a New Agent

```bash
# 1. Document the gap (mentally or in notes)
# Need an agent for GraphQL API development

# 2. Create the agent
npm run --silent create -- graphql-developer "Use when developing GraphQL APIs - schema design, resolvers, queries, mutations" --type development

# 3. Review output
# Created: .claude/agents/development/graphql-developer.md

# 4. Audit
npm run --silent audit -- graphql-developer

# 5. Customize the template in your editor

# 6. Test
npm run --silent test -- graphql-developer

# 7. Verify discovery in new session
```

## References

- [Lean Agent Template](./lean-agent-template.md)
- [Audit Phases](./audit-phases.md)
- [Agent Architecture](../../../docs/AGENT-ARCHITECTURE.md)
