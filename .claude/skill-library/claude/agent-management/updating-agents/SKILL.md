---
name: updating-agents
description: Use when modifying existing agents - guides through TDD update workflow (RED-GREEN) with compliance validation
allowed-tools: Read, Write, Edit, Bash, Grep, TodoWrite, Task, Skill, AskUserQuestion
---

# Updating Agents

**Instruction-driven agent updates with TDD enforcement (simplified RED-GREEN for updates).**

**IMPORTANT**: Use TodoWrite to track phases. Updates still require validation.

---

## When to Use

- Modifying existing agent (add/change/remove content)
- User says "update the X agent"
- Fixing issues found in agent

**NOT for**: Creating new agents (use `creating-agents` skill)

---

## Quick Reference

| Phase | Purpose | Time | Checkpoint |
|-------|---------|------|------------|
| **1. 🔴 RED** | Document current failure | 5 min | Failure captured |
| **2. Locate** | Find agent file | 1 min | File found |
| **3. Minimal Change** | Edit agent (minimal diff) | 5-10 min | Change applied |
| **4. 🟢 GREEN** | Verify fix works | 5 min | Agent solves problem |
| **5. Compliance** | Quality checks | 3 min | Audit passed |
| **6. 🔵 REFACTOR** | Pressure test (if major change) | 10-15 min | Optional for minor changes |

**Total**: 20-40 minutes (minor changes ~20 min, major changes ~40 min with REFACTOR)

---

## Phase 1: 🔴 RED (Document Current Failure)

### 1.1 What's Wrong Today?

Use AskUserQuestion:

```
Question: What behavior is wrong with the current agent?
Header: Current Issue
Options:
  - Agent gives wrong guidance
  - Agent missing important rules
  - Agent uses wrong tools/skills
  - Agent needs additional capabilities
```

### 1.2: Capture Failure

Ask user to test current agent and show failure:

```
Question: Can you demonstrate the failure with the current agent?
Header: Failure Demo
Options:
  - I'll describe what goes wrong
  - Let me spawn the agent and show you
```

**If "spawn agent"**: Use Task tool with scenario, capture wrong behavior.

**If "describe"**: Record their description.

### 1.3 Confirm This Needs Agent Update

```
Question: Does this require updating the agent (vs updating a skill)?
Header: Update Scope
Options:
  - Yes - agent itself needs changes
  - No - should update a skill instead
  - Unclear - help me determine
```

**If "skill"**: Recommend using `skill-manager` instead.

**Cannot proceed without confirming agent update needed** ✅

---

## Phase 2: Locate Agent

### 2.1 Find Agent File

**If user provided name**:
```bash
find .claude/agents -name "{name}.md"
```

**If searching**:
```bash
cd .claude/skill-library/claude/agent-management/searching-agents/scripts && npm run --silent search -- "{keywords}"
```

### 2.2 Read Current Agent

```
Read `.claude/agents/{type}/{name}.md`
```

Understand current structure before changing.

---

## Phase 3: Minimal Change

### 3.1 Identify Specific Section to Change

**Based on RED failure**, determine which section needs update:

| If failure is... | Update section... |
|------------------|-------------------|
| Wrong guidance | Critical Rules or Skill References |
| Missing capability | Core Responsibilities |
| Wrong tools | Frontmatter tools field |
| Wrong skills | Frontmatter skills field or Skill References |
| Missing escalation | Escalation Protocol |
| Wrong output | Output Format |
| Skills not invoked | Mandatory Skills section (see 3.3) |

### 3.2 Apply Minimal Edit

**Use Edit tool** (not Write - preserve rest of file):

```
Edit {
  file_path: ".claude/agents/{type}/{name}.md",
  old_string: "{Section to change}",
  new_string: "{Updated section}"
}
```

**Minimal diff**: Change only what's needed to fix RED failure.

### 3.3 Special Case: Updating Mandatory Skills Section

**If updating the Mandatory Skills section**, ensure:

#### 3.3.1 EXTREMELY_IMPORTANT Block at Top

The agent MUST have an `<EXTREMELY_IMPORTANT>` block at the very top (after frontmatter, before main content).

**Critical Understanding**: The `skills:` field in agent frontmatter makes skills AVAILABLE (0 token discovery cost), but does NOT automatically invoke them. Agents must EXPLICITLY use the Skill tool. This pattern comes from obra/superpowers research.

**Template**:

```markdown
---
[frontmatter]
---

<EXTREMELY_IMPORTANT>
You MUST explicitly invoke mandatory skills using the Skill tool. This is not optional.

Before starting ANY implementation task:
1. Check if it matches a mandatory skill trigger
2. If yes, invoke the skill with: `skill: "skill-name"`
3. Show the invocation in your output
4. Follow the skill's instructions exactly

**Mandatory Skills for This Agent:**
- `{skill-1}` - Use when {trigger condition}
- `{skill-2}` - Use when {trigger condition}
- `{skill-3}` - Use when {trigger condition}

**Common rationalizations to avoid:**
- "This is just a simple feature" → NO. Check for skills.
- "I can implement this quickly" → NO. Invoke skills first.
- "The skill is overkill" → NO. If a skill exists, use it.
- "I remember the skill's content" → NO. Skills evolve. Read current version.
- "This doesn't count as {skill trigger}" → NO. When in doubt, use the skill.

If you skip mandatory skill invocation, your work will fail validation.
</EXTREMELY_IMPORTANT>

# Agent Name

[Rest of agent content]
```

