---
name: orchestrating-integration-development
description: Use when developing Chariot backend integrations with third-party APIs - orchestrates 16-phase workflow with P0 compliance
allowed-tools: Read, TodoWrite, Task, AskUserQuestion, Bash, Grep, Glob, Skill
---

# Orchestrating Integration Development

**Complete orchestration workflow for developing Chariot backend integrations with third-party APIs.**

## When to Use

Use this skill when:

- Developing a new integration from design to tested code
- Building integrations with external APIs (Shodan, Qualys, ServiceNow, Wiz, etc.)
- Creating asset discovery, vulnerability sync, or bidirectional sync integrations
- Ensuring P0 compliance (VMFilter, CheckAffiliation, ValidateCredentials, errgroup, pagination)

**Invoked by**: `/integration` command

## Quick Reference

| Phase | Name                  | Purpose                                            | Conditional | Gate |
| ----- | --------------------- | -------------------------------------------------- | ----------- | ---- |
| 1     | Setup                 | Worktree creation, output directory, MANIFEST.yaml | Always      |      |
| 2     | Triage                | Classify work type (SMALL/MEDIUM/LARGE)            | Always      |      |
| 3     | Codebase Discovery    | Explore integration patterns, detect vendor APIs   | Always      | ⛔ 1 |
| 4     | Skill Discovery       | Map vendor to skills, check/create vendor skill    | Always      |      |
| 5     | Complexity            | Technical complexity assessment                    | Always      |      |
| 6     | Brainstorming         | Integration design refinement                      | LARGE only  |      |
| 7     | Architecture Plan     | Integration architecture AND task decomposition    | MEDIUM+     |      |
| 8     | Implementation        | Client, collector, and integration code            | Always      | ⛔ 2 |
| 9     | Design Verification   | Verify implementation matches architecture plan    | MEDIUM+     |      |
| 10    | Domain Compliance     | P0 validation (7 mandatory requirements)           | Always      |      |
| 11    | Code Quality          | Code review (spec compliance + quality)            | Always      |      |
| 12    | Test Planning         | Test strategy with test-lead                       | MEDIUM+     |      |
| 13    | Testing               | Test implementation and execution                  | Always      | ⛔ 3 |
| 14    | Coverage Verification | Verify test coverage meets threshold (≥80%)        | Always      |      |
| 15    | Test Quality          | No low-value tests, correct assertions, all pass   | Always      |      |
| 16    | Completion            | Final verification, PR, frontend (conditional)     | Always      |      |

**⛔ = Compaction Gate** - BLOCKING checkpoint requiring [compaction-gates.md](references/compaction-gates.md) protocol.

**Work Types:** SMALL, MEDIUM, LARGE (determined in Phase 2: Triage)

**Phase Skip Matrix:**

| Work Type | Skipped Phases       |
| --------- | -------------------- |
| SMALL     | 5, 6, 7, 9           |
| MEDIUM    | None                 |
| LARGE     | None (all 16 phases) |

## Foundational Patterns

This skill is **self-contained** - all orchestration patterns are documented within this skill and its references.

| Pattern                   | Reference                                                             | Integration Notes                          |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| Task Decomposition        | [delegation-templates.md](references/delegation-templates.md)         | Add vendor skill to prompts                |
| Delegation Protocol       | [delegation-templates.md](references/delegation-templates.md)         | Integration-specific agent templates       |
| Parallel Execution        | [file-scope-boundaries.md](references/file-scope-boundaries.md)       | Prevent agent conflicts on shared files    |
| Handling Agent Results    | [agent-matrix.md](references/agent-matrix.md)                         | Route blocked agents appropriately         |
| Verification Patterns     | [p0-compliance.md](references/p0-compliance.md)                       | 7 mandatory P0 requirements                |
| Quality Scoring           | Phase 11, 15 references                                               | Standard quality gate (≥70 pass)           |
| Orchestration Guards      | [rationalization-table.md](references/rationalization-table.md)       | Integration-specific anti-patterns         |
| Workflow Handoff Protocol | [compaction-gates.md](references/compaction-gates.md)                 | Context preservation at gates              |
| Escalation Protocol       | [checkpoint-configuration.md](references/checkpoint-configuration.md) | Human checkpoints at key decisions         |
| Error Recovery            | [error-recovery.md](references/error-recovery.md)                     | Abort triggers and recovery procedures     |
| Context Monitoring        | [compaction-gates.md](references/compaction-gates.md)                 | Token thresholds and measurement           |
| P0 Compliance             | [p0-compliance.md](references/p0-compliance.md)                       | VMFilter, CheckAffiliation, errgroup, etc. |

