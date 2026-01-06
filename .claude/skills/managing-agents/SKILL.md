---
name: managing-agents
description: Use when managing agents (create, update, audit, fix, rename, test, search, list) - pure router delegating to library skills with TDD enforcement and lean agent pattern (<150 lines).
allowed-tools: Read, Skill, TodoWrite, AskUserQuestion
---

# Agent Lifecycle Manager

**Pure router for agent operations. Delegates to library skills.**

> **MANDATORY**: You MUST use TodoWrite to track complex workflows.

---

## Quick Decision Guide

```
What do you need?

Creating new agent?
├─ From scratch → Read creating-agents
└─ TDD required → Read creating-agents (enforces RED-GREEN-REFACTOR)

Modifying existing agent?
├─ Content change → Read updating-agents
├─ Rename → Read renaming-agents
└─ Fix issues → Read fixing-agents

Validating agent?
├─ Quick check → skill: "auditing-agents" (Phase 0 CLI)
├─ Full audit → Read auditing-agents (Phases 1-18)
└─ Test behavior → Read verifying-agent-skill-invocation

Discovery?
├─ Find agent → Read searching-agents
└─ List all → Read listing-agents
```

---

## Common Anti-Patterns

❌ **WRONG**: Create agent without TDD
✅ **RIGHT**: Read creating-agents → Follow RED-GREEN-REFACTOR

❌ **WRONG**: Create agent with Tier 1/2/3 structure
✅ **RIGHT**: Use Step 1/2/3 structure per gold standard

❌ **WRONG**: Use Read() for all skills
✅ **RIGHT**: Skill tool for core, Read for library (two-tier)

❌ **WRONG**: Output with skills_read array
✅ **RIGHT**: Output with skills_invoked + library_skills_read

❌ **WRONG**: 3 brief Anti-Bypass points
✅ **RIGHT**: 5-6 detailed points with explanations

❌ **WRONG**: Target <150 lines for all agents
✅ **RIGHT**: 150-280 lines depending on agent type

❌ **WRONG**: Edit agent without audit first
✅ **RIGHT**: Read auditing-agents → Fix issues → Re-audit

❌ **WRONG**: Skip backup before fixes
✅ **RIGHT**: Read fixing-agents → Creates backup automatically

❌ **WRONG**: Agent >300 lines "because it's complex"
✅ **RIGHT**: Type-specific targets (Architecture: 150-200, Development: 150-180, Testing: 200-280)

❌ **WRONG**: Use block scalars in description
✅ **RIGHT**: Single-line with \n escapes

❌ **WRONG**: Agent has skills but no Skill tool
✅ **RIGHT**: Read agent-compliance-contract.md → Section 12

---

## Router Table

| Operation | Library Skill                                                                             |
| --------- | ----------------------------------------------------------------------------------------- |
| create    | `.claude/skill-library/claude/agent-management/creating-agents/SKILL.md`                  |
| update    | `.claude/skill-library/claude/agent-management/updating-agents/SKILL.md`                  |
| audit     | `.claude/skill-library/claude/agent-management/auditing-agents/SKILL.md`                  |
| fix       | `.claude/skill-library/claude/agent-management/fixing-agents/SKILL.md`                    |
| rename    | `.claude/skill-library/claude/agent-management/renaming-agents/SKILL.md`                  |
| test      | `.claude/skill-library/claude/agent-management/verifying-agent-skill-invocation/SKILL.md` |
| search    | `.claude/skill-library/claude/agent-management/searching-agents/SKILL.md`                 |
| list      | `.claude/skill-library/claude/agent-management/listing-agents/SKILL.md`                   |

---

## Troubleshooting

**Agent not found**: Navigate to repo root first (`ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"`)

**Audit failing**: Run Phase 0 CLI first, then manual phases. See auditing-agents.

**Agent exceeds type-specific target**: Extract to references. See updating-agents for extraction workflow. Targets: Architecture 150-200, Development 150-180, Testing 200-280.

**TDD skipped**: Creating/updating agents enforce TDD. Cannot bypass.

**Skills not loading**: Library skills require Read tool, not Skill tool.

---

## Related

**References**:

- [agent-compliance-contract.md](references/agent-compliance-contract.md) - Compliance rules
- [patterns/repo-root-detection.md](references/patterns/repo-root-detection.md) - Navigation
- [patterns/line-count-limits.md](references/patterns/line-count-limits.md) - Size targets
