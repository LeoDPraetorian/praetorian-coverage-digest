# Phase 2: Discovery

**Parallel reuse discovery using native Explore agents (very thorough mode).**

## Overview

The Discovery phase executes AFTER Brainstorming (Phase 1) and BEFORE Planning (Phase 3). It spawns parallel `Explore` agents (native Claude Code agent) to exhaustively search the codebase for reusable patterns, preventing the #1 implementation failure: creating new code when reusable code exists.

**Why this phase exists:**

Without discovery, developers default to special-casing:

```go
// What happens without discovery
func handleRequest(req Request) {
    if req.IsNewFeature {  // Special-case added
        doNewThing()
    }
    // Original code surrounded by conditionals
}
```

Discovery ensures developers and leads know what patterns exist BEFORE making design decisions.

## Quick Reference

| Aspect         | Details                                                         |
| -------------- | --------------------------------------------------------------- |
| **Execution**  | PARALLEL - frontend + backend Explore agents run simultaneously |
| **Agents**     | 2 × Explore (native Claude Code agent)                          |
| **Mode**       | **very thorough** (always)                                      |
| **Input**      | design.md from Phase 1 (Brainstorming)                          |
| **Output**     | frontend-discovery.md, backend-discovery.md                     |
| **Checkpoint** | NONE - feeds directly into Planning and Architecture            |
| **Objective**  | Find reusable code; report what CAN BE EXTENDED vs must create  |

## Agent Spawning

**CRITICAL: Spawn BOTH agents in a SINGLE Task message for parallel execution.**

### Frontend Discovery Prompt

```
Task(subagent_type: "Explore", description: "Frontend reuse discovery")
```

**Prompt:**

```markdown
Perform a VERY THOROUGH reuse discovery analysis for the frontend codebase.

FEATURE CONTEXT:
[Paste design.md summary here]

SEARCH OBJECTIVES:

1. Find ALL existing components that could be extended for this feature
2. Find ALL existing hooks, utilities, and helpers that apply
3. Find ALL existing patterns (state management, API calls, error handling) we must follow
4. Identify the exact files where new code should be placed based on existing structure

OUTPUT REQUIREMENTS - Structure your response as:

## Reusable Components

| Component | Location | Can Extend? | Extension Point |
| --------- | -------- | ----------- | --------------- |
| ...       | ...      | Yes/No      | What to modify  |

## Reusable Utilities

| Utility | Location | Usage Pattern |
| ------- | -------- | ------------- |
| ...     | ...      | How to use it |

## Patterns to Follow

| Pattern | Example Location | Must Follow? |
| ------- | ---------------- | ------------ |
| ...     | ...              | Yes/No       |

## Recommended File Placement

| New Code Type | Suggested Location | Rationale |
| ------------- | ------------------ | --------- |
| ...           | ...                | Why here  |

## Anti-Pattern Warnings

List any existing code that does something similar that we MUST NOT duplicate.

## Summary

- **Reuse Percentage:** X%
- **Files to Extend:** N
- **Files to Create:** M

CRITICAL: Do NOT just list what exists. For each finding, explicitly state whether it CAN BE EXTENDED for this feature and HOW.

OUTPUT_FILE: {feature_dir}/frontend-discovery.md
```

**Path:** `modules/chariot/ui` (or relevant frontend path)

### Backend Discovery Prompt

```
Task(subagent_type: "Explore", description: "Backend reuse discovery")
```

**Prompt:**

```markdown
Perform a VERY THOROUGH reuse discovery analysis for the backend codebase.

FEATURE CONTEXT:
[Paste design.md summary here]

SEARCH OBJECTIVES:

1. Find ALL existing handlers, services, or packages that could be extended
2. Find ALL existing utilities, helpers, and shared code that apply
3. Find ALL existing patterns (error handling, validation, DB access) we must follow
4. Identify the exact packages where new code should be placed based on existing structure

OUTPUT REQUIREMENTS - Structure your response as:

## Reusable Packages/Services

| Package | Location | Can Extend? | Extension Point |
| ------- | -------- | ----------- | --------------- |
| ...     | ...      | Yes/No      | What to modify  |

## Reusable Utilities

| Utility | Location | Usage Pattern |
| ------- | -------- | ------------- |
| ...     | ...      | How to use it |

## Patterns to Follow

| Pattern | Example Location | Must Follow? |
| ------- | ---------------- | ------------ |
| ...     | ...              | Yes/No       |

## Recommended File Placement

| New Code Type | Suggested Location | Rationale |
| ------------- | ------------------ | --------- |
| ...           | ...                | Why here  |

## Anti-Pattern Warnings

List any existing code that does something similar that we MUST NOT duplicate.

## Summary

- **Reuse Percentage:** X%
- **Files to Extend:** N
- **Files to Create:** M

CRITICAL: Do NOT just list what exists. For each finding, explicitly state whether it CAN BE EXTENDED for this feature and HOW.

OUTPUT_FILE: {feature_dir}/backend-discovery.md
```