## Before You Begin

**MANDATORY prerequisites** - invoke these skills BEFORE starting Phase 1:

1. `persisting-agent-outputs` - Output directory structure and MANIFEST.yaml format
2. `using-git-worktrees` (LIBRARY) - Isolated workspace for integration development
   - Path: `Read('.claude/skill-library/workflow/using-git-worktrees/SKILL.md')`

**Cannot proceed without loading these skills** ✅

**State Tracking:** You MUST use TodoWrite BEFORE starting. Create items for all 16 phases before spawning any agents.

## Configuration

This skill uses multiple sections of `.claude/config/orchestration-limits.yaml`:

| Section        | Scope                             | Used For                                    |
| -------------- | --------------------------------- | ------------------------------------------- |
| `inter_phase`  | Implementation→Review→Test cycles | Tight feedback loop pattern                 |
| `orchestrator` | Re-invoking entire patterns       | Retry limits in Orchestration Guards        |
| `integration`  | P0 fix retries                    | MAX_P0_FIX_ATTEMPTS limit (domain-specific) |

**Precedence**: Skill-specific override > config file > hardcoded fallback

> **No Unilateral Overrides**: Agents MUST NOT override config values (even with "safer" lower limits) or add limits together across scopes. To change limits, update the config file or get user approval via AskUserQuestion.

## Critical Rules

### Compaction Gates are BLOCKING

See [references/compaction-gates.md](references/compaction-gates.md) for the full protocol.

Quick summary: Do NOT proceed past compaction checkpoints (Phase 3→4, Phase 8→9, Phase 13→14) without completing verification. Cannot skip without explicit user approval.

### P0 Compliance is NON-NEGOTIABLE

Integration development has 7 mandatory P0 requirements verified in Phase 10:

| #   | Requirement         | What It Means                           |
| --- | ------------------- | --------------------------------------- |
| 1   | VMFilter            | Initialize and use for asset filtering  |
| 2   | CheckAffiliation    | Real API query, not stub                |
| 3   | ValidateCredentials | First call in Invoke(), fail fast       |
| 4   | errgroup Safety     | SetLimit + captured loop variables      |
| 5   | Pagination Safety   | maxPages OR LastPage check              |
| 6   | Error Handling      | No ignored errors, wrapped with context |
| 7   | File Size           | ≤400 lines per file                     |

See [Phase 10: Domain Compliance](references/phase-10-domain-compliance.md) for details.

## Emergency Abort

See [references/error-recovery.md](references/error-recovery.md) for abort triggers and procedures.

Quick triggers:

- User requests stop
- 3+ consecutive API failures
- 3+ failed P0 fix attempts
- Context window exhausted (>85% tokens)
- MAX_RETRIES exceeded on critical path

## Phase-Specific References

- [Phase 1: Setup](references/phase-1-setup.md) - Worktree, output directory, MANIFEST.yaml
- [Phase 2: Triage](references/phase-2-triage.md) - Work type classification
- [Phase 3: Codebase Discovery](references/phase-3-codebase-discovery.md) - Integration pattern discovery
- [Phase 4: Skill Discovery](references/phase-4-skill-discovery.md) - Vendor skill check/creation
- [Phase 5: Complexity](references/phase-5-complexity.md) - Technical assessment
- [Phase 6: Brainstorming](references/phase-6-brainstorming.md) - Design refinement (LARGE only)
- [Phase 7: Architecture Plan](references/phase-7-architecture-plan.md) - Architecture + tasks
- [Phase 8: Implementation](references/phase-8-implementation.md) - Code development
- [Phase 9: Design Verification](references/phase-9-design-verification.md) - Plan verification
- [Phase 10: Domain Compliance](references/phase-10-domain-compliance.md) - P0 validation
- [Phase 11: Code Quality](references/phase-11-code-quality.md) - Code review
- [Phase 12: Test Planning](references/phase-12-test-planning.md) - Test strategy
- [Phase 13: Testing](references/phase-13-testing.md) - Test execution
- [Phase 14: Coverage Verification](references/phase-14-coverage-verification.md) - Coverage check
- [Phase 15: Test Quality](references/phase-15-test-quality.md) - Test quality
- [Phase 16: Completion](references/phase-16-completion.md) - PR, cleanup, frontend

