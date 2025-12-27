# Skill Loading Protocol (Tiered)

**Single source of truth for agent skill loading structure.**

Referenced by: `creating-agents`, `updating-agents`, `auditing-agents`

**Gold Standard**: `frontend-developer` (129 lines) - `.claude/agents/development/frontend-developer.md`

---

## Quick Reference

All agents with `skills:` in frontmatter MUST have a Tiered Skill Loading Protocol section.

```markdown
## Skill Loading Protocol

Use Read() for ALL skills. Do NOT use Skill tool. Do NOT rely on training data.

### Tier 1: Always Read (Every Task)

[Universal + gateway + core skills]

### Tier 2: Multi-Step Tasks

[TodoWrite when ≥2 steps]

### Tier 3: Triggered by Task Type

[Task-specific trigger tables]

## Anti-Bypass

[3 bullet points]
```

---

## Full Template

```markdown
## Skill Loading Protocol

Use Read() for ALL skills. Do NOT use Skill tool. Do NOT rely on training data.

### Tier 1: Always Read (Every Task)

Before ANY work, read these skills:

| Skill                       | Path                                                  | Purpose            |
| --------------------------- | ----------------------------------------------------- | ------------------ |
| verifying-before-completion | `.claude/skills/verifying-before-completion/SKILL.md` | Final validation   |
| calibrating-time-estimates  | `.claude/skills/calibrating-time-estimates/SKILL.md`  | Accurate estimates |
| gateway-{domain}            | `.claude/skills/gateway-{domain}/SKILL.md`            | Domain patterns    |

### Tier 2: Multi-Step Tasks

If task requires ≥2 steps, also read:

| Skill           | Path                                      | Trigger             |
| --------------- | ----------------------------------------- | ------------------- |
| using-todowrite | `.claude/skills/using-todowrite/SKILL.md` | Multi-step tracking |

### Tier 3: Triggered by Task Type

| Task Type        | Skill                    | Path                                               |
| ---------------- | ------------------------ | -------------------------------------------------- |
| Debugging        | debugging-systematically | `.claude/skills/debugging-systematically/SKILL.md` |
| Creating feature | developing-with-tdd      | `.claude/skills/developing-with-tdd/SKILL.md`      |
| Refactoring      | adhering-to-dry          | `.claude/skills/adhering-to-dry/SKILL.md`          |

## Anti-Bypass

- "Simple task" → Skill loading takes seconds, mistakes take hours
- "I already know" → Skills evolve. Read the current version.
- "No time" → Skipping skills creates rework. Always slower.
```

---

## Mandatory Universal Skills

All agents MUST include these in Tier 1:

1. `verifying-before-completion` - Prevents incomplete work
2. `calibrating-time-estimates` - Prevents overestimation

---

## Language Guidelines (Claude 4.5+)

| Avoid                  | Use Instead            |
| ---------------------- | ---------------------- |
| MUST, CRITICAL, ALWAYS | Use, Call, Do          |
| You are REQUIRED to... | You should...          |
| This is not optional   | (Remove - unnecessary) |

**Why**: Claude 4.5+ instruction following is stronger. Aggressive language causes overtriggering.

---

## Output Format Requirement

Output format MUST include skills_read array:

```json
{
  "skills_read": [".claude/skills/...", ".claude/skill-library/..."]
}
```

This enables verification that the agent loaded skills correctly.

---

## Verification

After creating/updating Skill Loading Protocol:

1. **Start new Claude Code session** (mandatory - caching)
2. **Spawn agent with test task** that triggers Tier 3 skill
3. **Check for Read() calls** in output
4. **Check for skills_read** array in JSON output

---

## Related

- [Agent Compliance Contract](../agent-compliance-contract.md)
- [Output Format](output-format.md)
