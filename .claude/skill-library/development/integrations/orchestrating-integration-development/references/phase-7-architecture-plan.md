# Phase 7: Architecture Plan

**Design integration architecture AND decompose into implementation tasks.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Architecture Plan combines technical design with task decomposition:

1. Define integration components with P0 compliance
2. Design data flows and authentication
3. Decompose work into specific tasks
4. Get human approval before implementation

**Conditional:** Skipped for SMALL work_type.

**Entry Criteria:** Phase 6 (Brainstorming) complete or skipped, Phase 5 (Complexity) complete.

**Exit Criteria:** Architecture approved, tasks defined, ready for implementation.

---

## Step 1: Gather Inputs

```markdown
## Architecture Plan Inputs

**Vendor:** {from Phase 4}
**Integration Type:** {from Phase 2 triage or Phase 6}

**Discovery Findings:** {from Phase 3}

- P0 patterns found: [list]
- File placement: [from discovery]

**Skills Available:** {from Phase 4}

- Vendor skill: integrating-with-{vendor}
- P0 skills: developing-integrations, validating-integrations

**Complexity Tier:** {from Phase 5}
**Batch Plan:** {from Phase 5}
```

---

## Step 2: Spawn Integration-Lead Agent

**⚡ PRE-SPAWN CHECK:** Before spawning, run intra-phase compaction protocol from [compaction-gates.md](compaction-gates.md#intra-phase-compaction-heavy-phases).

**Agent prompt template:**

```markdown
Task: Design integration architecture for {vendor}

**INPUT FILES (read all):**

- discovery.md: Codebase patterns from existing integrations
- skill-manifest.yaml: Available skills
- brainstorming.md (if exists): Design decisions

**OUTPUT:** architecture-plan.md with ALL sections:

## Part 1: Technical Architecture

1. Authentication Flow
2. Pagination Strategy (maxPages constant)
3. CheckAffiliation Approach (NOT a stub)
4. Tabularium Mapping
5. errgroup Concurrency (SetLimit value)
6. File Size Management (<400 lines)
7. P0 Compliance Checklist (MANDATORY)
8. Frontend Requirements (YES/NO with reason)

## Part 2: Task Decomposition

9. Task list with IDs (T001, T002, etc.)
10. File assignments per task
11. Dependencies between tasks
12. Batch assignments
13. Acceptance criteria per task

**MANDATORY SKILLS:**

- integrating-with-{vendor}: Vendor API patterns, auth, rate limits
- developing-integrations: P0 requirements and implementation patterns
- gateway-integrations: Integration patterns and P0 requirements
- gateway-backend: Go backend patterns
- writing-plans: Task decomposition structure
- persisting-agent-outputs: Output file format

**OUTPUT_DIRECTORY:** {from Phase 1}
```

---

## Step 3: Integration-Specific Architecture Components

| #   | Component            | Purpose                           | P0 Requirement |
| --- | -------------------- | --------------------------------- | -------------- |
| 1   | Authentication Flow  | Credential retrieval, client init | #3             |
| 2   | Pagination Strategy  | Termination guarantee             | #5             |
| 3   | CheckAffiliation     | Asset ownership verification      | #2             |
| 4   | Tabularium Mapping   | Entity transformation             | -              |
| 5   | errgroup Concurrency | SetLimit + loop variable capture  | #4             |
| 6   | VMFilter Integration | Duplicate prevention              | #1             |
| 7   | Error Handling       | All errors checked with context   | #6             |
| 8   | File Size Management | <400 lines or split plan          | #7             |

---

## Step 4: P0 Compliance Checklist

**MANDATORY in architecture-plan.md:**

```markdown
## P0 Compliance Checklist

| #   | Requirement         | Planned Location                  | Pattern Reference    |
| --- | ------------------- | --------------------------------- | -------------------- |
| 1   | VMFilter            | {vendor}.go:45 (init), :123 (use) | crowdstrike.go:45    |
| 2   | CheckAffiliation    | {vendor}.go:234 (real query)      | wiz.go:717           |
| 3   | ValidateCredentials | {vendor}.go:89 (first in Invoke)  | standard pattern     |
| 4   | errgroup Safety     | {vendor}.go:156 (SetLimit=10)     | crowdstrike.go:162   |
| 5   | Pagination Safety   | {vendor}.go:189 (maxPages=1000)   | tenable.go:156       |
| 6   | Error Handling      | All functions                     | wrapped with context |
| 7   | File Size           | {estimate} lines                  | target <400          |
```

---

## Step 5: Human Checkpoint

**🛑 REQUIRED:** Present architecture for approval.

```
AskUserQuestion({
  questions: [{
    question: "Approve this integration architecture?",
    header: "Architecture Review",
    options: [
      { label: "Approve (Recommended)", description: "Proceed with implementation" },
      { label: "Architecture needs work", description: "Technical design issues" },
      { label: "Tasks need adjustment", description: "Refine task breakdown" },
      { label: "Wrong approach", description: "Return to brainstorming" }
    ],
    multiSelect: false
  }]
})
```

**Checkpoint presentation:**

```markdown
Phase 7 Architecture Review:

Integration: {vendor}
Type: {integration_type}
Files to create: {count}

P0 Requirements Addressed:
✅ VMFilter: {approach}
✅ CheckAffiliation: {approach}
✅ ValidateCredentials: First in Invoke()
✅ errgroup: SetLimit({n}) with capture
✅ Pagination: maxPages={n} constant
✅ Error handling: All errors checked
✅ File size: {estimate} lines ({single file | split})

Frontend: {YES (enum, logos, hook) | NO (reason)}

Tasks: {N} tasks in {M} batches

Proceed to Phase 8 (Implementation)?
```

---

## Step 6: Architecture Plan Structure

`{OUTPUT_DIR}/architecture-plan.md`:

```markdown
# Architecture Plan: {vendor} Integration

**Designed:** {timestamp}
**Architect:** integration-lead

---

## Part 1: Technical Architecture

### Authentication Flow

**Method:** {from brainstorming}
**Implementation:**

func NewClient(ctx context.Context, secret string) (\*Client, error) {
// Parse credentials from secret
// Initialize HTTP client
// Return configured client
}

### Pagination Strategy

**Type:** {token | page | cursor}
**maxPages constant:** 1000

for page := 0; page < maxPages && hasMore; page++ {
resp, err := client.List(ctx, nextToken)
if err != nil { return err }
// process
nextToken = resp.NextToken
hasMore = nextToken != ""
}

### CheckAffiliation Approach

**Method:** {API Query | Re-enumerate | CheckAffiliationSimple}
**Implementation:** {code example}

### P0 Compliance Checklist

[See Step 4 above]

### Frontend Requirements

**UI Needed:** {YES | NO}
**Reason:** {justification}

---

## Part 2: Task Decomposition

### Task Summary

| ID   | Task             | File               | Batch | Dependencies |
| ---- | ---------------- | ------------------ | ----- | ------------ |
| T001 | Client setup     | {vendor}.go        | 1     | None         |
| T002 | Type definitions | {vendor}\_types.go | 1     | None         |
| T003 | Collector        | {vendor}.go        | 2     | T001         |
| T004 | CheckAffiliation | {vendor}.go        | 2     | T001         |
| T005 | Unit tests       | {vendor}\_test.go  | 3     | T003, T004   |

### Detailed Tasks

#### T001: Client setup

**File:** {vendor}.go
**Acceptance Criteria:**

- [ ] Credential parsing works
- [ ] HTTP client configured
- [ ] ValidateCredentials is first in Invoke()
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  7_architecture_plan:
    status: "complete"
    completed_at: "{timestamp}"
    checkpoint_approved: true
    architect_agents: ["integration-lead"]

architecture_plan:
  components_designed: 8
  p0_compliance: "PLANNED"
  total_tasks: 5
  total_batches: 3

  key_decisions:
    - decision: "Use real CheckAffiliation with API query"
      rationale: "Vendor supports individual lookup"

  tasks:
    - id: "T001"
      title: "Client setup"
      batch: 1
      dependencies: []
      status: "pending"
```

---

## Step 8: Report Results

```markdown
## Architecture Plan Complete

**Components Designed:** 8 (all P0 addressed)
**Tasks Created:** 5
**Batches:** 3

**P0 Compliance:**
✅ All 7 requirements have planned implementation locations

**Key Decisions:**

- Real CheckAffiliation (not stub)
- maxPages=1000 for pagination safety
- SetLimit=10 for errgroup

→ Proceeding to Phase 8: Implementation
```

---

## Skip Conditions

Phase 7 is skipped when:

- work_type is SMALL

**When skipped:** MANIFEST shows `7_architecture_plan: { status: "skipped", reason: "work_type" }`

---

## Gate Checklist

Phase 7 is complete when:

- [ ] `integration-lead` agent spawned with correct prompt
- [ ] `architecture-plan.md` created with all sections
- [ ] P0 Compliance Checklist completed with planned locations
- [ ] Frontend Requirements section completed (YES/NO)
- [ ] Task decomposition with acceptance criteria
- [ ] Human approved via AskUserQuestion
- [ ] MANIFEST.yaml updated
- [ ] Phase 7 status updated to 'complete'

---

## Related References

- [checkpoint-configuration.md](checkpoint-configuration.md) - Architecture checkpoint
- [phase-8-implementation.md](phase-8-implementation.md) - Next phase
