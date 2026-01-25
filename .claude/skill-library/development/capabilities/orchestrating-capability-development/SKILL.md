---
name: orchestrating-capability-development
description: Use when developing security capabilities (VQL, Nuclei, Janus, Fingerprintx, Scanner integrations) - coordinates architecture, implementation, review, and testing phases with capability-specific quality checks
allowed-tools: Skill, Task, TodoWrite, Read, Glob, Grep, AskUserQuestion
---

# Capability Development Orchestration

**Systematically guide security capability development through sixteen phases with parallel agent execution, explicit feedback loops, and structured capability directories.**

## Overview

This skill orchestrates complete security capability development from concept to tested artifact using a 16-phase workflow with capability-specific customizations.

**Orchestration is NOT implementation.** The orchestrator's responsibilities are:

1. **Analyze** capability scope and complexity
2. **Decompose** into specialized subtasks
3. **Delegate** to appropriate agents (capability-lead, capability-developer, capability-reviewer, capability-tester)
4. **Synthesize** results into coherent output
5. **Track progress** across the workflow

## When to Use This Skill

Use this skill when you need to:

- Develop a complete security capability from concept to tested artifact
- Create VQL capabilities for Velociraptor-based detection
- Write Nuclei templates for vulnerability scanning
- Build Janus tool chains for security scanner orchestration
- Implement Fingerprintx modules for service detection
- Integrate external security scanners into the platform

**Symptoms this skill addresses:**

- Manual orchestration of capability-specific agents
- Missing architecture approval for security detection logic
- Inconsistent quality checks across capability types
- No structured workflow for VQL/Nuclei/Janus development
- Lost context between development phases

## State Tracking (MANDATORY)

**MUST use TodoWrite BEFORE starting any orchestration workflow.**

Multi-phase orchestration involves coordinating multiple agents. Without external state tracking, context drift causes forgotten phases, repeated spawns, and missed verification steps.

**Create TodoWrite items for each phase BEFORE spawning any agents.**

## Standard Phase Template

| Phase | Name                  | Purpose                                             | Conditional | Gate |
| ----- | --------------------- | --------------------------------------------------- | ----------- | ---- |
| 1     | Setup                 | Worktree creation, output directory, MANIFEST.yaml  | Always      |      |
| 2     | Triage                | Classify work type, select phases to execute        | Always      |      |
| 3     | Codebase Discovery    | Explore codebase patterns, detect capability types  | Always      | G1   |
| 4     | Skill Discovery       | Map technologies to skills, detect gaps, background research | Always      |      |
| 5     | Complexity            | Technical complexity assessment, execution strategy | Always      |      |
| 6     | Brainstorming         | Design refinement with human-in-loop                | LARGE only  |      |
| 7     | Architecture Plan     | Technical design AND task decomposition             | MEDIUM+     |      |
| 8     | Implementation        | Capability artifact development                     | Always      | G2   |
| 9     | Design Verification   | Verify implementation matches plan                  | MEDIUM+     |      |
| 10    | Domain Compliance     | Capability-specific mandatory patterns validation   | Always      |      |
| 11    | Code Quality          | Capability review for detection accuracy            | Always      |      |
| 12    | Test Planning         | Test strategy and plan creation                     | MEDIUM+     |      |
| 13    | Testing               | Test implementation and execution                   | Always      | G3   |
| 14    | Coverage Verification | Verify test coverage meets threshold                | Always      |      |
| 15    | Test Quality          | No low-value tests, correct assertions, all pass    | Always      |      |
| 16    | Completion            | Final verification, PR, cleanup                     | Always      |      |

**G = Compaction Gate** - BLOCKING checkpoint requiring [compaction-gates.md](references/compaction-gates.md) protocol before next phase.

**Work Types:** BUGFIX, SMALL, MEDIUM, LARGE (determined in Phase 2: Triage)

**Phase Skip Matrix:**

| Work Type | Skipped Phases       |
| --------- | -------------------- |
| BUGFIX    | 5, 6, 7, 9, 12       |
| SMALL     | 5, 6, 7, 9           |
| MEDIUM    | None                 |
| LARGE     | None (all 16 phases) |

## Quick Reference

| Phase | Agents                                   | Execution          | Checkpoint          |
| ----- | ---------------------------------------- | ------------------ | ------------------- |
| 1     | -                                        | Setup              | -                   |
| 2     | -                                        | Triage             | -                   |
| 3     | Explore (1-10 via discovering-codebases) | **PARALLEL**       | -                   |
| 4     | -                                        | Skill mapping      | -                   |
| 5     | -                                        | Assessment         | -                   |
| 6     | brainstorming skill                      | Sequential         | Human               |
| 7     | capability-lead + security-lead          | **PARALLEL**       | Human               |
| 8     | capability-developer                     | Mode-dependent     | Per-task if 4+      |
| 9     | -                                        | Verification       | -                   |
| 10    | -                                        | Compliance check   | Violations->Human   |
| 11    | capability-reviewer                      | Two-stage gated    | 2+1 retry->escalate |
| 12    | test-lead                                | Sequential         | -                   |
| 13    | capability-tester ×3                     | **PARALLEL**       | -                   |
| 14    | -                                        | Coverage check     | -                   |
| 15    | test-lead                                | Sequential         | 1 retry->escalate   |
| 16    | -                                        | Final verification | -                   |

## Configuration

This skill uses `.claude/config/orchestration-limits.yaml`:

| Section        | Scope                               | Used For                             |
| -------------- | ----------------------------------- | ------------------------------------ |
| `inter_phase`  | Implementation->Review->Test cycles | tight-feedback-loop pattern          |
| `orchestrator` | Re-invoking entire patterns         | Retry limits in Orchestration Guards |

> **No Unilateral Overrides**: Agents MUST NOT override config values. To change limits, update the config file or get user approval via AskUserQuestion.

## Phase-Specific References

- [Phase 1: Setup](references/phase-1-setup.md) - Worktree creation, output directory, MANIFEST.yaml
- [Phase 2: Triage](references/phase-2-triage.md) - Work type classification (BUGFIX/SMALL/MEDIUM/LARGE)
- [Phase 3: Codebase Discovery](references/phase-3-codebase-discovery.md) - Explore agent patterns, capability type detection
- [Phase 4: Skill Discovery](references/phase-4-skill-discovery.md) - Technology-to-skill mapping, gap detection, background research orchestration
- [Phase 5: Complexity](references/phase-5-complexity.md) - Technical assessment, execution strategy
- [Phase 6: Brainstorming](references/phase-6-brainstorming.md) - Design refinement with human-in-loop (LARGE only)
- [Phase 7: Architecture Plan](references/phase-7-architecture-plan.md) - Technical design AND task decomposition
- [Phase 8: Implementation](references/phase-8-implementation.md) - Capability artifact development
- [Phase 9: Design Verification](references/phase-9-design-verification.md) - Plan-to-implementation matching
- [Phase 10: Domain Compliance](references/phase-10-domain-compliance.md) - Capability-specific mandatory patterns
- [Phase 11: Code Quality](references/phase-11-code-quality.md) - Capability review for detection accuracy
- [Phase 12: Test Planning](references/phase-12-test-planning.md) - Test strategy and plan creation
- [Phase 13: Testing](references/phase-13-testing.md) - Test implementation and execution
- [Phase 14: Coverage Verification](references/phase-14-coverage-verification.md) - Coverage threshold validation
- [Phase 15: Test Quality](references/phase-15-test-quality.md) - Assertion quality, no low-value tests
- [Phase 16: Completion](references/phase-16-completion.md) - Final verification, PR, cleanup

## Compaction Gates

**BLOCKING checkpoints at phase transitions where context accumulates:**

| Gate | After Phase | Before Phase | Trigger Threshold |
| ---- | ----------- | ------------ | ----------------- |
| 1    | 3           | 4            | 70% (140k tokens) |
| 2    | 8           | 9            | 70% (140k tokens) |
| 3    | 13          | 14           | 70% (140k tokens) |

**Protocol:** See [compaction-gates.md](references/compaction-gates.md) for:

- 5-step compaction procedure
- "What to Compact / What to Keep" tables
- Capability-specific content lists
- Rationalization counters

## Agent Matrix for Capability Development

| Capability Type | Phase 7 Agents                 | Phase 8 Agents       | Phase 11 Agents                       | Phase 13 Agents      |
| --------------- | ------------------------------ | -------------------- | ------------------------------------- | -------------------- |
| VQL             | capability-lead, security-lead | capability-developer | capability-reviewer                   | capability-tester ×3 |
| Nuclei          | capability-lead, security-lead | capability-developer | capability-reviewer                   | capability-tester ×3 |
| Janus           | capability-lead, backend-lead  | capability-developer | capability-reviewer, backend-reviewer | capability-tester ×3 |
| Fingerprintx    | capability-lead, backend-lead  | capability-developer | capability-reviewer, backend-reviewer | capability-tester ×3 |
| Scanner         | capability-lead, backend-lead  | capability-developer | capability-reviewer, backend-reviewer | capability-tester ×3 |