## Agents Spawned

See [references/agent-matrix.md](references/agent-matrix.md) for complete agent selection guide with:

- Agent responsibilities by phase
- Mandatory skills per agent
- Selection rules and anti-patterns
- Sequential vs parallel execution patterns

**Quick Reference:**

| Phase | Agent                               | Purpose                           |
| ----- | ----------------------------------- | --------------------------------- |
| 3     | Explore                             | Codebase discovery                |
| 7     | integration-lead                    | Architecture + task decomposition |
| 8     | integration-developer               | Client + collector implementation |
| 9     | integration-reviewer                | Design verification               |
| 11.1  | integration-reviewer                | Spec compliance review            |
| 11.2  | backend-reviewer + backend-security | Quality + security (parallel)     |
| 12    | test-lead                           | Test strategy                     |
| 13    | backend-tester                      | Test implementation               |
| 14    | test-lead                           | Coverage verification             |
| 16.1  | frontend-developer                  | Frontend (conditional)            |

## Output Directory Structure

Output directory: `.claude/.output/integrations/{workflow-id}/`

| Phase                     | Output File                |
| ------------------------- | -------------------------- |
| 2: Triage                 | `triage.md`                |
| 3: Codebase Discovery     | `discovery.md`             |
| 4: Skill Discovery        | `skill-manifest.yaml`      |
| 5: Complexity             | `complexity.md`            |
| 6: Brainstorming          | `brainstorming.md`         |
| 7: Architecture Plan      | `architecture-plan.md`     |
| 8: Implementation         | `implementation.md`        |
| 9: Design Verification    | `design-verification.md`   |
| 10: Domain Compliance     | `p0-compliance-review.md`  |
| 11: Code Quality          | `code-quality.md`          |
| 12: Test Planning         | `test-plan.md`             |
| 13: Testing               | `testing.md`               |
| 14: Coverage Verification | `coverage-verification.md` |
| 15: Test Quality          | `test-quality.md`          |
| 16: Completion            | `completion.md`            |

## Rationalization Prevention

Agents rationalize skipping steps. Watch for these phrases:

| Rationalization                      | Reality                                              |
| ------------------------------------ | ---------------------------------------------------- |
| "CheckAffiliation can be a stub"     | 98% of stubs never get fixed. Implement real query.  |
| "I'll add ValidateCredentials later" | Fail fast. It must be first in Invoke().             |
| "P0 validation is redundant"         | Without it, code review will reject. Run it.         |
| "This is a simple integration"       | Complexity is unpredictable. Follow all phases.      |
| "I know the API well"                | Skills capture rate limits, auth quirks, pagination. |

**See:** [references/rationalization-table.md](references/rationalization-table.md) for complete table.

## Integration

### Called By

- `/integration` command
- User requests: "Build a {vendor} integration", "Create integration for {vendor}"

### Requires (invoke before starting)

| Skill                      | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `persisting-agent-outputs` | Output directory structure and MANIFEST.yaml format |

### Calls (during execution)

