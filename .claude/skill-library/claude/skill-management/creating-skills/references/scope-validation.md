# Phase 0: Scope Validation

Before creating a skill, validate that a skill (not an agent) is the appropriate solution.

## Skill vs Agent Decision

**Skills** = Knowledge, patterns, workflows, methodologies

- Examples: TDD, debugging, brainstorming, API patterns

**Agents** = Task executors with tools and autonomy

- Examples: frontend-developer, backend-tester, tool-reviewer

## When Agent is More Appropriate

If the request is for a task executor (something that runs tests, builds code, reviews PRs), use:

```
skill: "agent-manager"
args: "create [agent-name]"
```

## Compliance Target

Skills created by this workflow must comply with the [Skill Compliance Contract](.claude/skills/managing-skills/references/skill-compliance-contract.md).

This includes frontmatter, progressive disclosure, integration section, line count limits, and all 28 audit phases.
