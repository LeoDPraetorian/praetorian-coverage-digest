# Handoff Format - discovery-summary.json Schema

**Purpose**: Machine-readable summary of discovery findings for downstream phases (architecture, planning, implementation).

**Consumed by**: frontend-lead, backend-lead, capability-lead (via orchestrator prompts)

**Token budget**: < 2000 tokens (for inclusion in lead agent prompts)

---

## Complete Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "feature_name",
    "timestamp",
    "reuse_percentage",
    "components_analyzed",
    "patterns_to_extend",
    "utilities_to_reuse",
    "file_placement",
    "anti_patterns"
  ],
  "properties": {
    "feature_name": {
      "type": "string",
      "description": "Human-readable feature name from design.md"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of discovery completion"
    },
    "reuse_percentage": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Estimated percentage of feature that reuses existing code"
    },
    "components_analyzed": {
      "type": "integer",
      "minimum": 1,
      "description": "Number of components analyzed in Stage 2"
    },
    "patterns_to_extend": {
      "type": "array",
      "description": "Existing code that can be modified/extended",
      "items": {
        "type": "object",
        "required": ["name", "location", "extension_point"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Function/class/component name"
          },
          "location": {
            "type": "string",
            "description": "File path + function/class name (NO line numbers)"
          },
          "current_purpose": {
            "type": "string",
            "description": "What it does now"
          },
          "extension_point": {
            "type": "string",
            "description": "How to modify for this feature"
          },
          "component": {
            "type": "string",
            "description": "Which component this came from (frontend/backend/etc)"
          }
        }
      }
    },
    "utilities_to_reuse": {
      "type": "array",
      "description": "Shared utilities/helpers to use",
      "items": {
        "type": "object",
        "required": ["name", "location", "use_case"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Function name"
          },
          "location": {
            "type": "string",
            "description": "File path + function name"
          },
          "signature": {
            "type": "string",
            "description": "Function signature with types"
          },
          "use_case": {
            "type": "string",
            "description": "When/how to use it"
          },
          "component": {
            "type": "string",
            "description": "Which component this came from"
          }
        }
      }
    },
    "patterns": {
      "type": "array",
      "description": "Architectural patterns to follow",
      "items": {
        "type": "object",
        "required": ["pattern", "description", "example_location"],
        "properties": {
          "pattern": {
            "type": "string",
            "description": "Pattern name"
          },
          "description": {
            "type": "string",
            "description": "What the pattern enforces"
          },
          "example_location": {
            "type": "string",
            "description": "Where it's demonstrated"
          },
          "mandatory": {
            "type": "boolean",
            "description": "Must follow (true) or recommended (false)"
          }
        }
      }
    },
    "file_placement": {
      "type": "array",
      "description": "WHERE to place new code",
      "items": {
        "type": "object",
        "required": ["type", "recommended_path", "rationale"],
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "component",
              "hook",
              "utility",
              "handler",
              "model",
              "service",
              "test",
              "config"
            ],
            "description": "Type of code artifact"
          },
          "recommended_path": {
            "type": "string",
            "description": "Suggested file path (relative to repo root)"
          },
          "rationale": {
            "type": "string",
            "description": "Why this location (follows existing pattern, etc)"
          },
          "naming_convention": {
            "type": "string",
            "description": "File naming pattern (PascalCase, camelCase, snake_case)"
          }
        }
      }
    },
    "anti_patterns": {
      "type": "array",
      "description": "Specific code smells to avoid",
      "items": {
        "type": "string",
        "description": "Anti-pattern with rationale (e.g., 'Do not duplicate X - use Y instead')"
      }
    },
    "discovery_gaps": {
      "type": "array",
      "description": "Components that were scoped but not fully analyzed",
      "items": {
        "type": "object",
        "required": ["component", "reason"],
        "properties": {
          "component": {
            "type": "string",
            "description": "Component path"
          },
          "reason": {
            "type": "string",
            "description": "Why incomplete (timeout, error, etc)"
          }
        }
      }
    },
    "metadata": {
      "type": "object",
      "description": "Additional context for debugging/auditing",
      "properties": {
        "orchestrator": {
          "type": "string",
          "description": "Which orchestrator invoked this (orchestrating-feature-development, etc)"
        },
        "agent_count": {
          "type": "integer",
          "description": "How many agents spawned in Stage 2"
        },
        "scope_paths": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Scope paths used in Stage 1"
        },
        "total_files_analyzed": {
          "type": "integer",
          "description": "Total code files analyzed across all components"
        }
      }
    }
  }
}
```

---

## Example: Medium Codebase (3 Components)

```json
{
  "feature_name": "Metrics Dashboard",
  "timestamp": "2026-01-10T14:23:45Z",
  "reuse_percentage": 65,
  "components_analyzed": 3,
  "patterns_to_extend": [
    {
      "name": "useMetrics",
      "location": "modules/chariot/ui/src/hooks/useMetrics.ts - useMetrics hook",
      "current_purpose": "Fetch vulnerability metrics from API",
      "extension_point": "Add query parameters for date range filtering and metric type selection",
      "component": "metrics-frontend"
    },
    {
      "name": "GetMetricsHandler",
      "location": "modules/chariot/backend/pkg/metrics/handlers/get_metrics.go - GetMetricsHandler func",
      "current_purpose": "Return all metrics without filtering",
      "extension_point": "Add query string parsing for filters (date_from, date_to, metric_type)",
      "component": "metrics-backend"
    }
  ],
  "utilities_to_reuse": [
    {
      "name": "formatDate",
      "location": "modules/chariot/ui/src/utils/formatters.ts - formatDate",
      "signature": "(date: Date, format?: string) => string",
      "use_case": "Format all timestamps in dashboard (chart labels, tooltips, export filenames)",
      "component": "shared-hooks"
    },
    {
      "name": "formatNumber",
      "location": "modules/chariot/ui/src/utils/formatters.ts - formatNumber",
      "signature": "(num: number, decimals?: number) => string",
      "use_case": "Format metric values with K/M suffixes (e.g., 1.2K vulnerabilities)",
      "component": "shared-hooks"
    },
    {
      "name": "useDebounce",
      "location": "modules/chariot/ui/src/hooks/useDebounce.ts - useDebounce",
      "signature": "<T>(value: T, delay: number) => T",
      "use_case": "Debounce filter input changes to avoid excessive API calls",
      "component": "shared-hooks"
    },
    {
      "name": "apiClient",
      "location": "modules/chariot/ui/src/lib/api.ts - apiClient",
      "signature": "{ get, post, put, delete }",
      "use_case": "All API calls - includes auth headers, error handling, retry logic",
      "component": "shared-hooks"
    }
  ],
  "patterns": [
    {
      "pattern": "Feature-based organization",
      "description": "All feature code (components, hooks, utils) colocates in features/{name}/",
      "example_location": "features/metrics/, features/assets/, features/vulnerabilities/",
      "mandatory": true
    },
    {
      "pattern": "TanStack Query for API",
      "description": "Use useQuery for GET, useMutation for POST/PUT/DELETE",
      "example_location": "hooks/useMetrics.ts, hooks/useAssets.ts",
      "mandatory": true
    },
    {
      "pattern": "Barrel exports",
      "description": "Each feature exports via index.ts barrel",
      "example_location": "features/metrics/index.ts",
      "mandatory": false
    }
  ],
  "file_placement": [
    {
      "type": "component",
      "recommended_path": "modules/chariot/ui/src/features/metrics/components/MetricsDashboardFilter.tsx",
      "rationale": "Follows feature-based organization. Metrics-related components colocate in features/metrics/components/",
      "naming_convention": "PascalCase"
    },
    {
      "type": "hook",
      "recommended_path": "modules/chariot/ui/src/features/metrics/hooks/useMetricsFilter.ts",
      "rationale": "Feature-specific hooks stay in feature directory. Keep filter logic close to components.",
      "naming_convention": "camelCase with 'use' prefix"
    },
    {
      "type": "handler",
      "recommended_path": "modules/chariot/backend/pkg/metrics/handlers/get_filtered_metrics_handler.go",
      "rationale": "Handlers grouped by domain. Create new file per endpoint following snake_case convention.",
      "naming_convention": "snake_case with '_handler.go' suffix"
    }
  ],
  "anti_patterns": [
    "Do not duplicate MetricsContext - extend the existing Context in features/metrics/context.tsx instead",
    "Do not use fetch directly - always use apiClient wrapper for auth headers and error handling",
    "Do not create inline data transformations - extract to utility functions for testability",
    "Do not mix feature and shared code - keep metrics-specific logic in features/metrics/, not shared components/",
    "Do not use deprecated useState for server state - TanStack Query is the standard"
  ],
  "discovery_gaps": [],
  "metadata": {
    "orchestrator": "orchestrating-feature-development",
    "agent_count": 3,
    "scope_paths": [
      "modules/chariot/ui/src/",
      "modules/chariot/backend/pkg/"
    ],
    "total_files_analyzed": 50
  }
}
```

---

## Example: Greenfield Component (Low Reuse)

```json
{
  "feature_name": "AI-Powered Vulnerability Triage",
  "timestamp": "2026-01-10T15:45:12Z",
  "reuse_percentage": 15,
  "components_analyzed": 2,
  "patterns_to_extend": [],
  "utilities_to_reuse": [
    {
      "name": "apiClient",
      "location": "modules/chariot/ui/src/lib/api.ts - apiClient",
      "signature": "{ get, post, put, delete }",
      "use_case": "All API calls for AI service communication",
      "component": "shared-hooks"
    }
  ],
  "patterns": [
    {
      "pattern": "Feature-based organization",
      "description": "All feature code colocates in features/{name}/",
      "example_location": "features/metrics/, features/assets/",
      "mandatory": true
    }
  ],
  "file_placement": [
    {
      "type": "component",
      "recommended_path": "modules/chariot/ui/src/features/ai-triage/components/",
      "rationale": "New feature area - create dedicated feature directory following existing pattern",
      "naming_convention": "PascalCase"
    },
    {
      "type": "service",
      "recommended_path": "modules/chariot/backend/pkg/ai/services/triage_service.go",
      "rationale": "New AI domain - create pkg/ai/ for all AI-related services",
      "naming_convention": "snake_case with '_service.go' suffix"
    }
  ],
  "anti_patterns": [
    "Do not use fetch directly - always use apiClient wrapper"
  ],
  "discovery_gaps": [],
  "metadata": {
    "orchestrator": "orchestrating-feature-development",
    "agent_count": 2,
    "scope_paths": [
      "modules/chariot/ui/src/",
      "modules/chariot/backend/pkg/"
    ],
    "total_files_analyzed": 8
  }
}
```

**Interpretation**:
- Low reuse (15%) indicates greenfield feature
- No patterns_to_extend → entirely new functionality
- Minimal utilities_to_reuse → mostly net-new code
- File placement guidance creates new directories
- Anti-patterns still enforced (apiClient usage)

---

## Usage in Downstream Phases

### Architecture Phase (frontend-lead/backend-lead)

**Prompt inclusion**:

```
You are designing the architecture for: {feature_name}

