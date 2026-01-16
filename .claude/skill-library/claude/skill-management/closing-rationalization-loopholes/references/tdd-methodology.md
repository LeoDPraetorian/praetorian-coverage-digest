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

Add to `.claude/docs/agents/AGENT-LOOPHOLES.md`:

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

### Step 4: Reproduce the Failure

Spawn a fresh agent via Task tool with the exact task that caused the failure:

```markdown
Task: {exact original task}

COMPLIANCE CHECK:

- Document what the agent does
- Capture any rationalization in the response
```

**Why reproduce?** The observed failure could be context-dependent. Reproduction proves it's a systematic loophole, not a one-time fluke.

### Step 5: Understand the Rationalization

If the rationalization is not clear from the agent's output:

1. Ask Claude directly: "Why did you [skip X / do Y instead of Z]?"
2. Capture the verbatim rationalization
3. This becomes the "If you think:" trigger in the counter

**Cannot proceed to GREEN without:**

- ✅ Failure reproduced with fresh agent
- ✅ Rationalization captured (verbatim or explained)

### RED Phase Completion Criteria

- ✅ All evidence fields captured
- ✅ Failure reproduced with fresh agent
- ✅ Rationalization captured (verbatim or explained)
- ✅ Pattern classified (or new pattern documented)
- ✅ Entry added to AGENT-LOOPHOLES.md

**Cannot proceed without reproduced failure and understood rationalization.**

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

### Step 5: Verify Counter Works

Spawn fresh agent via Task tool with the same task:

```markdown
Task: {exact original task}

COMPLIANCE CHECK:

- Did agent announce skills before using them?
- Did agent follow the required protocol?
- Does output show compliance?

Note: Counter has been added to {location}. Verify it prevents the rationalization.
```

### Step 6: Iterate Until Passes

If agent still fails:

1. Analyze why counter didn't work
2. Strengthen counter language (more specific trigger, stronger reality check)
3. Re-run verification
4. Repeat until agent complies

**Common iteration fixes:**

- Counter trigger doesn't match agent's actual thought → Use verbatim rationalization
- Counter too generic → Add "Not even when:" exclusions
- Counter not visible → Move to more prominent location

**Cannot proceed to REFACTOR without:**

- ✅ Fresh agent passes with counter loaded
- ✅ Tracking entry updated with counter location

### GREEN Phase Completion Criteria

- ✅ Counter written addressing specific rationalization
- ✅ Scope determined and counter placed correctly
- ✅ 1% rule and announcement requirement present
- ✅ Fresh agent passes with counter loaded
- ✅ Tracking entry updated with counter location

**Cannot proceed without fresh agent passing with counter loaded.**

---

## 🔵 REFACTOR Phase: Pressure Test While Green

**Goal**: The counter works. Now verify it holds under pressure and improve if needed.

**Key principle**: You are ALREADY GREEN. Tests should stay green through all variations.

### Step 1: Pressure Test with Variations

Test the counter with pressure scenarios:

- **Time pressure**: "This is urgent, need answer ASAP"
- **Authority override**: "User explicitly said 'quick answer'"
- **Sunk cost**: "Already wrote working code, refactoring wastes time"

Spawn fresh agents with these variations and verify the counter holds.

### Step 2: Clean Up Counter Language

If needed, improve counter wording:

- Make trigger phrases more specific
- Strengthen reality checks
- Add explicit "Not even when:" exclusions

### Step 3: Check for Related Loopholes

Consider broader implications:

- Do other agents exhibit same pattern?
- Should counter be escalated to wider scope?
- Are there similar rationalizations that need counters?

### Step 4: Mark as Verified

Update loophole tracking:

```markdown
| Date       | Agent    | Task         | Rationalization | Counter Added      | Verified |
| ---------- | -------- | ------------ | --------------- | ------------------ | -------- |
| YYYY-MM-DD | mcp-lead | "analyze..." | Quick Question  | mcp-lead.md#L45-67 | ✅       |
```

### REFACTOR Phase Completion Criteria

- ✅ Pressure tests pass (counter holds under variations)
- ✅ Counter language cleaned up if needed
- ✅ Related loopholes identified and documented
- ✅ Counter scope appropriate (not too narrow, not too broad)
- ✅ Loophole marked verified in tracking

**Gate: Stays green through all pressure test variations**

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
