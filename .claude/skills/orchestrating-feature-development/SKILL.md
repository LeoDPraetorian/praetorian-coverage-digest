---
name: orchestrating-feature-development
description: Use when implementing complete features - coordinates brainstorming, planning, architecture, implementation, and testing phases with agent delegation
allowed-tools: Skill, Task, TodoWrite, Read, Write, Bash, AskUserQuestion
---

# Feature Development Orchestration

Systematically guides feature development through five phases with quality gates, progress persistence, and structured agent handoffs.

## When to Use This Skill

Use this skill when you need to:

- Implement a complete feature from concept to tested code
- Ensure systematic quality assurance through all phases
- Coordinate multiple specialized agents (architects, developers, testers)
- Maintain progress across multiple sessions
- Get human approval at key checkpoints

**Symptoms this skill addresses:**

- Manual orchestration of skills and agents
- Lost context between sessions
- Skipped phases or quality gates
- No structured handoffs between agents
- Mental progress tracking instead of persistent state

## Quick Start

```
User: "Implement user dashboard with metrics display"

Skill workflow:
1. Brainstorm design → Human checkpoint
2. Write implementation plan → Human checkpoint
3. Task(frontend-architect) + Task(frontend-reviewer) in parallel → Architecture validation
4. Task(frontend-developer) → Implementation
5. Task(frontend-unit-test-engineer) → Tests
```

## Table of Contents

This skill coordinates five phases with detailed workflows in references:

### Core Phases

- **[Phase 1: Brainstorming](references/phase-1-brainstorming.md)** - Design refinement with human-in-loop
- **[Phase 2: Planning](references/phase-2-planning.md)** - Detailed implementation plan creation
- **[Phase 3: Architecture](references/phase-3-architecture.md)** - Design decisions via architect agents
- **[Phase 4: Implementation](references/phase-4-implementation.md)** - Code development via developer agents
- **[Phase 5: Testing](references/phase-5-testing.md)** - Test creation via test engineer agents

### Supporting Documentation

- **[Progress Persistence](references/progress-persistence.md)** - Resume workflow, progress file format
- **[Agent Handoffs](references/agent-handoffs.md)** - Structured JSON handoff format
- **[Troubleshooting](references/troubleshooting.md)** - Common issues and solutions

## Workflow Overview

**CRITICAL: Use TodoWrite to track all phases.** Do NOT track mentally.

### Phase Sequence

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Brainstorming                                     │
│  Tool: Skill("brainstorming")                               │
│  Exit: Human approves design                                │
└─────────────────┬───────────────────────────────────────────┘
                  │ Checkpoint
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Planning                                          │
│  Tool: Skill("writing-plans")                               │
│  Exit: Plan saved to .claude/features/{id}/plan.md          │
└─────────────────┬───────────────────────────────────────────┘
                  │ Checkpoint
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Dual-Agent Architecture Review                    │
│  Tool: Task("*-architect") + Task("*-reviewer") parallel    │
│  Exit: Architecture validated, conflicts resolved           │
└─────────────────┬───────────────────────────────────────────┘
                  │ (No checkpoint - automated with user input if conflicts)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Implementation                                    │
│  Tool: Task(subagent_type: "*-developer")                   │
│  Exit: Code implemented, builds passing                     │
└─────────────────┬───────────────────────────────────────────┘
                  │ (No checkpoint - automated)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: Testing                                           │
│  Tool: Task(subagent_type: "*-test-engineer")               │
│  Exit: Tests passing, coverage met                          │
└─────────────────────────────────────────────────────────────┘
```

### Initial Setup

1. **Create TodoWrite checklist** for all 5 phases
2. **Create feature workspace**:
   ```bash
   mkdir -p .claude/features/{feature-id}
   ```
3. **Initialize progress file**:
   ```json
   {
     "feature_id": "{feature-id}",
     "created": "2024-12-13",
     "current_phase": "brainstorming",
     "phases": {
       "brainstorming": { "status": "in_progress" },
       "planning": { "status": "pending" },
       "architecture": { "status": "pending" },
       "implementation": { "status": "pending" },
       "testing": { "status": "pending" }
     }
   }
   ```

See [Progress Persistence](references/progress-persistence.md) for complete schema.

## Critical Rules

### Must Use TodoWrite

**You MUST create TodoWrite todos for all phases.** Mental tracking leads to skipped steps.

### Human Checkpoints Are Mandatory

**After brainstorming and planning phases**, you MUST:

1. Use AskUserQuestion to confirm approval
2. Do NOT proceed to next phase without approval
3. Record approval in progress file

### Agent Handoffs Must Be Structured

All Task agents must return JSON with:

```json
{
  "status": "complete|blocked|needs_review",
  "phase": "architecture|implementation|testing",
  "summary": "What was accomplished",
  "files_modified": ["paths"],
  "handoff": {
    "next_phase": "phase-name",
    "context": "Key decisions for next phase"
  }
}
```

See [Agent Handoffs](references/agent-handoffs.md) for complete format.

### Resume Capability Required

**Every phase must save progress** to `.claude/features/{feature-id}/progress.json`.

On resume:

1. Read progress file
2. Identify current phase from `current_phase` field
3. Continue from that phase
4. Do NOT restart from beginning

## Best Practices

✅ **Do:**

- Create TodoWrite todos at start
- Save progress after each phase
- Use AskUserQuestion for human checkpoints
- Spawn agents in parallel when tasks are independent
- Read existing code before architecture phase

❌ **Don't:**

- Skip human checkpoints
- Track progress mentally
- Spawn all agents at once (sequence matters)
- Proceed without structured handoffs
- Ignore blocked status from agents

## Determining Agent Types

| Feature Domain | Architect          | Reviewer          | Developer          | Tester                      |
| -------------- | ------------------ | ----------------- | ------------------ | --------------------------- |
| React UI       | frontend-architect | frontend-reviewer | frontend-developer | frontend-unit-test-engineer |
| Go API         | backend-architect  | backend-reviewer  | backend-developer  | backend-tester              |
| Full-stack     | Both architects    | Both reviewers    | Both developers    | Both test engineers         |

**Rule**: Match agents to feature domain, not codebase composition.

**Phase 3 Note**: Always spawn architect AND reviewer in parallel for quality assurance.

## Troubleshooting

### "I lost context mid-workflow"

**Solution**: Read `.claude/features/{feature-id}/progress.json` and continue from `current_phase`.

### "Agent returned blocked status"

**Solution**:

1. Read agent's `handoff.context` for details
2. Use AskUserQuestion to get user input
3. Update plan/architecture as needed
4. Re-run blocked phase

### "How do I handle parallel work?"

**Solution**:

- Frontend + Backend implementation → Spawn in parallel
- Architecture → Implementation → Sequence required
- Unit tests + E2E tests → Spawn in parallel

See [Troubleshooting](references/troubleshooting.md) for more scenarios.

## Related Skills

- `brainstorming` - Phase 1 refinement workflow
- `writing-plans` - Phase 2 plan creation
- `executing-plans` - Alternative pattern for batch execution
- `persisting-progress-across-sessions` - Cross-session state management
- `orchestrating-multi-agent-workflows` - Multi-agent coordination patterns

## Exit Criteria

Feature development is complete when:

- ✅ All 5 phases marked "complete" in progress file
- ✅ Tests passing
- ✅ Build successful
- ✅ User approves final result
