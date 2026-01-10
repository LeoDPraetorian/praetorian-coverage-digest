# Output Schema

Complete JSON schema for `sizing-report.json` with validation rules.

## Complete Schema

```typescript
interface SizingReport {
  scope: string;                    // Path analyzed (e.g., "./modules/chariot")
  metrics: SizingMetrics;
  components: Component[];
  strategy: ParallelizationStrategy;
}

interface SizingMetrics {
  total_files: number;              // Total files in scope
  total_directories: number;        // Total directories
  estimated_loc?: number;           // Optional: Lines of code (if cloc available)
  files_by_extension: Record<string, number>;  // e.g., { ".go": 2100, ".ts": 3200 }
}

interface Component {
  path: string;                     // Relative path (e.g., "./backend")
  files: number;                    // File count in this component
  priority: "high" | "medium" | "low";
  security_relevant_files: number;  // Count of auth/crypto/handler files
  recommended_depth: "full" | "sampling" | "skip";
}

interface ParallelizationStrategy {
  tier: "small" | "medium" | "large";
  parallelization: "single" | "by-component";
  sampling_required: boolean;
  recommended_agents: number;       // How many codebase-mapper agents to spawn
  components_to_analyze: ComponentAnalysisConfig[];
  estimated_token_budget?: number;  // Optional: Rough estimate
}

interface ComponentAnalysisConfig {
  path: string;                     // Which component to analyze
  depth: "full" | "sampling" | "skip";
}
```

## Validation Rules

### Required Fields

All top-level fields are **required**:
- `scope`
- `metrics`
- `components`
- `strategy`

### Field Constraints

**scope**:
- Must be valid directory path
- Should be relative (e.g., `./modules/chariot`)

**metrics.total_files**:
- Must be >= 0
- Must match sum of component file counts

**metrics.files_by_extension**:
- Keys must start with "." (e.g., ".go", ".ts")
- Values must be >= 0

**components[].priority**:
- Must be "high", "medium", or "low"
- Based on security_relevant_files count:
  - > 10 → "high"
  - 5-10 → "medium"
  - < 5 → "low"

**components[].recommended_depth**:
- "full" - Analyze all files
- "sampling" - Use anchor files + sampling
- "skip" - Don't analyze (test/docs directories)

**strategy.tier**:
- "small" if total_files < 1,000
- "medium" if 1,000 <= total_files <= 10,000
- "large" if total_files > 10,000

**strategy.parallelization**:
- "single" for small tier
- "by-component" for medium/large tiers

**strategy.recommended_agents**:
- Must be >= 1
- For single: always 1
- For by-component: count of components with depth != "skip"

## Example: Small Codebase

```json
{
  "scope": "./my-small-app",
  "metrics": {
    "total_files": 450,
    "total_directories": 28,
    "estimated_loc": 8500,
    "files_by_extension": {
      ".ts": 320,
      ".tsx": 85,
      ".json": 45
    }
  },
  "components": [
    {
      "path": "./src",
      "files": 450,
      "priority": "medium",
      "security_relevant_files": 6,
      "recommended_depth": "full"
    }
  ],
  "strategy": {
    "tier": "small",
    "parallelization": "single",
    "sampling_required": false,
    "recommended_agents": 1,
    "components_to_analyze": [
      { "path": "./src", "depth": "full" }
    ]
  }
}
```

## Example: Medium Codebase

```json
{
  "scope": "./modules/chariot",
  "metrics": {
    "total_files": 5432,
    "total_directories": 342,
    "estimated_loc": 95000,
    "files_by_extension": {
      ".go": 2100,
      ".ts": 2200,
      ".tsx": 800,
      ".json": 250,
      ".yaml": 82
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
      "files": 2200,
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
    },
    {
      "path": "./docs",
      "files": 332,
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

## Example: Large Codebase

```json
{
  "scope": "./",
  "metrics": {
    "total_files": 15420,
    "total_directories": 892,
    "estimated_loc": 285000,
    "files_by_extension": {
      ".go": 6200,
      ".ts": 5800,
      ".tsx": 2100,
      ".py": 800,
      ".json": 450,
      ".yaml": 70
    }
  },
  "components": [
    {
      "path": "./modules/chariot/backend",
      "files": 6200,
      "priority": "high",
      "security_relevant_files": 85,
      "recommended_depth": "sampling"
    },
    {
      "path": "./modules/chariot/ui",
      "files": 5800,
      "priority": "high",
      "security_relevant_files": 18,
      "recommended_depth": "sampling"
    },
    {
      "path": "./modules/nebula",
      "files": 1200,
      "priority": "medium",
      "security_relevant_files": 32,
      "recommended_depth": "full"
    },
    {
      "path": "./modules/chariot/e2e",
      "files": 800,
      "priority": "low",
      "security_relevant_files": 0,
      "recommended_depth": "skip"
    },
    {
      "path": "./docs",
      "files": 420,
      "priority": "low",
      "security_relevant_files": 0,
      "recommended_depth": "skip"
    },
    {
      "path": "./modules/ai-research",
      "files": 1000,
      "priority": "low",
      "security_relevant_files": 2,
      "recommended_depth": "skip"
    }
  ],
  "strategy": {
    "tier": "large",
    "parallelization": "by-component",
    "sampling_required": true,
    "recommended_agents": 3,
    "components_to_analyze": [
      { "path": "./modules/chariot/backend", "depth": "sampling" },
      { "path": "./modules/chariot/ui", "depth": "sampling" },
      { "path": "./modules/nebula", "depth": "full" }
    ],
    "estimated_token_budget": 650000
  }
}
```

## Token Budget Estimation

**Formula (rough estimate):**
```
tokens_per_file = 500  # Average for source code
total_tokens = (files_to_analyze * tokens_per_file) + overhead

overhead = 50000  # Per-agent startup, summaries, handoffs
```

**Example calculations:**
- Small (450 files): 450 × 500 + 50000 = 275,000 tokens
- Medium (4300 files): 4300 × 500 + 50000 = 2,200,000 tokens
- Large with sampling (8200 files, 30% sampled): 2460 × 500 + 50000 = 1,280,000 tokens

## Schema Evolution

**Version 1.0** (current):
- Basic sizing metrics
- Component-level recommendations
- Three-tier strategy (small/medium/large)

**Future enhancements** (not yet implemented):
- Dependency graph (which components call which)
- Estimated runtime per component
- Technology stack per component
- Historical sizing data for trend analysis