**Path:** `modules/chariot/backend` (or relevant backend path)

## Why "Very Thorough" Mode

The Explore agent supports three thoroughness levels: `quick`, `medium`, `very thorough`.

**Always use `very thorough` for Discovery because:**

1. **Context window efficiency** - Explore manages its own context, so thoroughness doesn't impact orchestrator
2. **Prevent false negatives** - Missing reusable code leads to duplication
3. **One-time cost** - Discovery runs once per feature; thoroughness pays dividends in implementation
4. **Architecture quality** - Leads make better decisions with comprehensive discovery reports

## Discovery Report Format

Each Explore agent outputs a structured markdown report:

```markdown
# Reuse Discovery Report

## Feature: [Feature Name]

## Domain: frontend|backend

## Date: [ISO timestamp]

---

## Reusable Components

| Component | Location | Can Extend? | Extension Point |
| --------- | -------- | ----------- | --------------- |

## Reusable Utilities

| Utility | Location | Usage Pattern |
| ------- | -------- | ------------- |

## Patterns to Follow

| Pattern | Example Location | Must Follow? |
| ------- | ---------------- | ------------ |

## Recommended File Placement

| New Code Type | Suggested Location | Rationale |
| ------------- | ------------------ | --------- |

## Anti-Pattern Warnings

[Existing code that does something similar - MUST NOT duplicate]

## Summary

- **Reuse Percentage:** X%
- **Files to Extend:** N
- **Files to Create:** M
```

## Handoff to Phase 3 (Planning)

Discovery outputs feed into Planning:

```json
{
  "status": "complete",
  "agent": "Explore",
  "domain": "frontend|backend",
  "output_file": ".claude/.output/features/{feature-id}/[frontend|backend]-discovery.md",
  "summary": {
    "reuse_percentage": 75,
    "files_to_extend": 4,
    "files_to_create": 1,
    "critical_patterns": ["handler-chain", "repository-pattern"]
  }
}
```

The `writing-plans` skill in Phase 3 consumes these reports to create implementation plans that prioritize extension over creation.

## Handoff to Phase 4 (Architecture)

Lead agents in Phase 4 receive discovery reports and must:

1. **Read both discovery reports** (frontend + backend)
2. **Analyze pattern quality** - distinguish good code from tech debt
3. **Assess each pattern** - extend or refactor?
4. **Propose refactoring plans** if tech debt found
5. **Update tech debt registry** regardless of human decision

### Tech Debt Assessment

Leads evaluate discovered patterns for:

| Pattern Quality | Characteristics                             | Action                   |
| --------------- | ------------------------------------------- | ------------------------ |
| **Good**        | Clean, extensible, documented               | Extend as recommended    |
| **Tech Debt**   | Special-casing, tight coupling, duplication | Propose refactoring plan |
| **Mixed**       | Partially good, some issues                 | Document trade-offs      |

### Tech Debt Registry Update

Leads populate `.claude/tech-debt-registry.md`:

```markdown
### [Pattern Name]

- **Location:** path/to/file.go
- **Identified:** 2025-12-30
- **Feature:** feature-id that discovered it
- **Issue:** Why this is tech debt
- **Recommendation:** Refactor approach
- **Status:** pending
```

## metadata.json Updates

After discovery completes, update phase status:

```json
{
  "phases": {
    "discovery": {
      "status": "complete",
      "frontend_complete": true,
      "backend_complete": true,
      "completed_at": "2025-12-30T10:30:00Z"
    }
  }
}
```

## Error Handling

### Agent Timeout

If one Explore agent times out:

1. Mark that domain as incomplete in metadata.json
2. Proceed with available report
3. Note gap in Planning phase input

### No Patterns Found

If exhaustive search finds no reusable patterns:

1. Verify search was truly thorough
2. Document "greenfield" justification
3. Proceed to Planning with explicit "no reuse" rationale

### Conflicting Recommendations

If frontend and backend reports conflict:

1. Flag in handoff to Architecture
2. Leads resolve during Phase 4
3. Document resolution rationale

## Exit Criteria

Discovery phase is complete when:

- [ ] Frontend Explore agent completed (or explicitly timed out)
- [ ] Backend Explore agent completed (or explicitly timed out)
- [ ] frontend-discovery.md written to feature directory
- [ ] backend-discovery.md written to feature directory
- [ ] metadata.json updated with discovery status
- [ ] Both reports contain structured reuse tables

## Related

- **discovering-reusable-code skill** - Methodology reference (prompts now baked into Explore)
- **Native Explore agent** - Executes the analysis (very thorough mode)
- **Phase 3: Planning** - Consumes discovery reports
- **Phase 4: Architecture** - Performs tech debt assessment
