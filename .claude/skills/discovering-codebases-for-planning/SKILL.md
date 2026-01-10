---
name: discovering-codebases-for-planning
description: Use when orchestration workflows need exhaustive codebase discovery before planning - three-stage process (scoping, parallel deep discovery, synthesis) that dynamically spawns 1-10 Explore agents based on feature context and codebase size
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite, Task, AskUserQuestion
---

# Discovering Codebases for Planning

**Exhaustive, feature-context-aware codebase discovery for orchestration workflows.**

## When to Use

Invoke this skill when:

- **Orchestration workflows** (orchestrating-feature-development, orchestrating-capability-development, orchestrating-fingerprintx-development) reach Phase 2 Discovery
- **Planning implementation** requires understanding existing code to maximize DRY/reuse
- **Direct invocation** when you need structured, parallelized codebase analysis before architecture/planning phases

**DO NOT use for**:

- Security-focused analysis (use codebase-mapping for threat modeling)
- Simple file searches (use Grep/Glob directly)
- Single-component analysis (use Explore agent directly)

## Problem Statement

Current Phase 2 Discovery spawns **fixed agent counts** regardless of codebase size:

- Features: 2 agents (frontend, backend)
- Capabilities: 1 agent
- No feature-context filtering
- No synthesis/deduplication step

**Failures**:

1. **Large codebases**: 2 agents can't cover 5+ relevant components → incomplete discovery
2. **Small codebases**: 2 agents for 10-file features → wasted resources
3. **No filtering**: Agents analyze everything, not just feature-relevant code → noise

## Solution: Three-Stage Discovery

| Stage       | Executor    | Purpose                                     | Output                    |
| ----------- | ----------- | ------------------------------------------- | ------------------------- |
| 1. Scoping  | Orchestrator | Parse feature context, count files, plan agents | scoping-report.json       |
| 2. Discovery | N Explore agents | Parallel DRY-focused analysis per component | discovery-{component}.md  |
| 3. Synthesis | Orchestrator | Merge findings, deduplicate, summarize      | discovery.md + summary.json |

---

## Stage 1: Scoping (Orchestrator Executes)

**Input**: design.md (feature context) + scope paths

**Process**:

1. **Parse feature context** from design.md → Extract requirements, components mentioned
2. **Quick directory scan** (find, ls) → Identify candidate directories under scope paths
3. **Filter to relevant components** → Match feature requirements to candidate paths
4. **Count files per component** → Determine analysis complexity
5. **Calculate agent count** → Apply agent count logic (see below)
6. **Generate scoping-report.json** → Structured output for Stage 2

**Agent Count Logic**:

```
IF relevant_components.length == 1:
    agents = 1
ELIF relevant_components.length <= 10:
    agents = relevant_components.length  # One per component
ELSE:
    agents = 10  # Max parallelization, group smallest components
```

**Output Structure** (scoping-report.json):

```json
{
  "feature_context": "summary from design.md",
  "relevant_components": [
    {
      "path": "modules/chariot/ui/src/features/metrics",
      "files": 23,
      "relevance": "high",
      "rationale": "Metrics dashboard UI implementation"
    }
  ],
  "strategy": {
    "total_relevant_files": 38,
    "agent_count": 2,
    "mode": "parallel"
  }
}
```

**See**: [references/stage-1-scoping.md](references/stage-1-scoping.md) for detailed implementation

---

## Stage 2: Parallel Deep Discovery (Explore Agents)

**Input**: scoping-report.json

**Process**:

1. **Spawn N agents in SINGLE message** (critical for parallel execution)
2. **ALWAYS use 'very thorough' mode** (non-negotiable)
3. **Each agent receives**:
   - Feature context summary (from design.md)
   - Assigned component path
   - DRY-focused search objectives (see Agent Prompt Template)
   - Structured output format requirements

**Agent Prompt Template**:

```
You are analyzing {component_path} for feature: {feature_context}.

OBJECTIVES (DRY/Reuse Focus):
1. Find ALL existing code that could be EXTENDED for this feature
2. Find ALL utilities, helpers, hooks that apply
3. Find ALL patterns we MUST follow (file structure, naming, state management)
4. Identify WHERE new code should be placed (follow existing conventions)
5. List anti-patterns to AVOID duplicating

OUTPUT FORMAT:
Use structured tables (see references/agent-output-format.md)

THOROUGHNESS: very thorough mode
```

**Output**: discovery-{component-name}.md per agent

**See**: [references/stage-2-parallel-discovery.md](references/stage-2-parallel-discovery.md) for agent spawning patterns

---

## Stage 3: Synthesis + Verification (Orchestrator Executes)

**Input**: N discovery reports from Stage 2

**Process**:

1. **Merge all reusable patterns** → Unified view of hooks, utilities, patterns
2. **Deduplicate cross-component findings** → Same utility found by multiple agents? Merge entries
3. **Verify completeness** → All scoped components have reports?
4. **Resolve conflicts** → If agents disagree on approach, document both with rationale
5. **Generate file placement** → WHERE new code should go (not WHAT code)
6. **Produce handoff summary** → <2000 tokens for architect/planning phase

**Output Artifacts**:

- `discovery.md` - Unified, structured with tables (for human review)
- `file-placement.md` - Recommendations with rationale
- `discovery-summary.json` - Machine-readable for downstream phases

**See**: [references/stage-3-synthesis.md](references/stage-3-synthesis.md) for synthesis algorithms

---

## Key Design Principles

