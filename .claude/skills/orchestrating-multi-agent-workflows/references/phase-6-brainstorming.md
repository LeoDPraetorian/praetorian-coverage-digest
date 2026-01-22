# Phase 6: Brainstorming

**Design refinement through collaborative exploration of alternatives.**

---

## Overview

Brainstorming refines the initial concept by:

1. Exploring alternative approaches
2. Identifying trade-offs
3. Validating assumptions
4. Getting human approval on direction

**Conditional:** Only executes for LARGE work_type.

**Entry Criteria:** Phase 5 (Complexity) complete.

**Exit Criteria:** Design direction approved by human, alternatives documented.

---

## Step 1: Invoke Brainstorming Skill

**REQUIRED SUB-SKILL:** `Skill("brainstorming")`

This skill provides:

- Socratic questioning method
- Alternative exploration
- Trade-off analysis
- Incremental validation

Follow the skill's process completely.

---

## Step 2: Prepare Context for Brainstorming

Gather inputs from previous phases:

```markdown
## Brainstorming Context

**Original Request:**
{user's original request from Phase 2}

**Discovery Findings:**

- Existing patterns: {from Phase 4}
- Affected areas: {from Phase 4}
- Constraints: {from Phase 4}

**Complexity Assessment:**

- Tier: {from Phase 5}
- Key factors: {from Phase 5}

**Initial Assumptions:**

1. {assumption 1}
2. {assumption 2}
3. ...
```

---

## Step 3: Explore Alternatives

Generate 2-4 alternative approaches:

| Approach           | Description                | Pros                | Cons                  |
| ------------------ | -------------------------- | ------------------- | --------------------- |
| A: Extend existing | Build on current patterns  | Familiar, less risk | May not fit perfectly |
| B: New component   | Create dedicated component | Clean separation    | More code to maintain |
| C: Hybrid          | Mix of existing + new      | Balanced            | More complex          |

For each alternative, assess:

- Alignment with existing patterns
- Implementation effort
- Maintenance burden
- Risk level

---

## Step 4: Validate Assumptions

For each assumption, determine:

| Assumption             | Validation Method              | Result             |
| ---------------------- | ------------------------------ | ------------------ |
| "Users need X feature" | Check existing usage data      | Confirmed/Rejected |
| "Pattern Y will work"  | Review similar implementations | Confirmed/Rejected |
| "Constraint Z applies" | Verify with codebase           | Confirmed/Rejected |

**If assumption rejected:** Revise approach or flag for human decision.

---

## Step 5: Human Checkpoint

**REQUIRED:** Present findings to human for approval.

Use AskUserQuestion:

```
AskUserQuestion({
  questions: [{
    question: "Which design approach should we use?",
    header: "Design Direction",
    options: [
      { label: "Approach A (Recommended)", description: "Extend existing - lowest risk, familiar patterns" },
      { label: "Approach B", description: "New component - cleaner but more work" },
      { label: "Approach C", description: "Hybrid - balanced trade-offs" },
      { label: "Need more exploration", description: "Continue brainstorming with different angles" }
    ],
    multiSelect: false
  }]
})
```

---

## Step 6: Handle Human Response

Based on selection:

**Approach Selected:**

- Record in MANIFEST
- Proceed to Phase 7 (Architecture Plan)

**Need More Exploration:**

- Return to Step 3 with new angles
- Maximum 3 brainstorming iterations
- After 3: escalate to human with "decision required"

---

## Step 7: Write Brainstorming Report

Create `{OUTPUT_DIR}/brainstorming.md`:

```markdown
# Brainstorming Report

**Feature:** {description}
**Session:** {timestamp}

## Alternatives Explored

### Approach A: Extend Existing (SELECTED)

**Description:** Build on current UserProfile component
**Pros:**

- Familiar pattern
- Less code to write
- Lower risk

**Cons:**

- May need refactoring later
- Slight technical debt

### Approach B: New Component

**Description:** Create dedicated ProfileMetrics component
**Pros:**

- Clean separation
- Easier to test

**Cons:**

- More code to maintain
- Breaks from existing patterns

### Approach C: Hybrid

**Description:** New component that wraps existing
**Pros:**

- Best of both worlds

**Cons:**

- More complex
- May confuse future developers

## Assumptions Validated

| Assumption               | Status    | Evidence                   |
| ------------------------ | --------- | -------------------------- |
| Users need metrics       | Confirmed | Analytics show 80% request |
| Current pattern supports | Confirmed | Similar extension exists   |

## Decision

**Selected:** Approach A - Extend Existing
**Rationale:** Lowest risk, aligns with existing patterns
**Approved by:** Human (checkpoint)
```

---

## Step 8: Update MANIFEST.yaml

```yaml
phases:
  6_brainstorming:
    status: "complete"
    completed_at: "{timestamp}"
    checkpoint_approved: true

brainstorming:
  iterations: 1
  alternatives_explored: 3
  selected_approach: "A"
  approach_name: "Extend Existing"
  rationale: "Lowest risk, aligns with existing patterns"

  assumptions_validated:
    - assumption: "Users need metrics"
      status: "confirmed"
    - assumption: "Current pattern supports"
      status: "confirmed"
```

---

## Step 9: Update TodoWrite & Report

```markdown
## Brainstorming Complete

**Selected Approach:** Extend Existing (Approach A)
**Rationale:** Lowest risk, aligns with patterns

**Key Decisions:**

- Build on UserProfile component
- Add metrics section
- Reuse existing data hooks

→ Proceeding to Phase 7: Architecture Plan
```

---

## Skip Conditions

Phase 6 is skipped when:

- work_type is BUGFIX, SMALL, or MEDIUM
- User explicitly requests to skip ("just build it")

**When skipped:** MANIFEST shows `5_brainstorming: { status: "skipped", reason: "work_type" }`

---

## Related References

- [Phase 5: Complexity](phase-5-complexity.md) - Provides inputs
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Uses selected approach
- [brainstorming](../../brainstorming/SKILL.md) - Required sub-skill
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval
