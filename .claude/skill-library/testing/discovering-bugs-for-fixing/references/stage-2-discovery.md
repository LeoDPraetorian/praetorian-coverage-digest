# Stage 2: Discovery (Explore Agents)

**CONDITIONAL: Only execute if agent_count > 0 from Stage 1.**

## Overview

Stage 2 spawns Explore agents in parallel to investigate candidate locations identified in Stage 1. Each agent receives a bug-focused prompt and searches for code paths that could cause the symptoms.

## Inputs

| Input                   | Source  | Format                        |
| ----------------------- | ------- | ----------------------------- |
| bug-scoping-report.json | Stage 1 | JSON with candidate_locations |
| Bug description         | Stage 1 | String                        |
| Symptoms                | Stage 1 | Array of strings              |

## Agent Spawning Protocol

### Step 2.1: Prepare Agent Prompts

For each candidate location, generate a bug-focused prompt:

```
You are investigating a bug in {component_path}.

BUG: {bug_description}
SYMPTOMS:
- {symptom_1}
- {symptom_2}
- {symptom_3}

OBJECTIVES (Bug-Focused):
1. Find code paths that could cause these symptoms
2. Identify state mutations, side effects, async operations
3. Look for error handling (or lack thereof)
4. Find related test files that might be failing
5. Note any TODO/FIXME comments near relevant code

SCOPE:
Focus on: {component_path} and files it imports/exports

OUTPUT FORMAT (keep brief):
- File: path
- Lines: range (approx)
- Relevance: high/medium/low
- Why: 1-sentence explanation

MODE: quick (do not exhaustively catalog - just find bug-relevant code)

OUTPUT_DIRECTORY: {OUTPUT_DIR}
MANDATORY SKILLS: persisting-agent-outputs (for output files)
```

### Step 2.2: Spawn Agents in Parallel

**CRITICAL: Spawn ALL agents in a SINGLE message using multiple Task tool calls.**

```typescript
// Example: 3 candidates = 3 Task calls in one message
Task({
  subagent_type: "Explore",
  description: "Investigate useUserProfile hook",
  prompt: "[generated prompt for src/hooks/useUserProfile.ts]",
});

Task({
  subagent_type: "Explore",
  description: "Investigate ProfilePage component",
  prompt: "[generated prompt for src/features/profile/ProfilePage.tsx]",
});

Task({
  subagent_type: "Explore",
  description: "Investigate cache utilities",
  prompt: "[generated prompt for src/utils/cache.ts]",
});
```

**Agent Configuration:**

| Parameter         | Value   | Rationale                                   |
| ----------------- | ------- | ------------------------------------------- |
| subagent_type     | Explore | Bug discovery requires codebase exploration |
| thoroughness      | quick   | Bug-focused, not comprehensive DRY search   |
| run_in_background | false   | Need results to consolidate                 |

### Step 2.3: Wait for All Agents

Do not proceed until all agents return. Handle timeouts gracefully.

**Timeout handling:**

```
If agent exceeds timeout (5 minutes):
  - Mark component as "incomplete" in output
  - Proceed with available results
  - Note timeout in candidate-locations.md
```

## Agent Output Processing

### Step 2.4: Read Agent Outputs

Each agent writes to OUTPUT_DIR:

```
.claude/.output/bugs/{timestamp}-{bug-name}/
├── discovery-useUserProfile.md
├── discovery-ProfilePage.md
└── discovery-cache.md
```

Read each file and extract findings.

### Step 2.5: Consolidate Results

Merge all agent findings into candidate-locations.md:

**Format:**

```markdown
# Bug Discovery Results

## Bug Description

{bug_description}

## Symptoms

- {symptom_1}
- {symptom_2}

## Candidate Locations (by confidence)

### High Confidence

#### src/hooks/useUserProfile.ts (lines 34-67)

**Relevance**: High
**Why**: Hook doesn't invalidate query cache on userId change, causing stale data

**Code Path**:

1. useQuery called with userId as key
2. Navigation changes userId prop
3. Query cache not invalidated
4. Previous user's data returned from cache

**Related Files**:

- src/features/profile/ProfilePage.tsx (consumes hook)
- src/utils/queryClient.ts (cache configuration)

**Test Files**:

- tests/hooks/useUserProfile.test.ts (no test for userId change)

### Medium Confidence

#### src/features/profile/ProfilePage.tsx (lines 12-45)

**Relevance**: Medium
**Why**: Component may not properly handle useUserProfile refetch

**Code Path**:

1. useUserProfile called with userId from URL params
2. No explicit refetch on param change
3. Relies on automatic invalidation (which isn't happening per above)

### Low Confidence

#### src/utils/cache.ts (lines 89-102)

**Relevance**: Low
**Why**: Contains 'stale' configuration but doesn't match symptoms

## Recommended Investigation Order

1. Start with: src/hooks/useUserProfile.ts (lines 34-67)
2. Verify in: src/features/profile/ProfilePage.tsx (param change handling)
3. Check tests: tests/hooks/useUserProfile.test.ts (coverage gap)

## Notes

- No obvious error handling issues found
- No TODO/FIXME comments related to this bug
- Similar patterns in src/hooks/useOrgProfile.ts may have same issue
```

