---
name: sizing-codebases
description: Use when assessing codebase size (Phase 2) after Phase 1 Business Context - counts files per component, categorizes as small/medium/large, outputs sizing-report.json with parallelization strategy
allowed-tools: Bash, Glob, Grep, Read, Write, TodoWrite
---

# Codebase Sizing

**Systematic methodology for assessing codebase size to inform threat modeling Phase 3 parallelization strategy.**

## When to Use

Use this skill when:

- Starting threat modeling workflow after Phase 1 (Business Context) completes
- Need to determine how many `codebase-mapper` agents to spawn for Phase 3
- Want data-driven decisions for parallelization vs single-agent execution
- Must decide between full analysis vs sampling for large codebases
- Preventing agent timeouts by identifying oversized components upfront

**You MUST use TodoWrite** to track progress through all 5 workflow steps.

---

## Quick Reference

| Step                          | Purpose                                      | Command Example                 | Output             |
| ----------------------------- | -------------------------------------------- | ------------------------------- | ------------------ |
| 1. File Counting              | Total files and per-directory counts         | `find {scope} -type f \| wc -l` | File counts        |
| 2. Component Discovery        | Identify components by directory heuristics  | `ls -d {scope}/*/`              | Component list     |
| 3. Size Categorization        | Classify as small/medium/large               | Compare totals to thresholds    | Tier assignment    |
| 4. Security Relevance Scoring | Prioritize components with auth/crypto files | `find -name "*auth*"`           | Priority weights   |
| 5. Strategy Recommendation    | Output parallelization decision              | Generate JSON                   | sizing-report.json |

---

## Strategy Matrix

| Total Files    | Tier   | Parallelization | Analysis Depth     | Estimated Time |
| -------------- | ------ | --------------- | ------------------ | -------------- |
| < 1,000        | small  | Single agent    | Full               | 5-15 min       |
| 1,000 - 10,000 | medium | Per-component   | Full               | 15-45 min      |
| > 10,000       | large  | Per-component   | Sampling + anchors | 30-60 min      |

**Per-Component Thresholds:**

| Component Files | Recommendation                               |
| --------------- | -------------------------------------------- |
| < 500           | Single agent, full analysis                  |
| 500 - 2,000     | Single agent, full analysis                  |
| 2,000 - 5,000   | Consider splitting if multiple subcomponents |
| > 5,000         | Must split or use sampling                   |

---

## Core Workflow

### Step 1: File Counting

**Goal**: Count total files and files per directory.

**Commands:**

```bash
# Total files in scope
find {scope} -type f | wc -l

# Files by extension (technology detection)
find {scope} -type f -name "*.go" -o -name "*.ts" -o -name "*.tsx" | wc -l

# Per-directory file counts
for dir in {scope}/*/; do
  echo "$dir: $(find "$dir" -type f | wc -l)"
done

# Optional: Lines of code estimate (if cloc available)
cloc --quiet --sum-one {scope}
```

**Output**: Record total_files, files_by_extension, directory counts.

---

### Step 2: Component Discovery

**Goal**: Identify logical components by directory heuristics.

**Detection patterns:**

```bash
# Common component directory patterns
ls -d {scope}/*/ 2>/dev/null | grep -E "(api|backend|frontend|ui|web|cmd|pkg|internal|src|lib|services|handlers|controllers|models|database|auth|infra)"
```

**Component types to identify:**

| Pattern                         | Component Type | Security Relevance                 |
| ------------------------------- | -------------- | ---------------------------------- |
| `api/`, `backend/`, `services/` | Backend API    | High - entry points, data handling |
| `frontend/`, `ui/`, `web/`      | Frontend       | Medium - XSS, client-side risks    |
| `auth/`, `authentication/`      | Authentication | Critical - identity verification   |
| `cmd/`, `pkg/` (Go)             | CLI/Libraries  | Medium - command injection risks   |
| `infra/`, `terraform/`          | Infrastructure | Medium - misconfigurations         |
| `e2e/`, `tests/`, `docs/`       | Supporting     | Low - skip for threat modeling     |

**Output**: List of component paths with file counts.

---

### Step 3: Size Categorization

**Goal**: Classify codebase as small/medium/large based on total file count.

**Decision logic:**

```
IF total_files < 1,000:
  tier = "small"
  parallelization = "single"
  sampling_required = false

ELIF total_files >= 1,000 AND total_files <= 10,000:
  tier = "medium"
  parallelization = "by-component"
  sampling_required = false

ELIF total_files > 10,000:
  tier = "large"
  parallelization = "by-component"
  sampling_required = true
```

**Output**: Tier assignment (small/medium/large).

---

### Step 4: Security Relevance Scoring

**Goal**: Prioritize components containing security-relevant files.

**Detection patterns:**

```bash
# Authentication files
find {scope} -type f \( -name "*auth*" -o -name "*jwt*" -o -name "*token*" -o -name "*session*" \) | wc -l

# Cryptography files
find {scope} -type f \( -name "*crypto*" -o -name "*encrypt*" -o -name "*hash*" -o -name "*key*" \) | wc -l

# Handler/controller files (entry points)
find {scope} -type f \( -name "*handler*" -o -name "*controller*" -o -name "*route*" \) | wc -l
```