1. **ALWAYS very thorough** - Discovery is one-time cost, pays dividends in planning
2. **DRY/Reuse focused** - Primary goal: find code to EXTEND, not just catalog
3. **Feature-context aware** - Only analyze components RELEVANT to this feature
4. **Parallel execution** - Spawn ALL Stage 2 agents in single Task message
5. **Structured output** - Tables for scannable data, JSON for machine consumption

---

## Integration

### Called By

- `orchestrating-feature-development` (Phase 2 Discovery)
- `orchestrating-capability-development` (Phase 2 Discovery)
- `orchestrating-fingerprintx-development` (Phase 2 Discovery, if applicable)
- Direct invocation when exhaustive discovery needed before planning

### Requires (invoke before starting)

| Skill                       | When  | Purpose                                    |
| --------------------------- | ----- | ------------------------------------------ |
| `persisting-agent-outputs`  | Start | Establish OUTPUT_DIR for discovery artifacts |

### Calls (during execution)

| Tool/Skill      | Phase   | Purpose                                  |
| --------------- | ------- | ---------------------------------------- |
| Task (Explore)  | Stage 2 | Spawn N parallel agents for deep discovery |

### Pairs With (conditional)

| Skill              | Trigger                     | Purpose                            |
| ------------------ | --------------------------- | ---------------------------------- |
| `writing-plans`    | After discovery complete    | Use findings to create implementation plan |
| `brainstorming`    | Before discovery (optional) | Clarify feature requirements for better scoping |

---

## Output Artifacts Location

```
.claude/.output/{workflow-type}/{timestamp}-{name}/discovery/
├── scoping-report.json        # Stage 1
├── discovery-frontend.md      # Stage 2 (per component)
├── discovery-backend.md       # Stage 2 (per component)
├── discovery-capabilities.md  # Stage 2 (if applicable)
├── discovery.md               # Stage 3 (unified)
├── file-placement.md          # Stage 3
└── discovery-summary.json     # Stage 3 (machine-readable)
```

---

## Handoff Format (discovery-summary.json)

**Consumed by**: Architecture/Planning phases

```json
{
  "reuse_percentage": 65,
  "components_analyzed": 3,
  "patterns_to_extend": [
    {
      "name": "useMetrics hook",
      "location": "src/hooks/useMetrics.ts",
      "extension_point": "add dashboard data fetching"
    }
  ],
  "utilities_to_reuse": [
    {
      "name": "formatMetricValue",
      "location": "src/utils/metrics.ts",
      "use_case": "format all metric display values"
    }
  ],
  "file_placement": [
    {
      "type": "component",
      "recommended_path": "src/features/metrics/Dashboard.tsx",
      "rationale": "follows existing feature structure"
    }
  ],
  "anti_patterns": [
    "Do not duplicate MetricsContext - extend it",
    "Do not create new date formatter - use formatMetricValue"
  ]
}
```

**See**: [references/handoff-format.md](references/handoff-format.md) for schema details

---

## Checklist (TodoWrite Tracking)

### Stage 1: Scoping

- [ ] Parsed feature context from design.md
- [ ] Scanned directories for candidate components
- [ ] Filtered to feature-relevant components only
- [ ] Counted files per component
- [ ] Applied agent count logic
- [ ] Generated scoping-report.json

### Stage 2: Parallel Discovery

- [ ] Spawned N Explore agents in SINGLE Task message (parallel execution verified)
- [ ] All agents configured with 'very thorough' mode
- [ ] All agents received DRY-focused prompt template
- [ ] Collected all discovery-*.md reports (one per agent)

### Stage 3: Synthesis

- [ ] Merged all discovery reports into unified view
- [ ] Deduplicated cross-component findings
- [ ] Verified all components have reports (no gaps)
- [ ] Generated file-placement.md with rationale
- [ ] Generated discovery.md (human-readable)
- [ ] Generated discovery-summary.json (machine-readable)

---

## Error Handling

| Error                             | Response                                                      |
| --------------------------------- | ------------------------------------------------------------- |
| **Agent timeout**                 | Mark component as incomplete, proceed with available reports, note gap in discovery.md |
| **No reusable code found**        | Document 'greenfield' justification in discovery.md, proceed to planning |
| **Conflicting recommendations**   | Flag in discovery.md with both options, let architect resolve in next phase |
| **Scoping finds 0 relevant components** | Error - design.md may be incomplete, return to brainstorming phase |
| **Agent reports missing tables**  | Request structured output, re-run that agent if needed      |

---

## Difference from Threat Modeling codebase-mapping

**This skill is NOT security-focused.**

| Aspect          | discovering-codebases-for-planning | codebase-mapping (threat modeling) |
| --------------- | ---------------------------------- | ---------------------------------- |
| **Goal**        | Maximize DRY/reuse for planning    | Identify security boundaries       |
| **Focus**       | Patterns, utilities, file placement | Trust boundaries, data flows, entry points |
| **Output**      | discovery.md (reuse tables)        | architecture.md (security artifacts) |
| **Consumers**   | Architect, planning phases         | threat-modeler, security analysis  |
| **When to use** | Before implementation planning     | Before threat modeling (Phase 3)   |

---

## Related Skills

| Skill                                | Purpose                                          |
| ------------------------------------ | ------------------------------------------------ |
| `orchestrating-feature-development`  | Primary consumer - invokes this in Phase 2       |
| `orchestrating-capability-development` | Primary consumer - invokes this in Phase 2     |
| `persisting-agent-outputs`           | Required before starting - establishes OUTPUT_DIR |
| `writing-plans`                      | Downstream consumer - uses discovery findings    |
| `brainstorming`                      | Upstream (optional) - clarifies feature context  |
| `codebase-mapping`                   | Parallel skill for security/threat modeling      |
