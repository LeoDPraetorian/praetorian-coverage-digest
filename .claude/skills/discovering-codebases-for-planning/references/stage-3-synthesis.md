# Stage 3: Synthesis + Verification - Merging Multi-Agent Discoveries

**Executor**: Orchestrator (not spawned agent)

**Duration**: 5-10 minutes

**Purpose**: Merge findings from N agents into unified, deduplicated view for architecture/planning phases.

---

## Input: N Discovery Reports

Read all agent outputs:

```bash
ls $OUTPUT_DIR/discovery/discovery-*.md
```

Expected files:
- `discovery-{component-1}.md`
- `discovery-{component-2}.md`
- ... (one per agent from Stage 2)

---

## Process Overview

```
Stage 3 Workflow:
1. Read all agent reports → Extract structured data
2. Merge tables across reports → Unified view
3. Deduplicate entries → Same utility found by multiple agents?
4. Verify completeness → All components covered?
5. Resolve conflicts → Agents disagree on pattern?
6. Generate file placement → WHERE code should go
7. Produce handoff artifacts → discovery.md + summary.json
```

---

## Step 1: Extract Structured Data

Parse each `discovery-{component}.md` file:

**Extract from each file**:

- Component overview (path, files, purpose)
- Existing Code to Extend (table rows)
- Utilities to Reuse (table rows)
- Patterns to Follow (table rows)
- File Placement Guidance (prose)
- Anti-Patterns (list items)

**Data structure** (in-memory):

```python
{
  "component_name": {
    "overview": {...},
    "extensions": [ { name, location, purpose, extension_point }, ... ],
    "utilities": [ { name, location, signature, use_case }, ... ],
    "patterns": [ { pattern, description, example_location }, ... ],
    "placement": "prose guidance",
    "anti_patterns": [ "item1", "item2", ... ]
  }
}
```

---

## Step 2: Merge Tables Across Reports

**Goal**: Create unified tables with ALL findings from ALL agents.

### Merge Algorithm: Existing Code to Extend

```python
merged_extensions = []

for component_data in all_components:
  for extension in component_data["extensions"]:
    # Add component source to each entry
    extension["component"] = component_data["name"]
    merged_extensions.append(extension)

# Sort by component, then by name
merged_extensions.sort(key=lambda x: (x["component"], x["name"]))
```

**Output table**:

| Component | Name             | Location        | Current Purpose         | Extension Point               |
| --------- | ---------------- | --------------- | ----------------------- | ----------------------------- |
| Frontend  | MetricsDashboard | Dashboard.tsx   | Display metrics         | Add new chart types           |
| Backend   | GetMetricsHandler | metrics.go      | Fetch metrics from DB   | Add filtering parameters      |

**Same algorithm for**:
- Utilities to Reuse
- Patterns to Follow

---

## Step 3: Deduplicate Cross-Component Findings

**Problem**: Multiple agents may discover the same utility (e.g., `formatDate` found by both frontend and backend agents).

**Deduplication logic**:

```python
def deduplicate_utilities(utilities):
  seen = {}  # key: (name, location), value: first occurrence

  for util in utilities:
    key = (util["name"], util["location"])

    if key in seen:
      # Merge use cases from duplicate
      seen[key]["use_case"] += f"; {util['use_case']}"
      seen[key]["found_by"].append(util["component"])
    else:
      util["found_by"] = [util["component"]]
      seen[key] = util

  return list(seen.values())
```

**Example deduplication**:

**Before**:
| Component | Name       | Location        | Use Case           |
| --------- | ---------- | --------------- | ------------------ |
| Frontend  | formatDate | utils/date.ts   | Format timestamps  |
| Backend   | formatDate | utils/date.ts   | Format log timestamps |

**After**:
| Name       | Location        | Use Case                          | Found By           |
| ---------- | --------------- | --------------------------------- | ------------------ |
| formatDate | utils/date.ts   | Format timestamps; Format log timestamps | Frontend, Backend |

**Benefits**:
- Clearer reuse percentage calculation
- Architects see utility is widely applicable
- Prevents duplicate recommendations

