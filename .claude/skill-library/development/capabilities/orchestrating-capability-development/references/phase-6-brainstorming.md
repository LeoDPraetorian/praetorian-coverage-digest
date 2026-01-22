# Phase 6: Brainstorming

**Design refinement through collaborative exploration of alternatives for capability development.**

---

## Overview

Brainstorming refines the initial concept by:

1. Exploring alternative detection approaches
2. Identifying trade-offs (accuracy vs performance)
3. Validating assumptions about threat landscape
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

**Capability Type:** {VQL/Nuclei/Janus/Fingerprintx/Scanner from Phase 3}

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

### VQL Capability Example

| Approach           | Description                     | Pros                 | Cons                  |
| ------------------ | ------------------------------- | -------------------- | --------------------- |
| A: Filesystem scan | Scan all files matching pattern | Comprehensive        | Slow on large systems |
| B: Registry check  | Check registry for indicators   | Fast                 | Windows-only          |
| C: Process memory  | Scan running process memory     | Catches in-use creds | Elevated permissions  |

### Nuclei Template Example

| Approach               | Description                      | Pros                 | Cons               |
| ---------------------- | -------------------------------- | -------------------- | ------------------ |
| A: Single request      | One request with complex matcher | Fast                 | May miss variants  |
| B: Multi-step workflow | Request chain with extraction    | Catches all variants | Slower             |
| C: Blind detection     | Use OOB callbacks                | Works on blind vulns | Requires DNS setup |

### Fingerprintx Module Example

| Approach             | Description                | Pros          | Cons              |
| -------------------- | -------------------------- | ------------- | ----------------- |
| A: Banner parsing    | Parse service banner       | Simple        | May be customized |
| B: Version probe     | Send version request       | Accurate      | Extra request     |
| C: Feature detection | Test for specific features | Very accurate | Multiple requests |

For each alternative, assess:

- Alignment with existing patterns (from Phase 3)
- Detection accuracy impact
- False positive risk
- Performance impact
- Implementation effort

---

## Step 4: Validate Assumptions

For each assumption, determine:

| Assumption               | Validation Method     | Result             |
| ------------------------ | --------------------- | ------------------ |
| "CVE has single variant" | Check NVD, exploit-db | Confirmed/Rejected |
| "Protocol follows RFC"   | Review protocol docs  | Confirmed/Rejected |
| "Target versions common" | Check Shodan stats    | Confirmed/Rejected |

**If assumption rejected:** Revise approach or flag for human decision.

---

## Step 5: Human Checkpoint

**REQUIRED:** Present findings to human for approval.

Use AskUserQuestion:

```
AskUserQuestion({
  questions: [{
    question: "Which detection approach should we use?",
    header: "Design Direction",
    options: [
      { label: "Approach A (Recommended)", description: "Single request - fastest, good for most cases" },
      { label: "Approach B", description: "Multi-step - catches all variants but slower" },
      { label: "Approach C", description: "Blind detection - works on blind vulns" },
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

Create `.capability-development/brainstorming.md`:

```markdown
# Brainstorming Report

**Capability:** {description}
**Type:** {VQL/Nuclei/Janus/Fingerprintx/Scanner}
**Session:** {timestamp}

## Alternatives Explored

### Approach A: Single Request Detection (SELECTED)

**Description:** Use single HTTP request with regex matchers
**Pros:**

- Fast scan performance
- Low request count
- Simple to maintain

**Cons:**

- May miss edge case variants
- Relies on stable response format

### Approach B: Multi-Step Workflow

**Description:** Chain requests to confirm vulnerability
**Pros:**

- Catches all CVE variants
- Lower false positive rate

**Cons:**

- Slower scan times
- More complex template

### Approach C: Blind Detection with OOB

**Description:** Use out-of-band DNS/HTTP callbacks
**Pros:**

- Works on blind vulnerabilities
- Definitive confirmation

**Cons:**

- Requires callback infrastructure
- More complex setup

## Assumptions Validated

| Assumption                 | Status    | Evidence                |
| -------------------------- | --------- | ----------------------- |
| CVE has single variant     | Rejected  | NVD shows 3 variants    |
| Response format consistent | Confirmed | Tested on 5 versions    |
| Target commonly deployed   | Confirmed | Shodan shows 50K+ hosts |

## Decision

**Selected:** Approach A - Single Request Detection
**Rationale:** Best balance of accuracy and performance
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
  approach_name: "Single Request Detection"
  rationale: "Best balance of accuracy and performance"

  assumptions_validated:
    - assumption: "CVE has single variant"
      status: "rejected"
      impact: "Need to handle 3 variants"
    - assumption: "Response format consistent"
      status: "confirmed"
```

---

## Step 9: Update TodoWrite & Report

```markdown
## Brainstorming Complete

**Selected Approach:** Single Request Detection (Approach A)
**Rationale:** Best balance of accuracy and performance

**Key Decisions:**

- Use regex matchers for detection
- Handle 3 CVE variants (not 1 as initially assumed)
- Target version range: 1.0-2.5

→ Proceeding to Phase 7: Architecture Plan
```

---

## Capability-Specific Brainstorming Focus

| Capability Type | Primary Focus Areas                                           |
| --------------- | ------------------------------------------------------------- |
| VQL             | Artifact sources, query performance, platform coverage        |
| Nuclei          | Detection method, false positive prevention, variant coverage |
| Janus           | Tool selection, pipeline ordering, error handling strategy    |
| Fingerprintx    | Probe design, protocol compliance, version extraction         |
| Scanner         | API approach, authentication method, rate limit handling      |

### VQL-Specific Questions

- What artifacts contain the target data?
- What query approach minimizes system impact?
- How to handle different OS versions?

### Nuclei-Specific Questions

- What response indicates vulnerability?
- How to avoid false positives on patched systems?
- What CVE variants exist?

### Janus-Specific Questions

- Which tools should be chained?
- What's the optimal ordering?
- How to handle tool failures?

### Fingerprintx-Specific Questions

- What protocol features identify this service?
- How to distinguish from similar services?
- What version markers exist?

### Scanner-Specific Questions

- What API endpoints are needed?
- What authentication method?
- How to handle rate limits?

---

## Skip Conditions

Phase 6 is skipped when:

- work_type is BUGFIX, SMALL, or MEDIUM
- User explicitly requests to skip ("just build it")

**When skipped:** MANIFEST shows `6_brainstorming: { status: "skipped", reason: "work_type" }`

---

## Edge Cases

### Conflicting Detection Approaches

If experts disagree on approach:

1. Document both perspectives
2. Create comparison matrix
3. Present trade-offs to user
4. Let human make final call

### Unknown Threat Landscape

If insufficient information about target:

1. Document what's unknown
2. Propose research tasks
3. Get user approval for research
4. Return to brainstorming after research

### Porting Existing Capability

If porting Python to Go:

1. Review original Python implementation
2. Explore Go idiomatic alternatives
3. Invoke `porting-python-capabilities-to-go`
4. Document porting trade-offs

---

## Related References

- [Phase 5: Complexity](phase-5-complexity.md) - Provides inputs
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Uses selected approach
- [Capability Types](capability-types.md) - Type-specific focus areas
- [Quality Standards](quality-standards.md) - Accuracy/performance targets
- [brainstorming](../../brainstorming/SKILL.md) - Required sub-skill
- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval
