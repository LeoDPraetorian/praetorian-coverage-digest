---
name: testing-agent-skills
description: Use when verifying agent correctly uses mandatory skills - spawns agent with trigger scenarios, evaluates skill invocation and methodology compliance, reports PASS/FAIL/PARTIAL per skill.
allowed-tools: Read, Grep, Glob, Task, TodoWrite
---

# Testing Agent Skills

**Verify agent correctly invokes and follows its mandatory skills through behavioral testing.**

> **IMPORTANT**: Use TodoWrite to track each skill's test result. Testing multiple skills requires organized progress tracking.

---

## Overview

This skill tests **agent-skill integration** (Phase 8 of agent creation):
- ✅ Does skill exist as a file?
- ✅ Does agent invoke skill when appropriate?
- ✅ Does agent follow skill's methodology?

**This is NOT pressure testing** (Phase 10). For testing agent resistance to rationalization under pressure, see `testing-skills-with-subagents`.

---

## When to Use

- Testing new agent's mandatory skills (creating-agents Phase 8)
- Verifying agent updates didn't break skill integration
- Debugging why agent isn't following expected workflow
- Quality assurance before deploying agent

**NOT for**:
- Testing skill effectiveness (use `testing-skills-with-subagents`)
- Agent discovery testing (internal CLI utility for maintainers)
- Pressure testing agents (use Phase 10 in creating-agents)

---

## Quick Reference

| Step | Action | Time |
|------|--------|------|
| 1 | Extract mandatory skills from agent | 1-2 min |
| 2 | Create TodoWrite tracking | 30 sec |
| 3 | For each skill: verify exists | 30 sec/skill |
| 4 | For each skill: design trigger scenario | 2 min/skill |
| 5 | For each skill: spawn agent | 2 min/skill |
| 6 | For each skill: evaluate output | 2-3 min/skill |
| 7 | Report aggregate results | 1 min |

**Total**: ~10-25 minutes (depends on number of skills)

---

## Input Parameters

### Agent Name (Required)
The agent to test. Example: `react-developer`, `go-developer`

### Skill Name (Optional)
- **If provided**: Test only this specific skill
- **If omitted**: Test ALL mandatory skills from agent

---

## Workflow

### Step 1: Extract Mandatory Skills

**1.1 Read Agent File**

Determine category first (architecture, development, testing, quality, analysis, research, orchestrator, mcp-tools).

```bash
# If you know the category
Read `.claude/agents/{category}/{agent-name}.md`

# If searching
Glob pattern: `.claude/agents/**/{agent-name}.md`
```

**1.2 Find "Mandatory Skills" Section**

Look for section titled:
- "Mandatory Skills"
- "Required Skills"
- "Must Use"

Example format:
```markdown
## Mandatory Skills

### developing-with-tdd
**When**: Implementing any feature or bugfix
**Use**: `developing-with-tdd` skill

### debugging-systematically
**When**: Investigating bugs or errors
**Use**: `debugging-systematically` skill

### verifying-before-completion
**When**: Before claiming work complete
**Use**: `verifying-before-completion` skill
```

**1.3 Extract Skill List**

From the section, extract skill names:
- `developing-with-tdd`
- `debugging-systematically`
- `verifying-before-completion`

**If skill parameter was provided**: Filter to just that skill.

**If no mandatory skills found**:
```
⚠️ Agent has no mandatory skills listed

This is unusual. Options:
1. Agent is incomplete (should have mandatory skills)
2. Agent type doesn't require them (rare)

Ask user: "Should this agent have mandatory skills?"
```

---

### Step 2: Create TodoWrite Tracking

**Create todo for each skill to test:**

```
TodoWrite:
- Test developing-with-tdd: PENDING
- Test debugging-systematically: PENDING
- Test verifying-before-completion: PENDING
```

**Why TodoWrite is critical**: Testing multiple skills takes 15-30 minutes. Without tracking, you WILL lose your place or forget results.

---

### Step 3: For Each Skill - Verify Exists

**Update todo:**
```
TodoWrite:
- Test {skill-name}: IN_PROGRESS
```

**3.1 Check Core Skills**

```bash
Read `.claude/skills/{skill-name}/SKILL.md`
```

**If found**: ✅ Proceed to Step 4

**If not found**, check library:

**3.2 Check Library Skills**

```bash
Grep pattern: "name: {skill-name}"
Path: .claude/skill-library
Output: files_with_matches
```

**If found**: ✅ Proceed to Step 4

**If NOT FOUND**:
```
❌ BLOCKER: Skill "{skill-name}" doesn't exist

The agent references a non-existent skill. This is a critical issue.

Update TodoWrite:
- Test {skill-name}: BLOCKED (skill doesn't exist)

Options:
1. Fix typo in agent's skill name
2. Remove skill from agent (if not actually needed)
3. Create missing skill (if genuinely needed)

STOP - Cannot proceed without resolving this blocker.
```

---

### Step 4: For Each Skill - Design Trigger Scenario

**4.1 Read the Skill**

```bash
Read `.claude/skills/{skill-name}/SKILL.md`
# OR
Read `{library-path-from-grep}`
```

**4.2 Understand Trigger Conditions**

Look for:
- **Description**: `"Use when [TRIGGER CONDITION]..."`
- **When to Use** section
- **Examples** in description or body

**4.3 Create Trigger Scenario**

Design a scenario that **REQUIRES** this skill to be invoked.

**Guidelines**:
- Make it realistic (not academic)
- Clearly trigger the skill's "Use when" condition
- Be specific about the task
- Keep it concise (1-3 sentences)

**Examples**:

| Skill | Trigger Scenario |
|-------|------------------|
| `developing-with-tdd` | "Implement a password validation function that checks for minimum 8 characters, at least one uppercase, one number, and one special character." |
| `debugging-systematically` | "There's a bug in the user registration flow. When users submit the form, nothing happens and no error is shown. Debug this issue." |
| `verifying-before-completion` | "You just finished implementing the email verification feature. It's working in your manual tests. Are you done?" |
| `gateway-frontend` | "Create a reusable dropdown component for selecting user roles (admin, editor, viewer) with proper accessibility." |

**See references/trigger-scenarios.md for more examples.**

---

### Step 5: For Each Skill - Spawn Agent

**5.1 Spawn with Task Tool**

```
Task({
  subagent_type: "{agent-name}",
  prompt: "{trigger-scenario}",
  description: "Test {skill-name} integration"
})
```

**5.2 Wait for Completion**

Let the agent execute fully. Capture the complete output.

**5.3 Read Agent Output**

The Task tool returns the agent's full response. Read it carefully before evaluating.

---

### Step 6: For Each Skill - Evaluate Output

**6.1 Apply Evaluation Criteria**

Read `references/evaluation-criteria.md` for detailed criteria.

**Quick evaluation checklist:**

#### PASS Criteria ✅
- [ ] Agent explicitly invoked skill: `skill: "{skill-name}"`
- [ ] Agent output shows methodology was followed
- [ ] Key requirements from skill appear in agent's work
- [ ] No violations of skill's critical rules

#### FAIL Criteria ❌
- [ ] Agent didn't invoke skill at all
- [ ] Agent invoked but ignored methodology
- [ ] Agent violated skill's critical rules
- [ ] Output doesn't show skill was followed

