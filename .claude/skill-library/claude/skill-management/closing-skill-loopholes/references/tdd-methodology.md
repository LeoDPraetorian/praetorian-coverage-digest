# TDD Methodology for Closing Loopholes

**Complete RED-GREEN-REFACTOR workflow for systematic loophole closure.**

## Overview

Closing skill loopholes uses Test-Driven Development (TDD) methodology adapted from software engineering. Each phase has specific gates that must be passed before proceeding.

---

## 🔴 RED Phase: Prove the Loophole Exists

**Goal**: Document concrete evidence that agents bypass skill instructions.

**Cannot proceed to GREEN without failing test.**

### Step 1: Capture Failure Evidence

Document the compliance failure with all required fields:

```markdown
Agent: {agent-name}
File: .claude/agents/{type}/{agent-name}.md
Task: "{exact prompt given to agent}"
Expected: {what skill/agent definition required}
Actual: {what agent actually did}
Rationalization: {agent's justification - verbatim or inferred}
```

**Example:**

```
Agent: mcp-lead
File: .claude/agents/architecture/mcp-lead.md
Task: "Analyze Serena connection pool implementation"
Expected: Invoke persisting-agent-outputs, write to file, track skills
Actual: Inline response, no file, no skill tracking
Rationalization: [Inferred] "Quick analysis doesn't need full protocol"
```

### Step 2: Classify the Pattern

Match observed behavior to known pattern:

| Pattern                   | Indicators                                                      |
| ------------------------- | --------------------------------------------------------------- |
| Quick Question Trap       | Agent treats analysis as "just answering a question"            |
| Context First             | Agent explores/reads code before checking for applicable skills |
| Memory Confidence         | Agent assumes they know skill content without reading           |
| Overkill Excuse           | Agent decides protocol is "too much" for this task              |
| Description Hallucination | Agent invents different skill description                       |
| Sunk Cost                 | Agent has working code, doesn't want to refactor                |
| Time Pressure             | Agent prioritizes speed over compliance                         |
| Authority Override        | Agent interprets user request as bypassing protocol             |

**If pattern doesn't match existing taxonomy**: Create new pattern entry.

### Step 3: Document in Tracking File

Add to `.claude/docs/AGENT-LOOPHOLES.md`:

```markdown
| Date       | Agent   | Task             | Rationalization | Counter Added | Verified |
| ---------- | ------- | ---------------- | --------------- | ------------- | -------- |
| YYYY-MM-DD | {agent} | "{task summary}" | {pattern name}  | [pending]     | ❌       |
```

**Create file if missing:**

```markdown
# Agent Loophole Tracking

Records compliance failures and counter effectiveness.

## Format

| Date | Agent | Task | Rationalization | Counter Added | Verified |
| ---- | ----- | ---- | --------------- | ------------- | -------- |

## Process

1. RED: Document loophole when discovered
2. GREEN: Add counter reference to "Counter Added" column
3. REFACTOR: Update "Verified" to ✅ when re-test passes
```

### RED Phase Completion Criteria

- ✅ All evidence fields captured
- ✅ Pattern classified (or new pattern documented)
- ✅ Entry added to AGENT-LOOPHOLES.md
- ✅ Specific scenario identified for re-testing

**Cannot proceed without concrete failure evidence.**

---

## 🟢 GREEN Phase: Write Minimal Counter

**Goal**: Add explicit counter that prevents the specific rationalization.

### Step 1: Write Counter

Use template:

```markdown
## {Pattern Name} Counter

If you think: "{exact rationalization}"

Reality: {why this thought is wrong}

Required action:

- {specific behavior 1}
- {specific behavior 2}
```

**Counter quality checklist:**

- ✅ Addresses ONLY observed rationalization (not hypothetical ones)
- ✅ Uses "If you think" to trigger on exact phrasing
- ✅ Provides "Reality" counter-argument
- ✅ Specifies "Required action" with concrete steps
- ✅ Written in imperative, direct language

### Step 2: Determine Scope

Use decision tree:

```
Is loophole specific to one agent?
├─ YES → Agent-specific counter
│         Location: {agent}.md <EXTREMELY-IMPORTANT> section
│
└─ NO → Is it specific to one skill's usage?
        ├─ YES → Skill-wide counter
        │         Location: {skill}/SKILL.md ## Red Flags section
        │
        └─ NO → Universal counter
                  Location: using-skills anti-rationalization table
```

**Examples:**

- **Agent-specific**: mcp-lead treats analysis as quick questions → Counter in mcp-lead.md
- **Skill-wide**: Multiple agents skip persisting-agent-outputs → Counter in persisting-agent-outputs/SKILL.md
- **Universal**: Many agents skip skills due to "memory confidence" → Counter in using-skills/SKILL.md

### Step 3: Add Supporting Rules

If not present in target location, add:

**1% Threshold Rule:**

```markdown
## The 1% Rule (NON-NEGOTIABLE)

If there is even a 1% chance a skill might apply:

- You MUST invoke that skill
- This is not optional
- You cannot rationalize your way out of this

Uncertainty = Invocation. Period.
```

**Announcement Requirement:**

