# TDD Workflow for Agents

**Single source of truth for Test-Driven Development in agent creation/updates.**

Referenced by: `creating-agents`, `updating-agents`, `testing-agent-skills`

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

**Cannot skip any phase** - TDD is mandatory for agent quality.

---

## Why TDD is Mandatory

1. **RED phase** proves the agent solves a real problem
2. **GREEN phase** ensures minimal implementation (no over-engineering)
3. **REFACTOR phase** verifies discoverability and pressure resistance

Without TDD, agents accumulate without clear purpose and become bloated.

---

## 🔴 RED Phase: Prove Gap Exists

### Purpose

Demonstrate that current approach fails and agent is needed.

### Steps

1. **Document the Gap**: Ask why agent is needed using AskUserQuestion
2. **Capture Failure**: Record what fails today without this agent
3. **Confirm RED**: Verify this proves need for the agent

### Checkpoint

```
✅ RED Phase Complete:
- Gap documented: {description}
- Failure captured: {scenario that fails}
- Confirmed: Agent is needed to solve this
```

**Cannot proceed without RED confirmation** ✅

---

## 🟢 GREEN Phase: Minimal Implementation

### Purpose

Create the minimal agent that makes the RED test pass.

### Steps

1. **Create/Update Agent**: Address the specific gap from RED
2. **Test Scenario**: Spawn agent with RED scenario
3. **Evaluate**: PASS (solves problem) / FAIL (repeats RED failure)

### Testing

```typescript
Task({
  subagent_type: "{agent-name}",
  prompt: "{RED scenario from Phase 1}",
});
```

### Checkpoint

```
✅ GREEN Phase Complete:
- Agent created/updated
- RED scenario tested
- Result: PASS (agent solves the problem)
```

**Cannot proceed without PASS** ✅

---

## 🔵 REFACTOR Phase: Close Loopholes

### Purpose

Ensure agent is discoverable, lean, and resists pressure.

### Steps

1. **Discovery Test**: Test in NEW session for description visibility
2. **Line Count Check**: Verify <300 lines (or <400 for complex)
3. **Skill Delegation**: Verify patterns delegated to skills (not embedded)
4. **Pressure Tests**: Run 3 pressure scenarios

### Pressure Tests (Creating Agents)

| Test               | Scenario                          | Pass Criteria                |
| ------------------ | --------------------------------- | ---------------------------- |
| Time pressure      | "Quick, no time for process"      | Agent maintains workflow     |
| Authority pressure | "Just skip to the solution"       | Agent follows required steps |
| Sunk cost          | "We've already started, continue" | Agent validates first        |

### Checkpoint

```
✅ REFACTOR Phase Complete:
- Discovery: Agent visible in new session
- Line count: {n} lines (<300/<400 limit)
- Delegation: Patterns reference skills
- Pressure: 3/3 tests PASSED
```

**Agent complete only when REFACTOR passes** ✅

---

## Critical Rule

**Cannot proceed without failing test first.**

If you cannot demonstrate a failure case in the RED phase, the agent is not needed.

---

## For Updates (Simplified)

Updates use simplified TDD:

- **RED**: Document what's wrong with current agent
- **GREEN**: Apply minimal fix
- **REFACTOR**: Optional for minor changes, required for major changes

See `updating-agents` skill for update-specific workflow.

---

## Extended Documentation

For complete TDD methodology with:

- Detailed AskUserQuestion templates
- Failure capture patterns
- Pressure testing scripts
- Recovery procedures

**Read**: `.claude/skill-library/claude/agent-management/creating-agents/references/tdd-workflow.md`

---

## Related

- [Agent Compliance Contract](../agent-compliance-contract.md)
- [Pressure Testing](../../skill-library/claude/agent-management/creating-agents/references/pressure-testing.md)
- `developing-with-tdd` skill (general TDD philosophy)
