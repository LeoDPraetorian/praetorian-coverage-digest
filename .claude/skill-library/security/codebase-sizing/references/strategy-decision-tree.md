# Strategy Decision Tree

Visual flowchart and decision logic for determining codebase sizing strategy.

## Decision Flowchart

```
START: Count total files in scope
    ↓
    ├─→ total_files < 1,000?
    │       ↓ YES
    │       ├─→ TIER: small
    │       ├─→ PARALLELIZATION: single
    │       ├─→ SAMPLING: false
    │       ├─→ AGENTS: 1
    │       └─→ RESULT: Single codebase-mapper, full analysis
    │
    └─→ total_files >= 1,000?
            ↓ YES
            ├─→ total_files <= 10,000?
            │       ↓ YES
            │       ├─→ TIER: medium
            │       ├─→ PARALLELIZATION: by-component
            │       ├─→ SAMPLING: false
            │       ├─→ Discover components (find */api|backend|frontend)
            │       │       ↓
            │       │       ├─→ For each component:
            │       │       │   ├─→ component_files > 5,000?
            │       │       │   │   ↓ YES → depth: "sampling"
            │       │       │   │   ↓ NO  → depth: "full"
            │       │       │   ├─→ is_test_or_docs?
            │       │       │   │   ↓ YES → depth: "skip"
            │       │       │   └─→ Add to components_to_analyze
            │       │       └─→ AGENTS: count(depth != "skip")
            │       └─→ RESULT: N parallel codebase-mappers, full per component
            │
            └─→ total_files > 10,000?
                    ↓ YES
                    ├─→ TIER: large
                    ├─→ PARALLELIZATION: by-component
                    ├─→ SAMPLING: true
                    ├─→ Discover components
                    │       ↓
                    │       ├─→ For each component:
                    │       │   ├─→ component_files > 2,000?
                    │       │   │   ↓ YES → depth: "sampling"
                    │       │   │   ↓ NO  → depth: "full"
                    │       │   ├─→ is_test_or_docs?
                    │       │   │   ↓ YES → depth: "skip"
                    │       │   └─→ Add to components_to_analyze
                    │       └─→ AGENTS: count(depth != "skip")
                    └─→ RESULT: N parallel codebase-mappers, sampling for large components
```

## Decision Matrix

| Total Files | Tier | Component Files | Component Depth | Agent Count | Estimated Time |
|-------------|------|-----------------|-----------------|-------------|----------------|
| < 1,000 | small | N/A | full | 1 | 5-15 min |
| 1,000 - 10,000 | medium | < 5,000 | full | 2-5 | 15-45 min |
| 1,000 - 10,000 | medium | > 5,000 | sampling | 2-5 | 15-45 min |
| > 10,000 | large | < 2,000 | full | 3-10 | 30-60 min |
| > 10,000 | large | 2,000 - 5,000 | sampling | 3-10 | 30-60 min |
| > 10,000 | large | > 5,000 | sampling | 3-10 | 30-60 min |

## Component-Level Decisions

### Skip Determination

```
IF component matches pattern:
  - /test/
  - /tests/
  - /e2e/
  - /__tests__/
  - /docs/
  - /examples/
  - /node_modules/
  - /vendor/
  - /.git/

THEN depth = "skip"
```

### Priority Determination

```
security_relevant_files = count(
  auth files + crypto files + handler files
)

IF security_relevant_files > 10:
  priority = "high"
ELIF security_relevant_files >= 5:
  priority = "medium"
ELSE:
  priority = "low"
```

### Sampling vs Full Analysis

```
IF tier == "small":
  all_components → depth = "full"

IF tier == "medium":
  FOR each component:
    IF component_files > 5,000:
      depth = "sampling"
    ELSE:
      depth = "full"

IF tier == "large":
  FOR each component:
    IF component_files > 2,000:
      depth = "sampling"
    ELSE:
      depth = "full"
```

## Edge Cases

### Monorepo with Many Packages

