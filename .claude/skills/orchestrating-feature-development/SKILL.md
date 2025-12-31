---
name: orchestrating-feature-development
description: Use when implementing complete features - coordinates brainstorming, planning, architecture, implementation, review, and testing phases with parallel agent execution and feedback loops
allowed-tools: Skill, Task, TodoWrite, Read, Write, Bash, AskUserQuestion
---

# Feature Development Orchestration

Systematically guides feature development through ten phases with parallel agent execution, explicit feedback loops, and structured feature directories.

## When to Use This Skill

Use this skill when you need to:

- Implement a complete feature from concept to tested code
- Coordinate multiple specialized agents (leads, developers, reviewers, testers)
- Ensure quality through parallel review (code + security)
- Maintain progress with structured handoffs and feedback loops

**Symptoms this skill addresses:**

- Manual orchestration of skills and agents
- Sequential execution when parallel is possible
- Missing security review in architecture
- No feedback loops before escalation
- Lost context between sessions

## Quick Reference

| Phase              | Agents                                     | Execution                | Checkpoint         |
| ------------------ | ------------------------------------------ | ------------------------ | ------------------ |
| 0: Setup           | -                                          | Create feature directory | -                  |
| 1: Brainstorming   | brainstorming skill                        | Sequential               | 🛑 Human           |
| 2: Discovery       | code-pattern-analyzer (frontend + backend) | **PARALLEL**             | -                  |
| 3: Planning        | writing-plans skill                        | Sequential               | 🛑 Human           |
| 4: Architecture    | frontend-lead + security-lead              | **PARALLEL**             | 🛑 Human           |
| 5: Implementation  | frontend-developer                         | Sequential               | -                  |
| 6: Code Review     | frontend-reviewer + frontend-security      | **PARALLEL**             | 1 retry → escalate |
| 7: Test Planning   | test-lead                                  | Sequential               | -                  |
| 8: Testing         | frontend-tester (unit + integration + e2e) | **PARALLEL**             | -                  |
| 9: Test Validation | test-lead                                  | Sequential               | 1 retry → escalate |
| 10: Completion     | -                                          | Final verification       | -                  |

## Table of Contents

### Core Phases

Each phase has detailed documentation in the references/ directory:

- **[Phase 1: Brainstorming](references/phase-1-brainstorming.md)** - Design refinement with human-in-loop
- **[Phase 2: Discovery](references/phase-2-discovery.md)** - Parallel pattern analysis (frontend + backend)
- **[Phase 3: Planning](references/phase-3-planning.md)** - Detailed implementation plan creation
- **[Phase 4: Architecture](references/phase-4-architecture.md)** - Parallel leads + security assessment + tech debt analysis
- **[Phase 5: Implementation](references/phase-5-implementation.md)** - Code development via developer agents
- **[Phase 6: Code Review](references/phase-6-code-review.md)** - Parallel reviewers with feedback loop
- **[Phase 7: Test Planning](references/phase-7-test-planning.md)** - test-lead creates test plan
- **[Phase 8: Testing](references/phase-8-testing.md)** - Parallel test modes following plan
- **[Phase 9: Test Validation](references/phase-9-test-validation.md)** - test-lead validates against plan

### Supporting Documentation

Cross-cutting concerns and troubleshooting guides:

- **[Progress Persistence](references/progress-persistence.md)** - Resume workflow, progress file format
- **[Agent Handoffs](references/agent-handoffs.md)** - Structured JSON handoff format
- **[Troubleshooting](references/troubleshooting.md)** - Common issues and solutions

## Workflow Overview