| Skill                                 | Phase/Step                   | Purpose                                         |
| ------------------------------------- | ---------------------------- | ----------------------------------------------- |
| `discovering-codebases-for-planning`  | Phase 3                      | Parallel codebase discovery with Explore agents |
| `persisting-progress-across-sessions` | Gate 1 (Ph 3→4)              | Context compaction after discovery              |
| `skill-manager`                       | Phase 4                      | Create integrating-with-{vendor} if missing     |
| `integrating-with-{vendor}` ¹         | Phase 6, 7, 8, 9, 11, 12, 13 | Vendor API patterns, auth, rate limits, mocks   |
| `brainstorming`                       | Phase 6                      | Clarify integration scope and requirements      |
| `gateway-integrations`                | Phase 7, 8, 9, 11, 12, 13    | Route to integration-specific skills            |
| `developing-integrations` ¹           | Phase 7, 8, 9, 10, 11        | P0 requirements definition and patterns         |
| `persisting-progress-across-sessions` | Gate 2 (Ph 8→9)              | Context compaction after implementation         |
| `validating-integrations` ¹           | Phase 10                     | P0 compliance verification                      |
| `testing-integrations` ¹              | Phase 12, 13                 | Mock server patterns for integration tests      |
| `persisting-progress-across-sessions` | Gate 3 (Ph 13→14)            | Context compaction after testing                |
| `finishing-a-development-branch` ¹    | Phase 16                     | Final verification and merge/PR options         |

**¹ Library skills - load via Read:**

- `developing-integrations`: `Read(".claude/skill-library/development/integrations/developing-integrations/SKILL.md")`
- `validating-integrations`: `Read(".claude/skill-library/development/integrations/validating-integrations/SKILL.md")`
- `testing-integrations`: `Read(".claude/skill-library/testing/testing-integrations/SKILL.md")`
- `finishing-a-development-branch`: `Read(".claude/skill-library/workflow/finishing-a-development-branch/SKILL.md")`
- `integrating-with-{vendor}`: `Read(".claude/skill-library/development/integrations/integrating-with-{vendor}/SKILL.md")`

**Human Checkpoints:** AskUserQuestion is used at Phase 4 (skill creation), Phase 6 (design approval), Phase 7 (architecture approval), Phase 10 (P0 violations), Phase 11/15 (retry exhausted), Phase 16 (final approval). See [checkpoint-configuration.md](references/checkpoint-configuration.md).

**Blocked Agent Routing:** When agents return `blocked` status, route using the blocked agent routing table in `persisting-agent-outputs/references/blocked-agent-routing.md`. Orchestrator may override suggestions based on workflow context.

### Pairs With (conditional)

| Skill                       | Trigger                 | Purpose                |
| --------------------------- | ----------------------- | ---------------------- |
| `developing-with-subagents` | >3 implementation tasks | Per-task review cycles |

## Exit Criteria

Integration development is complete when ALL criteria are verified:

- [ ] Phase completion: 16/16 (or applicable phases based on work type)
- [ ] Skill artifacts: `integrating-with-{vendor}` exists
- [ ] P0 compliance: 7/7 requirements pass
- [ ] Review status: All APPROVED
- [ ] Test status: ≥80% coverage, all pass
- [ ] Final verification: build, test, vet, lint pass
- [ ] Human approval obtained

**See:** [references/exit-criteria.md](references/exit-criteria.md) for complete checklist.

## References

- [Agent Matrix](references/agent-matrix.md) - Agent selection by phase
- [Checkpoint Configuration](references/checkpoint-configuration.md) - Human checkpoint strategy
- [Compaction Gates](references/compaction-gates.md) - Context compaction protocol
- [Error Recovery](references/error-recovery.md) - Abort triggers and recovery
- [Exit Criteria](references/exit-criteria.md) - Completion checklist
- [Prompt Templates](references/prompts/) - Agent prompt templates
- [Rationalization Table](references/rationalization-table.md) - Anti-bypass patterns

## Related Skills

- **`developing-integrations`** (LIBRARY) - P0 requirements and patterns
  - `Read(".claude/skill-library/development/integrations/developing-integrations/SKILL.md")`
- **`validating-integrations`** (LIBRARY) - Compliance verification
  - `Read(".claude/skill-library/development/integrations/validating-integrations/SKILL.md")`
- **`testing-integrations`** (LIBRARY) - Mock server patterns
  - `Read(".claude/skill-library/testing/testing-integrations/SKILL.md")`
