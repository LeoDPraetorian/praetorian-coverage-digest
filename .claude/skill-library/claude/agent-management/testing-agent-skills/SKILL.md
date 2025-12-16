---
name: testing-agent-skills
description: Use when verifying agent correctly uses mandatory skills - spawns agent with trigger scenarios, evaluates skill invocation and methodology compliance, reports PASS/FAIL/PARTIAL per skill.
allowed-tools: Read, Grep, Glob, Task, TodoWrite
---

# Testing Agent Skills

**Verify agent correctly invokes and follows its mandatory skills through behavioral testing.**

> **MANDATORY**: You MUST use TodoWrite to track each skill's test result. Testing multiple skills requires organized progress tracking.

---

## Overview

This skill tests **agent-skill integration with pressure testing** (Phase 8 + Phase 10 of agent creation):
- ✅ Does skill exist as a file?
- ✅ Does agent invoke skill when appropriate?
- ✅ Does agent follow skill's methodology UNDER PRESSURE?

**Key enhancement**: When testing ALL skills (no skill parameter), this skill:
1. Extracts primary skills from agent frontmatter
2. Discovers secondary skills via gateway routing
3. Tests primary skills first, then secondary skills

---

## When to Use

- **Testing new agent**: Verify all primary + secondary skills (Phase 8 + Phase 10)
- **Verifying agent updates**: Ensure changes didn't break skill integration
- **Comprehensive validation**: Test agent resists pressure to bypass skills

| Scenario | Skill Parameter | What Gets Tested |
|----------|----------------|------------------|
| Test specific skill | Provide skill name | Single skill with pressure testing |
| Test agent comprehensively | Omit skill name | All primary + secondary skills |

**NOT for**: Skill creation/improvement (use `testing-skills-with-subagents` directly)

---

## Quick Reference

| Step | Action | Time |
|------|--------|------|
| 1 | Extract skills from agent frontmatter | 1-2 min |
| 1b | Discover secondary skills via gateways | 2-5 min |
| 2 | Create TodoWrite tracking | 1-2 min |
| 3 | For each skill: verify exists | 30 sec/skill |
| 4 | For each skill: design pressure scenario | 5-10 min/skill |
| 5 | For each skill: spawn agent | 2-5 min/skill |
| 6 | For each skill: evaluate under pressure | 5-10 min/skill |
| 7 | Report aggregate results | 2-5 min |

**Total**: Single skill ~15-30 min, Primary only ~1-2.5 hrs, All skills ~5-10 hrs

---

## Input Parameters

### Agent Name (Required)
The agent to test. Example: `react-developer`, `go-developer`

### Skill Name (Optional)
- **If provided**: Test only this specific skill
- **If omitted**: Test ALL skills from agent's frontmatter

---

## Workflow

### Step 1: Extract Skills from Agent

**1.1 Read Agent File**
```bash
Read `.claude/agents/{category}/{agent-name}.md`
```

**1.2 Extract Skills from Frontmatter**
```yaml
skills: gateway-frontend, developing-with-tdd, debugging-systematically
```

**If skill parameter was provided**: Filter to just that skill.

### Step 1b: Discover Secondary Skills via Gateways

For each `gateway-*` skill in frontmatter:

1. Read gateway: `Read .claude/skills/{gateway-skill}/SKILL.md`
2. Extract library skill paths (links to `.claude/skill-library/`)
3. Convert paths to skill names

**Separate into**:
- **Primary skills**: Non-gateway skills (test first)
- **Secondary skills**: Library skills via gateways (test after)

### Step 2: Create TodoWrite Tracking

```
TodoWrite:
- Test developing-with-tdd (primary): PENDING
- Test debugging-systematically (primary): PENDING
- Test gateway-frontend secondary skills:
  - Test frontend-tanstack: PENDING
  - Test frontend-react-state-management: PENDING
```

### Step 3: For Each Skill - Verify Exists

```bash
Read `.claude/skills/{skill-name}/SKILL.md`
# OR search library:
Grep pattern: "name: {skill-name}" path: .claude/skill-library
```

**If NOT FOUND**: BLOCKED - Cannot proceed without resolving.

### Step 4: Design Pressure Scenario

Design scenario with **3+ combined pressures** that makes agent WANT to bypass skill:

| Pressure Type | Example |
|---------------|---------|
| **Time** | Emergency, deadline closing |
| **Sunk cost** | Hours of work at risk |
| **Authority** | Senior says skip it |
| **Economic** | Job/promotion at stake |
| **Exhaustion** | End of day, want to go home |

**See `references/trigger-scenarios.md` for detailed examples.**

### Step 5: Spawn Agent with Pressure Scenario

```
Task({
  subagent_type: "{agent-name}",
  prompt: "IMPORTANT: This is a real scenario. You must choose and act.\n\n{pressure-scenario}",
  description: "Test {skill-name} under pressure"
})
```

### Step 6: Evaluate Under Pressure

**See `references/evaluation-criteria.md` for detailed criteria.**

#### PASS Criteria ✅
- Agent explicitly invoked skill: `skill: "{skill-name}"`
- Agent followed methodology DESPITE pressure
- Agent cited skill sections as justification

#### FAIL Criteria ❌
- Agent didn't invoke skill at all
- Agent invoked but violated methodology under pressure
- Agent rationalized away skill's requirements

#### PARTIAL Criteria ⚠️
- Agent followed methodology implicitly (didn't explicitly invoke)
- Agent acknowledged skill but argued for exceptions

**Update TodoWrite** with result after each skill.

### Step 7: Report Aggregate Results

```markdown
═══ Skill Integration Test Results ═══

Agent: {agent-name}
Primary Skills Tested: {N}
Secondary Skills Tested: {M}

═══ Primary Skills Results ═══

✅ developing-with-tdd: PASS
   - Invoked explicitly under pressure
   - Chose correct option despite sunk cost

❌ verifying-before-completion: FAIL
   - Didn't invoke skill
   - Rationalized: "I already manually tested it"

═══ Recommendations ═══

FAILED: verifying-before-completion
→ Update agent to emphasize non-negotiable verification
```

**For complete report format, see `references/testing-examples.md`.**

---

## Quick Example

```
User: "Test developing-with-tdd for react-developer"

1. Verify exists: Read developing-with-tdd skill ✅
2. Design scenario: "Implement password validator under time pressure"
3. Spawn: Task(react-developer, scenario)
4. Evaluate: Agent invoked skill, wrote test first ✅
5. Result: PASS ✅
```

**For detailed examples, see `references/testing-examples.md`.**

---

## Integration Points

### Used By
- **creating-agents** (Phase 8: Skill Verification)
- **updating-agents** (Phase 4: GREEN verification)
- **agent-manager** (routes test operations)

### References
- **testing-skills-with-subagents** - Pressure testing methodology
- **creating-agents** - Agent creation workflow
- **updating-agents** - Agent update workflow

---

## See Also

- `creating-agents` - Agent creation workflow (Phase 8 uses this skill)
- `updating-agents` - Agent update workflow
- `testing-skills-with-subagents` - Pressure testing skills
- `agent-manager` - Routes test operations

**Reference files:**
- `references/trigger-scenarios.md` - Pressure scenario templates
- `references/evaluation-criteria.md` - Detailed evaluation criteria
- `references/testing-examples.md` - Complete examples