**CRITICAL: Use TodoWrite to track all phases.** Do NOT track mentally.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 0: Setup                                                         │
│  Create: .claude/features/YYYY-MM-DD-{semantic-name}/                   │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Brainstorming                                                 │
│  Tool: Skill("brainstorming")                                           │
│  Output: design.md                                                      │
│  Human Checkpoint                                                       │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: Discovery (PARALLEL)                                          │
│  Agents: code-pattern-analyzer (frontend) + (backend)                   │
│  Tool: Skill("discovering-reusable-code")                               │
│  Output: frontend-discovery.md, backend-discovery.md                    │
│  No Human Checkpoint (feeds into Architecture)                          │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 3: Planning                                                      │
│  Tool: Skill("writing-plans")                                           │
│  Output: plan.md                                                        │
│  Human Checkpoint                                                       │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 4: Architecture (PARALLEL)                                       │
│  Agents: frontend-lead + security-lead (single Task message)            │
│  Input: frontend-discovery.md + backend-discovery.md                    │
│  Output: architecture.md, security-assessment.md, tech-debt.md          │
│  Tech Debt Registry: Update .claude/tech-debt-registry.md               │
│  Human Checkpoint (enhanced with tech debt decisions)                   │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 5: Implementation                                                │
│  Agent: frontend-developer (+ backend-developer if full-stack)          │
│  Input: architecture.md + security-assessment.md + tech-debt.md         │
│  Output: Code files + implementation-log.md                             │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 6: Code Review (PARALLEL, MAX 1 RETRY)                           │
│  Agents: frontend-reviewer + frontend-security                          │
│  Output: review.md, security-review.md                                  │
│  Loop: If CHANGES_REQUESTED → developer fixes → re-review ONCE          │
│  Escalate: If still failing → AskUserQuestion                           │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 7: Test Planning                                                 │
│  Agent: test-lead (creates test plan)                                   │
│  Output: test-plan.md                                                   │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 8: Testing (PARALLEL - all 3 modes)                              │
│  Agents: frontend-tester × 3 (unit, integration, e2e)                   │
│  Input: test-plan.md (follow plan requirements)                         │
│  Output: test files + test-summary-*.md                                 │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 9: Test Validation (MAX 1 RETRY)                                 │
│  Agent: test-lead (validates against plan)                              │
│  Output: test-validation.md                                             │
│  Loop: If plan not met → tester fixes → re-validate ONCE                │
│  Escalate: If still failing → AskUserQuestion                           │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 10: Completion                                                   │
│  Final verification: npm run build, npx tsc --noEmit, npm test          │
│  Update metadata.json status: "complete"                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Phase 0: Setup

Create feature workspace with semantic naming:

```bash
FEATURE_DATE=$(date +%Y-%m-%d)
FEATURE_NAME="<semantic-abbreviation>"  # e.g., "asset-filtering"
FEATURE_ID="${FEATURE_DATE}-${FEATURE_NAME}"
FEATURE_DIR=".claude/features/${FEATURE_ID}"

mkdir -p "${FEATURE_DIR}"
```

**Semantic naming rules:**

- 2-4 words describing the feature, lowercase with hyphens
- Examples: `asset-filtering`, `dark-mode-toggle`, `settings-refactor`

**Initialize metadata.json:**

```json
{
  "feature_id": "2025-12-28-asset-filtering",
  "description": "Original feature description",
  "created": "2025-12-28T10:00:00Z",
  "status": "in_progress",
  "current_phase": "brainstorming",
  "phases": {
    "brainstorming": { "status": "in_progress" },
    "discovery": {
      "status": "pending",
      "frontend_complete": false,
      "backend_complete": false
    },
    "planning": { "status": "pending" },
    "architecture": {
      "status": "pending",
      "tech_debt_identified": [],
      "human_decision": null
    },
    "implementation": { "status": "pending" },
    "review": { "status": "pending", "retry_count": 0 },
    "test_planning": { "status": "pending" },
    "testing": { "status": "pending" },
    "validation": { "status": "pending", "retry_count": 0 },
    "completion": { "status": "pending" }
  }
}
```

## Critical Rules

### Parallel Execution is MANDATORY

**Spawn independent agents in a SINGLE message:**

```typescript
// Good - all in one message
Task("frontend-lead", ...)
Task("security-lead", ...)
```

**Do NOT spawn sequentially when parallel is possible:**

```typescript
// Bad - wastes time
await Task("frontend-lead", ...)
await Task("security-lead", ...)
```

### Human Checkpoints are MANDATORY

After phases 1, 3, and 4, you MUST:

1. Use AskUserQuestion to confirm approval
2. Do NOT proceed without approval
3. Record approval in metadata.json

**Note**: Phase 2 (Discovery) has NO checkpoint - it feeds directly into Planning and Architecture.

### Feedback Loops: MAX 1 Retry

After ONE retry cycle, escalate to user via AskUserQuestion. Do NOT loop indefinitely.

### Agent Handoffs Must Be Structured

