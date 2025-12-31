# Phase 2: Discovery

**Parallel pattern analysis before architecture decisions.**

## Overview

The Discovery phase executes AFTER Brainstorming (Phase 1) and BEFORE Planning (Phase 3). It spawns parallel `code-pattern-analyzer` agents to exhaustively search the codebase for reusable patterns, preventing the #1 implementation failure: creating new code when reusable code exists.

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

| Aspect           | Details                                                       |
| ---------------- | ------------------------------------------------------------- |
| **Execution**    | PARALLEL - frontend + backend analyzers run simultaneously    |
| **Agents**       | 2 × code-pattern-analyzer                                     |
| **Input**        | design.md from Phase 1 (Brainstorming)                        |
| **Output**       | frontend-discovery.md, backend-discovery.md                   |
| **Checkpoint**   | NONE - feeds directly into Planning and Architecture          |
| **Skill Used**   | discovering-reusable-code                                     |
| **Objective**    | Report patterns objectively (no judgment on code quality)     |

## Agent Spawning

**CRITICAL: Spawn BOTH agents in a SINGLE Task message for parallel execution.**

```typescript
// Correct - parallel execution
Task("code-pattern-analyzer", {
  prompt: `Analyze frontend patterns for feature: ${featureDescription}
    Scope: modules/*/ui/src/*
    Use discovering-reusable-code skill methodology.
    Output to: ${featureDir}/frontend-discovery.md`,
  subagent_type: "code-pattern-analyzer"
})
Task("code-pattern-analyzer", {
  prompt: `Analyze backend patterns for feature: ${featureDescription}
    Scope: modules/*/backend/*
    Use discovering-reusable-code skill methodology.
    Output to: ${featureDir}/backend-discovery.md`,
  subagent_type: "code-pattern-analyzer"
})
```

**Why parallel?** Context window limits (~10K-15K lines) mean a single agent cannot analyze the full codebase. Domain-specific agents ensure comprehensive coverage.

## Discovery Agent Responsibilities

Each `code-pattern-analyzer` agent must:

1. **Extract requirements** from design.md
2. **Run exhaustive searches** with documented commands
3. **Apply reusability matrix** (100%/80%/60%/40%/0%)
4. **Enforce 10-file rule** for any "create new" proposals
5. **Generate discovery report** in standard format

### Frontend Agent Scope

```bash
# Search patterns for frontend analyzer
grep -r "[keyword]" modules/*/ui/src/ --include="*.tsx" -l
grep -r "[keyword]" modules/*/ui/src/ --include="*.ts" -l
grep -r "export.*use" modules/*/ui/src/hooks/ -l
grep -r "const.*Component" modules/*/ui/src/components/ -l
```

**Focus areas:**

- React components (pages, features, shared)
- Custom hooks (data fetching, state, utilities)
- UI patterns (forms, tables, modals, filters)
- State management (Zustand stores, TanStack Query)

### Backend Agent Scope

```bash
# Search patterns for backend analyzer
grep -r "[keyword]" modules/*/backend/pkg/ --include="*.go" -l
grep -r "type.*Handler" modules/*/backend/pkg/handler/ -l
grep -r "interface.*Service" modules/*/backend/pkg/service/ -l
grep -r "func.*Repository" modules/*/backend/pkg/repository/ -l
```

**Focus areas:**

- Handler patterns (REST, GraphQL)
- Service layer implementations
- Repository patterns (DynamoDB, Neo4j)
- Lambda function patterns

## Discovery Report Format

Each agent outputs a structured markdown report:

```markdown
# Exhaustive Reuse Analysis Report

## Feature: [Feature Name]

## Date: [ISO timestamp]

## Analyst: code-pattern-analyzer (frontend|backend)

---

## COMPLIANCE CONFIRMATION

COMPLIANCE CONFIRMED: Exhaustive analysis performed, reuse prioritized over creation.

---

## SEARCH METHODOLOGY EXECUTED

### Commands Run

[Actual commands with result counts]

### Coverage Verification

- [x] modules/chariot/[scope] searched (X files)
- [x] Related documentation reviewed

---

## EXISTING IMPLEMENTATIONS DISCOVERED

### 100% Reusable (Use As-Is)

[Implementations that can be imported directly]

### 80% Reusable (Extend)

[Implementations needing minor extension]

### 60% Reusable (Adapt)

[Implementations needing adaptation]

### 0% Reusable (New Code Required)

[With EXHAUSTIVE JUSTIFICATION - minimum 10 files analyzed]

---

## PATTERN INVENTORY

[Patterns identified with extension points]

---

## INTEGRATION RECOMMENDATIONS

[Recommended approach based on discovery]

---

## KEY FINDINGS

- **Reuse Percentage:** X%
- **Files to Extend:** N
- **Files to Create:** M
```

## Handoff to Phase 3 (Planning)

Discovery outputs feed into Planning:

```json
{
  "status": "complete",
  "agent": "code-pattern-analyzer",
  "domain": "frontend|backend",
  "output_file": ".claude/features/{feature-id}/[frontend|backend]-discovery.md",
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

| Pattern Quality | Characteristics                               | Action                      |
| --------------- | --------------------------------------------- | --------------------------- |
| **Good**        | Clean, extensible, documented                 | Extend as recommended       |
| **Tech Debt**   | Special-casing, tight coupling, duplication   | Propose refactoring plan    |
| **Mixed**       | Partially good, some issues                   | Document trade-offs         |

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

If one analyzer times out:

1. Mark that domain as incomplete in metadata.json
2. Proceed with available report
3. Note gap in Planning phase input

### No Patterns Found

If exhaustive search finds no reusable patterns:

1. Verify search methodology was complete
2. Document "greenfield" justification
3. Proceed to Planning with explicit "no reuse" rationale

### Conflicting Recommendations

If frontend and backend reports conflict:

1. Flag in handoff to Architecture
2. Leads resolve during Phase 4
3. Document resolution rationale

## Exit Criteria

Discovery phase is complete when:

- [ ] Frontend analyzer completed (or explicitly timed out)
- [ ] Backend analyzer completed (or explicitly timed out)
- [ ] frontend-discovery.md written to feature directory
- [ ] backend-discovery.md written to feature directory
- [ ] metadata.json updated with discovery status
- [ ] Both reports contain COMPLIANCE CONFIRMATION

## Related

- **discovering-reusable-code skill** - Methodology used by analyzers
- **code-pattern-analyzer agent** - Executes the analysis
- **Phase 3: Planning** - Consumes discovery reports
- **Phase 4: Architecture** - Performs tech debt assessment
