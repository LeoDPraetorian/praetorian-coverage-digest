---
name: discovering-bugs-for-fixing
description: Use when orchestrating-bugfix reaches Phase 1-2 (Bug Scoping and Discovery) - scopes bugs and spawns Explore agents to find candidate locations before handing off to debugger agent
allowed-tools: Read, Bash, Grep, Glob, TodoWrite, Task, AskUserQuestion
---

# Discovering Bugs for Fixing

**Two-stage bug discovery workflow that scopes bugs and spawns Explore agents to find candidate locations.**

## Quick Reference

| Stage | Purpose                                | Output                  | Conditional |
| ----- | -------------------------------------- | ----------------------- | ----------- |
| 1     | Bug scoping, candidate identification  | bug-scoping-report.json | Always      |
| 2     | Parallel discovery with Explore agents | candidate-locations.md  | If agents>0 |

## When to Use

Invoke this skill when:

- orchestrating-bugfix reaches Phase 1 (Bug Scoping)
- Bug location is unknown and needs discovery
- Multiple candidate locations need parallel investigation

**DO NOT use for:**

- Bugs with known locations (skip directly to debugger agent)
- Feature planning (use discovering-codebases-for-planning)
- Security analysis (use codebase-mapping)

## Anti-Rationalization Guards

**Common rationalizations that violate this workflow:**

| Rationalization                         | Why It Fails                                                 | Counter                           |
| --------------------------------------- | ------------------------------------------------------------ | --------------------------------- |
| "Bug location is obvious from symptoms" | Obvious != correct; must verify with Stage 1                 | Always run Stage 1 scoping        |
| "Skip Stage 1, just search directly"    | Misses agent count logic, wastes resources on wrong approach | Stage 1 determines strategy       |
| "Spawn all candidates as agents"        | >5 candidates = too broad, need user to narrow scope         | Follow agent count logic strictly |
| "Skip persisting-agent-outputs"         | Artifacts lost, no handoff to debugger possible              | OUTPUT_DIR is mandatory           |
| "Quick grep is enough"                  | Grep doesn't understand code flow, need agent investigation  | Stage 2 Explore agents required   |
| "No time for two stages"                | Stage 1 is 2-3 min, prevents hours of wrong investigation    | Time investment prevents waste    |

**Not even when:**

- User says "it's urgent" → Still run Stage 1 (takes 2-3 min)
- Bug seems simple → Simple symptoms can have complex root causes
- You found one file with grep → Must verify with agent that it's THE file
- User provides a file path → Still run Stage 1 to confirm and find related code

## Skill Purpose

This skill handles Phase 1-2 of bugfix orchestration: determining what discovery is needed and finding candidate bug locations. It's the bug-focused equivalent of discovering-codebases-for-planning but optimized for debugging rather than feature planning.

**Key differences from feature discovery:**

| Aspect | Feature Discovery          | Bug Discovery                  |
| ------ | -------------------------- | ------------------------------ |
| Goal   | Maximize DRY/reuse         | Find bug-related code          |
| Mode   | very thorough              | quick or medium                |
| Prompt | Patterns, utilities        | Error paths, state flow        |
| Output | Comprehensive discovery.md | Focused candidate-locations.md |

## Two-Stage Process

### Stage 1: Bug Scoping (Orchestrator Executes)

**Input**: Bug description + symptoms from user

**Process**:

1. Parse bug description for keywords (error messages, component names, symptoms)
2. Quick grep for error messages, stack traces, relevant identifiers
3. Identify candidate locations (files/directories that might contain the bug)
4. Determine scope: Is this a 1-file bug or multi-component?
5. Calculate agent count using decision logic

**Agent Count Logic**:

```
IF location already known from symptoms:
    agents = 0  (skip to debugger)
ELIF 1 candidate location:
    agents = 1  (single Explore, quick mode)
ELIF 2-5 candidate locations:
    agents = candidate_count  (parallel, quick mode)
ELIF >5 candidates OR completely unknown:
    agents = 0  (ask user for more context)
```

**Output**: bug-scoping-report.json

```json
{
  "bug_description": "User profile shows stale data",
  "symptoms": ["Previous user data appears briefly", "Happens after navigation"],
  "grep_findings": [
    {
      "pattern": "useUserProfile",
      "files": 3,
      "locations": ["src/hooks/", "src/features/profile/"]
    },
    {
      "pattern": "stale",
      "files": 1,
      "locations": ["src/utils/cache.ts"]
    }
  ],
  "candidate_locations": [
    {
      "path": "src/hooks/useUserProfile.ts",
      "confidence": "high",
      "rationale": "Hook name matches symptom"
    },
    {
      "path": "src/features/profile/ProfilePage.tsx",
      "confidence": "medium",
      "rationale": "Consumes the hook"
    }
  ],
  "strategy": {
    "agent_count": 2,
    "mode": "quick",
    "skip_discovery": false
  }
}
```

