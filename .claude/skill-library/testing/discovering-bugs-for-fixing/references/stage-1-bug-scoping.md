# Stage 1: Bug Scoping

**Orchestrator executes this stage to determine discovery strategy.**

## Overview

Stage 1 analyzes the bug description and symptoms to identify candidate locations and determine how many Explore agents (if any) to spawn for discovery.

## Inputs

| Input           | Source | Format                                    |
| --------------- | ------ | ----------------------------------------- |
| Bug description | User   | Natural language description of the issue |
| Symptoms        | User   | Observable behaviors, error messages      |

## Step-by-Step Process

### Step 1.1: Parse Bug Description

Extract keywords from the bug description:

- **Component names**: "UserProfile", "checkout", "authentication"
- **Error messages**: "Cannot read property", "undefined is not a function"
- **Symptom keywords**: "stale", "flickers", "intermittent", "race condition"
- **Technical terms**: "async", "cache", "state", "render"

**Example:**

```
Bug: "User profile shows stale data after navigation"
Keywords extracted:
- Component: "user profile", "navigation"
- Symptom: "stale data"
- Technical: implied cache or state management issue
```

### Step 1.2: Run Grep Searches

Use Grep tool to find potential bug locations:

```bash
# Search for component/function names
grep -r "useUserProfile" --include="*.ts" --include="*.tsx"

# Search for error messages (if available)
grep -r "Cannot read property 'user'" --include="*.ts" --include="*.tsx"

# Search for symptom keywords
grep -r "stale" --include="*.ts" --include="*.tsx"
```

**Record findings:**

```json
{
  "pattern": "useUserProfile",
  "files": 3,
  "locations": [
    "src/hooks/useUserProfile.ts",
    "src/features/profile/ProfilePage.tsx",
    "src/features/dashboard/UserWidget.tsx"
  ]
}
```

### Step 1.3: Identify Candidate Locations

Analyze grep findings to determine candidate files/directories:

**Confidence scoring:**

- **High**: File name matches symptom, contains error message, or is referenced in stack trace
- **Medium**: File imports/uses related components
- **Low**: File contains keywords but unclear connection

**Example:**

```json
{
  "path": "src/hooks/useUserProfile.ts",
  "confidence": "high",
  "rationale": "Hook name matches symptom, likely handles profile data fetching/caching"
},
{
  "path": "src/features/profile/ProfilePage.tsx",
  "confidence": "medium",
  "rationale": "Consumes the hook, may have state management issues"
},
{
  "path": "src/utils/cache.ts",
  "confidence": "low",
  "rationale": "Contains 'stale' keyword, may be relevant to cache invalidation"
}
```

### Step 1.4: Determine Scope

Classify the bug scope:

- **1-file bug**: Clear single point of failure
- **2-5 component bug**: Limited to a few related files
- **Multi-component**: Crosses multiple features/modules
- **Unknown**: Symptoms too vague to narrow down

### Step 1.5: Calculate Agent Count

Apply decision logic:

```
IF location already known from symptoms (stack trace, error message with line number):
    agents = 0  (skip to debugger with known location)

ELIF 1 candidate location identified:
    agents = 1  (single Explore agent, quick mode)

ELIF 2-5 candidate locations identified:
    agents = candidate_count  (spawn parallel Explore agents, quick mode)

ELIF >5 candidates OR completely unknown:
    agents = 0  (too broad, ask user for more context)
```

**Rationale for limits:**

- **0 agents (known location)**: Debugger can start immediately
- **1 agent**: Clear candidate, quick verification needed
- **2-5 agents**: Parallel investigation efficient
- **0 agents (>5)**: Too broad, need user to narrow scope

## Output: bug-scoping-report.json

**Complete structure:**

```json
{
  "bug_description": "User profile shows stale data after navigation",
  "symptoms": [
    "Previous user data appears briefly when navigating to another user's profile",
    "Happens consistently after initial load",
    "Refresh fixes the issue temporarily"
  ],
  "grep_findings": [
    {
      "pattern": "useUserProfile",
      "files": 3,
      "locations": [
        "src/hooks/useUserProfile.ts",
        "src/features/profile/ProfilePage.tsx",
        "src/features/dashboard/UserWidget.tsx"
      ]
    },
    {
      "pattern": "stale",
      "files": 1,
      "locations": ["src/utils/cache.ts"]
    },
    {
      "pattern": "navigation",
      "files": 8,
      "locations": ["src/routing/", "src/navigation/"]
    }
  ],
  "candidate_locations": [
    {
      "path": "src/hooks/useUserProfile.ts",
      "confidence": "high",
      "rationale": "Hook name matches symptom, likely handles profile data fetching/caching"
    },
    {
      "path": "src/features/profile/ProfilePage.tsx",
      "confidence": "medium",
      "rationale": "Consumes the hook, may have state management issues"
    }
  ],
  "strategy": {
    "agent_count": 2,
    "mode": "quick",
    "skip_discovery": false,
    "rationale": "Two clear candidates identified, parallel investigation will be efficient"
  }
}
```

## Handoff to Stage 2

**If agent_count > 0:**

- Write bug-scoping-report.json to OUTPUT_DIR
- Proceed to Stage 2 (Discovery)
- Pass candidate_locations to Stage 2 for agent spawning

**If agent_count = 0 (known location):**

- Skip Stage 2
- Hand off directly to debugger agent with known file/line

**If agent_count = 0 (too broad):**

- Ask user for more context via AskUserQuestion
- Request: specific error message, stack trace, steps to reproduce
- Re-run Stage 1 with additional information

## Edge Cases

### No Grep Results

**Scenario**: grep finds nothing for any keywords

**Response**:

```
Bug may be in:
- External dependencies (node_modules)
- Dynamic imports
- Runtime-generated code
- Configuration files

Ask user: "Can you provide a stack trace or more specific location information?"
```

### Stack Trace Provided

**Scenario**: User provides stack trace with file:line

**Response**:

```json
{
  "strategy": {
    "agent_count": 0,
    "skip_discovery": true,
    "known_location": "src/hooks/useUserProfile.ts:45"
  }
}
```

Skip to debugger immediately.

### Intermittent Bugs

**Scenario**: Bug description includes "sometimes", "intermittent", "race condition"

**Strategy**:

- Grep for async operations: "async", "Promise", "setTimeout"
- Look for event handlers, timers, network requests
- Increase candidate confidence for async-heavy files

## Related Patterns

- **discovering-codebases-for-planning**: Feature-focused discovery (comprehensive)
- **codebase-mapping**: Security-focused discovery (threat modeling)
- **debugging-systematically**: Debugger agent methodology (post-discovery)
