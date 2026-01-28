# Phase 6: Brainstorming

**Design refinement through collaborative exploration of detection alternatives for fingerprintx plugins.**

---

## Overview

Brainstorming refines the initial concept by:

1. Exploring alternative detection approaches
2. Identifying trade-offs (accuracy vs complexity)
3. Validating assumptions about protocol behavior
4. Getting human approval on direction

**Conditional:** Only executes for LARGE work_type.

**Entry Criteria:** Phase 5 (Complexity) complete.

**Exit Criteria:** Detection strategy approved by human, alternatives documented.

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

**Protocol:** {protocol name from Phase 3}
**Default Ports:** {ports from research}

**Discovery Findings:**

- Similar plugins: {from Phase 3}
- Banner patterns: {from protocol research}
- Version markers: {from version matrix}

**Complexity Assessment:**

- Tier: {from Phase 5}
- Key factors: {from Phase 5}

**Initial Assumptions:**

1. {assumption 1 - e.g., "Banner contains version string"}
2. {assumption 2 - e.g., "All versions use same handshake"}
3. ...
```

---

## Step 3: Explore Detection Alternatives

Generate 2-4 alternative detection approaches:

**Fingerprintx-specific example:**

| Approach                    | Description                     | Pros               | Cons              |
| --------------------------- | ------------------------------- | ------------------ | ----------------- |
| A: Banner string match      | Match known banner prefix       | Simple, fast       | May miss variants |
| B: Binary protocol parse    | Parse handshake structure       | More accurate      | More complex      |
| C: Multi-stage detection    | Try banner, fall back to binary | Most complete      | Slowest           |
| D: Port-specific heuristics | Different logic per port        | Handles edge cases | More code paths   |

For each alternative, assess:

- Detection accuracy (based on Shodan samples)
- False positive risk
- Performance impact
- Maintenance burden
- Coverage of version variants

---

## Step 4: Validate Assumptions

For each assumption, determine:

| Assumption                     | Validation Method    | Result             |
| ------------------------------ | -------------------- | ------------------ |
| "Banner contains version"      | Check Shodan samples | Confirmed/Rejected |
| "Same handshake all versions"  | Compare 5.x vs 8.x   | Confirmed/Rejected |
| "Error response is consistent" | Test invalid request | Confirmed/Rejected |

**If assumption rejected:** Revise approach or flag for human decision.

---

## Step 5: Human Checkpoint

**REQUIRED:** Present findings to human for approval.

Use AskUserQuestion:

```
AskUserQuestion({
  questions: [{
    question: "Which detection approach should we use?",
    header: "Detection Strategy",
    options: [
      { label: "Banner string match (Recommended)", description: "Simple - good for clear banner protocols" },
      { label: "Binary protocol parse", description: "Accurate - needed for binary protocols" },
      { label: "Multi-stage detection", description: "Complete - try multiple methods" },
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

Create `.fingerprintx-development/brainstorming.md`:

```markdown
# Brainstorming Report

**Protocol:** {protocol name}
**Session:** {timestamp}

## Detection Alternatives Explored

### Approach A: Banner String Match (SELECTED)

**Description:** Match known banner prefix/format
**Pros:**

- Simple implementation
- Fast detection
- Easy to test

**Cons:**

- May miss unusual banner variants
- Version extraction less accurate

### Approach B: Binary Protocol Parse

**Description:** Parse handshake binary structure
**Pros:**

- Most accurate
- Better version extraction

**Cons:**

- More complex
- Harder to maintain

### Approach C: Multi-Stage Detection

**Description:** Try banner match, fall back to binary
**Pros:**

- Handles edge cases
- Most complete coverage

**Cons:**

- Slower (multiple attempts)
- More code to maintain

## Assumptions Validated

| Assumption                  | Status    | Evidence                          |
| --------------------------- | --------- | --------------------------------- |
| Banner contains version     | Confirmed | 18/20 Shodan samples have version |
| Same handshake all versions | Rejected  | 8.0 has different capabilities    |

## Decision

**Selected:** Approach A - Banner String Match
**Rationale:** Protocol has clear text banner, matches similar plugins
**Version note:** Will handle 8.0 capabilities separately
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
  approach_name: "Banner String Match"
  rationale: "Protocol has clear text banner, matches similar plugins"

  assumptions_validated:
    - assumption: "Banner contains version"
      status: "confirmed"
    - assumption: "Same handshake all versions"
      status: "rejected"
      note: "8.0 has different capabilities - handling separately"
```

---

## Step 9: Update TodoWrite & Report

```markdown
## Brainstorming Complete

**Selected Approach:** Banner String Match (Approach A)
**Rationale:** Protocol has clear text banner

**Key Decisions:**

- Use banner prefix matching
- Extract version from greeting string
- Handle 8.0 capabilities flag separately

-> Proceeding to Phase 7: Architecture Plan
```

---

## Skip Conditions

Phase 6 is skipped when:

- work_type is BUGFIX, SMALL, or MEDIUM
- User explicitly requests to skip ("just build it")

**When skipped:** MANIFEST shows `6_brainstorming: { status: "skipped", reason: "work_type" }`

---

## Fingerprintx-Specific Considerations

**Detection Accuracy vs Complexity:**

- Simple protocols: Banner match usually sufficient
- Binary protocols: May need structured parsing
- Multi-version protocols: Consider multi-stage approach

**Version Detection Trade-offs:**

- Accurate version: More complex parsing
- Basic version: Simpler, may miss edge cases
- No version: Simplest, but less useful

**Test Vector Implications:**

- Each approach affects test strategy
- More complex detection = more test cases needed
- Consider Docker container availability

---

## Related References

- [Phase 5: Complexity](phase-5-complexity.md) - Provides inputs
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Uses selected approach
- [brainstorming](.claude/skills/brainstorming/SKILL.md) - Required sub-skill
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval
