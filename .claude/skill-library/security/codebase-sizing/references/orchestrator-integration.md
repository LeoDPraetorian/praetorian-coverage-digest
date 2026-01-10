# Orchestrator Integration

How `threat-modeling-orchestrator` consumes `sizing-report.json` to configure Phase 3 codebase mapping.

## Integration Point

**Phase 2** (Codebase Sizing) executes **after Phase 1** (Business Context) and **before Phase 3** (Codebase Mapping).

```
Phase 1 (Business Context)
  ↓
  ⏸️ CHECKPOINT
  ↓
Phase 2 (Codebase Sizing) ← NEW
  ↓
  No checkpoint (automatic)
  ↓
Phase 3 (Codebase Mapping) ← Now informed by sizing
```

## Orchestrator Workflow

### Step 1: Spawn Codebase Sizer Agent

After Phase 1 checkpoint approval:

```typescript
// Orchestrator spawns single sizer agent (fast, uses haiku model)
Task("codebase-sizer", "Assess codebase size for {scope}", "codebase-sizer")
```

**Agent outputs**: `.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json`

### Step 2: Load Sizing Report

```typescript
const sizingPath = `.claude/.output/threat-modeling/${timestamp}-${slug}/phase-2/sizing-report.json`;
const sizing = JSON.parse(fs.readFileSync(sizingPath, 'utf8'));
```

### Step 3: Configure Phase 3 Based on Strategy

**Strategy-driven agent spawning:**

```typescript
function spawnCodebaseMappers(sizing: SizingReport, session: string) {
  if (sizing.strategy.tier === "small") {
    // Single agent, full analysis
    return [
      Task("codebase-mapper", `Analyze ${sizing.scope} for threat modeling`)
    ];
  }

  if (sizing.strategy.tier === "medium") {
    // Parallel agents per component, full analysis
    const tasks = sizing.strategy.components_to_analyze.map(component => {
      return Task(
        "codebase-mapper",
        `Analyze ${component.path} with ${component.depth} analysis`,
        "codebase-mapper"
      );
    });
    return tasks;
  }

  if (sizing.strategy.tier === "large") {
    // Parallel agents per component, sampling mode
    const tasks = sizing.strategy.components_to_analyze.map(component => {
      if (component.depth === "sampling") {
        return Task(
          "codebase-mapper",
          `Analyze ${component.path} using sampling strategy (anchor files + representative samples)`,
          "codebase-mapper"
        );
      } else {
        return Task(
          "codebase-mapper",
          `Analyze ${component.path} with full analysis`,
          "codebase-mapper"
        );
      }
    });
    return tasks;
  }
}

// Spawn all agents in parallel
const mapperTasks = spawnCodebaseMappers(sizing, session);
// Wait for all to complete, then consolidate
```

## Before Sizing (Current Behavior)

**Hardcoded paths** - orchestrator makes assumptions:

```typescript
// ❌ OLD: Hardcoded component paths
Task("codebase-mapper", "Analyze frontend: ./modules/chariot/ui")
Task("codebase-mapper", "Analyze backend: ./modules/chariot/backend")
Task("codebase-mapper", "Analyze CLI: ./modules/praetorian-cli")
```

**Problems:**
- No knowledge of component sizes (might spawn agent on 10k-file component → timeout)
- No dynamic discovery (assumes directory names)
- No sampling decision (always full analysis)

## After Sizing (New Behavior)

**Data-driven strategy** - orchestrator reads sizing report:

```typescript
// ✅ NEW: Data-driven from sizing-report.json
const sizing = loadSizingReport(session);

if (sizing.strategy.tier === "small") {
  // Single agent for small codebase
  Task("codebase-mapper", "Analyze ./modules/my-app")
}

if (sizing.strategy.tier === "medium") {
  // Parallel agents for medium codebase
  for (const component of sizing.strategy.components_to_analyze) {
    Task("codebase-mapper", `Analyze ${component.path}`)
  }
}

if (sizing.strategy.tier === "large") {
  // Parallel agents with sampling for large codebase
  for (const component of sizing.strategy.components_to_analyze) {
    if (component.depth === "sampling") {
      Task("codebase-mapper", `Analyze ${component.path} with sampling`)
    } else {
      Task("codebase-mapper", `Analyze ${component.path}`)
    }
  }
}
```

