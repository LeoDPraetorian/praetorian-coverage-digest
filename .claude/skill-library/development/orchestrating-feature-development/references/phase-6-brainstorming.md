# Phase 6: Brainstorming

**Design refinement through collaborative exploration of alternatives for feature development.**

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

**Feature Type:** {frontend/backend/full-stack from Phase 3}

**Discovery Findings:**

- Technologies: {from Phase 3}
- Affected areas: {from Phase 3}
- Constraints: {from Phase 3}

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

**Feature-specific example:**

| Approach                 | Description                      | Pros                | Cons           |
| ------------------------ | -------------------------------- | ------------------- | -------------- |
| A: Extend existing table | Add filter to current AssetTable | Familiar, less risk | May be limited |
| B: New filter component  | Create dedicated FilterPanel     | Clean separation    | More code      |
| C: Generic filter system | Build reusable filter framework  | Highly reusable     | More complex   |

For each alternative, assess:

- Alignment with existing patterns (from Phase 3)
- Implementation effort
- Maintenance burden
- Risk level
- Reusability

---

## Step 4: Validate Assumptions

For each assumption, determine:

| Assumption                | Validation Method     | Result             |
| ------------------------- | --------------------- | ------------------ |
| "Users need multi-select" | Check similar filters | Confirmed/Rejected |
| "Can reuse existing hook" | Review useAssets      | Confirmed/Rejected |
| "State needs persistence" | Check URL params      | Confirmed/Rejected |

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
      { label: "Approach C", description: "Generic system - reusable but complex" },
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

Create `.feature-development/brainstorming.md`:

```markdown
# Brainstorming Report

**Feature:** {description}
**Session:** {timestamp}

## Alternatives Explored

### Approach A: Extend Existing Table (SELECTED)

**Description:** Add filter column to current AssetTable
**Pros:**

- Familiar pattern (TanStack Table)
- Less code to write
- Lower risk

**Cons:**

- Limited customization
- May need refactoring later

### Approach B: New Filter Component

**Description:** Create dedicated FilterPanel component
**Pros:**

- Clean separation of concerns
- Easier to test

**Cons:**

- More code to maintain
- State coordination needed

### Approach C: Generic Filter System

**Description:** Build reusable filter framework
**Pros:**

- Can reuse across tables
- Future-proof

**Cons:**

- Over-engineering for current needs
- More complex implementation

## Assumptions Validated

| Assumption               | Status    | Evidence                         |
| ------------------------ | --------- | -------------------------------- |
| Users need multi-select  | Confirmed | Similar filters use multi-select |
| Can reuse useAssets hook | Confirmed | Pattern supports filter params   |

## Decision

**Selected:** Approach A - Extend Existing Table
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
  approach_name: "Extend Existing Table"
  rationale: "Lowest risk, aligns with existing patterns"

  assumptions_validated:
    - assumption: "Users need multi-select"
      status: "confirmed"
    - assumption: "Can reuse useAssets hook"
      status: "confirmed"
```

---

## Step 9: Update TodoWrite & Report

```markdown
## Brainstorming Complete

**Selected Approach:** Extend Existing Table (Approach A)
**Rationale:** Lowest risk, aligns with patterns

**Key Decisions:**

- Add filter column to existing table
- Reuse useAssets hook with new params
- Follow TanStack Table filter pattern

→ Proceeding to Phase 7: Architecture Plan
```

---

## Skip Conditions

Phase 6 is skipped when:

- work_type is BUGFIX, SMALL, or MEDIUM
- User explicitly requests to skip ("just build it")

**When skipped:** MANIFEST shows `6_brainstorming: { status: "skipped", reason: "work_type" }`

---

## Related References

- [Phase 5: Complexity](phase-5-complexity.md) - Provides inputs
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Uses selected approach
- [brainstorming](.claude/skills/brainstorming/SKILL.md) - Required sub-skill
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval
