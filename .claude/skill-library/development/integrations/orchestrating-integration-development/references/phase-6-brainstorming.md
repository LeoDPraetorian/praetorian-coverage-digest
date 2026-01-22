# Phase 6: Brainstorming

**Design refinement through collaborative exploration of integration approaches.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Brainstorming refines the integration concept by:

1. Clarifying integration scope and requirements
2. Exploring alternative approaches
3. Validating assumptions about the vendor API
4. Getting human approval on direction

**Conditional:** Only executes for LARGE work_type.

**Entry Criteria:** Phase 5 (Complexity) complete.

**Exit Criteria:** Design direction approved by human, design.md written.

---

## Step 1: Invoke Brainstorming Skill

**REQUIRED SUB-SKILL:** `Skill("brainstorming")`

Follow the skill's Socratic questioning process.

---

## Step 2: Prepare Context for Brainstorming

Gather inputs from previous phases:

```markdown
## Brainstorming Context

**Original Request:**
{user's original request from Phase 2}

**Discovery Findings:**

- P0 patterns found: {from Phase 3}
- File placement: {from Phase 3}
- Vendor skill: {from Phase 4 - exists/created/missing}

**Complexity Assessment:**

- Tier: {from Phase 5}
- Key factors: {endpoints, entities, auth, pagination}

**Initial Assumptions:**

1. {assumption about API capability}
2. {assumption about auth flow}
3. ...
```

---

## Step 3: Key Questions to Resolve (Integration-Specific)

### 1. Vendor Identification

| Question                                                | Why It Matters                    |
| ------------------------------------------------------- | --------------------------------- |
| What vendor are we integrating with?                    | API docs source, SDK availability |
| Is there an existing `integrating-with-{vendor}` skill? | Reuse vs. create new              |
| What is the vendor's official API documentation URL?    | Research source                   |

### 2. Integration Type

| Type               | Description             | Data Flow        | Example         |
| ------------------ | ----------------------- | ---------------- | --------------- |
| Asset Discovery    | Import external assets  | Vendor → Chariot | Shodan, Censys  |
| Vulnerability Sync | Import vulns for assets | Vendor → Chariot | Qualys, Tenable |
| Bidirectional Sync | Two-way sync            | Vendor ↔ Chariot | Wiz, Orca       |

### 3. Authentication Method

| Method                     | UI Required? | Example            |
| -------------------------- | ------------ | ------------------ |
| API Key                    | YES          | Shodan, VirusTotal |
| OAuth2 Client Credentials  | YES          | Wiz, CrowdStrike   |
| OAuth2 Authorization Code  | YES          | GitHub App         |
| Service Account (IAM Role) | NO           | AWS cross-account  |

### 4. API Capabilities

| Capability      | Impact                       |
| --------------- | ---------------------------- |
| Pagination type | Determines loop pattern      |
| Rate limits     | Determines concurrency       |
| Bulk operations | Affects performance strategy |
| Webhooks        | Real-time vs. polling        |

### 5. Affiliation Strategy

| Approach               | When to Use                     |
| ---------------------- | ------------------------------- |
| API Query              | API supports individual lookups |
| Re-enumerate           | No individual lookup endpoint   |
| CheckAffiliationSimple | Simple integrations             |

---

## Step 4: Explore Alternatives

Generate 2-3 alternative approaches:

| Approach         | Description               | Pros               | Cons                |
| ---------------- | ------------------------- | ------------------ | ------------------- |
| A: Standard      | Follow existing patterns  | Familiar, low risk | May not fit         |
| B: Custom client | Build custom API client   | Optimized for API  | More code           |
| C: SDK-based     | Use vendor's official SDK | Well-tested        | Dependency overhead |

---

## Step 5: Validate Assumptions

For each assumption about the integration, determine:

| Assumption                 | Validation Method             | Result             |
| -------------------------- | ----------------------------- | ------------------ |
| "API supports pagination"  | Check API docs                | Confirmed/Rejected |
| "OAuth2 is required"       | Verify auth endpoint          | Confirmed/Rejected |
| "Rate limits are 100/min"  | Check vendor documentation    | Confirmed/Rejected |
| "CheckAffiliation via API" | Verify lookup endpoint exists | Confirmed/Rejected |

**If assumption rejected:** Revise approach or flag for human decision.

---

## Step 6: Human Checkpoint

**🛑 REQUIRED:** Present design to human for approval.

```
AskUserQuestion({
  questions: [{
    question: "Approve this integration design?",
    header: "Design Review",
    options: [
      { label: "Approve (Recommended)", description: "Proceed with this design" },
      { label: "Revise", description: "Return to brainstorming" },
      { label: "Cancel", description: "Stop workflow" }
    ],
    multiSelect: false
  }]
})
```

---

## Step 7: Handle Human Response

Based on selection:

**Approach Approved:**

- Record in MANIFEST
- Proceed to Phase 7 (Architecture Plan)

**Revise (Need More Exploration):**

- Return to Step 3 with new angles
- Maximum 3 brainstorming iterations
- After 3: escalate to human with "decision required"

**Cancel:**

- Update MANIFEST status to "cancelled"
- Clean up output directory if requested

---

## Step 8: Write Brainstorming Report

Create `{OUTPUT_DIR}/brainstorming.md`:

```markdown
# Integration Design: {Vendor}

## Overview

- **Vendor**: {name}
- **Integration Type**: {asset_discovery | vuln_sync | bidirectional_sync}
- **API Documentation**: {url}

## Authentication

- **Method**: {API Key | OAuth2 | Service Account}
- **Credential Fields**: {list}

## API Capabilities

- **Base URL**: {url}
- **Rate Limits**: {requests per minute}
- **Pagination**: {token | page | cursor}

## Data Mapping

### Assets

| Vendor Entity | Chariot Field | Transformation |
| ------------- | ------------- | -------------- |

### Vulnerabilities (if applicable)

| Vendor Entity | Chariot Field | Transformation |
| ------------- | ------------- | -------------- |

## Affiliation Strategy

- **Method**: {API Query | Re-enumerate | CheckAffiliationSimple}
- **Endpoint**: {if API Query}

## Selected Approach

**Approach:** {A/B/C}
**Rationale:** {why}
**Approved by:** Human (checkpoint)

## Open Questions

- {unresolved items}
```

---

## Step 9: Update MANIFEST.yaml

```yaml
phases:
  6_brainstorming:
    status: "complete"
    completed_at: "{timestamp}"
    checkpoint_approved: true

brainstorming:
  vendor: "{vendor}"
  integration_type: "{type}"
  auth_method: "{method}"
  selected_approach: "A"
  approach_name: "Standard pattern"
  rationale: "Follows existing patterns, low risk"
```

---

## Step 10: Update TodoWrite

```
TodoWrite([
  { content: "Phase 6: Brainstorming", status: "completed", activeForm: "Brainstorming design" },
  { content: "Phase 7: Architecture Plan", status: "in_progress", activeForm: "Creating architecture plan" },
  // ... rest
])
```

---

## Step 11: Report Results

```markdown
## Brainstorming Complete

**Vendor:** {vendor}
**Integration Type:** {type}
**Auth Method:** {method}
**Selected Approach:** Standard pattern

**Key Decisions:**

- Follow existing Wiz-style collector pattern
- Use OAuth2 client credentials
- Implement real CheckAffiliation with API query

→ Proceeding to Phase 7: Architecture Plan
```

---

## Skip Conditions

Phase 6 is skipped when:

- work_type is SMALL or MEDIUM

**When skipped:** MANIFEST shows `6_brainstorming: { status: "skipped", reason: "work_type" }`

---

## Gate Checklist

Phase 6 is complete when:

- [ ] `brainstorming` skill invoked
- [ ] Vendor and integration type confirmed
- [ ] Authentication method identified
- [ ] API capabilities documented
- [ ] Affiliation strategy decided
- [ ] `brainstorming.md` created
- [ ] Human approved design via AskUserQuestion
- [ ] MANIFEST.yaml updated
- [ ] Phase 6 status updated to 'complete'

---

## Related References

- [checkpoint-configuration.md](checkpoint-configuration.md) - Design approval checkpoint
- [phase-7-architecture-plan.md](phase-7-architecture-plan.md) - Next phase
