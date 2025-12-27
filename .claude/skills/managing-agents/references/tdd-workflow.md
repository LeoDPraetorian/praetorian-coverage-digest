# TDD Workflow

> **REDIRECT**: This file redirects to the central pattern.
>
> **See**: [TDD Workflow (Central)](patterns/tdd-workflow.md)

---

## Quick Reference

```
🔴 RED → 🟢 GREEN → 🔵 REFACTOR
```

| Phase       | Purpose                | Checkpoint               |
| ----------- | ---------------------- | ------------------------ |
| 🔴 RED      | Prove gap exists       | Failure documented       |
| 🟢 GREEN    | Minimal implementation | Agent solves RED problem |
| 🔵 REFACTOR | Close loopholes        | Pressure tests PASS      |

**Cannot skip any phase** - TDD is mandatory.

---

## Critical Rule

**Cannot proceed without failing test first.**

If you cannot demonstrate a failure case in the RED phase, the agent is not needed.

---

## Full Documentation

- **Pattern file**: [patterns/tdd-workflow.md](patterns/tdd-workflow.md) - Quick reference with all phases
- **Extended methodology**: `.claude/skill-library/claude/agent-management/creating-agents/references/tdd-workflow.md` - Full 900-line TDD guide with templates and examples