### Step 2.6: Write candidate-locations.md

Write consolidated output to OUTPUT_DIR:

```bash
OUTPUT_DIR/.claude/.output/bugs/{timestamp}-{bug-name}/candidate-locations.md
```

## Bug-Focused vs Feature-Focused Discovery

### Differences in Agent Prompts

| Aspect          | Feature Discovery                    | Bug Discovery                          |
| --------------- | ------------------------------------ | -------------------------------------- |
| **Goal**        | Find reusable patterns               | Find bug-causing code                  |
| **Focus**       | Utilities, shared components         | Error paths, state mutations           |
| **Exhaustive?** | Yes (DRY enforcement)                | No (targeted investigation)            |
| **Mode**        | very thorough                        | quick                                  |
| **Output**      | Comprehensive inventory              | Focused candidate list                 |
| **Examples**    | "List all form validation utilities" | "Find code that handles userId change" |

### Agent Objectives Comparison

**Feature Discovery (discovering-codebases-for-planning):**

```
OBJECTIVES:
1. Identify all existing patterns for X
2. Find reusable utilities
3. Document component hierarchy
4. List shared hooks/contexts
5. Catalog test infrastructure
```

**Bug Discovery (this skill):**

```
OBJECTIVES:
1. Find code paths that could cause these symptoms
2. Identify state mutations, side effects, async operations
3. Look for error handling (or lack thereof)
4. Find related test files that might be failing
5. Note any TODO/FIXME comments near relevant code
```

## Handoff to Debugger Agent

### Step 2.7: Prepare Handoff

After consolidating results, hand off to debugger agent:

**Handoff format:**

```
DEBUGGER AGENT INPUT:

Bug: {bug_description}
Symptoms: {symptoms}

Discovery completed. Investigate in order:
1. src/hooks/useUserProfile.ts (lines 34-67) - HIGH confidence
2. src/features/profile/ProfilePage.tsx (lines 12-45) - MEDIUM confidence

See full discovery: {OUTPUT_DIR}/candidate-locations.md

Start with systematic debugging of highest-confidence location.
```

**Debugger agent then invokes:** `debugging-systematically` skill

## Edge Cases

### All Agents Return Low Confidence

**Scenario**: No high-confidence candidates found

**Response**:

```markdown
## Discovery Results: No Clear Candidates

All investigated locations had low confidence matches.

**Recommendation**: Ask user for additional context:

- Can you reproduce the bug with specific steps?
- Is there a stack trace available?
- When did this bug start appearing (recent code changes)?

Consider broader search or dependency investigation.
```

### Agent Timeout

**Scenario**: One or more agents exceed timeout

**Response**:

```markdown
## Incomplete Discovery

**Completed**:

- src/hooks/useUserProfile.ts (HIGH confidence)
- src/features/profile/ProfilePage.tsx (MEDIUM confidence)

**Timed Out**:

- src/utils/cache.ts (exploration incomplete)

**Recommendation**: Proceed with available results. If investigation fails, manually inspect timed-out component.
```

### Conflicting Agent Findings

**Scenario**: Multiple agents identify different root causes

**Response**:

```markdown
## Multiple Possible Root Causes

### Theory A: Cache Invalidation Issue (Agent 1)

[details]

### Theory B: Race Condition in Async Fetch (Agent 2)

[details]

**Recommendation**: Investigate Theory A first (higher confidence), then Theory B if needed.
```

## Performance Considerations

### Agent Count Impact

| Agent Count | Estimated Time | Notes                                   |
| ----------- | -------------- | --------------------------------------- |
| 1           | 2-3 min        | Single Explore, quick mode              |
| 2-5         | 3-5 min        | Parallel execution, slightly slower     |
| >5          | Not allowed    | Stage 1 should ask user to narrow scope |

### Quick Mode Tuning

**Quick mode parameters**:

- Max file reads: 10-15 files
- Max grep searches: 5-10 patterns
- Depth: 2-3 levels from root component

**Rationale**: Bug discovery needs focused investigation, not exhaustive catalog.

## Related Patterns

- **discovering-codebases-for-planning**: Feature-focused (very thorough mode)
- **debugging-systematically**: Debugger agent methodology (post-discovery)
- **persisting-agent-outputs**: OUTPUT_DIR structure
