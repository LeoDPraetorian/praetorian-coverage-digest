# Agent Matrix

**Agent selection guide for fingerprintx plugin development orchestration.**

## Fingerprintx Agent Type Matrix

| Phase              | Agent Type  | Agent Name           | Purpose                           |
| ------------------ | ----------- | -------------------- | --------------------------------- |
| **Discovery**      | Exploration | Explore              | Codebase pattern discovery        |
| **Architecture**   | Lead        | capability-lead      | Plugin architecture design        |
| **Implementation** | Developer   | capability-developer | Plugin code implementation        |
| **Review**         | Reviewer    | capability-reviewer  | Code quality review               |
| **Testing**        | Tester      | capability-tester    | Test implementation and execution |

## Selection Rules

### Rule 1: Fingerprintx Uses Capability Agents

All fingerprintx plugin development uses the capability agent family:

```typescript
// Discovery
Task("Explore", "Find similar plugin patterns in {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/...");

// Architecture
Task("capability-lead", "Design detection strategy for {protocol} plugin...");

// Implementation
Task("capability-developer", "Implement {protocol} plugin...");

// Review
Task("capability-reviewer", "Review {protocol} plugin implementation...");

// Testing
Task("capability-tester", "Test {protocol} plugin...");
```

### Rule 2: Discovery Before Architecture

**Always spawn Explore agent first** for codebase discovery before architectural planning.

```typescript
// Phase 3: Discovery
Task("Explore", "Find existing plugin patterns for similar protocols...");

// Phase 7: Architecture (after discovery complete)
Task("capability-lead", "Using discovery findings, design plugin architecture...");
```

### Rule 3: Sequential Plugin Development

Fingerprintx plugins are developed sequentially (single plugin per workflow):

1. Explore → finds patterns
2. capability-lead → designs architecture
3. capability-developer → implements plugin
4. capability-reviewer → reviews code
5. capability-tester → tests implementation

### Rule 4: No Parallel Implementation

Unlike full-stack features, fingerprintx plugins are single-file focused:

- `plugin.go` - main detection logic
- `{protocol}_test.go` - tests
- `types.go` - type constant (modify only)
- `plugins.go` - import (modify only)

No parallel developer agents needed.

## Agent Responsibilities

### Discovery Agent

- **Explore**: Fast codebase exploration, similar plugin discovery
- Output: Existing patterns, plugin locations, test patterns

### Lead Agent

- **capability-lead**: Detection strategy design, plugin architecture
- Output: Detection approach, version extraction strategy, file structure

### Developer Agent

- **capability-developer**: Plugin implementation, TDD approach
- Mandatory skills: `developing-with-tdd`, `writing-fingerprintx-modules`, `verifying-before-completion`
- Output: Plugin code, unit tests

### Reviewer Agent

- **capability-reviewer**: Code quality, pattern compliance, maintainability
- Output: Approval/rejection, improvement recommendations

### Tester Agent

- **capability-tester**: Test creation, Docker validation, Shodan validation
- Output: Test files, test results, validation reports

## Phase-to-Agent Mapping

| Phase                 | Agent                | Parallel? | Dependencies      |
| --------------------- | -------------------- | --------- | ----------------- |
| 3: Codebase Discovery | Explore              | Single    | Phase 2 complete  |
| 7: Architecture Plan  | capability-lead      | Single    | Phase 6 complete  |
| 8: Implementation     | capability-developer | Single    | Phase 7 complete  |
| 11: Code Quality      | capability-reviewer  | Single    | Phase 10 complete |
| 13: Testing           | capability-tester    | Single    | Phase 12 complete |

## Effort Scaling by Plugin Type

| Plugin Complexity          | Agents Per Phase           | Example                 |
| -------------------------- | -------------------------- | ----------------------- |
| Simple (text banner)       | 1 agent per phase          | HTTP detection          |
| Moderate (binary protocol) | 1 agent per phase          | MySQL with version      |
| Complex (multi-stage)      | 1 agent, more iterations   | SSH with version matrix |
| Very Complex (novel)       | 1 agent, extra checkpoints | Proprietary protocol    |

Fingerprintx doesn't scale by adding more agents - it scales by iteration depth and checkpoint frequency.

## Anti-Patterns

### ❌ Wrong: Using Frontend/Backend Agents

```typescript
Task("backend-developer", "Build MySQL fingerprintx plugin");
// Wrong agent family - should use capability-developer
```

### ❌ Wrong: Parallel Developer Agents

```typescript
Task("capability-developer", "Implement detection...");
Task("capability-developer", "Implement version extraction...");
// Single plugin - use single agent with sequential tasks
```

### ❌ Wrong: Skipping Discovery

```typescript
Task("capability-lead", "Design plugin architecture...");
// Should have run Explore first to find similar plugins
```

### ✅ Right: Sequential Capability Pipeline

```typescript
// Discovery
Task("Explore", "Find similar plugins in {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/...");

// Architecture (after discovery)
Task("capability-lead", "Design {protocol} detection strategy...");

// Implementation (after architecture approved)
Task("capability-developer", "Implement {protocol} plugin following architecture...");

// Review (after implementation)
Task("capability-reviewer", "Review plugin against P0 compliance...");

// Testing (after review approved)
Task("capability-tester", "Test plugin with unit, Docker, and Shodan validation...");
```

## Related References

- [Phase 8: Implementation](phase-8-implementation.md) - Developer agent usage
- [Phase 11: Code Quality](phase-11-code-quality.md) - Reviewer agent usage
- [Phase 13: Testing](phase-13-testing.md) - Tester agent usage
- [Delegation Templates](delegation-templates.md) - Agent prompt templates
