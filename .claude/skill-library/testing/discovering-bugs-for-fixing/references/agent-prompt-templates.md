# Agent Prompt Templates

**Complete templates for Explore agent prompts in Stage 2.**

## Overview

Stage 2 spawns Explore agents with bug-focused prompts. This document provides complete templates for different bug types and scenarios.

## Base Template

**Use this as the foundation for all bug investigation prompts:**

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

## Template Variables

| Variable          | Source                   | Example                                                             |
| ----------------- | ------------------------ | ------------------------------------------------------------------- |
| {component_path}  | candidate_locations      | "src/hooks/useUserProfile.ts"                                       |
| {bug_description} | bug-scoping-report.json  | "User profile shows stale data"                                     |
| {symptom_N}       | bug-scoping-report.json  | "Previous user data appears briefly"                                |
| {OUTPUT_DIR}      | persisting-agent-outputs | ".claude/.output/bugs/2026-01-15T10-30-00-user-profile-stale-data/" |

## Bug Type-Specific Templates

### Template A: State Management Bug

**When to use**: Symptoms include stale data, incorrect state, lost updates.

```
You are investigating a STATE MANAGEMENT bug in {component_path}.

BUG: {bug_description}

SYMPTOMS:
- {symptom_1}
- {symptom_2}

STATE-SPECIFIC OBJECTIVES:
1. Find state initialization, updates, and reads
2. Identify where state is derived or computed
3. Look for missing dependencies in useEffect/useMemo
4. Check for stale closures in callbacks
5. Verify state synchronization across components

SCOPE:
- Primary: {component_path}
- Related: State management (Context, Redux, Zustand)
- Related: Components that share this state

OUTPUT FORMAT:
- File: path
- Lines: range
- State flow: [initialization → update → read]
- Relevance: high/medium/low
- Why: 1-sentence explanation

MODE: quick

OUTPUT_DIRECTORY: {OUTPUT_DIR}
MANDATORY SKILLS: persisting-agent-outputs
```

### Template B: Async/Race Condition Bug

**When to use**: Symptoms include intermittent failures, timing-dependent bugs, race conditions.

```
You are investigating an ASYNC/RACE CONDITION bug in {component_path}.

BUG: {bug_description}

SYMPTOMS:
- {symptom_1}
- {symptom_2}

ASYNC-SPECIFIC OBJECTIVES:
1. Find all async operations (Promise, async/await, setTimeout)
2. Identify race conditions between async operations
3. Look for missing await keywords
4. Check for unhandled promise rejections
5. Verify cleanup in useEffect for async operations

SCOPE:
- Primary: {component_path}
- Related: API calls, event handlers, timers
- Related: AbortController usage (or lack thereof)

OUTPUT FORMAT:
- File: path
- Lines: range
- Async flow: [trigger → operation → completion]
- Race risk: high/medium/low
- Why: 1-sentence explanation

MODE: quick

OUTPUT_DIRECTORY: {OUTPUT_DIR}
MANDATORY SKILLS: persisting-agent-outputs
```

### Template C: Error Handling Bug

**When to use**: Symptoms include uncaught errors, silent failures, incorrect error messages.

```
You are investigating an ERROR HANDLING bug in {component_path}.

BUG: {bug_description}

SYMPTOMS:
- {symptom_1}
- {symptom_2}

ERROR-SPECIFIC OBJECTIVES:
1. Find try/catch blocks and error boundaries
2. Identify error propagation paths
3. Look for swallowed errors (empty catch blocks)
4. Check error recovery and fallback logic
5. Verify error messages match actual failures

SCOPE:
- Primary: {component_path}
- Related: Error boundaries, global error handlers
- Related: Logging and monitoring integration

OUTPUT FORMAT:
- File: path
- Lines: range
- Error path: [throw → catch → handle]
- Relevance: high/medium/low
- Why: 1-sentence explanation

MODE: quick

OUTPUT_DIRECTORY: {OUTPUT_DIR}
MANDATORY SKILLS: persisting-agent-outputs
```

### Template D: Rendering Bug

**When to use**: Symptoms include visual glitches, incorrect UI state, flicker, layout issues.

