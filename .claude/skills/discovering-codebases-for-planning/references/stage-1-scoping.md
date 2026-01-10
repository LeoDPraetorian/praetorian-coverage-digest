# Stage 1: Scoping - Detailed Implementation

**Executor**: Orchestrator (not spawned agent)

**Duration**: 2-5 minutes

**Purpose**: Determine which components are relevant to the feature and how many agents to spawn for Stage 2.

---

## Input Requirements

| Input               | Source                     | Required? |
| ------------------- | -------------------------- | --------- |
| `design.md`         | Phase 1 (Brainstorming/Design) | Yes       |
| `scope_paths`       | Orchestrator configuration | Yes       |
| `OUTPUT_DIR`        | persisting-agent-outputs   | Yes       |

**design.md** must contain:
- Feature requirements (what we're building)
- Components mentioned (metrics, authentication, etc.)
- User stories or acceptance criteria

**scope_paths** examples:
- `modules/chariot/ui/src/` (frontend scope)
- `modules/chariot/backend/pkg/` (backend scope)
- `modules/janus/` (framework scope)

---

## Process (Step-by-Step)

### Step 1: Parse Feature Context from design.md

**Goal**: Extract WHAT we're building to filter components.

**Implementation**:

```bash
# Read design.md
cat $OUTPUT_DIR/design/design.md
```

**Extract**:
- Feature name (e.g., "Metrics Dashboard")
- Key components mentioned (e.g., "metrics", "dashboard", "charts")
- Technical stack (React? Go? Both?)
- User-facing vs backend-only

**Output**: `feature_context` string (2-3 sentences summarizing requirements)

**Example**:
```
"Building metrics dashboard in React UI to display vulnerability trends.
Requires backend API for metrics aggregation and frontend components for charts."
```

---

### Step 2: Quick Directory Scan

**Goal**: Identify candidate directories under scope_paths.

**Implementation**:

```bash
# For each scope path, find directories with code files
find modules/chariot/ui/src -type d -name "features" -o -name "components" -o -name "hooks" -o -name "utils"
find modules/chariot/backend/pkg -type d -maxdepth 2
```

**Candidate filtering**:
- Ignore: `node_modules/`, `dist/`, `build/`, `.git/`, `test/`, `__tests__/`
- Include: `features/`, `components/`, `hooks/`, `utils/`, `pkg/`, `handlers/`

**Output**: List of candidate directory paths

---

### Step 3: Filter to Feature-Relevant Components

**Goal**: Match feature requirements to candidate paths.

**Matching logic**:

```
FOR each candidate_path:
  relevance = 0

  # Check if path name matches feature keywords
  IF path contains ANY(feature_keywords):
    relevance += HIGH (3 points)

  # Check if path type is always relevant
  IF path matches "utils/" OR "hooks/" OR "common/":
    relevance += MEDIUM (2 points)

  # Check if path is in scope but unrelated
  IF path contains NONE(feature_keywords) AND not utils/hooks/common:
    relevance += LOW (1 point) OR SKIP

  # Count files in path
  file_count = count_code_files(path)

  IF file_count < 5:
    relevance = LOW  # Too small to need dedicated agent

  relevant_components.append({
    path: candidate_path,
    files: file_count,
    relevance: HIGH/MEDIUM/LOW,
    rationale: "why it's relevant"
  })
```

**Feature keyword extraction**:
- Extract nouns from feature_context (e.g., "metrics", "dashboard", "vulnerability")
- Convert to lowercase
- Match against path segments

**Example**:
```
Feature: "Metrics Dashboard"
Keywords: ["metrics", "dashboard", "chart"]

Candidate: modules/chariot/ui/src/features/metrics/
Match: "metrics" found → HIGH relevance
Files: 23 TypeScript files → Needs dedicated agent

Candidate: modules/chariot/ui/src/features/authentication/
Match: None → SKIP (not feature-relevant)
```

---

### Step 4: Count Files Per Component

**Goal**: Determine analysis complexity.

**Implementation**:

```bash
# Count code files (not tests, not configs)
find $component_path -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.go" -o -name "*.py" \) \
  ! -path "*/test/*" ! -path "*/__tests__/*" ! -name "*.test.*" ! -name "*.spec.*" \
  | wc -l
```

**Thresholds**:
- **< 5 files**: Very small, group with another component
- **5-50 files**: Standard, 1 agent
- **50-200 files**: Large, 1 agent (very thorough mode)
- **> 200 files**: Massive, consider splitting into sub-components or 2 agents

---

### Step 5: Calculate Agent Count

**Logic**:

```python
relevant_components = [comp for comp in all_components if comp.relevance in ['HIGH', 'MEDIUM']]

if len(relevant_components) == 0:
    # Error: No relevant components found
    return error("design.md may be incomplete or scope_paths wrong")

if len(relevant_components) == 1:
    agents = 1

elif len(relevant_components) <= 10:
    # One agent per component (ideal)
    agents = len(relevant_components)

else:
    # Max 10 agents (Claude Code parallelization limit)
    agents = 10
    # Group smallest components together
    # Assign largest N-1 components to dedicated agents
    # Assign remaining small components to 1 agent
```

**Why max 10 agents?**
- Claude Code Task tool handles up to 10 parallel agents efficiently
- Beyond 10, coordination overhead outweighs parallelization gains
- Grouping small components (<10 files each) into 1 agent is more efficient than spawning 15 agents

---

### Step 6: Generate scoping-report.json

**Goal**: Structured output for Stage 2.

**Schema**:

```json
{
  "feature_context": "string (2-3 sentences)",
  "relevant_components": [
    {
      "path": "relative/path/from/repo/root",
      "files": 23,
      "relevance": "high|medium",
      "rationale": "why this component is relevant to the feature"
    }
  ],
  "strategy": {
    "total_relevant_files": 123,
    "agent_count": 5,
    "mode": "parallel"
  },
  "timestamp": "2026-01-10T12:34:56Z",
  "scope_paths": ["modules/chariot/ui/src/", "modules/chariot/backend/pkg/"]
}
```

**Write to**:

```bash
$OUTPUT_DIR/discovery/scoping-report.json
```

---

## Output Validation

**Checklist before proceeding to Stage 2**:

- [ ] `feature_context` accurately summarizes design.md requirements
- [ ] `relevant_components` array has at least 1 entry
- [ ] All components have `relevance: high|medium` (no 'low' components included)
- [ ] `agent_count` matches logic (1 for single component, N for N components, max 10)
- [ ] `total_relevant_files` > 0
- [ ] `scoping-report.json` written to OUTPUT_DIR

**If validation fails**: Return to design.md, clarify feature requirements, re-run scoping.

---

## Example Output

**Scenario**: Building metrics dashboard feature

```json
{
  "feature_context": "Building metrics dashboard in React UI to display vulnerability trends. Requires backend API for metrics aggregation and frontend components for charts.",
  "relevant_components": [
    {
      "path": "modules/chariot/ui/src/features/metrics",
      "files": 23,
      "relevance": "high",
      "rationale": "Metrics dashboard UI implementation - exact match"
    },
    {
      "path": "modules/chariot/backend/pkg/metrics",
      "files": 15,
      "relevance": "high",
      "rationale": "Backend metrics API handlers and aggregation logic"
    },
    {
      "path": "modules/chariot/ui/src/hooks",
      "files": 12,
      "relevance": "medium",
      "rationale": "Shared React hooks - may contain reusable data fetching patterns"
    }
  ],
  "strategy": {
    "total_relevant_files": 50,
    "agent_count": 3,
    "mode": "parallel"
  },
  "timestamp": "2026-01-10T14:23:45Z",
  "scope_paths": ["modules/chariot/ui/src/", "modules/chariot/backend/pkg/"]
}
```

**Next**: Stage 2 spawns 3 Explore agents (one for metrics frontend, one for metrics backend, one for shared hooks).