#### PARTIAL Criteria ⚠️
- [ ] Agent followed methodology implicitly (didn't explicitly invoke)
- [ ] Agent invoked but only partially followed
- [ ] Agent mentioned skill but didn't fully apply it

**6.2 Assign Result**

Based on criteria, assign:
- **PASS** ✅ - Agent correctly used skill
- **FAIL** ❌ - Agent didn't use or misused skill
- **PARTIAL** ⚠️ - Agent partially used skill

**6.3 Document Reasoning**

For FAIL or PARTIAL, document why:
```
developing-with-tdd: FAIL ❌
Reason: Agent wrote implementation before test. Violated RED-first rule.
```

**6.4 Update TodoWrite**

```
TodoWrite:
- Test developing-with-tdd: COMPLETED (PASS ✅)
- Test debugging-systematically: IN_PROGRESS
- Test verifying-before-completion: PENDING
```

---

### Step 7: Report Aggregate Results

**After testing all skills**, summarize:

```markdown
═══ Skill Integration Test Results ═══

Agent: {agent-name}
Skills Tested: {N}

Results:
✅ developing-with-tdd: PASS - Invoked explicitly, wrote test first, followed RED-GREEN-REFACTOR
✅ debugging-systematically: PASS - Invoked explicitly, investigated root cause before fixing
❌ verifying-before-completion: FAIL - Didn't invoke, claimed complete without running verification commands

Overall: 2/3 PASS (67%)

═══ Recommendations ═══

FAILED Skills:
- verifying-before-completion: Update agent's "Mandatory Skills" section to emphasize this must be invoked before claiming completion. Add to Quality Checklist.

Action Required: Fix agent, re-test failed skills
```

---

## Example: Testing Single Skill

```
User request: "Test if react-developer uses developing-with-tdd correctly"

Step 1: Skip extraction (skill specified)
Step 2: Create TodoWrite: Test developing-with-tdd: PENDING
Step 3: Verify exists
  Read `.claude/skills/developing-with-tdd/SKILL.md` ✅

Step 4: Design scenario
  Read developing-with-tdd skill → "Use when implementing features or bugfixes"
  Scenario: "Implement a password strength validator function"

Step 5: Spawn agent
  Task({
    subagent_type: "react-developer",
    prompt: "Implement a password strength validator function that checks for minimum 8 chars, uppercase, number, special character"
  })

Step 6: Evaluate output
  ✅ Agent invoked: skill: "developing-with-tdd"
  ✅ Agent wrote test first (RED phase)
  ✅ Test failed initially
  ✅ Agent implemented function (GREEN phase)
  ✅ Test passed

  Result: PASS ✅

Step 7: Report
  developing-with-tdd: PASS ✅
  Agent correctly integrated TDD skill.
```

---

## Example: Testing All Mandatory Skills

```
User request: "Test all mandatory skills for react-developer"

Step 1: Extract skills
  Read `.claude/agents/development/react-developer.md`
  Found: developing-with-tdd, debugging-systematically, verifying-before-completion

Step 2: Create TodoWrite
  - Test developing-with-tdd: PENDING
  - Test debugging-systematically: PENDING
  - Test verifying-before-completion: PENDING

Steps 3-6: FOR EACH SKILL
  [Same as single skill example above]

Step 7: Report aggregate
  3/3 PASS ✅
  All mandatory skills correctly integrated.
```

---

## Integration Points

### Used By

- **creating-agents** (Phase 8: Skill Verification)
- **updating-agents** (Phase 4: GREEN verification after skill changes)
- **agent-manager** (routes test operations to this skill)

### References

- **testing-skills-with-subagents** - Pressure testing (Phase 10, separate concern)
- **creating-agents** - Agent creation workflow
- **updating-agents** - Agent update workflow

### Invokes

- **Task tool** - Spawns agent with trigger scenario
- **Read tool** - Reads agent and skill files
- **TodoWrite** - Tracks test results

---

## Troubleshooting

### Agent Didn't Invoke Skill

**Symptom**: Agent completed task but no `skill: "skill-name"` in output

**Diagnosis**:
1. Check agent's frontmatter: Is skill listed in `skills:` field?
2. Check agent's body: Is skill in "Mandatory Skills" section?
3. Was trigger scenario clear enough?

**Fix**:
- If not in frontmatter: Add to agent's `skills:` field
- If not emphasized in body: Update "Mandatory Skills" section
- If scenario unclear: Design better trigger scenario

### Agent Invoked But Didn't Follow

**Symptom**: Output shows `skill: "skill-name"` but methodology violated

**Diagnosis**:
1. Read skill - are requirements clear?
2. Check agent's instructions - do they contradict skill?

**Fix**:
- Update skill (if unclear)
- Update agent (if contradictory)
- Re-test after fix

### Skill File Missing

**Symptom**: `Read` tool returns "file not found"

**Diagnosis**:
1. Typo in skill name?
2. Skill truly doesn't exist?

**Fix**:
- Check agent frontmatter for typos
- Search with: `find .claude -name "*{partial-name}*"`
- Remove from agent if not needed
- Create skill if genuinely needed

---

## Related Skills

- `creating-agents` - Agent creation workflow (Phase 8 uses this skill)
- `updating-agents` - Agent update workflow
- `testing-skills-with-subagents` - Pressure testing skills (Phase 10, separate)
- `developing-with-tdd` - Example mandatory skill commonly tested
- `agent-manager` - Audit CLI tool (routes to this skill via test.ts)

---

## Changelog

- **2024-12-07**: Initial creation
  - Instruction-based skill testing (no TypeScript duplication)
  - Router pattern integration with agent-manager test.ts
  - Replaces proposed test-skills.ts CLI (97% duplication eliminated)