**Priority weighting:**

| Security-Relevant Files | Priority |
| ----------------------- | -------- |
| > 10 auth/crypto files  | high     |
| 5-10 auth/crypto files  | medium   |
| < 5 auth/crypto files   | low      |

**Output**: Component list with priority assignments.

---

### Step 5: Strategy Recommendation

**Goal**: Generate sizing-report.json with parallelization strategy.

**Output schema:**

```json
{
  "scope": "./modules/chariot",
  "metrics": {
    "total_files": 8432,
    "total_directories": 342,
    "estimated_loc": 156000,
    "files_by_extension": {
      ".go": 2100,
      ".ts": 3200,
      ".tsx": 1800,
      ".py": 500
    }
  },
  "components": [
    {
      "path": "./backend",
      "files": 2100,
      "priority": "high",
      "security_relevant_files": 45,
      "recommended_depth": "full"
    },
    {
      "path": "./ui",
      "files": 5000,
      "priority": "high",
      "security_relevant_files": 12,
      "recommended_depth": "full"
    },
    {
      "path": "./e2e",
      "files": 800,
      "priority": "low",
      "security_relevant_files": 0,
      "recommended_depth": "skip"
    }
  ],
  "strategy": {
    "tier": "medium",
    "parallelization": "by-component",
    "sampling_required": false,
    "recommended_agents": 2,
    "components_to_analyze": [
      { "path": "./backend", "depth": "full" },
      { "path": "./ui", "depth": "full" }
    ],
    "estimated_token_budget": 450000
  }
}
```

**Write location**: `.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/sizing-report.json`

**See [references/output-schema.md](references/output-schema.md) for complete JSON schema.**

---

## Integration with Threat Modeling Orchestrator

This skill is executed as **Phase 2** (automatic, no checkpoint) between Phase 1 and Phase 3.

**Orchestrator consumption:**

```python
# Pseudocode for orchestrator logic
sizing = read("phase-2/sizing-report.json")

if sizing.strategy.tier == "small":
    # Single agent, full analysis
    Task("codebase-mapper", f"Analyze {scope}")

elif sizing.strategy.tier == "medium":
    # Parallel agents per component, full analysis
    for component in sizing.strategy.components_to_analyze:
        Task("codebase-mapper", f"Analyze {component.path}")

elif sizing.strategy.tier == "large":
    # Parallel agents per component, sampling mode
    for component in sizing.strategy.components_to_analyze:
        Task("codebase-mapper", f"Analyze {component.path} with sampling")
```

**See [references/orchestrator-integration.md](references/orchestrator-integration.md) for complete integration details.**

---

## Critical Rules

### DO

- ✅ Always count files before making parallelization decisions
- ✅ Use directory heuristics to discover components dynamically
- ✅ Skip test/docs/examples directories (low security value)
- ✅ Weight components by security-relevant file presence
- ✅ Output structured JSON for machine consumption

### DON'T

- ❌ Hardcode component paths - discover them dynamically
- ❌ Skip sizing and guess parallelization strategy
- ❌ Analyze test directories in threat modeling
- ❌ Use LOC as primary metric (unreliable, slow to compute)
- ❌ Proceed to Phase 3 without generating sizing-report.json

---

## Handling Edge Cases

**Monorepo structure**: Treat each package/module as separate component. Look for workspace configuration (`pnpm-workspace.yaml`, `go.work`).

**Polyglot codebase**: Run technology detection per directory. Map which components use which stack.

**No standard directory structure**: Fall back to file extension-based grouping. Group by language/framework.

**Very deep nesting**: Limit depth to 3 levels. Beyond that, treat as single large component requiring sampling.

---

## Output Artifacts

| File                 | Location                                                      | Purpose                                       |
| -------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| `sizing-report.json` | `.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/` | Machine-readable sizing data for orchestrator |

**No checkpoint required** - sizing is automatic progression to Phase 3.

---

## References

- [references/sizing-commands.md](references/sizing-commands.md) - Complete command reference by OS
- [references/output-schema.md](references/output-schema.md) - Complete JSON schema with validation
- [references/orchestrator-integration.md](references/orchestrator-integration.md) - How orchestrator consumes sizing data
- [references/strategy-decision-tree.md](references/strategy-decision-tree.md) - Visual flowchart for tier selection

---

## Related Skills

- `codebase-mapping` - Phase 3 methodology (uses sizing output)
- `threat-modeling-orchestrator` - Invokes this skill as Phase 2
- `business-context-discovery` - Phase 1 (runs before sizing)

---

## Troubleshooting

**Problem**: No components detected
**Solution**: Lower threshold for grep pattern. Check for non-standard directory names.

**Problem**: File count very slow (>30 seconds)
**Solution**: Large codebase. Use `find {scope} -maxdepth 3` to limit depth.

**Problem**: Monorepo with 50+ packages
**Solution**: Group packages by domain. Treat groups as components.