All Task agents must return JSON with:

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "What was accomplished",
  "files_modified": ["paths"],
  "verdict": "APPROVED|CHANGES_REQUESTED|BLOCKED",
  "handoff": {
    "recommended_agent": "next-agent",
    "context": "Key info for next phase"
  }
}
```

## Agent Matrix by Feature Type

| Type       | Discovery (Phase 2)      | Leads (Phase 4)               | Developers (Phase 5) | Reviewers (Phase 6)                   | Planner (Phase 7) | Testers (Phase 8)  | Validator (Phase 9) |
| ---------- | ------------------------ | ----------------------------- | -------------------- | ------------------------------------- | ----------------- | ------------------ | ------------------- |
| Frontend   | code-pattern-analyzer ×2 | frontend-lead + security-lead | frontend-developer   | frontend-reviewer + frontend-security | test-lead         | frontend-tester ×3 | test-lead           |
| Backend    | code-pattern-analyzer ×2 | backend-lead + security-lead  | backend-developer    | backend-reviewer + backend-security   | test-lead         | backend-tester ×3  | test-lead           |
| Full-stack | code-pattern-analyzer ×2 | All 4 leads                   | Both developers      | All 4 reviewers                       | test-lead         | All 6 testers      | test-lead           |

**Rule**: Match agents to feature domain. Discovery always runs frontend + backend analyzers in parallel. Full-stack features spawn ALL agents in parallel for phases 4-9.

## Feature Directory Structure

```text
.claude/features/YYYY-MM-DD-{semantic-name}/
├── metadata.json              # Status, timestamps, phase tracking
├── design.md                  # Phase 1: brainstorming output
├── frontend-discovery.md      # Phase 2: frontend pattern analysis
├── backend-discovery.md       # Phase 2: backend pattern analysis
├── plan.md                    # Phase 3: planning output
├── architecture.md            # Phase 4: frontend-lead output
├── security-assessment.md     # Phase 4: security-lead output
├── tech-debt-assessment.md    # Phase 4: tech debt analysis by leads
├── backend-architecture.md    # Phase 4: backend-lead output (if applicable)
├── implementation-log.md      # Phase 5: developer output
├── review.md                  # Phase 6: frontend-reviewer output
├── security-review.md         # Phase 6: security-reviewer output
├── test-plan.md               # Phase 7: test-lead test plan
├── test-summary-unit.md       # Phase 8: unit test output
├── test-summary-integration.md # Phase 8: integration test output
├── test-summary-e2e.md        # Phase 8: e2e test output
└── test-validation.md         # Phase 9: test-lead validation
```

## Troubleshooting

### "I lost context mid-workflow"

**Solution**: Read `.claude/features/{feature-id}/metadata.json` and continue from `current_phase`.

### "Reviewer returned CHANGES_REQUESTED twice"

**Solution**: After 1 retry, escalate to user:

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Reviews still failing after retry. How to proceed?",
      header: "Review",
      options: [
        { label: "Show me the issues", description: "Review feedback details" },
        { label: "Proceed anyway", description: "Accept current state" },
        { label: "Cancel feature", description: "Stop development" },
      ],
    },
  ],
});
```

### "How do I handle full-stack features?"

**Solution**: Spawn ALL domain agents in parallel:

- Phase 2: code-pattern-analyzer (frontend) + code-pattern-analyzer (backend) - always runs
- Phase 4: frontend-lead + backend-lead + security-lead (3 agents)
- Phase 5: frontend-developer + backend-developer (2 agents)
- Phase 6: All 4 reviewers in parallel
- Phase 8: All 6 testers in parallel

See [Troubleshooting](references/troubleshooting.md) for more scenarios.

## Related Skills

- `brainstorming` - Phase 1 refinement workflow
- `discovering-reusable-code` - Phase 2 pattern discovery methodology
- `writing-plans` - Phase 3 plan creation
- `executing-plans` - Alternative pattern for batch execution
- `persisting-progress-across-sessions` - Cross-session state management
- `orchestrating-multi-agent-workflows` - Multi-agent coordination patterns
- `dispatching-parallel-agents` - For 3+ independent failures during debugging

## Exit Criteria

Feature development is complete when:

- ✅ All 10 phases marked "complete" in metadata.json
- ✅ Discovery reports generated for frontend and backend
- ✅ Tech debt registry updated with findings from architecture phase
- ✅ All reviewers returned verdict: APPROVED
- ✅ Test plan created with coverage targets
- ✅ All tests from plan implemented
- ✅ Test validation confirms plan adherence and quality_score >= 70
- ✅ Final verification passed (build, lint, tests)
- ✅ User approves final result