**Benefits:**
- Prevents timeouts (knows when to split or sample)
- Discovers components dynamically
- Skips irrelevant directories (tests, docs)
- Optimal parallelization

## Handoff Data Structure

**From Phase 2 to Phase 3:**

```json
{
  "from_phase": "2",
  "to_phase": "3",
  "sizing_summary": {
    "tier": "medium",
    "total_files": 5432,
    "components_discovered": 4,
    "components_to_analyze": 2,
    "recommended_agents": 2,
    "sampling_required": false
  },
  "artifacts": [
    {
      "name": "sizing-report.json",
      "path": ".claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json",
      "load_when": "always"
    }
  ],
  "next_phase_guidance": "Spawn 2 parallel codebase-mapper agents for backend (2100 files) and ui (2200 files). Full analysis for both."
}
```

## Error Handling

### Missing Sizing Report

```typescript
if (!fs.existsSync(sizingReportPath)) {
  throw new Error(
    "Phase 2 sizing report not found. " +
    "Cannot proceed to Phase 3 without sizing assessment. " +
    "Run Phase 2 first."
  );
}
```

### Invalid Sizing Report

```typescript
const required = ['scope', 'metrics', 'components', 'strategy'];
for (const field of required) {
  if (!sizing[field]) {
    throw new Error(`Invalid sizing report: missing field '${field}'`);
  }
}

if (sizing.strategy.recommended_agents < 1) {
  throw new Error("Invalid sizing report: recommended_agents must be >= 1");
}
```

### Component Count Mismatch

```typescript
const analyzeCount = sizing.strategy.components_to_analyze.length;
if (analyzeCount !== sizing.strategy.recommended_agents) {
  console.warn(
    `Component count (${analyzeCount}) doesn't match ` +
    `recommended agents (${sizing.strategy.recommended_agents}). ` +
    `Using component count.`
  );
}
```

## Session Directory Structure

**Updated structure with Phase 2:**

```
.claude/.output/threat-modeling/{timestamp}-{slug}/
├── config.json
├── scope.json
├── phase-1/                    # Business context
│   └── summary.md
├── phase-2/                    # NEW: Sizing assessment
│   └── sizing-report.json      # ← Orchestrator reads this
├── phase-3/                    # Codebase mapping (informed by Phase 2)
│   ├── manifest.json
│   ├── components/
│   └── summary.md
├── phase-4/                    # Security controls
├── phase-5/                    # Threat model
└── phase-6/                    # Test plan
```

## Integration Testing

**Test scenarios for orchestrator:**

1. **Small codebase** (< 1,000 files)
   - Sizing recommends single agent
   - Orchestrator spawns 1 codebase-mapper
   - Phase 3 completes in 5-15 min

2. **Medium codebase** (1,000 - 10,000 files)
   - Sizing recommends 2-5 agents
   - Orchestrator spawns N parallel codebase-mappers
   - Phase 3 completes in 15-45 min

3. **Large codebase** (> 10,000 files)
   - Sizing recommends sampling for some components
   - Orchestrator spawns agents with depth flags
   - Phase 3 completes in 30-60 min

4. **Edge case: All components skipped**
   - Sizing recommends 0 agents (all test/docs)
   - Orchestrator errors with "No analyzable components"
   - User must adjust scope

## Future Enhancements

**Not yet implemented:**

- **Incremental sizing**: Compare current sizing vs previous session
- **Token budget enforcement**: Warn if estimated tokens exceed limit
- **Dynamic re-sizing**: If agent times out, re-spawn with sampling
- **Cost estimation**: Predict API cost based on token budget
