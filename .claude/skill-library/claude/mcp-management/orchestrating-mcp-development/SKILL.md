---
name: orchestrating-mcp-development
description: Use when creating MCP wrappers - orchestrates discovery, architecture, batched TDD, review, audit for 100% tool coverage
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Task, Skill
---

# Orchestrating MCP Development

**Multi-agent workflow orchestration for MCP wrapper creation with 100% tool coverage, shared architecture patterns, batched parallel execution, and quality gates.**

## When to Use This Skill

Use this skill when:

- Creating new MCP wrappers via /tool-manager create {service}
- Need to wrap ALL tools in an MCP service (100% coverage)
- Want shared architecture patterns across all wrappers
- Require batched parallel execution for multiple tools
- Need TypeScript best practices enforcement

**This skill orchestrates MCP wrapper creation for ALL tools in a service with specialized agents for each phase.**

**You MUST use TodoWrite before starting to track all workflow steps.**

## Quick Reference

| Phase | Name                  | Agents                                      | Execution           | Checkpoint   |
| ----- | --------------------- | ------------------------------------------- | ------------------- | ------------ |
| 1     | Setup                 | using-git-worktrees, setting-up-mcp-servers | Sequential          | -            |
| 2     | Brainstorming         | brainstorming                               | Sequential          | 🛑 Human     |
| 3     | Discovery             | Claude                                      | Sequential          | -            |
| 4     | Planning              | writing-plans                               | Sequential          | 🛑 Human     |
| 5     | Architecture          | tool-lead + security-lead                   | PARALLEL            | 🛑 Human     |
| 6     | Per-Tool Architecture | tool-lead + tool-tester                     | BATCHED (3-5 tools) | -            |
| 7     | Test Planning         | CLI                                         | Sequential          | Gate         |
| 8     | Implementation        | tool-developer                              | BATCHED (3-5 tools) | -            |
| 9     | P0 Compliance         | CLI                                         | Sequential          | Gate         |
| 10    | Code Review           | tool-reviewer                               | BATCHED (3-5 tools) | 1 retry/tool |
| 11    | Testing               | CLI                                         | Sequential          | Gate         |
| 12    | Audit                 | CLI                                         | Sequential          | Gate         |
| 13    | Completion            | finishing-a-development-branch              | Sequential          | Checklist    |

## Agent Matrix

| Phase | Agent(s)       | Mode     | Execution | Output                                         | Notes                                                                                                         |
| ----- | -------------- | -------- | --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 5     | tool-lead      | shared   | PARALLEL  | architecture-shared.md                         | Requires file locking for MANIFEST.yaml updates ([file-locking-phase5.md](references/file-locking-phase5.md)) |
| 5     | security-lead  | shared   | PARALLEL  | security-assessment.md                         | Requires file locking for MANIFEST.yaml updates ([file-locking-phase5.md](references/file-locking-phase5.md)) |
| 6     | tool-lead      | per-tool | BATCHED   | tools/{tool}/architecture.md                   |
| 6     | tool-tester    | per-tool | BATCHED   | tools/{tool}/test-plan.md, {tool}.unit.test.ts |
| 8     | tool-developer | per-tool | BATCHED   | {tool}.ts                                      |
| 10    | tool-reviewer  | per-tool | BATCHED   | tools/{tool}/review.md                         |

## Batching Strategy

For MCPs with many tools, process in batches to prevent overwhelming agents:

**Batch Size:** 3-5 tools per batch

**Batching applies to:**

- Phase 6: Per-Tool Architecture (architecture + test planning + test implementation)
- Phase 8: Implementation
- Phase 10: Code Review

**Execution Pattern:**

```
Batch 1: [get-issue, list-issues, create-issue]
  └─ Spawn 3 agents in parallel
  └─ Wait for all to complete
  └─ Update MANIFEST.yaml

Batch 2: [update-issue, delete-issue, find-issue]
  └─ Spawn 3 agents in parallel
  └─ Wait for all to complete
  └─ Update MANIFEST.yaml

... continue until all tools processed
```

**Progress Tracking:** Update MANIFEST.yaml after each batch completes.

## Context Window Monitoring

For MCPs with >15 tools, monitor token usage at phase transitions to prevent context degradation. Token thresholds trigger at 105k (warning), 140k (critical), and >170k (emergency), with mandatory compaction protocols. Monitoring triggers automatically when >15 tools detected.

**Details:** [Context Monitoring](references/context-monitoring.md)

## Orchestration Guards

Retry limits prevent infinite loops during implementation (2 retries), P0 validation (2 retries), code review (1 retry), and testing (2 retries). Iteration counts persist in MANIFEST.yaml and trigger escalation protocols when limits are reached. Flaky tests count as failures - fix or escalate, never retry for 'lucky pass'.

**Details:** [Orchestration Guards](references/orchestration-guards.md)

## Shared Infrastructure

Agents MUST reference shared utilities from .claude/ for testing, response handling, input sanitization, and MCP client interactions.

**Complete infrastructure details:** See [references/shared-infrastructure.md](references/shared-infrastructure.md)

## Critical Rules

**Foundation patterns from `orchestrating-multi-agent-workflows`:**

- **State Tracking (Mandatory)** (lines 23-29) - MUST use TodoWrite before starting any orchestration workflow
- **Parallel Execution** (lines 122-133) - Phase 5 spawns tool-lead + security-lead in parallel
- **Human Checkpoints** (Pattern, lines 286-294, references/checkpoint-configuration.md) - Brainstorming (Phase 2), Planning (Phase 4), and Architecture (Phase 5) approvals
- **Feedback Loops** (lines 235-246, references/tight-feedback-loop.md) - Implementation→Review→Test cycles with inter_phase limits
- **Orchestration Guards** (lines 265-294, references/orchestration-guards.md) - Retry limits, failure definition, iteration persistence
- **Delegation Protocol** (lines 111-119) - 4 elements: clear objective, context, scope boundaries, expected output
- **File Locking** (Pattern 3.7, lines 143-152, references/file-locking.md) - Prevent conflicts in parallel phases; Phase 5 parallel agents use lock protocol for MANIFEST.yaml ([file-locking-phase5.md](references/file-locking-phase5.md))
- **Gated Verification** (lines 175-184) - Two-stage: Stage 1 (compliance) → Stage 2 (quality/security)
- **Requirements Verification** (Pattern 4.4, lines 186-201) - Verify architecture requirements before technical P0 checks

**MCP-specific adaptations:**

- **Batched Execution**: Phases 6, 8, 10 process tools in batches of 3-5 (see Batching Strategy section)
- **Structured Handoff**: Agents return JSON with status, verdict, next_steps (see Agent Matrix)
- **CLI Gates**: Phase 7 (RED must fail), Phase 9 (P0 compliance), Phase 11 (GREEN ≥80%), Phase 12 (Audit ≥10/11)
- **Implementation Limits**: Max 2 retries per tool for implementation fixes in Phase 8 (inter_phase.implementation_retry_limit). See Orchestration Guards for escalation protocol
- **Review Limits**: Max 1 retry per tool in Phase 10 code review (inter_phase.review_retry_limit). See Orchestration Guards for escalation protocol

**See:** `orchestrating-multi-agent-workflows` for complete pattern definitions and configuration system (`.claude/config/orchestration-limits.yaml`).

**Complete rules and formats:** See [references/critical-rules.md](references/critical-rules.md)

## Configuration Integration

This orchestration uses limits from `.claude/config/orchestration-limits.yaml`:

| Limit Type                  | Config Section                              | Used In          | Default |
| --------------------------- | ------------------------------------------- | ---------------- | ------- |
| Batch implementation cycles | inter_phase.max_feedback_iterations         | Phase 8          | 5       |
| Consecutive review failures | inter_phase.max_consecutive_review_failures | Phase 10         | 3       |
| Pattern-level escalation    | orchestrator.requirement_compliance_retries | P0 gate failures | 2       |

**See:** `orchestrating-multi-agent-workflows` lines 58-70 for configuration system architecture.

## P0 Compliance Validation

Phase 9 (P0 Compliance) uses a two-stage validation process:

**Stage 1 (Architecture Requirements):** Verifies Phase 5 architecture decisions (architecture-shared.md, per-tool architecture.md) are implemented. Pattern 4.4 from orchestrating-multi-agent-workflows.

**Stage 2 (Technical P0):** Verifies token optimization (80-99% reduction), Zod schema accuracy, Result pattern usage, response filtering, input sanitization, shared infrastructure, and comprehensive error handling.

Violations in either stage trigger 🛑 Human Checkpoint. Both stages must pass before proceeding to Phase 10 (Code Review).

**Complete validation protocol and report formats:** See [references/p0-compliance.md](references/p0-compliance.md)