```
You are investigating a RENDERING bug in {component_path}.

BUG: {bug_description}

SYMPTOMS:
- {symptom_1}
- {symptom_2}

RENDERING-SPECIFIC OBJECTIVES:
1. Find render triggers (props, state, context changes)
2. Identify expensive renders (complex JSX, inline functions)
3. Look for key prop issues in lists
4. Check conditional rendering logic
5. Verify memoization (React.memo, useMemo, useCallback)

SCOPE:
- Primary: {component_path}
- Related: Parent and child components
- Related: CSS and styling logic

OUTPUT FORMAT:
- File: path
- Lines: range
- Render flow: [trigger → render → DOM update]
- Relevance: high/medium/low
- Why: 1-sentence explanation

MODE: quick

OUTPUT_DIRECTORY: {OUTPUT_DIR}
MANDATORY SKILLS: persisting-agent-outputs
```

## Prompt Construction Examples

### Example 1: Stale Data in User Profile

**Inputs:**

```json
{
  "component_path": "src/hooks/useUserProfile.ts",
  "bug_description": "User profile shows stale data after navigation",
  "symptoms": [
    "Previous user data appears briefly",
    "Happens after navigation to another user",
    "Refresh fixes the issue"
  ],
  "bug_type": "state_management"
}
```

**Generated Prompt:**

```
You are investigating a STATE MANAGEMENT bug in src/hooks/useUserProfile.ts.

BUG: User profile shows stale data after navigation

SYMPTOMS:
- Previous user data appears briefly
- Happens after navigation to another user
- Refresh fixes the issue

STATE-SPECIFIC OBJECTIVES:
1. Find state initialization, updates, and reads
2. Identify where state is derived or computed
3. Look for missing dependencies in useEffect/useMemo
4. Check for stale closures in callbacks
5. Verify state synchronization across components

SCOPE:
- Primary: src/hooks/useUserProfile.ts
- Related: State management (Context, Redux, Zustand)
- Related: Components that share this state

OUTPUT FORMAT:
- File: path
- Lines: range
- State flow: [initialization → update → read]
- Relevance: high/medium/low
- Why: 1-sentence explanation

MODE: quick

OUTPUT_DIRECTORY: .claude/.output/bugs/2026-01-15T10-30-00-user-profile-stale-data/
MANDATORY SKILLS: persisting-agent-outputs
```

### Example 2: Intermittent API Failure

**Inputs:**

```json
{
  "component_path": "src/api/fetchUserData.ts",
  "bug_description": "User data fetch sometimes fails with no error",
  "symptoms": [
    "API call succeeds most of the time",
    "Occasionally returns undefined",
    "No error thrown or logged"
  ],
  "bug_type": "async_race"
}
```

**Generated Prompt:**

```
You are investigating an ASYNC/RACE CONDITION bug in src/api/fetchUserData.ts.

BUG: User data fetch sometimes fails with no error

SYMPTOMS:
- API call succeeds most of the time
- Occasionally returns undefined
- No error thrown or logged

ASYNC-SPECIFIC OBJECTIVES:
1. Find all async operations (Promise, async/await, setTimeout)
2. Identify race conditions between async operations
3. Look for missing await keywords
4. Check for unhandled promise rejections
5. Verify cleanup in useEffect for async operations

SCOPE:
- Primary: src/api/fetchUserData.ts
- Related: API calls, event handlers, timers
- Related: AbortController usage (or lack thereof)

OUTPUT FORMAT:
- File: path
- Lines: range
- Async flow: [trigger → operation → completion]
- Race risk: high/medium/low
- Why: 1-sentence explanation

MODE: quick

OUTPUT_DIRECTORY: .claude/.output/bugs/2026-01-15T10-35-00-user-data-fetch-intermittent/
MANDATORY SKILLS: persisting-agent-outputs
```

## Prompt Tuning Guidelines

### When to Add Detail

**Add more context if:**

- Bug is complex (multiple interacting systems)
- Symptoms are vague (agent needs more guidance)
- Previous agents found nothing (need to expand scope)

**Example enhancement:**

```
ADDITIONAL CONTEXT:
- This bug started after PR #1234 (refactored auth flow)
- Only affects users with multiple roles
- Only reproducible in production environment
```

### When to Reduce Detail

**Remove detail if:**

- Bug is simple (single function, clear symptoms)
- Too much context slows agent down
- Agent spending time on irrelevant areas

**Example simplification:**

```
OBJECTIVES (simplified):
1. Find where userId is used in cache key
2. Check if cache invalidates on userId change
```

## Related Documentation

- [stage-2-discovery.md](stage-2-discovery.md) - Full Stage 2 workflow
- [output-artifacts.md](output-artifacts.md) - Expected agent outputs
- [error-handling.md](error-handling.md) - Agent timeout and failure handling
