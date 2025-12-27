# Multi-Agent Orchestration Architecture

This document captures best practices for multi-agent AI systems based on research from Anthropic, industry practitioners, and analysis of the Chariot Development Platform's implementation.

**Last Updated:** 2025-12-25
**Status:** Living document - updated as patterns evolve

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Architecture Overview](#architecture-overview)
- [Core Patterns](#core-patterns)
- [Best Practices from Research](#best-practices-from-research)
- [Current Implementation Assessment](#current-implementation-assessment)
- [Gaps and Recommendations](#gaps-and-recommendations)
- [Skill Connectivity Analysis](#skill-connectivity-analysis)
- [Reference Links](#reference-links)
- [Implementation Todo List](#implementation-todo-list)

---

## Executive Summary

Multi-agent systems using Claude can achieve **90%+ performance improvements** over single-agent approaches when properly orchestrated. The key principles are:

1. **Orchestrator-Worker Pattern** - Lead agents coordinate, specialist agents implement
2. **Fresh Context Per Task** - Each subagent gets isolated context, minimizing pollution
3. **Parallel Execution** - Independent tasks run concurrently in a single message
4. **Structured Handoffs** - JSON schemas enable predictable agent communication
5. **Progress Persistence** - External state files survive context exhaustion
6. **Validation Gates** - Quality checks between phases catch errors early

**Chariot Implementation Score: 8.5/10** - Well-aligned with best practices, with opportunities for improvement in token efficiency, conflict prevention, and validation loops.

---

## Architecture Overview

### Three-Tier Agent System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TIER 1: ORCHESTRATORS                           │
│  Analyze → Decompose → Delegate → Synthesize → Track Progress           │
│                                                                         │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ frontend-orchestrator│    │ backend-orchestrator │                    │
│  │ Tools: Task, Todo,   │    │ Tools: Task, Todo,   │                    │
│  │ Read, Ask, Glob, Grep│    │ Read, Ask, Glob, Grep│                    │
│  └──────────┬──────────┘    └──────────┬──────────┘                     │
└─────────────┼──────────────────────────┼────────────────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         TIER 2: SPECIALISTS                             │
│  Focused expertise with implementation tools                            │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  Architects  │ │  Developers  │ │   Testers    │ │  Reviewers   │   │
│  │ (Design)     │ │ (Implement)  │ │ (Validate)   │ │ (Quality)    │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  Tools: Bash, Edit, Write, Read, Glob, Grep, MultiEdit, TodoWrite       │
└─────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         TIER 3: SKILLS                                  │
│  Reusable behavioral modules loaded on-demand                           │
│                                                                         │
│  Core Skills (~25)           │  Library Skills (~120)                   │
│  .claude/skills/             │  .claude/skill-library/                  │
│  ├── developing-with-tdd     │  ├── frontend/                           │
│  ├── debugging-systematically│  ├── backend/                            │
│  ├── brainstorming           │  ├── testing/                            │
│  └── ...                     │  └── security/                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Execution Flow

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: ANALYSIS                                                      │
│  Orchestrator determines: Architecture? Implementation? Testing?        │
│  Creates TodoWrite items for all phases                                 │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: DECOMPOSITION                                                 │
│  Map dependencies: Sequential vs Parallel vs Hybrid                     │
│  Architecture → Implementation (sequential)                             │
│  Unit ↔ E2E ↔ Integration tests (parallel)                              │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: DELEGATION                                                    │
│  Spawn agents with: Objective + Context + Scope + Expected Output       │
│  Parallel agents in SINGLE message for concurrency                      │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: SYNTHESIS                                                     │
│  Collect agent outputs (structured JSON)                                │
│  Check for conflicts, run validators, integrate changes                 │
└─────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: VERIFICATION                                                  │
│  All tests passing? Build successful? User approves?                    │
│  Update progress file, mark TodoWrite complete                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Patterns

### Pattern 1: Orchestrator-Worker Separation

**Principle:** Orchestrators coordinate; they never implement.

```markdown
# Orchestrator Agent
tools: Task, TodoWrite, Read, Glob, Grep, AskUserQuestion
# Note: NO Write, Edit, Bash - cannot modify code

# Worker Agent
tools: Bash, Edit, Write, Read, Glob, Grep, MultiEdit, TodoWrite
# Has implementation tools
```

**Why This Matters:**
- Prevents orchestrators from "doing it themselves" and bypassing specialists
- Enforces clear responsibility boundaries
- Makes agent behavior predictable

### Pattern 2: Parallel Dispatch

**Principle:** Independent tasks run in a SINGLE message with multiple Task calls.

```typescript
// CORRECT: All three run concurrently
Task("frontend-unit-test-engineer", "Create unit tests for AssetFilter...");
Task("frontend-e2e-test-engineer", "Create E2E tests for asset filtering...");
Task("frontend-integration-test-engineer", "Create MSW integration tests...");

// WRONG: Sequential dispatch wastes time
Task("frontend-unit-test-engineer", "...");
// wait for response
Task("frontend-e2e-test-engineer", "...");
// wait for response
```

**When to Use Parallel:**
- Tasks have no data dependencies
- Agents modify different files
- 3+ independent failures need investigation

**When to Use Sequential:**
- Later task needs earlier task's output
- Agents would modify same files
- Order matters (architecture before implementation)

### Pattern 3: Structured Handoffs

**Principle:** All agents return structured JSON for predictable orchestration.

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "1-2 sentence description",
  "phase": "architecture|implementation|testing",
  "files_modified": ["path/to/file.ts"],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "command_output": "vitest run - 5 passed"
  },
  "handoff": {
    "next_phase": "testing",
    "context": "Key decisions for next phase",
    "recommended_agent": "frontend-unit-test-engineer"
  }
}
```

### Pattern 4: Progress Persistence

**Principle:** External state files survive context exhaustion and session interruptions.

```
.claude/progress/
├── frontend-asset-filtering.md    # Active orchestrations
├── backend-job-processing.md
└── archived/                       # Completed (kept for reference)
    └── frontend-dashboard-2024-01.md

.claude/features/{feature-id}/
├── progress.json                   # Machine-readable state
├── context/                        # Requirements
├── architecture/                   # Design decisions
├── implementation/                 # Agent outputs
└── testing/                        # Test results
```

**Resume Protocol:**
1. Check for existing progress files at session start
2. Read current phase from `progress.json`
3. Create TodoWrite items from pending phases
4. Continue from current phase (don't restart)

### Pattern 5: Human Checkpoints

**Principle:** Get explicit approval before irreversible phases.

```
Phase 1: Brainstorming → CHECKPOINT (User approves design)
Phase 2: Planning      → CHECKPOINT (User approves plan)
Phase 3: Architecture  → Automated (dual-agent validation)
Phase 4: Implementation → Automated
Phase 5: Testing       → CHECKPOINT (User approves final result)
```

### Pattern 6: Dual-Agent Validation

**Principle:** Architect + Reviewer in parallel for architecture phase.

```typescript
// Spawn both in single message
Task("frontend-architect", "Design component architecture for...");
Task("frontend-reviewer", "Review proposed architecture for...");

// Wait for both, then reconcile
// If conflicts: escalate to user
// If aligned: proceed to implementation
```

---

## Best Practices from Research

### From Anthropic's Multi-Agent Research System

| Practice | Detail |
|----------|--------|
| **Token Usage = 80% of Performance** | Optimize context, use progressive disclosure |
| **Orchestrator-Worker Outperforms by 90%** | Opus orchestrator + Sonnet workers optimal |
| **Think Like Your Agents** | Simulate agent behavior before deploying |
| **Scale Effort to Complexity** | Simple queries don't need multi-agent |
| **Parallel Tool Calling** | Fire multiple operations simultaneously |
| **Enable Self-Improvement** | Agents should iterate on their own output |

### From Context Engineering Research

| Practice | Detail |
|----------|--------|
| **Minimize Shared Context** | Fresh sub-agents for discrete tasks |
| **Keep Toolsets Small** | ~20 core tools per agent, not 100+ |
| **Context Compaction** | Summarize when approaching limits |
| **Treat Agents as Tools** | Structured schemas, deterministic outputs |
| **Pre-Rot Thresholds** | Clean context before degradation |

### From Claude 4.5 Best Practices

| Practice | Detail |
|----------|--------|
| **Be Explicit** | Claude 4.5 follows instructions precisely |
| **Dial Back Aggressive Language** | "Use this tool when..." not "MUST use..." |
| **Long-Horizon State Tracking** | Progress files, git for state |
| **Multi-Context Workflows** | Write tests first, structured todo files |
| **Parallel Tool Calls in Single Message** | Maximize concurrency |

### From Security Research

| Vulnerability | Mitigation |
|---------------|------------|
| **Orchestration Exploitation** | Validate agent outputs, scope boundaries |
| **Authorization Hijacking** | Least-privilege tool access |
| **Goal Manipulation** | Clear, explicit instructions |
| **Supply Chain Attacks** | Audit skill/agent dependencies |

---

## Current Implementation Assessment

### What We're Doing Right (Score: 8.5/10)

| Practice | Implementation | Score |
|----------|----------------|-------|
| **Orchestrator-Worker Pattern** | Orchestrators have no Write/Edit tools | 10/10 |
| **Parallel Execution** | `dispatching-parallel-agents` skill | 10/10 |
| **Progress Persistence** | progress.json with full resume protocol | 10/10 |
| **Structured Handoffs** | Standard JSON format across all agents | 9/10 |
| **Narrow Agent Scope** | 6-8 tools per agent, role-appropriate | 9/10 |
| **Human Checkpoints** | After brainstorm/planning phases | 9/10 |
| **TodoWrite Tracking** | Mandatory, emphasized in all skills | 10/10 |
| **Escalation Protocols** | Specific triggers defined | 9/10 |
| **Dual-Agent Architecture** | Architect + Reviewer in parallel | 10/10 |
| **Domain-Specific Orchestrators** | Frontend vs Backend separation | 9/10 |

### Key Implementation Files

| Component | Location | Purpose |
|-----------|----------|---------|
| Frontend Orchestrator | `.claude/agents/orchestrator/frontend-orchestrator.md` | Coordinates React/TS work |
| Backend Orchestrator | `.claude/agents/orchestrator/backend-orchestrator.md` | Coordinates Go/AWS work |
| Feature Development | `.claude/skills/orchestrating-feature-development/SKILL.md` | 5-phase workflow |
| Multi-Agent Workflows | `.claude/skills/orchestrating-multi-agent-workflows/SKILL.md` | General patterns |
| Progress Persistence | `.claude/skills/persisting-progress-across-sessions/SKILL.md` | State management |
| Parallel Dispatch | `.claude/skills/dispatching-parallel-agents/SKILL.md` | Concurrent execution |
| Feature Command | `.claude/commands/feature.md` | User entry point |
| Einstein Pipeline | `.claude/commands/feature-complete.md` | 14-phase pipeline |

---

## Gaps and Recommendations

### Gap 1: Token Efficiency / Context Compaction

**Current State:** Progressive disclosure for skills, but no explicit context compaction for long orchestrations.

**Best Practice:** "Token usage accounts for 80% of performance variance." (Anthropic Research)

**Recommendation:** Add context compaction protocol to `persisting-progress-across-sessions`:

```markdown
## Context Compaction Protocol

When approaching token limits (conversation > 50 messages):

1. **Summarize completed phase outputs**
   - Replace full JSON with 2-3 line summary
   - Archive full output to progress file

2. **Keep only active context**
   - Current phase details
   - Immediate prior phase decisions
   - Key file paths

3. **Use file references**
   - "See .claude/features/{id}/arch-decisions.md"
   - NOT inline content

4. **Compaction triggers**
   - After every 3 completed phases
   - When agent output exceeds 1000 tokens
   - Before spawning new agents
```

### Gap 2: Proactive Conflict Prevention

**Current State:** Conflict detection is reactive (after parallel agents return).

**Best Practice:** "File locking mechanisms... dependency graph analysis to prevent simultaneous modifications." (Dev.to)

**Recommendation:** Add conflict prevention to delegation protocol:

```markdown
## Proactive Conflict Prevention

Before spawning parallel agents:

1. **Identify file boundaries**
   - Ask each agent: "Which files will you modify?"
   - OR: Specify in prompt: "Only modify files in {directory}"

2. **Check for overlap**
   - If agents may edit same files → make sequential
   - If disjoint file sets → safe to parallelize

3. **Scope boundaries in prompts**
   \`\`\`markdown
   Scope: Only modify files in src/components/filters/
   Do NOT edit: src/components/shared/, src/hooks/
   If you need changes outside scope, return blocked status.
   \`\`\`

4. **Lock file pattern (optional)**
   - Create .claude/locks/{agent-name}.lock with file list
   - Check for conflicts before spawning
   - Remove lock when agent completes
```

### Gap 3: Explicit Validation Loops

**Current State:** Verification exists but "loop until passing" isn't enforced.

**Best Practice:** "Run validator → fix errors → repeat. This pattern greatly improves output quality." (Skills Best Practices)

**Recommendation:** Add validation loop to phase transitions:

```markdown
## Validation Loop Protocol

Each phase MUST use validation loop (max 3 iterations):

1. **Agent executes task**
2. **Run phase validators**
3. **If validators fail:**
   - Return failure details to agent
   - Agent fixes issues
   - Re-run validators
   - Increment iteration count
4. **If 3 iterations exhausted:**
   - Escalate to user with full context
5. **Only proceed when validators pass**

### Phase-Specific Validators

| Phase | Validators | Pass Criteria |
|-------|------------|---------------|
| Architecture | Peer review (reviewer agent) | status: "approved" |
| Implementation | `npm run build`, `npm run lint` | Exit code 0 |
| Unit Tests | `vitest run --reporter=json` | All tests pass |
| E2E Tests | `playwright test --reporter=json` | All tests pass |
| Security | Security reviewer agent | No critical findings |
```

### Gap 4: Mandatory Security Gate

**Current State:** Security reviewers exist but aren't mandatory.

**Best Practice:** Top vulnerabilities include "Orchestration Exploitation" and "Authorization Hijacking." (XenonStack)

**Recommendation:** Add security gate for high-risk features:

```markdown
## Security Gate (Mandatory for Sensitive Features)

### Trigger Detection

Before testing phase, check if feature handles:
- [ ] Authentication / authorization
- [ ] User input (forms, file uploads)
- [ ] Sensitive data (PII, credentials, API keys)
- [ ] External API calls
- [ ] Database queries with user data

### If ANY trigger matches:

1. **Spawn security reviewer BEFORE testing**
   \`\`\`typescript
   Task("frontend-security-reviewer", "Review {feature} for OWASP vulnerabilities");
   // OR
   Task("backend-security-reviewer", "Review {feature} for injection, auth bypass");
   \`\`\`

2. **Gate requirement**
   - Must return status: "approved" or "approved_with_notes"
   - If "blocked": Fix issues before proceeding
   - If "critical_findings": Escalate to user immediately

3. **Document in progress file**
   - Security review date
   - Reviewer agent
   - Findings and resolutions
```

### Gap 5: Agent Output Schema Validation

**Current State:** JSON handoff format is documented but not enforced.

**Best Practice:** "Treat agents as tools with structured schemas." (Context Engineering)

**Recommendation:** Create TypeScript interfaces and validation:

```typescript
// .claude/types/agent-outputs.ts

export interface AgentOutput {
  status: 'complete' | 'blocked' | 'needs_review';
  summary: string;
  phase?: 'architecture' | 'implementation' | 'testing' | 'review';
  files_modified: string[];
  verification?: {
    tests_passed: boolean;
    build_success: boolean;
    command_output?: string;
  };
  handoff?: {
    next_phase: string;
    context: string;
    recommended_agent?: string;
  };
  error?: {
    type: string;
    message: string;
    recoverable: boolean;
  };
}

// Validation function for orchestrators
export function validateAgentOutput(output: unknown): AgentOutput {
  // Validate required fields
  // Throw descriptive error if invalid
  // Return typed output if valid
}
```

### Gap 6: Metrics and Observability

**Current State:** No explicit metrics collection for agent performance.

**Best Practice:** "Token usage accounts for 80% of performance variance." (Anthropic Research)

**Recommendation:** Add metrics to progress files:

```markdown
## Orchestration Metrics

Track in progress.json:

\`\`\`json
{
  "metrics": {
    "total_agents_spawned": 7,
    "parallel_executions": 2,
    "sequential_executions": 5,
    "validation_loop_iterations": {
      "implementation": 2,
      "testing": 1
    },
    "phase_durations": {
      "architecture": "3m 24s",
      "implementation": "12m 48s",
      "testing": "8m 12s"
    },
    "escalations": 1,
    "conflicts_detected": 0,
    "conflicts_resolved": 0
  }
}
\`\`\`

Use metrics for:
- Identifying slow phases
- Optimizing parallelization opportunities
- Tracking validation loop efficiency
- Measuring conflict rate
```

---

## Skill Connectivity Analysis

This section analyzes how skills are connected to the `/feature` workflow and identifies orphaned skills that should be integrated.

### The Fundamental Problem

```
┌─────────────────────────────────────────────────────────────────────┐
│  /feature orchestration                                             │
│                                                                     │
│  Phase 1 ─→ skill: "brainstorming"  ✅ ENFORCED                     │
│  Phase 2 ─→ skill: "writing-plans"  ✅ ENFORCED                     │
│  Phase 3 ─→ Task(frontend-architect) ⚠️ HOPE agent uses skills     │
│  Phase 4 ─→ Task(frontend-developer) ⚠️ HOPE agent uses skills     │
│  Phase 5 ─→ Task(test-engineers)     ⚠️ HOPE agent uses skills     │
│                                                                     │
│  ❌ No Phase 6: Code Review                                         │
│  ❌ No Phase 7: Security Review (for sensitive features)            │
│  ❌ No Phase 8: PR/Branch Completion                                │
└─────────────────────────────────────────────────────────────────────┘

Agent skills: field makes skills DISCOVERABLE (0 token cost)
But agents must CHOOSE to invoke them - nothing enforces it
```

### Skills Inventory

| Category | Total Skills | Connected to /feature | Gap |
|----------|-------------|----------------------|-----|
| Core Skills | 35 | 2 explicitly, ~15 via agents | 18 orphaned |
| Testing Library | 18 | 0 directly | 18 orphaned |
| Security Library | 13 | 0 directly | 13 orphaned |
| Workflow Library | 7 | 0 directly | 7 orphaned |
| Quality Library | 2 | 0 directly | 2 orphaned |
| Frontend Library | ~25 | ~10 via gateway | 15 orphaned |
| Backend Library | ~15 | ~8 via gateway | 7 orphaned |
| **Total** | **~155** | **~27 connected** | **~60% orphaned** |

### What's Actually Connected to /feature

#### Explicitly Called by Orchestration

| Phase | Skills Actually Invoked | Method |
|-------|------------------------|--------|
| Phase 1 | `brainstorming` | `skill: "brainstorming"` |
| Phase 2 | `writing-plans` | `skill: "writing-plans"` |
| Phase 3 | None directly | Agents spawned, expected to self-invoke |
| Phase 4 | None directly | Agents spawned, expected to self-invoke |
| Phase 5 | None directly | Agents spawned, expected to self-invoke |

#### Agent Skills Fields (Available, Not Enforced)

```yaml
# Orchestrators
frontend-orchestrator: orchestrating-multi-agent-workflows, persisting-progress-across-sessions,
                       dispatching-parallel-agents, gateway-frontend

# Developers
frontend-developer: adhering-to-dry, adhering-to-yagni, calibrating-time-estimates,
                    debugging-systematically, developing-with-tdd, gateway-frontend,
                    using-todowrite, verifying-before-completion

# Test Engineers
frontend-unit-test-engineer: calibrating-time-estimates, debugging-systematically,
                             developing-with-tdd, gateway-frontend, gateway-testing,
                             testing-anti-patterns, verifying-before-completion
```

### Orphaned Skills by Category

#### 1. Workflow Skills (Completely Disconnected)

These skills exist but have **zero connection** to `/feature`:

| Skill | Purpose | Should Be Used In |
|-------|---------|-------------------|
| `code-review-checklist` | Comprehensive review checklist | After Phase 5 (new Phase 6) |
| `finishing-a-development-branch` | Branch cleanup, PR prep | After all phases complete |
| `requesting-code-review` | PR creation best practices | Feature completion |
| `receiving-code-review` | Handling review feedback | When human reviews |
| `github-workflow-automation` | PR/issue automation | Feature completion |
| `using-git-worktrees` | Parallel development | Before starting feature |

**Impact**: Features complete without proper PR workflow, code review, or branch hygiene.

#### 2. Security Skills (Available via Gateway, Never Mandated)

Accessible through `gateway-security` but **never triggered** by `/feature`:

| Skill | Purpose | Should Be Used In |
|-------|---------|-------------------|
| `authorization-testing` | Test access controls | Phase 5 for auth features |
| `secret-scanner` | Find hardcoded secrets | Before any commit |
| `defense-in-depth` | Security architecture | Phase 3 Architecture |
| `business-context-discovery` | Threat modeling Phase 0 | Phase 1 for security features |
| `threat-modeling` | STRIDE analysis | Phase 3 for security features |
| `security-test-planning` | Security test generation | Phase 5 for security features |

**Impact**: Security features can complete without any security review or testing.

#### 3. Testing Skills (Exist but Not Mandated)

| Skill | Purpose | Should Be Used In |
|-------|---------|-------------------|
| `test-infrastructure-discovery` | Find existing test utilities | BEFORE spawning test engineers |
| `verifying-test-file-existence` | Verify files exist before testing | BEFORE test engineers |
| `behavior-vs-implementation-testing` | Test behaviors, not implementations | Mandatory for all test engineers |
| `testing-anti-patterns` | Avoid common test mistakes | Mandatory for all test engineers |
| `test-metrics-reality-check` | Verify coverage is real | AFTER testing phase |

**Impact**: Test engineers may create tests for non-existent files or report fake coverage.

#### 4. Quality Skills (Only in UI/UX Designer)

| Skill | Purpose | Should Be Used In |
|-------|---------|-------------------|
| `adhering-to-uiux-laws` | UX laws (Fitts, Hick's, etc.) | Phase 4 for UI features |
| `analyzing-cyclomatic-complexity` | Code complexity analysis | Phase 5 or Code Review phase |

**Impact**: UI features ship without UX validation; complex code isn't flagged.

#### 5. Core Skills Listed But Not Enforced

These are in agent `skills:` fields but agents don't reliably invoke them:

| Skill | Listed In | Problem |
|-------|-----------|---------|
| `developing-with-tdd` | All developers | Agents skip TDD under pressure |
| `calibrating-time-estimates` | All agents | Never actually invoked |
| `verifying-before-completion` | All agents | Agents claim complete without verification |
| `adhering-to-dry` | Developers | Not checked |
| `adhering-to-yagni` | Developers | Not checked |

### Recommended Fixes for Skill Connectivity

#### Fix 1: Add Missing Phases to /feature

```markdown
## Phase 6: Code Review (NEW)
Tool: Task(subagent_type: "*-reviewer")
Skills enforced: code-review-checklist, analyzing-cyclomatic-complexity
Exit: Review approved OR issues resolved

## Phase 7: Security Review (CONDITIONAL - NEW)
Trigger: Feature handles auth, user input, secrets, or external APIs
Tool: Task(subagent_type: "*-security-reviewer")
Skills enforced: authorization-testing, secret-scanner, defense-in-depth
Exit: Security approved

## Phase 8: Completion (NEW)
Tool: Skill("finishing-a-development-branch")
Skills enforced: github-workflow-automation, requesting-code-review
Exit: PR created
```

#### Fix 2: Enforce Pre-Conditions Before Spawning Agents

```markdown
# Before spawning test engineers (Phase 5), orchestrator must:
Read(".claude/skill-library/testing/test-infrastructure-discovery/SKILL.md")
Read(".claude/skill-library/testing/verifying-test-file-existence/SKILL.md")

# Include discovered infrastructure in test engineer prompts
```

#### Fix 3: Add Skill Verification to Agent Handoffs

```json
{
  "status": "complete",
  "skills_invoked": [
    "developing-with-tdd",
    "verifying-before-completion"
  ],
  "skills_skipped": [],
  "skills_skipped_reason": "N/A"
}
```

#### Fix 4: Create Skill Enforcement Layer

```markdown
## Agent Output Validation (Add to orchestrating-multi-agent-workflows)

After agent returns, validate:
1. Did agent report skills_invoked in handoff?
2. Are mandatory skills present?
3. If missing, re-spawn with explicit instruction

Mandatory skills by agent type:
| Agent Type | Required Skills |
|------------|-----------------|
| Developers | developing-with-tdd, verifying-before-completion |
| Test Engineers | testing-anti-patterns, verifying-before-completion |
| Reviewers | code-review-checklist |
| Security | authorization-testing, secret-scanner |
```

#### Fix 5: Add Conditional Security Gate

```markdown
## Security Gate Trigger Detection

Before Phase 5 (Testing), check if feature handles:
- [ ] Authentication / authorization
- [ ] User input (forms, file uploads)
- [ ] Sensitive data (PII, credentials, API keys)
- [ ] External API calls
- [ ] Database queries with user data

If ANY checked → Spawn security reviewer before proceeding
```

### Quick Wins (Immediate Implementation)

1. **Add `test-infrastructure-discovery` to Phase 5 preconditions** (30 min)
2. **Add `code-review-checklist` as Phase 6** (1 hour)
3. **Add `secret-scanner` to completion workflow** (30 min)
4. **Add `finishing-a-development-branch` at end** (30 min)
5. **Add skills_invoked to handoff schema** (1 hour)

---

## Reference Links

### Agents (Architecture, Sub-Agents, Multi-Agent Orchestration)

| Resource | Key Insight |
|----------|-------------|
| [Claude Code Sub-Agents](https://code.claude.com/docs/en/sub-agents) | Official documentation on subagent architecture |
| [InfoQ: Claude Code Subagents](https://www.infoq.com/news/2025/08/claude-code-subagents/) | Subagents with isolated contexts, least-privilege tools |
| [Anthropic: Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system) | 90% improvement with orchestrator-worker pattern |
| [Dev.to: 10 Claude Instances in Parallel](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) | File locking, validation gates, ROI analysis |
| [Multi-Agents vs Tool Groups](https://offnote.substack.com/p/multi-agents-vs-tool-groups-a-layered) | Agent = Toolgroup + Routers |

### Prompt Engineering & Context Management

| Resource | Key Insight |
|----------|-------------|
| [Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices) | Be explicit, parallel tool calls, avoid aggressive language |
| [Todo Tracking in Agent SDK](https://platform.claude.com/docs/en/agent-sdk/todo-tracking) | Three-state todo lifecycle |
| [Context Engineering Part 2](https://www.philschmid.de/context-engineering-part-2) | Token usage = 80% of performance, ~20 tools per agent |
| [Context Engineering Strategies](https://www.theaiautomators.com/context-engineering-strategies-to-build-better-ai-agents/) | 9 strategies: memory, RAG, summarization, isolation |
| [Efficient Context & Parallelism](https://www.agalanov.com/notes/efficient-claude-code-context-parallelism-sub-agents/) | Git worktree + separate Claude sessions |

### Skills & MCP

| Resource | Key Insight |
|----------|-------------|
| [Skills Explained](https://www.claude.com/blog/skills-explained) | Progressive disclosure, Skills vs MCP vs Prompts |
| [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | <500 lines, concise, feedback loops |
| [Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) | Prompt-based meta-tool architecture |
| [Simon Willison: Claude Skills](https://simonwillison.net/2025/Oct/16/claude-skills/) | Token efficiency, universal compatibility |
| [Superpowers Repository](https://github.com/obra/superpowers) | 7-phase workflow, TDD, skill testing |
| [Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) | 98.7% token reduction with code execution |

### Claude 4.5 Model Updates

| Resource | Key Insight |
|----------|-------------|
| [Claude Opus 4.5](https://www.anthropic.com/news/claude-opus-4-5) | Best for coding/agents, effort parameter |
| [Claude Sonnet 4.5](https://www.anthropic.com/news/claude-sonnet-4-5) | Best coding model, context awareness |
| [What's New in Claude 4.5](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-5) | Programmatic tool calling, memory tool, context editing |
| [Opus 4.5 Migration Snippets](https://github.com/anthropics/claude-code/blob/main/plugins/claude-opus-4-5-migration/skills/claude-opus-4-5-migration/references/prompt-snippets.md) | Over-triggering fixes, over-engineering prevention |

### Security

| Resource | Key Insight |
|----------|-------------|
| [Top 10 AI Agent Vulnerabilities](https://www.xenonstack.com/blog/vulnerabilities-in-ai-agents) | Orchestration exploitation, authorization hijacking |
| [Agentic AI Security](https://securityboulevard.com/2025/07/emerging-agentic-ai-security-vulnerabilities-expose-enterprise-systems-to-widespread-identity-based-attacks/) | IdentityMesh vulnerability, MCP risks |

### Agent SDK

| Resource | Key Insight |
|----------|-------------|
| [Building Agents with SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) | Gather → Act → Verify → Repeat loop |
| [SDK Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) | Claude Code SDK → Claude Agent SDK |

---

## Implementation Todo List

### Priority 0: Skill Connectivity Quick Wins (Immediate)

- [ ] **Add `test-infrastructure-discovery` to Phase 5 preconditions**
  - Location: `.claude/skills/orchestrating-feature-development/references/phase-5-testing.md`
  - Add: Read skill before spawning test engineers, include in prompts
  - Effort: 30 minutes

- [ ] **Add `code-review-checklist` as Phase 6**
  - Location: `.claude/skills/orchestrating-feature-development/SKILL.md`
  - Add: New phase after testing, spawn reviewer agents
  - Effort: 1 hour

- [ ] **Add `secret-scanner` to completion workflow**
  - Location: `.claude/skills/orchestrating-feature-development/references/` (new phase-8-completion.md)
  - Add: Run secret scanner before any commit/PR
  - Effort: 30 minutes

- [ ] **Add `finishing-a-development-branch` at workflow end**
  - Location: `.claude/skills/orchestrating-feature-development/SKILL.md`
  - Add: Phase 8 that invokes branch completion skill
  - Effort: 30 minutes

- [ ] **Add `skills_invoked` to agent handoff schema**
  - Location: `.claude/skills/orchestrating-multi-agent-workflows/SKILL.md`
  - Add: Required field in handoff JSON, validation logic
  - Effort: 1 hour

### Priority 1: High Impact, Low Effort

- [ ] **Add context compaction protocol** to `persisting-progress-across-sessions` skill
  - Location: `.claude/skills/persisting-progress-across-sessions/SKILL.md`
  - Add: Compaction triggers, summarization rules, file reference patterns
  - Effort: 1-2 hours

- [ ] **Add file scope boundaries** to agent delegation prompts
  - Location: `.claude/skills/orchestrating-multi-agent-workflows/SKILL.md`
  - Add: Scope template, overlap detection checklist
  - Effort: 1 hour

- [ ] **Document validation loop protocol** in orchestration skills
  - Location: `.claude/skills/orchestrating-feature-development/SKILL.md`
  - Add: Max iterations, phase-specific validators, escalation triggers
  - Effort: 1-2 hours

- [ ] **Create skill enforcement layer for agents**
  - Location: `.claude/skills/orchestrating-multi-agent-workflows/SKILL.md`
  - Add: Mandatory skills by agent type, validation after agent returns
  - Effort: 2 hours

### Priority 2: Medium Impact, Medium Effort

- [ ] **Create mandatory security gate** for sensitive features
  - Location: New file or add to `orchestrating-feature-development`
  - Add: Trigger detection (auth, user input, secrets, external APIs), reviewer spawn
  - Effort: 2-3 hours

- [ ] **Add metrics tracking** to progress files
  - Location: `.claude/skills/persisting-progress-across-sessions/references/`
  - Add: Metrics schema, collection points, analysis guidance
  - Effort: 2 hours

- [ ] **Create agent output TypeScript interfaces**
  - Location: `.claude/types/agent-outputs.ts` (new)
  - Add: AgentOutput interface with skills_invoked, validation function
  - Effort: 2 hours

- [ ] **Connect workflow skills to /feature completion**
  - Location: `.claude/skills/orchestrating-feature-development/SKILL.md`
  - Add: `requesting-code-review`, `github-workflow-automation` integration
  - Effort: 2 hours

- [ ] **Add UX validation for UI features**
  - Location: `.claude/skills/orchestrating-feature-development/references/phase-4-implementation.md`
  - Add: Conditional `adhering-to-uiux-laws` check for frontend features
  - Effort: 1 hour

### Priority 3: Lower Priority, Higher Effort

- [ ] **Implement file locking mechanism** for parallel agents
  - Location: New skill or script
  - Add: Lock creation, conflict detection, automatic cleanup
  - Effort: 4-6 hours

- [ ] **Create orchestration dashboard/visualization**
  - Location: New tool or documentation
  - Add: Phase progress, agent status, metrics display
  - Effort: 8+ hours

- [ ] **Add automated conflict detection** between agent outputs
  - Location: Integration with orchestration skills
  - Add: File diff analysis, semantic conflict detection
  - Effort: 6-8 hours

- [ ] **Integrate threat modeling for security-sensitive features**
  - Location: `.claude/skills/orchestrating-feature-development/SKILL.md`
  - Add: Conditional Phase 0.5 for features touching auth/data/APIs
  - Skills: `business-context-discovery`, `threat-modeling`, `security-test-planning`
  - Effort: 4-6 hours

- [ ] **Add complexity analysis to code review phase**
  - Location: Phase 6 (Code Review)
  - Add: `analyzing-cyclomatic-complexity` skill invocation
  - Effort: 1 hour

### Continuous Improvement

- [ ] **Review and update this document** quarterly
  - Check for new Anthropic best practices
  - Incorporate lessons learned from orchestrations
  - Update reference links

- [ ] **Collect orchestration metrics** over 10+ features
  - Identify patterns in phase durations
  - Measure validation loop efficiency
  - Track parallelization opportunities

- [ ] **Test edge cases** in multi-agent coordination
  - Simulate context exhaustion mid-orchestration
  - Test resume from various phases
  - Validate conflict handling

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-25 | Added Skill Connectivity Analysis section with orphaned skills inventory | Claude |
| 2025-12-25 | Added Priority 0 quick wins for skill connectivity fixes | Claude |
| 2025-12-25 | Expanded todo list with skill enforcement and workflow integration items | Claude |
| 2025-12-25 | Initial document creation with best practices from 32 web resources | Claude |

---

## Contributing

To update this document:

1. Review latest Anthropic documentation and research
2. Analyze recent orchestration outcomes in `.claude/progress/`
3. Update relevant sections with new learnings
4. Add new reference links with key insights
5. Update changelog

For questions or suggestions, discuss with the team before making significant changes to architectural patterns.
