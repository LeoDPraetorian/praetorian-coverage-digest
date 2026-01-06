# Agent Test Workflow

**Behavioral validation - skill integration testing.**

⚠️ **As of December 2024, agent testing uses instruction-based workflow for behavioral validation (NOT structural validation).**

---

## Overview

Testing validates agent BEHAVIOR - does the agent correctly invoke and follow skills when spawned under realistic pressure? This is distinct from audit, which validates structure/syntax.

**See:** [Audit vs Test Comparison](audit-vs-test.md) for full details on the distinction.

## How to Test an Agent

**Route to the verifying-agent-skill-invocation skill:**

```
Read: .claude/skill-library/claude/agent-management/verifying-agent-skill-invocation/SKILL.md
```

The `verifying-agent-skill-invocation` skill provides the complete workflow.

---

## What the Workflow Provides

### Behavioral Validation

- **Spawns agents** - Uses Task tool with trigger scenarios
- **Skill invocation testing** - Verifies agent invokes mandatory skills
- **Methodology compliance** - Checks if agent follows skill workflows (TDD, debugging, verification)
- **PASS/FAIL/PARTIAL** - Reports with detailed reasoning

### Test Inputs

- **Agent name** (required): e.g., `frontend-developer`
- **Skill name** (optional): e.g., `developing-with-tdd`
  - If omitted, tests ALL mandatory skills from agent's frontmatter

---

## Example Usage

```
User: "Test if frontend-developer uses developing-with-tdd correctly"

Agent workflow:
1. Read verifying-agent-skill-invocation skill
2. Provide agent=frontend-developer, skill=developing-with-tdd
3. Spawn frontend-developer with RED phase trigger scenario
4. Evaluate: Did agent invoke developing-with-tdd?
5. Evaluate: Did agent follow TDD workflow?
6. Report: PASS/FAIL/PARTIAL with reasoning
```

---

## Why Instruction-Based?

Testing requires complex capabilities:

- **Spawning agents** - Task tool to create agent instances
- **Scenario design** - Crafting realistic trigger situations
- **Behavior evaluation** - Analyzing agent responses for skill compliance
- **Multi-step workflows** - TodoWrite for tracking test phases
- **Pressure scenarios** - Time/authority/sunk cost tests

---

## Time Estimate

- **Single skill:** 10-25 minutes
- **All mandatory skills:** Hours (depends on skill count)

---

## Test vs Audit

| Aspect      | Test (Behavioral)     | Audit (Structural) |
| ----------- | --------------------- | ------------------ |
| **Purpose** | Behavioral validation | Lint validation    |
| **Method**  | Spawns agents         | Static analysis    |
| **Speed**   | 10-25 min per skill   | 30-60 seconds      |
| **When**    | Before deployment     | Before commit      |

**Use both:** Audit catches format issues fast. Test catches behavioral issues that only appear when agents execute under pressure.

---

## Prerequisites

None - the verifying-agent-skill-invocation skill handles all setup internally.

---

## Documentation

**Full workflow details:**
`.claude/skill-library/claude/agent-management/verifying-agent-skill-invocation/SKILL.md`

**Related references:**

- [Audit vs Test](audit-vs-test.md) - Critical distinction
- [Audit Workflow](audit-workflow.md) - Structural validation
- [TDD Workflow](tdd-workflow.md) - What agents should follow

---

## Historical Note: test.ts CLI (DEPRECATED)

The `test.ts` CLI script was deprecated - it performed structural checks that now belong in audit. The `test` operation now ONLY provides behavioral validation via the verifying-agent-skill-invocation skill.