```markdown
## Skill Announcement (MANDATORY)

Before using any skill, announce it in your response:

"I am invoking `{skill-name}` because {reason}."

This announcement must appear BEFORE you begin work.
No announcement = protocol violation.
```

### Step 4: Update Tracking

Update AGENT-LOOPHOLES.md entry:

```markdown
| Date       | Agent    | Task         | Rationalization | Counter Added      | Verified |
| ---------- | -------- | ------------ | --------------- | ------------------ | -------- |
| YYYY-MM-DD | mcp-lead | "analyze..." | Quick Question  | mcp-lead.md#L45-67 | ❌       |
```

### GREEN Phase Completion Criteria

- ✅ Counter written addressing specific rationalization
- ✅ Scope determined and counter placed correctly
- ✅ 1% rule and announcement requirement present
- ✅ Tracking entry updated with counter location

**Cannot proceed without counter in place.**

---

## 🔵 REFACTOR Phase: Verify and Iterate

**Goal**: Confirm counter prevents rationalization, find additional loopholes.

### Step 1: Re-Test Exact Scenario

Spawn fresh subagent with Task tool:

```markdown
Task: {exact original task that caused failure}

COMPLIANCE CHECK (blocking):

- Did agent announce skills before using them?
- Did agent write output to file (if required)?
- Does output metadata include skills_invoked?

IMPORTANT: You have {counter added} to prevent {rationalization pattern}.
```

**Use Task tool** - don't test in main conversation (contaminated context).

### Step 2: Evaluate Result

| Outcome                        | Evidence                                              | Action                            |
| ------------------------------ | ----------------------------------------------------- | --------------------------------- |
| ✅ PASS                        | Agent announced skills, wrote file, included metadata | Mark verified in tracking         |
| ❌ FAIL - Same rationalization | Agent used same bypass                                | Strengthen counter, re-test       |
| ❌ FAIL - New rationalization  | Agent found different loophole                        | Document new pattern, add counter |

**Example PASS evidence:**

```
Agent announced: "I am invoking persisting-agent-outputs to ensure output is tracked"
Agent wrote: .claude/.output/analysis/serena-pool-review.md
Metadata includes: skills_invoked: ["persisting-agent-outputs", "enforcing-evidence-based-analysis"]
```

**Example FAIL evidence:**

```
Agent bypassed with new rationalization: "User said 'quick analysis' so file output not needed"
```

### Step 3: Iterate if Needed

**If same rationalization:**

- Counter too weak - add stronger language
- Counter not visible - move to more prominent location
- Counter conflicts with other instructions - resolve conflict

**If new rationalization:**

- Document as separate loophole
- Add counter for new pattern
- Re-test both patterns

### Step 4: Update Tracking

Mark loophole verified:

```markdown
| Date       | Agent    | Task         | Rationalization | Counter Added      | Verified |
| ---------- | -------- | ------------ | --------------- | ------------------ | -------- |
| YYYY-MM-DD | mcp-lead | "analyze..." | Quick Question  | mcp-lead.md#L45-67 | ✅       |
```

### Step 5: Check for Related Loopholes

Consider broader implications:

- Do other agents exhibit same pattern?
- Should counter be escalated to wider scope?
- Are there similar rationalizations that need counters?

### REFACTOR Phase Completion Criteria

- ✅ Re-test shows compliance with counter
- ✅ Loophole marked verified in tracking
- ✅ Related loopholes identified and documented
- ✅ Counter scope appropriate (not too narrow, not too broad)

---

## Multi-Loophole Workflow

When addressing multiple loopholes:

1. **Prioritize by impact**: Close high-frequency loopholes first
2. **One pattern at a time**: Don't add multiple counters simultaneously
3. **Re-test incrementally**: Verify each counter works before adding next
4. **Watch for interactions**: New counter may reveal related loopholes

---

## Statistical Evidence

From AGENTS-NOT-FOLLOWING-DIRECTIONS.md:

- **40% failure rate**: Skills created without RED phase
- **30% stale information**: Skills populated from memory vs research
- **40% variance**: Skill invocation varied between runs (mcp-lead2: 5 vs 7 skills)
- **Description hallucination**: Agent invented description to justify skipping

**These statistics motivate TDD approach** - concrete evidence prevents building wrong solution.

---

## Common Mistakes

| Mistake                       | Impact                             | Prevention                             |
| ----------------------------- | ---------------------------------- | -------------------------------------- |
| Skip RED phase                | Build counter for wrong problem    | Always capture failure evidence first  |
| Add multiple counters at once | Can't isolate which counter works  | One counter per TDD cycle              |
| Test in main conversation     | Contaminated context skews results | Always use Task tool for fresh context |
| Generic counters              | Easy to rationalize around         | Address specific observed behavior     |
| Skip verification             | Don't know if counter works        | Always re-test exact scenario          |

---

## When to Stop

A loophole is closed when:

1. ✅ Counter addresses specific rationalization
2. ✅ Re-test passes (agent complies)
3. ✅ Tracking shows "Verified" status
4. ✅ No new rationalizations discovered in re-test

**Don't keep adding counters after compliance is achieved.**