## References

**Complete Table of Contents**: All reference documentation, prompt templates, phase procedures, and integration details are catalogued in [references/table-of-contents.md](references/table-of-contents.md).

**Workflow Phases (Phases 1-13)**: Setup → Brainstorming → Discovery → Planning → Architecture (PARALLEL) → Per-Tool Architecture (BATCHED) → Test Planning → Implementation (BATCHED) → P0 Compliance → Code Review (BATCHED, 1 retry/tool) → Testing → Audit → Completion. See [references/table-of-contents.md](references/table-of-contents.md) for phase-specific procedures.

## Output Directory Structure

```
.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/
├── MANIFEST.yaml              # Tracks ALL tools and phases (unified state)
├── tools-manifest.json        # All discovered tools
├── architecture-shared.md     # Phase 5: Shared patterns
├── security-assessment.md     # Phase 5: Shared security
└── tools/
    ├── get-issue/
    │   ├── schema-discovery.md   # Phase 3
    │   ├── architecture.md       # Phase 6
    │   ├── test-plan.md          # Phase 6
    │   └── review.md             # Phase 10
    ├── list-issues/
    │   └── ... (same structure)
    ├── create-issue/
    │   └── ... (same structure)
    └── ... (all tools)

.claude/tools/{service}/
├── get-issue.ts              # Phase 8: Wrapper
├── get-issue.unit.test.ts    # Phase 6: Tests
├── list-issues.ts
├── list-issues.unit.test.ts
├── create-issue.ts
├── create-issue.unit.test.ts
└── ... (all tools)
```

## Integration

### Called-By

| Invoker                | Context                                              |
| ---------------------- | ---------------------------------------------------- |
| gateway-mcp-tools      | Routes "create wrapper" / "orchestrate MCP" requests |
| /tool-manager command  | User executes /tool-manager create {service}         |
| managing-tool-wrappers | Delegates MCP wrapper creation workflow              |

### Requires

| Skill                         | When    | Purpose                                                                                                               |
| ----------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| using-git-worktrees (LIBRARY) | Phase 1 | Create isolated workspace for MCP development - `Read('.claude/skill-library/workflow/using-git-worktrees/SKILL.md')` |
| brainstorming (CORE)          | Phase 2 | Clarify tool requirements, token optimization goals - `skill: "brainstorming"`                                        |
| writing-plans (LIBRARY)       | Phase 4 | Create implementation plan for tool wrappers - `Read('.claude/skill-library/workflow/writing-plans/SKILL.md')`        |

### Core Skills

| Skill                                    | Purpose                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| setting-up-mcp-servers (LIBRARY)         | Phase 1: MCP detection and setup - `Read('.claude/skill-library/claude/mcp-management/setting-up-mcp-servers/SKILL.md')`         |
| finishing-a-development-branch (LIBRARY) | Phase 13: Commit wrappers, create PR, cleanup - `Read('.claude/skill-library/workflow/finishing-a-development-branch/SKILL.md')` |
| managing-tool-wrappers                   | Phases 11-12: CLI audit and generation                                                                                           |
| orchestrating-multi-agent-workflows      | Agent coordination, delegation protocol, P0 compliance validation, orchestration guards, gated verification                      |
| persisting-agent-outputs                 | MANIFEST.yaml format and agent handoffs                                                                                          |
| developing-with-subagents                | Conditional: >10 tools                                                                                                           |
| persisting-progress-across-sessions      | Conditional: >15 tools                                                                                                           |
| dispatching-parallel-agents              | Conditional: 3+ failures                                                                                                         |

### Library Skills

