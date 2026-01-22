# Foundation Pattern Applications

**How `orchestrating-mcp-development` applies patterns from `orchestrating-multi-agent-workflows`**

This reference maps foundation patterns to MCP-specific implementations, documents deviations, and provides line number citations for traceability.

---

## Pattern Mapping

### 1. State Tracking (Mandatory)

**Foundation**: `orchestrating-multi-agent-workflows` lines 23-29

**MCP Application**:

- SKILL.md lines 27-40: Quick Reference table with TodoWrite requirements
- Used in all 13 phases (1-13) to track orchestration progress
- MANIFEST.yaml (references/manifest-structure.md) provides persistent state across sessions

**Deviation**: None - strict adherence

---

### 2. Parallel Execution

**Foundation**: `orchestrating-multi-agent-workflows` lines 122-133

**MCP Application**:

- **Phase 5 (Shared Architecture)**: Spawns `tool-lead` + `security-lead` in parallel (SKILL.md line 91)
- Single message with multiple Task calls for independent architecture design
- File scope boundaries prevent conflicts (tool-lead: wrappers, security-lead: auth/validation)

**Example**:

```typescript
Task("tool-lead", "Design token optimization...");
Task("security-lead", "Design auth middleware...");
```

**Deviation**: None - strict adherence

---

### 3. Human Checkpoints

**Foundation**: `orchestrating-multi-agent-workflows` lines 286-294, references/checkpoint-configuration.md

**MCP Application**:

- **Phase 5 → Phase 6 transition**: Shared architecture approval checkpoint (SKILL.md line 92)
- Blocks batch implementation until user approves architecture designs
- Uses AskUserQuestion with architecture summaries from both agents

**Deviation**: Additional checkpoints in Phase 9 (P0 compliance failures) - see references/checkpoint-configuration.md lines 7-11

---

### 4. Feedback Loops

**Foundation**: `orchestrating-multi-agent-workflows` lines 235-246, references/tight-feedback-loop.md

**MCP Application**:

- **Phase 8 (Implementation)**: Developer → Reviewer cycles (max 5 iterations per batch)
- **Phase 10 (Code Review)**: Two-stage review with retry limits (Stage 1: 2 retries, Stage 2: 1 retry)
- Uses `inter_phase.max_feedback_iterations` config (default: 5)

**Deviation**: MCP adds **batching** to feedback loops - processes 3-5 tools per batch instead of all at once

---

### 5. Orchestration Guards

**Foundation**: `orchestrating-multi-agent-workflows` lines 265-294, references/orchestration-guards.md

**MCP Application**:

- **Retry Limits**:
  - Phase 8: `inter_phase.max_feedback_iterations = 5` (batch implementation cycles)
  - Phase 10: `inter_phase.max_consecutive_review_failures = 3` (consecutive review failures)
  - P0 gate: `orchestrator.requirement_compliance_retries = 2` (pattern-level escalation)
- **Failure Definition**: Stage 1 `SPEC_VIOLATION`, Stage 2 `CHANGES_REQUESTED` or `BLOCKED`
- **Iteration Persistence**: MANIFEST.yaml `tools_status.{tool}.retries` counter

**Deviation**: None - strict adherence

**Line References**:

- SKILL.md lines 107-109: Configuration Integration table
- references/phase-7-code-review.md lines 245-277: Retry logic implementation
- references/progress-persistence.md lines 63-72: Retry counter schema

---

### 6. Delegation Protocol

**Foundation**: `orchestrating-multi-agent-workflows` lines 111-119

**MCP Application**:

- **4 elements** provided to all spawned agents:
  1. **Clear objective**: "Implement wrapper for X tool with token optimization"
  2. **Context**: Architecture decisions from Phase 3, shared infrastructure paths
  3. **Scope boundaries**: "Do NOT implement tests (Phase 11), do NOT audit (Phase 12)"
  4. **Expected output**: JSON with status, verdict, next_steps

**Example** (Phase 8 developer prompt):

```
Objective: Implement get-issue wrapper with 95% token reduction
Context: Architecture approved - use response-utils.ts pickFields(['id', 'title', 'status'])
Scope: Implement wrapper.ts ONLY, tests handled by Phase 9
Output: { status: 'COMPLETE', verdict: 'READY_FOR_REVIEW', next_steps: [] }
```