## Capability Type Matrix

| Type         | Lead Focus                       | Developer Focus                | Test Focus                    |
| ------------ | -------------------------------- | ------------------------------ | ----------------------------- |
| VQL          | Query structure, artifacts       | Velociraptor queries           | Query parsing, detection      |
| Nuclei       | Template structure, matchers     | YAML templates, detection      | False positives, CVE coverage |
| Janus        | Pipeline design, tool chain      | Go integration, orchestration  | Pipeline flow, error handling |
| Fingerprintx | Probe design, protocol           | Go modules, response parsing   | Service detection accuracy    |
| Scanner      | API design, result normalization | Go/Python client, data mapping | Integration, error cases      |

See [capability-types.md](references/capability-types.md) for complete comparison.

## Capability-Specific Domain Compliance (Phase 10)

Capability development has specific P0 requirements by type:

### VQL Capabilities

| Check             | Description                               | Severity |
| ----------------- | ----------------------------------------- | -------- |
| Query Syntax      | VQL query parses without errors           | P0       |
| Artifact Schema   | Output matches expected schema            | P0       |
| Performance       | Query completes in ≤60s on typical system | P0       |
| Platform Coverage | Works on target platforms (Win/Linux/Mac) | P1       |

### Nuclei Templates

| Check            | Description                       | Severity |
| ---------------- | --------------------------------- | -------- |
| YAML Syntax      | Template validates without errors | P0       |
| Matcher Accuracy | ≤2% false positive rate           | P0       |
| CVE Metadata     | Complete CVE info if CVE-specific | P0       |
| Request Count    | ≤3 HTTP requests per target       | P1       |

### Janus/Fingerprintx/Scanner

| Check              | Description                        | Severity |
| ------------------ | ---------------------------------- | -------- |
| Go Compilation     | Compiles without errors            | P0       |
| Interface Contract | Implements required interfaces     | P0       |
| Error Handling     | Graceful failure on tool errors    | P0       |
| Rate Limiting      | Respects API rate limits (Scanner) | P0       |

See [Phase 10: Domain Compliance](references/phase-10-domain-compliance.md) for full checklist.

## Tight Feedback Loop (Phases 8-11-13)

**Implementation->Review->Test cycle with automatic iteration when review or tests fail.**

- Max iterations: Read from `orchestration-limits.yaml`
- Tracks iteration history in `{OUTPUT_DIR}/feedback-scratchpad.md`

**Pattern:** See [tight-feedback-loop.md](references/tight-feedback-loop.md)

## Checkpoint Configuration

Human approval required at specific phases based on work type:

| Work Type | Checkpoints (Phases)   |
| --------- | ---------------------- |
| BUGFIX    | 8 (implementation), 16 |
| SMALL     | 8 (implementation), 16 |
| MEDIUM    | 7 (plan), 8, 16        |
| LARGE     | 6 (design), 7, 8, 16   |

For large plans (>5 tasks), add intermediate checkpoints during implementation.

See [checkpoint-configuration.md](references/checkpoint-configuration.md) for capability-specific configuration.

## Parallel Execution

**When tasks are independent, spawn in a SINGLE message:**

```typescript
// Phase 7: Architecture - spawn leads in parallel
Task("capability-lead", "Design capability architecture...");
Task("security-lead", "Security assessment...");

// Phase 13: Testing - spawn testers in parallel
Task("capability-tester", "Unit tests for detection logic...");
Task("capability-tester", "Integration tests for tool chain...");
Task("capability-tester", "Edge case tests for false positives...");
```

**Do NOT spawn sequentially when tasks are independent.**

## File Scope Boundaries

When spawning parallel agents:

| Agent                | Scope                                              |
| -------------------- | -------------------------------------------------- |
| capability-developer | `{resolved_path}/` (external or internal)          |
| capability-reviewer  | READ-ONLY on capability paths                      |
| capability-tester    | test files only (_\_test.go, _\_test.vql)          |

**Path locations:**
- External (migrated): `{CAPABILITIES_ROOT}/modules/{capability}/`
- Internal (not yet migrated): `modules/{module}/` (e.g., chariot-aegis-capabilities, msp-definitions)

