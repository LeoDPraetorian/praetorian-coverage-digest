---
name: orchestrating-simple-feature
description: Use when implementing simple features requiring only a few dozen lines of code - coordinates brainstorming, planning, and implementation without full architecture/security/testing phases
allowed-tools: Skill, Task, TodoWrite, Read, Write, Bash, AskUserQuestion
---

# Simple Feature Development Orchestration

Streamlined feature development workflow for simple changes requiring minimal code (typically < 100 lines). Coordinates brainstorming, planning, and implementation without the overhead of full architectural design, security review, and comprehensive testing phases.

## When to Use This Skill

Use this skill when implementing **simple features** that meet ALL criteria:

- **Scope:** < 100 lines of code change
- **Complexity:** No new architectural patterns needed
- **Security:** No security implications (read-only operations, internal utilities)
- **Files:** Touch < 5 files
- **Risk:** Low risk of breaking existing functionality

**Examples of simple features:**

- Adding a utility function for data formatting
- Simple UI component without complex state
- Adding a configuration option
- Small bug fixes with known solutions
- Straightforward CRUD operations following existing patterns

**When NOT to use (use `orchestrating-feature-development` instead):**

- New API endpoints requiring security review
- UI features with complex state management
- Features touching authentication/authorization
- Changes requiring database migrations
- Features spanning multiple services/modules
- Anything requiring architectural decisions

## Mandatory Process (No Exceptions)

**ALL simple features MUST follow the 4-phase workflow.** No shortcuts, even when:

- ❌ "We don't have time" → Brainstorming + planning takes 10 minutes, prevents hours of rework
- ❌ "Tech lead said skip planning" → Authority doesn't override engineering discipline
- ❌ "I already know what to do" → Brainstorming validates assumptions, catches edge cases
- ❌ "It's only 20 lines of code" → Size doesn't determine need for process
- ❌ "Deployment window closing" → Rushing without planning causes production issues
- ❌ "User explicitly told me how to implement" → Users specify WHAT, not HOW. Still need brainstorming.

**Even when the user provides implementation details:**

- Phase 1 (Brainstorming): Validate the approach, consider alternatives, identify edge cases
- Phase 2 (Planning): Break into concrete tasks with verification steps
- Phase 3 (Implementation): Execute with proper patterns and error handling
- Phase 4 (Completion): Verify correctness before PR

**The workflow exists because simple != trivial.** Quick features still need:

- Validation they solve the right problem (brainstorming)
- Clear implementation steps (planning)
- Proper error handling and patterns (implementation)
- Verification before deployment (completion)

## Quick Reference

| Phase             | Agents/Skills                 | Execution  | Checkpoint |
| ----------------- | ----------------------------- | ---------- | ---------- |
| 0: Setup          | -                             | Sequential | -          |
| 1: Brainstorming  | `brainstorming`               | Sequential | 🛑 Human   |
| 2: Planning       | `writing-plans`               | Sequential | 🛑 Human   |
| 3: Implementation | `executing-plans`             | Sequential | -          |
| 4: Completion     | `verifying-before-completion` | Sequential | -          |

## Workflow Overview

