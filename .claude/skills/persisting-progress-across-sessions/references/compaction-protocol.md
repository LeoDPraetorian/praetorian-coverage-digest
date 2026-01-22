# Context Compaction Protocol - Detailed Reference

## Compaction Examples

### Example 1: Summarizing Architecture Phase

**Before compaction (in context):**

Phase 5 completed. frontend-lead returned:

```json
{
  "agent": "frontend-lead",
  "output_type": "architecture",
  "status": "complete",
  "summary": "Designed dashboard using compound component pattern...",
  "files_created": ["architecture.md"],
  "decisions": [
    "Use compound component pattern for Dashboard widgets",
    "State management via Zustand store at stores/dashboardStore.ts",
    "Data fetching via TanStack Query hooks",
    "Follow existing patterns in sections/insights/metrics/"
  ],
  "approach_comparison": {
    "option_a": { "name": "Monolithic component", "pros": [...], "cons": [...] },
    "option_b": { "name": "Compound pattern", "pros": [...], "cons": [...] },
    "option_c": { "name": "Render props", "pros": [...], "cons": [...] }
  },
  "security_considerations": [...],
  "tech_debt": [...],
  "handoff": { "next_agent": "frontend-developer", "context": "..." }
}
```

**After compaction (in context):**

Phase 5 (Architecture): COMPLETE

- Pattern: Compound component (<Dashboard.Widget>)
- State: Zustand (stores/dashboardStore.ts)
- Data: TanStack Query hooks
- Full details: .claude/.output/features/{id}/architecture.md

### Example 2: Summarizing Discovery Phase

**Before (800+ tokens):**

Discovery findings from 3 Explore agents:

- Frontend patterns: [detailed analysis of component hierarchy, state management, data fetching patterns, testing approaches, existing utilities, component library usage, etc.]
- Backend patterns: [detailed analysis of handler structure, service layer, repository pattern, error handling, validation, middleware, etc.]
- Test patterns: [detailed analysis of unit test structure, integration test patterns, E2E patterns, fixture usage, mock strategies, etc.]
- File placement recommendations: [detailed list of directories, naming conventions, import patterns, etc.]
- Existing utilities found: [detailed list of hooks, helpers, components, services that can be reused, etc.]

**After (150 tokens):**

Phase 3 (Discovery): COMPLETE

- Patterns: TanStack Query, MSW testing, Zustand state
- Placement: src/sections/dashboard/
- Utilities: useMetrics hook exists, extend it
- Full details: discovery.md, file-placement.md

### Example 3: Multi-Phase Summary

After phases 1-6 complete, before Phase 7:

**Compacted context:**

## Orchestration Progress

Phases 1-6 COMPLETE. Currently: Phase 7 (Plan Completion Review)

**Key Decisions (preserved):**

- Architecture: Compound component pattern
- State: Zustand for UI, TanStack Query for server
- Testing: Unit + Integration + E2E per test-plan.md

**Current Focus:**

- Verify all plan requirements implemented
- Files modified: [list from implementation]

**Full Details:** .claude/.output/features/{id}/

- design.md, discovery.md, plan.md, architecture.md
- implementation-log.md, progress.json

## When NOT to Compact

Do NOT compact:

- **Active blockers** - Need full context to resolve
- **Current phase instructions** - Required for execution
- **User-stated preferences or constraints** - Must maintain fidelity
- **Security requirements** - Cannot be summarized safely
- **Error details being debugged** - Need complete stack traces
- **Immediate prior phase decisions** - Needed for context continuity

## Compaction Anti-Patterns

### Anti-Pattern 1: Compacting Too Aggressively

**WRONG:**

```
Phases 1-5 complete. See MANIFEST.yaml.
Currently: Phase 6
```

**Problem:** Lost critical decisions needed for current phase.

**RIGHT:**

```
Phases 1-5 COMPLETE.

Key Decisions:
- Architecture: Compound pattern with Zustand
- Database: PostgreSQL with migrations in db/migrations/
- API: REST endpoints follow /api/v1/{resource} pattern
- Testing: Jest + React Testing Library + Playwright

Currently: Phase 6 (Implementation)
- Implementing AssetFilter component
- Files: src/sections/assets/components/AssetFilter.tsx
```

### Anti-Pattern 2: Never Compacting

**WRONG:** Keep all phase details in context until session end.

**Problem:** Context rot degrades performance in later phases.

**RIGHT:** Compact after every 3 phases or when approaching 40 messages.

### Anti-Pattern 3: Compacting Without Persisting

**WRONG:**