**Key Requirements**:
- Absolute language: "MUST", "not optional", "cannot rationalize" (obra/superpowers pattern)
- Explicit invocation syntax shown: `skill: "skill-name"`
- Anti-rationalization patterns preemptively counter agent shortcuts
- Clear consequence: "fail validation"

#### 3.3.2 Explicit Invocation Syntax

Each mandatory skill MUST show the exact invocation syntax:

```markdown
### Test-Driven Development
**When**: Writing any code or fixing bugs
**Invoke**: `skill: "developing-with-tdd"`

Not "use TDD" or "follow TDD principles" - you must INVOKE the skill.
```

#### 3.3.3 Anti-Rationalization Patterns

Include explicit counters to agent bypass attempts:

```markdown
**NOT OPTIONAL**:
- Not even when "it's just a small fix"
- Not even when "the user described the solution"
- Not even when "I know the pattern"
- Not even when "I'm under time pressure"
```

#### 3.3.4 Verification Requirement

**CRITICAL**: After updating Mandatory Skills, you MUST verify BOTH process and behavioral compliance in a fresh session.

**Why fresh session?** Agent frontmatter and descriptions are cached at session start. Testing in the same session shows OLD behavior.

**Verification Steps**:

1. **Start new Claude Code session** (mandatory - caching issue)
2. **Spawn agent with test task** that triggers mandatory skill
3. **Check for BOTH compliance types**:
   - **Process Compliance**: Does output show `skill: "skill-name"` or "I'm using the X skill"?
   - **Behavioral Compliance**: Does agent follow the skill's patterns correctly?
4. **Evaluate Result**:
   - ✅ PASS: Both process AND behavioral compliance
   - ❌ FAIL (silent): Correct behavior, no invocation announced
   - ❌ FAIL (lip service): Invocation announced, wrong behavior
   - ❌ FAIL (ignored): Neither invocation nor correct behavior

**Why both matter**:
- **Process without behavioral** = Agent announces skill but doesn't follow it (lip service)
- **Behavioral without process** = Agent follows patterns but doesn't announce (unverifiable, breaks trust)

**Common failure**: Agent implements correctly (behavioral) but doesn't show invocation (process). This is a CRITICAL failure because users cannot verify the skill was used.

---

## Phase 4: 🟢 GREEN (Verify Fix)

### 4.1 Re-Test Scenario

**Spawn agent with RED scenario**:

```
Task({
  subagent_type: "{agent-name}",
  prompt: "{Same scenario from Phase 1}"
})
```

### 4.2 Evaluate

- **PASS**: Fix resolved the issue
- **FAIL**: Issue persists, need different fix
- **PARTIAL**: Better but not fully fixed

### 4.3 Confirm GREEN

```
Question: Does the updated agent solve the problem?
Header: GREEN Status
Options:
  - Yes - fix works (GREEN)
  - Partially - needs more iteration
  - No - different approach needed
```

**If not PASS**: Edit again (Phase 3), re-test.

**Cannot proceed without GREEN** ✅

---

## Phase 5: Compliance

### 5.1 Critical Audit

```bash
cd .claude/skill-library/claude/agent-management/auditing-agents/scripts && npm run --silent audit-critical -- {agent-name}
```

**If fails**: Fix issues, re-run.

### 5.2 Line Count Check

```bash
wc -l .claude/agents/{type}/{name}.md
```

**If exceeded** (<300 or <400): Extract content to skills.

### 5.3 Manual Checks

**General**:
- [ ] Description still valid (if changed)
- [ ] Tools/skills still alphabetized
- [ ] All sections still present
- [ ] No block scalars introduced

**If Mandatory Skills Updated** (CRITICAL):
- [ ] EXTREMELY_IMPORTANT block exists at top (after frontmatter)
- [ ] Uses obra/superpowers template with absolute language ("MUST", "not optional")
- [ ] Each skill shows explicit syntax: `skill: "skill-name"`
- [ ] Includes all 5 anti-rationalization patterns
- [ ] States clear consequence: "fail validation"
- [ ] **Critical Understanding section** present (explains skills: frontmatter ≠ auto-invoke)
- [ ] **Will test in fresh session** for BOTH process + behavioral compliance

---

## Phase 6: 🔵 REFACTOR (Conditional)

### When to Run Pressure Tests

**Run REFACTOR if**:
- Changed Critical Rules (rules might not resist pressure)
- Changed Mandatory Skills (workflow might be weaker)
- Added new capabilities (new ways to rationalize)

**Skip REFACTOR if**:
- Minor wording changes
- Fixed typos
- Updated skill paths
- Added examples to description

### If Running REFACTOR

**Use same process as creating-agents Phase 9**:

```
skill: "testing-skills-with-subagents"
Read `.claude/skills/creating-agents/references/pressure-testing.md`
```

Run 1-3 pressure tests (depending on change scope):
- Major rule change: All 3 tests
- Minor rule change: 1-2 relevant tests
- Capability addition: 1 test specific to new capability

---

## Success Criteria

Update complete when:

1. ✅ RED documented (current failure)
2. ✅ Agent edited (minimal change)
3. ✅ GREEN passed (fix verified)
4. ✅ Compliance passed (audit + line count)
5. ✅ REFACTOR passed if needed (pressure tests)
6. ✅ TodoWrite complete

**For minor changes**: 1-5 sufficient
**For major changes**: All 6 required

---

## Related Skills

- `creating-agents` - Create new agents
- `testing-skills-with-subagents` - Pressure testing (if REFACTOR needed)
- `agent-manager` - Router to this skill
- `developing-with-tdd` - TDD philosophy
- `verifying-before-completion` - Final validation