See [file-scope-boundaries.md](references/file-scope-boundaries.md) for conflict detection protocol.

## Rationalization Prevention

<EXTREMELY-IMPORTANT>
You MUST read rationalization-table.md BEFORE proceeding past any compaction gate (after phases 3, 8, or 13).

```
Read(.claude/skill-library/development/capabilities/orchestrating-capability-development/references/rationalization-table.md)
```

This file contains anti-rationalization counters for "Momentum Bias", "Context Seems Fine", and other compaction gate bypass patterns.
</EXTREMELY-IMPORTANT>

See [rationalization-table.md](references/rationalization-table.md) for capability-specific rationalizations.

## Emergency Abort Protocol

**Triggers:** User request, 3+ escalations in same phase, critical security finding, unrecoverable error, cost/time exceeded.

**Flow:** Stop work -> Capture state -> Present cleanup options -> Execute cleanup -> Report final state.

See [emergency-abort.md](references/emergency-abort.md) for configuration.

## Capability Directory Structure

```
.worktrees/{capability-name}/
├── .capability-development/
│   ├── MANIFEST.yaml              # Capability metadata, status, metrics
│   ├── progress.md                # Session progress tracking
│   ├── skill-manifest.yaml        # Phase 4 output: technology-to-skill mapping
│   ├── discovery.md               # Phase 3 output: codebase patterns
│   ├── architecture.md            # Phase 7 output: technical design
│   ├── plan.md                    # Phase 7 output: implementation tasks
│   ├── feedback-scratchpad.md     # Iteration history for tight feedback loop
│   └── agents/                    # Agent output files
│       ├── capability-lead.md
│       ├── capability-developer.md
│       └── ...
└── [capability artifacts]         # Actual implementation (VQL/Nuclei/Go)
```

## Quality Standards

Each capability type has specific quality targets:

| Metric              | VQL  | Nuclei | Janus | Fingerprintx | Scanner |
| ------------------- | ---- | ------ | ----- | ------------ | ------- |
| Detection Accuracy  | ≥95% | ≥95%   | N/A   | ≥98%         | N/A     |
| False Positive Rate | ≤5%  | ≤2%    | N/A   | ≤1%          | N/A     |
| Pipeline Success    | N/A  | N/A    | ≥98%  | N/A          | N/A     |
| API Integration     | N/A  | N/A    | N/A   | N/A          | 100%    |

See [quality-standards.md](references/quality-standards.md) for complete metrics.

## Exit Criteria

Capability development is complete when:

- All applicable phases marked "complete" in MANIFEST.yaml (based on work type)
- Discovery artifacts generated (discovery.md, skill-manifest.yaml)
- Capability-type quality metrics met (detection accuracy, false positive rate)
- All reviewers returned verdict: APPROVED
- Test plan created and all tests implemented (quality_score >= 70)
- Final verification passed (build, lint, tests)
- Metrics tracked in MANIFEST.yaml (tokens, cost, iterations)
- Worktree cleaned up (merged and removed, OR kept per user request)
- User approves final result
- No rationalization phrases; all gate checklists passed; overrides documented

## Integration

### Called By

- `/capability` command - Primary entry point for users
- Parent orchestrators (multi-capability, scanner integration) - Via workflow handoff protocol

### Requires (invoke before or at start)

- **`using-git-worktrees`** (LIBRARY) - Phase 1
  - Purpose: Create isolated workspace
  - `Read(".claude/skill-library/workflow/using-git-worktrees/SKILL.md")`

- **`persisting-agent-outputs`** (CORE) - Phase 1
  - Purpose: Discover output directory, set up workspace
  - `skill: "persisting-agent-outputs"`

- **`discovering-codebases-for-planning`** (CORE) - Phase 3
  - Purpose: Parallel discovery with dynamic agent count
  - `skill: "discovering-codebases-for-planning"`

### Calls (skill-invocation via Skill tool)

- **`brainstorming`** (CORE) - Phase 6
  - Purpose: Design refinement with human-in-loop
  - `skill: "brainstorming"`

- **`writing-plans`** (CORE) - Phase 7
  - Purpose: Create detailed implementation plan
  - `skill: "writing-plans"`

- **`selecting-plugin-implementation-pattern`** (LIBRARY) - Phase 2
  - Purpose: YAML vs Go plugin decision
  - `Read(".claude/skill-library/development/capabilities/selecting-plugin-implementation-pattern/SKILL.md")`

