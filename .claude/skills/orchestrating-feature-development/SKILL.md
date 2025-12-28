---
name: orchestrating-feature-development
description: Use when implementing complete features - coordinates brainstorming, planning, architecture, implementation, review, and testing phases with parallel agent execution and feedback loops
allowed-tools: Skill, Task, TodoWrite, Read, Write, Bash, AskUserQuestion
---

# Feature Development Orchestration

Systematically guides feature development through eight phases with parallel agent execution, explicit feedback loops, and structured feature directories.

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

| Phase | Agents | Execution | Checkpoint |
|-------|--------|-----------|------------|
| 0: Setup | - | Create feature directory | - |
| 1: Brainstorming | brainstorming skill | Sequential | 🛑 Human |
| 2: Planning | writing-plans skill | Sequential | 🛑 Human |
| 3: Architecture | frontend-lead + security-lead | **PARALLEL** | 🛑 Human |
| 4: Implementation | frontend-developer | Sequential | - |
| 5: Code Review | frontend-reviewer + frontend-security | **PARALLEL** | 1 retry → escalate |
| 6: Testing | frontend-tester (unit + integration + e2e) | **PARALLEL** | - |
| 7: Test Assessment | test-assessor | Sequential | 1 retry → escalate |
| 8: Completion | - | Final verification | - |

## Table of Contents

### Core Phases

- **[Phase 1: Brainstorming](references/phase-1-brainstorming.md)** - Design refinement with human-in-loop
- **[Phase 2: Planning](references/phase-2-planning.md)** - Detailed implementation plan creation
- **[Phase 3: Architecture](references/phase-3-architecture.md)** - Parallel leads + security assessment
- **[Phase 4: Implementation](references/phase-4-implementation.md)** - Code development via developer agents
- **[Phase 5: Code Review](references/phase-5-code-review.md)** - Parallel reviewers with feedback loop
- **[Phase 6: Testing](references/phase-6-testing.md)** - Parallel test modes (unit + integration + e2e)
- **[Phase 7: Test Assessment](references/phase-7-test-assessment.md)** - Quality gate with feedback loop

### Supporting Documentation

- **[Progress Persistence](references/progress-persistence.md)** - Resume workflow, progress file format
- **[Agent Handoffs](references/agent-handoffs.md)** - Structured JSON handoff format
- **[Troubleshooting](references/troubleshooting.md)** - Common issues and solutions

## Workflow Overview