| Skill                                  | Path                                                                                        | Purpose                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| designing-progressive-loading-wrappers | .claude/skill-library/claude/mcp-management/designing-progressive-loading-wrappers/SKILL.md | Token optimization          |
| optimizing-llm-api-responses           | .claude/skill-library/development/typescript/optimizing-llm-api-responses/SKILL.md          | Response filtering          |
| implementing-result-either-pattern     | .claude/skill-library/development/typescript/implementing-result-either-pattern/SKILL.md    | Error handling              |
| validating-with-zod-schemas            | .claude/skill-library/development/typescript/validating-with-zod-schemas/SKILL.md           | Input validation            |
| implementing-retry-with-backoff        | .claude/skill-library/development/typescript/implementing-retry-with-backoff/SKILL.md       | Resilience                  |
| sanitizing-inputs-securely             | .claude/skill-library/development/typescript/sanitizing-inputs-securely/SKILL.md            | Security                    |
| structuring-hexagonal-typescript       | .claude/skill-library/development/typescript/structuring-hexagonal-typescript/SKILL.md      | Architecture                |
| testing-with-vitest-mocks              | .claude/skill-library/testing/testing-with-vitest-mocks/SKILL.md                            | Testing patterns            |
| avoiding-barrel-files                  | .claude/skill-library/development/typescript/avoiding-barrel-files/SKILL.md                 | Import patterns             |
| documenting-with-tsdoc                 | .claude/skill-library/development/typescript/documenting-with-tsdoc/SKILL.md                | Documentation               |
| orchestration-prompt-patterns          | .claude/skill-library/prompting/orchestration-prompt-patterns/SKILL.md                      | Prompt engineering patterns |

> Prompt templates in `references/prompts/` implement patterns from orchestration-prompt-patterns skill.

### Required Sub-Skills by Phase

| Phase | Required Sub-Skills                                           | Conditional Sub-Skills                             |
| ----- | ------------------------------------------------------------- | -------------------------------------------------- |
| All   | persisting-agent-outputs, orchestrating-multi-agent-workflows | context-monitoring (if >15 tools)                  |
| 1     | using-git-worktrees (LIBRARY), setting-up-mcp-servers (LIBRARY) | -                                                |
| 2     | brainstorming                                                 | -                                                  |
| 4     | writing-plans                                                 | -                                                  |
| 5-9   | -                                                             | developing-with-subagents (if >10 tools)           |
| 5-9   | -                                                             | persisting-progress-across-sessions (if >15 tools) |
| 8,9   | -                                                             | dispatching-parallel-agents (if 3+ failures)       |
| 13    | finishing-a-development-branch                                | -                                                  |

**Conditional complexity triggers:**

- \>10 tools: Invoke `developing-with-subagents` for batch coordination
- \>15 tools: Invoke `persisting-progress-across-sessions` for resume capability
- 3+ independent failures in batch: Invoke `dispatching-parallel-agents` for parallel fixes

## Related Skills

- **setting-up-mcp-servers** - MCP detection, installation, and configuration (Phase 1)
- **managing-tool-wrappers** - CLI commands for audit, fix, generate-skill (Phase 9, 10)
- **orchestrating-feature-development** - Reference for multi-agent orchestration patterns
- **dispatching-parallel-agents** - For handling batch failures across multiple tools
- **gateway-typescript** - Routes to TypeScript library skills (Zod, Result/Either, TSDoc)
- **gateway-testing** - Routes to testing patterns and @claude/testing usage

## Exit Criteria

MCP wrapper creation is complete when:

- ✅ All 13 phases (1-13) marked complete in MANIFEST.yaml
- ✅ 100% tool coverage (all discovered tools wrapped)
- ✅ Git worktree created with feature branch (Phase 1)
- ✅ MCP server configured (Phase 1)
- ✅ Brainstorming design approved by human (Phase 2)
- ✅ Implementation plan approved by human (Phase 4)
- ✅ Shared architecture approved by human (Phase 5)
- ✅ All tests pass with >=80% coverage per wrapper (Phase 11)
- ✅ All audits pass >=10/11 phases per wrapper (Phase 12)
- ✅ All code reviews verdict: APPROVED (Phase 10)
- ✅ All architecture requirements verified (Phase 9 Stage 1)
- ✅ Requirements verification checklists documented per tool
- ✅ All P0 technical compliance checks passed or user-approved deferrals documented (Phase 9 Stage 2)
- ✅ Service skill generated covering all tools (Phase 13)
- ✅ Build and tests pass (Phase 13)
- ✅ Phase 13 completion finalization complete (PR created or committed)
- ✅ Worktree cleaned up (if created)
- ✅ All wrapper files committed to feature branch
- ✅ All gate checklists passed (RED, P0, GREEN, Audit)
- ✅ No rationalization phrases detected during workflow
- ✅ MANIFEST.yaml status = 'complete'
- ✅ Both review stages passed (spec compliance + quality/security)
- ✅ All tool metadata files present with skills_invoked arrays
- ✅ All retry limits respected (no infinite loops)
- ✅ Escalations documented in MANIFEST.yaml with resolution
- ✅ Context monitoring performed at all phase transitions (for >15 tools)
- ✅ No phase executed above critical token threshold (140k)