**Deviation**: None - strict adherence

**Line References**:

- references/agent-prompts.md: Complete prompt templates with 4-element structure
- references/agent-handoffs.md: JSON format specifications

---

### 7. File Locking

**Foundation**: `orchestrating-multi-agent-workflows` lines 143-152, references/file-locking.md

**MCP Application**:

- **USED in Phase 3**: tool-lead + security-lead parallel agents require lock for MANIFEST.yaml updates
- **NOT USED in Phases 4, 6, 8**: Batching processes tools sequentially within each batch, avoiding conflicts
- Phase 5 agents have disjoint file ownership (architecture-shared.md vs security-assessment.md) but both update shared MANIFEST.yaml

**Deviation**: Partial application - Phase 5 only, not full workflow

**Rationale**:

- Phase 5: Two parallel agents require lock for MANIFEST.yaml `agents_contributed` array
- Phases 4, 6, 8: Batching (3-5 tools sequential per batch) eliminates concurrent writes
- Phase 5 lock protocol documented in file-locking-phase3.md

**Line References**:

- SKILL.md line 111: Phase 5 lock protocol requirement
- references/file-locking-phase3.md: Complete Phase 5 lock implementation (lines 39-67)

---

### 8. Gated Verification

**Foundation**: `orchestrating-multi-agent-workflows` lines 175-184

**MCP Application**:

- **Phase 9 → Phase 10 transition**: Two-stage review process
  - **Stage 1 (Blocking)**: Spec compliance - Does implementation match architecture? → `COMPLIANT` | `SPEC_VIOLATION`
  - **Stage 2 (Parallel)**: Quality + Security - Is code well-built? → `APPROVED` | `CHANGES_REQUESTED` | `BLOCKED`
- Prevents wasted effort reviewing non-compliant implementations

**Line References**:

- SKILL.md lines 249-255: Phase 10 description
- references/phase-7-code-review.md lines 1-67 (Stage 1), lines 245-277 (Stage 2)

**Deviation**: None - strict adherence

---

### 9. Requirements Verification

**Foundation**: `orchestrating-multi-agent-workflows` lines 186-201 (Pattern 4.4)

**MCP Application**:

- **Phase 9 Stage 1 (Architecture Requirements)**: Verify architecture.md requirements implemented before technical P0 checks
- Per-tool checklist comparing Phase 5 architecture decisions to Phase 8 implementations
- Documents verification in `tools/{tool}/requirements-verification.md`
- Blocks progression to Stage 2 (Technical P0) if requirements not met

**Example**:

```bash
# Architecture says: 'Use progressive loading pattern for large responses'
# Stage 1 verifies:
grep -n 'pickFields\|truncate' .claude/tools/linear/get-issue.ts
# Output: 67: const filtered = pickFields(response, ['id', 'title', 'status']);
# Result: ✅ COMPLIANT
```

**Integration with Gated Verification (Pattern 8)**:

- **Stage 1**: Architecture requirements (Pattern 4.4) → COMPLIANT | NON_COMPLIANT
- **Stage 2**: Technical P0 compliance (Pattern 4.7) → P0 PASS | P0 FAIL
- **Phase 8**: Code quality + security (Gated Verification Stage 2)

**Deviation**: None - strict adherence

**Line References**:

- references/p0-compliance.md: Stage 1 Architecture Requirements section
- references/phase-7-checklists.md: Stage 1 Spec Compliance Checklist

---

### 10. Phase Numbering Convention

**Foundation**: orchestrating-multi-agent-workflows Pattern 2.2, lines 73-83

**MCP Application**:

- 13 phases numbered 1-13 (sequential, no gaps)
- Phase prefix: "Phase 1: Setup", "Phase 1: Git Workspace"
- Sub-steps use decimals: Step 4.1, 4.2, 4.3
- Progress tracked in MANIFEST.yaml phase numbers

**Deviation**: None - strict adherence

**Line References**:

- SKILL.md lines 27-40: Quick Reference table
- references/table-of-contents.md: Complete phase list