### Stage 2: Discovery (Explore Agents) - CONDITIONAL

**Only execute if** agent_count > 0 from Stage 1.

**Agent Prompt Template**:

```
You are investigating a bug in {component_path}.

BUG: {bug_description}
SYMPTOMS: {symptoms}

OBJECTIVES (Bug-Focused):
1. Find code paths that could cause these symptoms
2. Identify state mutations, side effects, async operations
3. Look for error handling (or lack thereof)
4. Find related test files that might be failing
5. Note any TODO/FIXME comments near relevant code

OUTPUT FORMAT (keep brief):
- File: path
- Lines: range
- Relevance: high/medium/low
- Why: 1-sentence explanation

MODE: quick (do not exhaustively catalog - just find bug-relevant code)
```

**Output**: candidate-locations.md (consolidated from all agents)

**For complete Stage 1 workflow details, see:** [references/stage-1-bug-scoping.md](references/stage-1-bug-scoping.md)

**For complete Stage 2 workflow details, see:** [references/stage-2-discovery.md](references/stage-2-discovery.md)

## Integration

### Called By

- orchestrating-bugfix (Phase 1-2)

### Requires (invoke before starting)

| Skill                    | When  | Purpose                            |
| ------------------------ | ----- | ---------------------------------- |
| persisting-agent-outputs | Start | Establish OUTPUT_DIR for artifacts |

### Spawns (during Stage 2)

| Agent   | Mode  | Purpose                            |
| ------- | ----- | ---------------------------------- |
| Explore | quick | Find bug-related code in component |

### Hands Off To

| Agent/Skill    | When          | What                                     |
| -------------- | ------------- | ---------------------------------------- |
| debugger agent | After Stage 2 | candidate-locations.md for investigation |

## Output Artifacts

```
.claude/.output/bugs/{timestamp}-{bug-name}/
├── bug-scoping-report.json   # Stage 1
├── discovery-{component}.md  # Stage 2 (per agent, if any)
└── candidate-locations.md    # Stage 2 (consolidated)
```

**For complete output structure and artifact formats, see:** [references/output-artifacts.md](references/output-artifacts.md)

## Error Handling

| Error                    | Response                                               |
| ------------------------ | ------------------------------------------------------ |
| No candidates found      | Ask user for more context (error message, stack trace) |
| Too many candidates (>5) | Ask user to narrow scope                               |
| Agent timeout            | Mark component incomplete, proceed with available      |
| Grep finds nothing       | Bug may be in dependencies - ask user                  |

**For complete error handling patterns, see:** [references/error-handling.md](references/error-handling.md)

## Workflow Checklist

### Stage 1: Bug Scoping

- [ ] Parsed bug description for keywords
- [ ] Ran grep for error messages/identifiers
- [ ] Identified candidate locations
- [ ] Calculated agent count
- [ ] Generated bug-scoping-report.json

### Stage 2: Discovery (if agents > 0)

- [ ] Spawned N Explore agents in SINGLE message
- [ ] All agents used quick/medium mode (NOT very thorough)
- [ ] All agents received bug-focused prompt
- [ ] Consolidated results into candidate-locations.md

**Use TodoWrite to track these items during execution.**

## Related Skills

| Skill                              | Relationship                                      |
| ---------------------------------- | ------------------------------------------------- |
| discovering-codebases-for-planning | Similar pattern, but for features not bugs        |
| orchestrating-bugfix               | Primary consumer - invokes this in Phase 1-2      |
| debugging-systematically           | Used by debugger agent after this skill completes |
| persisting-agent-outputs           | Establishes OUTPUT_DIR structure                  |

## Progressive Disclosure

This SKILL.md provides the essential workflow. For detailed procedures:

- **Stage 1 Details:** [references/stage-1-bug-scoping.md](references/stage-1-bug-scoping.md)
- **Stage 2 Details:** [references/stage-2-discovery.md](references/stage-2-discovery.md)
- **Output Artifacts:** [references/output-artifacts.md](references/output-artifacts.md)
- **Error Handling:** [references/error-handling.md](references/error-handling.md)
- **Agent Prompts:** [references/agent-prompt-templates.md](references/agent-prompt-templates.md)