- **`finishing-a-development-branch`** (LIBRARY) - Phase 16
  - Purpose: Verify, PR options, cleanup
  - `Read(".claude/skill-library/workflow/finishing-a-development-branch/SKILL.md")`

### Spawns (agent-dispatch via Task tool)

- **`capability-lead` + `security-lead`** - Phase 7
  - Purpose: Architecture design and security assessment
  - Key mandatory skills: adhering-to-dry, adhering-to-yagni

- **`capability-developer`** - Phase 8
  - Purpose: Capability artifact implementation
  - Key mandatory skills: developing-with-tdd, verifying-before-completion

- **`capability-reviewer`** - Phase 11
  - Purpose: Code quality review for detection accuracy
  - Key mandatory skills: adhering-to-dry

- **`test-lead`** - Phases 12, 15
  - Purpose: Test strategy and quality validation
  - Key mandatory skills: None

- **`capability-tester` ×3** - Phase 13
  - Purpose: Parallel test implementation (unit, integration, edge cases)
  - Key mandatory skills: developing-with-tdd

### Pairs With (conditional)

- **`porting-python-capabilities-to-go`** (LIBRARY) - Porting Python to Go
  - Purpose: Coordinates idiom translation
  - `Read(".claude/skill-library/development/capabilities/porting-python-capabilities-to-go/SKILL.md")`

- **`developing-with-subagents`** (CORE) - Plan has >3 independent tasks
  - Purpose: Fresh subagent per task + two-stage review
  - `skill: "developing-with-subagents"`

- **`dispatching-parallel-agents`** (CORE) - 3+ independent failures
  - Purpose: Parallel investigation of unrelated issues
  - `skill: "dispatching-parallel-agents"`

- **`verifying-before-completion`** (CORE) - Phase 16 completion
  - Purpose: Final verification checklist
  - `skill: "verifying-before-completion"`

- **`debugging-systematically`** (CORE) - Review/test failures
  - Purpose: Systematic debugging when failures repeat
  - `skill: "debugging-systematically"`

## References

### Phase Files

- [Phase 1-16 references listed above]

### Supporting Documentation

- [Agent Matrix](references/agent-matrix.md) - Agent selection by capability type
- [Capability Types](references/capability-types.md) - VQL, Nuclei, Janus, Fingerprintx, Scanner comparison
- [Checkpoint Configuration](references/checkpoint-configuration.md) - Human approval points
- [Compaction Gates](references/compaction-gates.md) - BLOCKING context management
- [Directory Structure](references/directory-structure.md) - Capability workspace organization
- [Emergency Abort](references/emergency-abort.md) - Safe workflow termination
- [File Scope Boundaries](references/file-scope-boundaries.md) - Parallel agent conflict prevention
- [Progress Persistence](references/progress-persistence.md) - Cross-session resume
- [Quality Standards](references/quality-standards.md) - Capability-specific quality metrics
- [Rationalization Table](references/rationalization-table.md) - Capability-specific rationalizations
- [Tight Feedback Loop](references/tight-feedback-loop.md) - Implementation->Review->Test cycles
- [Troubleshooting](references/troubleshooting.md) - Common issues and solutions

### Prompt Templates

- [prompts/architect-prompt.md](references/prompts/architect-prompt.md) - Phase 7 leads
- [prompts/developer-prompt.md](references/prompts/developer-prompt.md) - Phase 8 developers
- [prompts/reviewer-prompt.md](references/prompts/reviewer-prompt.md) - Phase 11 reviewers
- [prompts/tester-prompt.md](references/prompts/tester-prompt.md) - Phase 13 testers

## External Sources

| Pattern                         | Source                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Context Compaction              | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents |
| Effort Scaling                  | https://www.anthropic.com/engineering/multi-agent-research-system                 |
| GitHub Flow (branch completion) | https://docs.github.com/en/get-started/using-github/github-flow                   |
| REQUIRED SUB-SKILL pattern      | https://github.com/obra/superpowers                                               |
| Tight Feedback Loop             | https://awesomeclaude.ai/ralph-wiggum                                             |

## Related Skills

- **orchestrating-feature-development** - Similar pattern for feature development
- **orchestrating-integration-development** - Similar pattern for third-party integrations
- **orchestrating-fingerprintx-development** - Specialized pattern for fingerprintx modules
- **persisting-progress-across-sessions** - Cross-session persistence for long-running capabilities
- **developing-with-subagents** - Same-session subagent execution with code review