**CRITICAL: Use TodoWrite to track all phases.** Do NOT track mentally.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 0: Setup                                                          │
│  Create: .claude/features/YYYY-MM-DD-{semantic-name}/                    │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Brainstorming                                                  │
│  Tool: Skill("brainstorming")                                            │
│  Output: design.md                                                       │
│  🛑 Human Checkpoint                                                     │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: Planning                                                       │
│  Tool: Skill("writing-plans")                                            │
│  Output: plan.md                                                         │
│  🛑 Human Checkpoint                                                     │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 3: Architecture (PARALLEL)                                        │
│  Agents: frontend-lead + security-lead (single Task message)             │
│  Output: architecture.md, security-assessment.md                         │
│  🛑 Human Checkpoint                                                     │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 4: Implementation                                                 │
│  Agent: frontend-developer (+ backend-developer if full-stack)           │
│  Input: architecture.md + security-assessment.md                         │
│  Output: Code files + implementation-log.md                              │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 5: Code Review (PARALLEL, MAX 1 RETRY)                            │
│  Agents: frontend-reviewer + frontend-security                  │
│  Output: review.md, security-review.md                                   │
│  Loop: If CHANGES_REQUESTED → developer fixes → re-review ONCE           │
│  Escalate: If still failing → AskUserQuestion                            │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 6: Testing (PARALLEL - all 3 modes)                               │
│  Agents: frontend-tester × 3 (unit, integration, e2e)                    │
│  Output: test files + test-summary-*.md                                  │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 7: Test Assessment (MAX 1 RETRY)                                  │
│  Agent: test-assessor                                                    │
│  Output: test-assessment.md                                              │
│  Loop: If quality < 70 → tester fixes → re-assess ONCE                   │
│  Escalate: If still failing → AskUserQuestion                            │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 8: Completion                                                     │
│  Final verification: npm run build, npx tsc --noEmit, npm test           │
│  Update metadata.json status: "complete"                                 │
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
    "planning": { "status": "pending" },
    "architecture": { "status": "pending" },
    "implementation": { "status": "pending" },
    "review": { "status": "pending", "retry_count": 0 },
    "testing": { "status": "pending" },
    "assessment": { "status": "pending", "retry_count": 0 },
    "completion": { "status": "pending" }
  }
}
```

## Critical Rules

### Parallel Execution is MANDATORY

**Spawn independent agents in a SINGLE message:**

```
// Good - all in one message
Task("frontend-lead", ...)
Task("security-lead", ...)
```

**Do NOT spawn sequentially when parallel is possible:**

```
// Bad - wastes time
await Task("frontend-lead", ...)
await Task("security-lead", ...)
```

### Human Checkpoints are MANDATORY

After phases 1, 2, and 3, you MUST:
1. Use AskUserQuestion to confirm approval
2. Do NOT proceed without approval
3. Record approval in metadata.json

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

| Type | Leads (Phase 3) | Developers (Phase 4) | Reviewers (Phase 5) | Testers (Phase 6) |
|------|-----------------|----------------------|---------------------|-------------------|
| Frontend | frontend-lead + security-lead | frontend-developer | frontend-reviewer + frontend-security | frontend-tester ×3 |
| Backend | backend-lead + security-lead | backend-developer | backend-reviewer + backend-security | backend-tester ×3 |
| Full-stack | All 4 leads | Both developers | All 4 reviewers | All 6 testers |

**Rule**: Match agents to feature domain. Full-stack features spawn ALL agents in parallel.

## Feature Directory Structure

```
.claude/features/YYYY-MM-DD-{semantic-name}/
├── metadata.json              # Status, timestamps, phase tracking
├── design.md                  # Phase 1: brainstorming output
├── plan.md                    # Phase 2: planning output
├── architecture.md            # Phase 3: frontend-lead output
├── security-assessment.md     # Phase 3: security-lead output
├── backend-architecture.md    # Phase 3: backend-lead output (if applicable)
├── implementation-log.md      # Phase 4: developer output
├── review.md                  # Phase 5: frontend-reviewer output
├── security-review.md         # Phase 5: security-reviewer output
├── test-summary-unit.md       # Phase 6: unit test output
├── test-summary-integration.md # Phase 6: integration test output
├── test-summary-e2e.md        # Phase 6: e2e test output
└── test-assessment.md         # Phase 7: test-assessor output
```

## Troubleshooting

### "I lost context mid-workflow"

**Solution**: Read `.claude/features/{feature-id}/metadata.json` and continue from `current_phase`.

### "Reviewer returned CHANGES_REQUESTED twice"

**Solution**: After 1 retry, escalate to user:
```typescript
AskUserQuestion({
  questions: [{
    question: "Reviews still failing after retry. How to proceed?",
    header: "Review",
    options: [
      { label: "Show me the issues", description: "Review feedback details" },
      { label: "Proceed anyway", description: "Accept current state" },
      { label: "Cancel feature", description: "Stop development" }
    ]
  }]
})
```

### "How do I handle full-stack features?"

**Solution**: Spawn ALL domain agents in parallel:
- Phase 3: frontend-lead + backend-lead + security-lead (3 agents)
- Phase 4: frontend-developer + backend-developer (2 agents)
- Phase 5: All 4 reviewers in parallel
- Phase 6: All 6 testers in parallel

See [Troubleshooting](references/troubleshooting.md) for more scenarios.

## Related Skills

- `brainstorming` - Phase 1 refinement workflow
- `writing-plans` - Phase 2 plan creation
- `executing-plans` - Alternative pattern for batch execution
- `persisting-progress-across-sessions` - Cross-session state management
- `orchestrating-multi-agent-workflows` - Multi-agent coordination patterns
- `dispatching-parallel-agents` - For 3+ independent failures during debugging

## Exit Criteria

Feature development is complete when:

- ✅ All 8 phases marked "complete" in metadata.json
- ✅ All reviewers returned verdict: APPROVED
- ✅ Test assessment quality_score >= 70
- ✅ Final verification passed (build, lint, tests)
- ✅ User approves final result