---

## Step 4: Verify Completeness

**Goal**: Ensure all components from Stage 1 scoping have corresponding discovery reports.

**Implementation**:

```python
scoping = read_json("$OUTPUT_DIR/discovery/scoping-report.json")
expected_components = [c["path"] for c in scoping["relevant_components"]]

discovered_components = [extract_component_from_filename(f) for f in discovery_files]

missing = set(expected_components) - set(discovered_components)

if missing:
  log_warning(f"Incomplete discovery: {missing}")
  # Document gap in discovery.md
  # Proceed anyway - partial discovery better than blocking
```

**Document gaps**:

```markdown
## Discovery Gaps

The following components were scoped but not fully analyzed:

- `modules/janus/pkg/scanner` - Agent timed out (component too large)
- Recommendation: Manual review or targeted follow-up discovery
```

---

## Step 5: Resolve Conflicts

**Problem**: Agents may disagree on patterns or recommendations.

**Example conflict**:

- Frontend agent: "Use Zustand for state management"
- Backend agent: "State management not needed, use React Context"

**Resolution strategy**:

```
IF both recommendations are valid (not mutually exclusive):
  → Document both with pros/cons
  → Let architect decide in next phase

IF recommendations contradict:
  → Investigate: which is project standard?
  → Check existing codebase prevalence
  → Flag for architect decision with data

IF one recommendation is clearly wrong:
  → Discard incorrect one
  → Document why (e.g., "Zustand not used in this codebase")
```

**Output in discovery.md**:

```markdown
## Conflicting Recommendations

**State Management Approach**:

Option A (Frontend discovery): Use Zustand
- Rationale: Lightweight, minimal boilerplate
- Found in: 0 existing files (not currently used)

Option B (Backend discovery): Use React Context
- Rationale: Standard React pattern
- Found in: 12 existing files (established pattern)

**Recommendation**: Follow Option B (React Context) - matches existing patterns.
```

---

## Step 6: Generate File Placement Guidance

**Goal**: Tell architect WHERE to put new code (not WHAT code to write).

**Aggregation logic**:

Extract "File Placement Guidance" prose from each agent → Synthesize into unified recommendations.

**Synthesis pattern**:

```markdown
## File Placement Recommendations

### New React Components
**Location**: `modules/chariot/ui/src/features/metrics/components/`
**Rationale**: Follows existing feature-based organization. All metrics-related components colocate here.
**Naming**: PascalCase, descriptive (e.g., `MetricsDashboardChart.tsx`)

### New Custom Hooks
**Location**: `modules/chariot/ui/src/features/metrics/hooks/`
**Rationale**: Feature-specific hooks stay in feature directory. Shared hooks go in `src/hooks/`.
**Naming**: Camel case, prefix with `use` (e.g., `useMetricsData.ts`)

### New Backend Handlers
**Location**: `modules/chariot/backend/pkg/metrics/handlers/`
**Rationale**: Handlers grouped by domain. Create new file per endpoint.
**Naming**: snake_case, suffix with `_handler.go` (e.g., `get_metrics_handler.go`)
```

**File placement sources**:
1. Existing directory structure (most authoritative)
2. Patterns found in similar features
3. Project conventions (CLAUDE.md, DESIGN-PATTERNS.md)

---

## Step 7: Calculate Reuse Percentage

**Goal**: Quantify how much existing code can be leveraged vs net-new code.

**Formula**:

```
reuse_percentage = (
  (utilities_to_reuse_count * 10) +
  (extensions_count * 5) +
  (patterns_to_follow_count * 3)
) / (estimated_new_functions_count * 10) * 100
```

**Interpretation**:

- **< 20%**: Mostly greenfield, new feature area
- **20-50%**: Moderate reuse, some patterns to follow
- **50-80%**: High reuse, mostly extending existing code
- **> 80%**: Minimal new code, primarily configuration/wiring

**Example**:

```
Utilities to reuse: 8 items (80 points)
Extensions: 6 items (30 points)
Patterns: 10 items (30 points)
Total reuse score: 140 points

Estimated new functions: 15 (150 points)

Reuse percentage: 140 / 150 * 100 = 93%
```