**Scenario**: 50 packages in workspace, average 200 files each (10,000 total)

**Decision logic:**
1. Tier = "medium" (10,000 files)
2. Group packages by domain:
   - backend packages → single component
   - frontend packages → single component
   - tools packages → skip
3. Spawn 2 agents (backend group, frontend group)

**Example grouping:**
```json
{
  "components": [
    {
      "path": "./packages/backend-*",
      "files": 4500,
      "priority": "high",
      "recommended_depth": "full"
    },
    {
      "path": "./packages/frontend-*",
      "files": 3800,
      "priority": "high",
      "recommended_depth": "full"
    },
    {
      "path": "./packages/tools-*",
      "files": 1700,
      "priority": "low",
      "recommended_depth": "skip"
    }
  ]
}
```

### Single Giant Component

**Scenario**: All code in `./src`, 8,000 files

**Decision logic:**
1. Tier = "medium" (8,000 files)
2. Single component found: `./src`
3. Component > 5,000 files → sampling
4. Spawn 1 agent with sampling mode

**Result**: Single agent, but uses sampling strategy (not full analysis)

### No Standard Structure

**Scenario**: Flat directory, mixed file types, 3,500 files

**Decision logic:**
1. Tier = "medium" (3,500 files)
2. No components found by pattern matching
3. Fallback: Group by file extension
   - `*.go` files → "go-files" component
   - `*.ts/*.tsx` files → "typescript-files" component
   - `*.py` files → "python-files" component
4. Spawn agents per language group

### Very Deep Nesting

**Scenario**: `./src/app/modules/features/... (8 levels deep)`, 4,000 files

**Decision logic:**
1. Tier = "medium" (4,000 files)
2. Limit component discovery to depth 3
3. Treat as single component: `./src`
4. Spawn 1 agent with full analysis

**Why limit depth**: Performance degradation with `find -maxdepth 8`

## Optimization Strategies

### For Speed

**Goal**: Minimize sizing time

```bash
# Use depth limits
find {scope} -maxdepth 3 -type f | wc -l

# Exclude common large dirs
find {scope} -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/vendor/*" \
  | wc -l

# Parallel counting (requires GNU parallel)
find {scope} -type d -maxdepth 1 | \
  parallel 'echo {}: $(find {} -type f | wc -l)'
```

### For Accuracy

**Goal**: Precise component identification

```bash
# Technology-based discovery
find {scope} -name "go.mod" -exec dirname {} \;
find {scope} -name "package.json" -exec dirname {} \;

# Security pattern matching
find {scope} -type f -name "*auth*" -o -name "*crypto*"

# Handler detection
grep -r "http.HandlerFunc\|HandleFunc" {scope} --include="*.go"
```

## Thresholds Rationale

### Why 1,000 files?

- Single agent can analyze 1,000 files in 5-15 min (comfortable)
- Parallelization overhead not worth it below this threshold
- Most small apps/services fall into this category

### Why 10,000 files?

- Upper bound for full analysis without sampling
- 10,000 files ≈ 5M tokens (approximate)
- Exceeding this risks context window exhaustion

### Why 5,000 files per component (medium)?

- Large component threshold for medium tier
- 5,000 files = ~2.5M tokens per agent
- Forces sampling to stay within safe limits

### Why 2,000 files per component (large)?

- Conservative threshold for large tier
- Ensures even large tier uses sampling aggressively
- Prevents any single agent from exceeding 1M token budget

## Testing Scenarios

| Scenario | Files | Expected Tier | Expected Agents | Expected Sampling |
|----------|-------|---------------|-----------------|-------------------|
| Small app | 450 | small | 1 | No |
| Medium app | 5,400 | medium | 2-3 | No |
| Large monorepo | 15,000 | large | 5-8 | Yes |
| Flat structure | 3,500 | medium | 1 | No |
| Many tiny packages | 10,000 | medium | 2-3 | No |
| Single giant component | 8,000 | medium | 1 | Yes |