DISCOVERY FINDINGS (from codebase analysis):

Reuse Percentage: {reuse_percentage}%

Patterns to Extend:
{format patterns_to_extend as bullet list}

Utilities to Reuse:
{format utilities_to_reuse as bullet list}

Architectural Patterns:
{format patterns as bullet list, highlight mandatory ones}

File Placement:
{format file_placement as bullet list}

Anti-Patterns to Avoid:
{format anti_patterns as bullet list}

Design your architecture to MAXIMIZE reuse of existing code and FOLLOW established patterns.
```

**Token budget**: ~1500-1800 tokens for medium discovery

### Planning Phase (writing-plans)

**Prompt inclusion**:

```
Create implementation plan for: {feature_name}

FILES TO MODIFY (from discovery):
{list patterns_to_extend with their locations}

UTILITIES TO IMPORT (from discovery):
{list utilities_to_reuse with their locations}

NEW FILES TO CREATE:
{list file_placement recommendations}

MUST AVOID:
{list anti_patterns}
```

**Token budget**: ~1000 tokens (subset of discovery-summary.json)

### Implementation Phase (developers)

Developers receive:
- **file-placement.md** - Quick reference for WHERE to put code
- **discovery.md** - Full context (if needed for deep dives)
- **NOT discovery-summary.json** - Machine format, not human-readable

---

## Validation

**Before writing discovery-summary.json, verify**:

- [ ] `reuse_percentage` is calculated (formula in stage-3-synthesis.md)
- [ ] `patterns_to_extend` array has NO line numbers in `location` field
- [ ] `utilities_to_reuse` includes `signature` for functions (helps developers understand usage)
- [ ] `file_placement` includes `rationale` (not just "put it here")
- [ ] `anti_patterns` are SPECIFIC (not generic advice)
- [ ] `discovery_gaps` documents any incomplete components (or empty array if complete)
- [ ] `metadata` includes `orchestrator`, `agent_count`, `scope_paths` for audit trail

**Token count check**:

```bash
cat discovery-summary.json | wc -m  # Should be < 10,000 characters (~2000 tokens)
```

If > 2000 tokens: Trim `patterns_to_extend` and `utilities_to_reuse` to top 10 most relevant items each.

---

## Related Files

- **discovery.md** - Human-readable summary (unlimited length, for manual review)
- **file-placement.md** - Quick reference guide (< 500 tokens)
- **discovery-summary.json** - Machine-readable (this file, < 2000 tokens)

All three written to: `$OUTPUT_DIR/discovery/`