**Note**: This is a rough heuristic, not precise measurement. Use for planning prioritization.

---

## Step 8: Produce Handoff Artifacts

### Output 1: discovery.md (Human-Readable)

**Structure**:

```markdown
# Codebase Discovery: {Feature Name}

*Generated: {timestamp}*
*Components Analyzed: {count}*
*Reuse Percentage: {XX}%*

---

## Executive Summary

{2-3 paragraphs: What we found, key reuse opportunities, file placement strategy}

---

## Discovery Findings

### Existing Code to Extend

{Merged, deduplicated table}

### Utilities to Reuse

{Merged, deduplicated table}

### Patterns to Follow

{Merged, deduplicated table}

---

## File Placement Recommendations

{Aggregated guidance from all agents}

---

## Anti-Patterns to Avoid

{Merged list from all agents, deduplicated}

---

## Discovery Gaps

{Any incomplete/missing components}

---

## Conflicting Recommendations

{If any conflicts exist, document resolution}

---

## Appendix: Component-Specific Reports

{Links to individual discovery-{component}.md files for deep dives}
```

**Write to**: `$OUTPUT_DIR/discovery/discovery.md`

---

### Output 2: file-placement.md (Concise Reference)

**Structure**:

```markdown
# File Placement Guide: {Feature Name}

Quick reference for WHERE to place new code.

## Frontend

| Code Type       | Location                          | Naming Convention  |
| --------------- | --------------------------------- | ------------------ |
| Components      | `features/metrics/components/`    | PascalCase         |
| Hooks           | `features/metrics/hooks/`         | camelCase, `use*`  |
| Utilities       | `features/metrics/utils/`         | camelCase          |

## Backend

| Code Type       | Location                          | Naming Convention  |
| --------------- | --------------------------------- | ------------------ |
| Handlers        | `pkg/metrics/handlers/`           | snake_case, `*_handler.go` |
| Models          | `pkg/metrics/models/`             | PascalCase         |
| Services        | `pkg/metrics/services/`           | snake_case, `*_service.go` |
```

**Write to**: `$OUTPUT_DIR/discovery/file-placement.md`

---

### Output 3: discovery-summary.json (Machine-Readable)

**Schema**: See [references/handoff-format.md](handoff-format.md) for complete schema.

**Purpose**: Consumed by architect/planning phases for programmatic access to findings.

**Key fields**:
- `reuse_percentage` (number)
- `components_analyzed` (number)
- `patterns_to_extend` (array of objects)
- `utilities_to_reuse` (array of objects)
- `file_placement` (array of objects)
- `anti_patterns` (array of strings)

**Write to**: `$OUTPUT_DIR/discovery/discovery-summary.json`

---

## Quality Gates

**Checklist before handing off to next phase**:

- [ ] All agent reports read and parsed
- [ ] Tables merged across components
- [ ] Cross-component findings deduplicated
- [ ] Completeness verified (or gaps documented)
- [ ] Conflicts resolved (or flagged for architect)
- [ ] File placement guidance generated
- [ ] Reuse percentage calculated
- [ ] All 3 output artifacts written (discovery.md, file-placement.md, discovery-summary.json)

---

## Handoff to Next Phase

**For orchestrating-feature-development**:
- discovery.md → Human-readable summary for architect review
- discovery-summary.json → Machine-readable for frontend-lead/backend-lead prompts
- file-placement.md → Quick reference during implementation

**Token budget**:
- discovery-summary.json: < 2000 tokens (for inclusion in lead prompts)
- discovery.md: < 5000 tokens (for architect review, not included in prompts)
- file-placement.md: < 500 tokens (for quick reference)

---

## Example Synthesis Output

See [examples/synthesis-output/](../examples/synthesis-output/) for complete examples:

- Small codebase (1 component, 10 files)
- Medium codebase (3 components, 50 files)
- Large codebase (8 components, 200 files)

Each example includes:
- Input: scoping-report.json + discovery-*.md files
- Output: discovery.md + file-placement.md + discovery-summary.json