**CRITICAL: Use TodoWrite to track all phases.**

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 0: Setup                                                         │
│  Create: .claude/.output/features/YYYY-MM-DD-HHMMSS-{semantic-name}/    │
│                                                                         │
│  REQUIRED SUB-SKILL: persisting-agent-outputs (discover output dir)    │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Brainstorming                                                 │
│  REQUIRED SUB-SKILL: brainstorming                                      │
│  Output: design.md                                                      │
│  🛑 Human Checkpoint                                                    │
│                                                                         │
│  Gate Checklist:                                                        │
│  □ Problem clearly defined?                                             │
│  □ Solution approach validated?                                         │
│  □ Confirms feature is simple enough for this workflow?                 │
│  □ No architectural/security concerns surfaced?                         │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: Planning                                                      │
│  REQUIRED SUB-SKILL: writing-plans                                      │
│  Output: implementation-plan.md                                         │
│  🛑 Human Checkpoint                                                    │
│                                                                         │
│  Gate Checklist:                                                        │
│  □ Plan confirms < 100 lines of code?                                   │
│  □ Tasks are concrete and actionable?                                   │
│  □ No architectural decisions needed?                                   │
│  □ Follows existing patterns?                                           │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 3: Implementation                                                │
│  REQUIRED SUB-SKILL: executing-plans                                    │
│  Output: Code changes in project                                        │
│                                                                         │
│  Implements plan in batches with review checkpoints                     │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 4: Completion                                                    │
│  REQUIRED SUB-SKILL: verifying-before-completion                        │
│  Output: Verification report in completion.md                           │
│                                                                         │
│  Gate Checklist:                                                        │
│  □ All tasks from plan completed?                                       │
│  □ Code follows existing patterns?                                      │
│  □ No obvious bugs introduced?                                          │
│  □ Ready for standard PR review?                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Phase-by-Phase Execution

**See detailed phase documentation in references/:**

- [Phase 0: Setup](references/phase-0-setup.md)
- [Phase 1: Brainstorming](references/phase-1-brainstorming.md)
- [Phase 2: Planning](references/phase-2-planning.md)
- [Phase 3: Implementation](references/phase-3-implementation.md)
- [Phase 4: Completion](references/phase-4-completion.md)

## Escalation to Full Workflow

**If during ANY phase you discover:**

- Architectural decisions needed
- Security implications
- Scope creeping beyond 100 lines
- Multiple services affected
- Complex state management required

**STOP and escalate to `orchestrating-feature-development`:**

```
I've discovered this feature is more complex than initially scoped.
Escalating to full orchestrating-feature-development workflow because:
[Specific reasons from list above]
```

Document the escalation reason in `escalation.md` in the feature directory.

## Integration

### Called By

- User directly when describing a simple feature request
- `/feature` command (routes based on scope assessment)

### Requires (invoke before starting)

| Skill                      | When  | Purpose                                      |
| -------------------------- | ----- | -------------------------------------------- |
| `persisting-agent-outputs` | Start | Discover and create feature output directory |
| `using-todowrite`          | Start | Initialize phase tracking                    |

### Calls (during execution)

| Skill                         | Phase   | Purpose                              |
| ----------------------------- | ------- | ------------------------------------ |
| `brainstorming`               | Phase 1 | Design refinement and validation     |
| `writing-plans`               | Phase 2 | Create implementation plan           |
| `executing-plans`             | Phase 3 | Execute plan with review checkpoints |
| `verifying-before-completion` | Phase 4 | Final verification before PR         |

### Pairs With (conditional)

| Skill                               | Trigger                              | Purpose                            |
| ----------------------------------- | ------------------------------------ | ---------------------------------- |
| `orchestrating-feature-development` | Escalation during any phase          | Full workflow for complex features |
| `developing-with-tdd`               | If implementation requires new tests | TDD discipline for correctness     |

## Troubleshooting

### "Feature turned out more complex than expected"

**Solution:** Escalate to `orchestrating-feature-development`. Better to catch complexity early than deliver incomplete work.

### "Should I add tests?"

**Answer:** Simple features should follow existing patterns that are already tested. If you find yourself needing new test infrastructure, escalate to full workflow.

### "No existing pattern to follow"

**Solution:** This is an architectural decision. Escalate to `orchestrating-feature-development` for proper architecture phase.

## Related Skills

- **`orchestrating-feature-development`** - Full 10-phase workflow for complex features
- **`brainstorming`** - Design refinement methodology (used in Phase 1)
- **`writing-plans`** - Implementation plan creation (used in Phase 2)
- **`executing-plans`** - Controlled plan execution (used in Phase 3)
- **`verifying-before-completion`** - Final verification checklist (used in Phase 4)
- **`persisting-agent-outputs`** - Feature directory structure and output format
- **`using-todowrite`** - Phase tracking and progress visibility