1. Summarize completed phases in context
2. Don't update MANIFEST.yaml

**Problem:** Information lost if session interrupted.

**RIGHT:**

1. Write full details to MANIFEST.yaml and artifact files
2. Verify write succeeded
3. Then summarize in context

## Compaction Workflow

### Step-by-Step Process

**1. Detect Trigger**

Check compaction triggers after each phase:

- Message count > 40?
- Completed 3 phases since last compaction?
- Agent output > 1000 tokens?
- Context usage approaching 80%?

**2. Identify Compactable Content**

Review conversation history:

- Which phases are complete?
- Which agent outputs are large?
- What discovery findings are in context?
- What architecture rationale is verbose?

**3. Update MANIFEST.yaml FIRST**

Update MANIFEST.yaml with phase completion:

```yaml
phases:
  architecture:
    status: "complete"
    timestamp: "2026-01-15T10:30:00Z"
    agent: "frontend-lead"

agents_contributed:
  - agent: "frontend-lead"
    artifact: "architecture.md"
    timestamp: "2026-01-15T10:30:00Z"
    status: "complete"
```

**4. Verify MANIFEST.yaml Updated**

Read the file back to confirm write succeeded.

**5. Summarize in Context**

Replace verbose content with summary:

```
Phase 3 (Architecture): COMPLETE
- Decision: Compound component pattern with Zustand
- File: .claude/.output/features/asset-filter/architecture.md
- Key: Dashboard uses <Dashboard.Widget> children pattern
```

**6. Remove Verbose Content**

Delete the full agent output, discovery details, and architecture rationale from context.

**7. Preserve Critical Context**

Ensure these remain in context:

- Current phase instructions
- Immediate prior phase key decisions
- Active blockers
- Key file paths being modified
- User preferences/constraints

## Pre-Rot Threshold Examples

### Example 1: Response Quality Drop

**Indicator:**
Agent: "Let me implement the filter component using best practices..."
[Generic implementation that ignores compound pattern decision]

**Action:**

1. Immediate compaction
2. Re-inject key decision: "Use compound component pattern (<AssetFilter.Option>)"
3. Verify agent acknowledgment

### Example 2: Missed Context

**Indicator:**
Agent: "What state management should we use?"
[Question was already answered in Phase 3]

**Action:**

1. Compaction + re-inject key facts
2. "Architecture Phase 3 decided: Zustand at stores/assetFilterStore.ts"
3. Continue with implementation

### Example 3: Instruction Drift

**Indicator:**
Agent creates new abstractions when simple solution requested.

**Action:**

1. Re-inject critical instruction: "Use simple inline handlers, no abstraction"
2. Compaction to remove verbose rationale
3. Refocus on current phase

## Integration with Orchestrations

### orchestrating-feature-development

After Phase 6 (Implementation) complete, before Phase 7 (Plan Completion Review):

**Compact:**

- Phases 1-2 (Setup, Brainstorming) → 2-line summaries
- Phase 3 (Discovery) → Key patterns only, reference discovery.md
- Phase 4 (Planning) → Reference plan.md
- Phase 5 (Architecture) → Key decisions only, reference architecture.md
- Phase 6 (Implementation) → Files modified list, reference implementation-log.md

**Keep in Context:**

- Phase 7 instructions (current phase)
- Implementation decisions from Phase 6 (immediate prior)
- Active blockers if any
- File paths modified

### orchestrating-integration-development

After Phase 5 (P0 Validation) complete:

**Compact:**

- Phases 1-3 (Architecture, Implementation, P0 Validation) → Summaries
- Store full P0 compliance details in MANIFEST.yaml and artifacts

**Keep in Context:**

- Current phase (Phase 6: Review)
- P0 compliance results (pass/fail)
- Files to review
- Integration patterns decided

## Compaction Metrics

Track these to improve compaction effectiveness:

| Metric                         | Target         | Measurement                   |
| ------------------------------ | -------------- | ----------------------------- |
| Context size before compaction | ~80% usage     | Approximate message count     |
| Context size after compaction  | ~50% usage     | Approximate message count     |
| Phases compacted               | 3+ phases      | Count                         |
| Response quality               | No degradation | User/orchestrator assessment  |
| Resume success                 | 100%           | Can resume from MANIFEST.yaml |

## Related Skills

- **persisting-progress-across-sessions** - Main skill (parent)
- **orchestrating-feature-development** - Uses compaction in 12-phase workflow
- **orchestrating-integration-development** - Uses compaction in 9-phase workflow
- **orchestrating-multi-agent-workflows** - Context management patterns