---

## MCP-Specific Deviations

These patterns are **unique to MCP orchestration** and NOT found in the foundation:

### Batching Strategy

**Where**: Phases 4 (Discovery), 6 (Implementation), 8 (Review)

**Rationale**: Large MCP services (50-200 tools) require chunking to:

- Prevent context window overflow (3-5 tools per batch = manageable context)
- Provide incremental progress checkpoints
- Enable parallelization within batches while maintaining sequential batch processing

**Implementation**:

- Phase 6: Batch schema discovery 3-5 tools at a time
- Phase 8: Batch implementation with feedback loops per batch
- Phase 10: Batch code review (Stage 1 compliance, Stage 2 quality)

**Line References**:

- SKILL.md line 94: Batching strategy overview
- references/large-service-handling.md: Complete batching logic

---

### Structured Handoff (JSON Format)

**Where**: All agent returns (Phases 3-10)

**Rationale**: Enables orchestrator to parse agent results programmatically:

```json
{
  "status": "COMPLETE" | "IN_PROGRESS" | "BLOCKED",
  "verdict": "APPROVED" | "CHANGES_REQUESTED" | "SPEC_VIOLATION",
  "next_steps": ["Fix X", "Implement Y"],
  "blocking_issues": []
}
```

**Line References**:

- SKILL.md line 95: Structured handoff requirement
- references/agent-handoffs.md: Complete JSON schema specifications

---

### CLI Gates

**Where**: Phases 5 (RED), 7 (P0), 9 (GREEN), 10 (Audit)

**Rationale**: TDD workflow + compliance validation using shared CLI tools:

- Phase 7: `npm run test` MUST fail (RED phase verification)
- Phase 9: P0 compliance checks via schema validators
- Phase 11: `npm run test` MUST pass with ≥80% coverage (GREEN phase)
- Phase 12: `npm run audit` MUST score ≥10/11 phases

**Line References**:

- SKILL.md line 94: CLI gate requirements
- references/phase-procedures.md: Gate implementation details

---

## Line Number Index

Quick reference for foundation pattern line numbers (all in `orchestrating-multi-agent-workflows` SKILL.md):

| Pattern                               | Lines   | Reference Files                            |
| ------------------------------------- | ------- | ------------------------------------------ |
| State Tracking                        | 23-29   | -                                          |
| Parallel Execution                    | 122-133 | -                                          |
| Human Checkpoints                     | 286-294 | references/checkpoint-configuration.md     |
| Feedback Loops                        | 235-246 | references/tight-feedback-loop.md          |
| Orchestration Guards                  | 265-294 | references/orchestration-guards.md         |
| Delegation Protocol                   | 111-119 | references/delegation-templates.md         |
| File Locking                          | 143-152 | references/file-locking.md                 |
| Gated Verification                    | 175-184 | references/gated-verification.md           |
| Requirements Verification             | 186-201 | references/p0-compliance.md (Stage 1)      |
| Phase Numbering Convention            | 73-83   | -                                          |
| Configuration System                  | 58-70   | `.claude/config/orchestration-limits.yaml` |
| Context Window Monitoring (5.3)       | 336-344 | references/context-monitoring.md           |
| REQUIRED SUB-SKILL Declarations (9.1) | 382-403 | -                                          |
| Workflow Handoff Protocol (9.4)       | 405-411 | -                                          |
| MANIFEST.yaml Maintenance (6.2)       | 314-335 | persisting-agent-outputs                   |
| Post-Completion Verification          | 247-256 | references/agent-output-validation.md      |
| Exit Criteria (8.3)                   | 367-380 | -                                          |
| Quality Scoring                       | 258-262 | references/quality-scoring.md              |
| Gate Override Protocol (4.6)          | 203-221 | -                                          |

---

## Verification Checklist

When modifying orchestrating-mcp-development:

- [ ] All foundation pattern references cite correct line numbers
- [ ] MCP deviations (batching, CLI gates, JSON handoff) are documented
- [ ] Integration table lists all foundation patterns used
- [ ] Configuration Integration section references correct config file paths
- [ ] No duplication of foundation content without attribution
