# Phase 0: Setup

**Purpose**: Create isolated workspace for integration development with metadata tracking.

## Overview

Phase 0 establishes the foundational workspace structure before any development work begins. This phase creates a timestamped output directory following the `persisting-agent-outputs` pattern, initializes tracking metadata, and sets up the MANIFEST.yaml file for documenting all workflow artifacts.

## Output Directory Structure

```bash
.claude/.output/integrations/YYYYMMDD-HHMMSS-{vendor-name}/
├── metadata.json        # Status, vendor, integration type, phase tracking
├── MANIFEST.yaml        # File inventory with descriptions
└── [phase outputs...]   # Created as phases execute
```

**Directory naming convention:**
- Timestamp: `YYYYMMDD-HHMMSS` format for sortability
- Vendor name: Lowercase, hyphenated (e.g., `shodan`, `wiz`, `qualys`)
- Full example: `.claude/.output/integrations/20260114-143022-shodan/`

## Prerequisites

**MANDATORY skills to invoke before Phase 0:**

1. **persisting-agent-outputs** - Defines output directory structure, MANIFEST.yaml format, and metadata.json schema
2. **orchestrating-multi-agent-workflows** - Agent coordination patterns, handoff protocols, and progress tracking

These skills provide the foundational patterns that Phase 0 implements. Cannot proceed without loading both.

## Setup Steps

### Step 1: Create Output Directory

```bash
# Navigate to repository root
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
cd "$ROOT"

# Generate timestamp and vendor slug
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
VENDOR="vendor-name"  # Lowercase, hyphenated

# Create directory structure
OUTPUT_DIR=".claude/.output/integrations/${TIMESTAMP}-${VENDOR}"
mkdir -p "${OUTPUT_DIR}"

echo "Created output directory: ${OUTPUT_DIR}"
```

### Step 2: Initialize metadata.json

The metadata.json file tracks workflow state, phase completion, and execution history.

**Initial structure:**

```json
{
  "vendor": "shodan",
  "integration_type": "asset_discovery",
  "status": "in_progress",
  "created_at": "2026-01-14T14:30:22Z",
  "phases": {
    "phase-0": {
      "status": "complete",
      "timestamp": "2026-01-14T14:30:22Z"
    },
    "phase-1": {
      "status": "pending"
    },
    "phase-2": {
      "status": "pending"
    },
    "phase-3": {
      "status": "pending"
    },
    "phase-4": {
      "status": "pending"
    },
    "phase-4.5": {
      "status": "pending"
    },
    "phase-5": {
      "status": "pending"
    },
    "phase-6": {
      "status": "pending"
    },
    "phase-7": {
      "status": "pending"
    },
    "phase-8": {
      "status": "pending"
    }
  }
}
```

**Field definitions:**

| Field | Type | Description |
|-------|------|-------------|
| vendor | string | Vendor name (lowercase, no spaces) |
| integration_type | enum | asset_discovery \| vuln_sync \| bidirectional_sync |
| status | enum | in_progress \| blocked \| complete |
| created_at | ISO 8601 | Workflow start timestamp |
| phases.{phase-id}.status | enum | pending \| in_progress \| complete \| skipped |
| phases.{phase-id}.timestamp | ISO 8601 | Phase completion time |

### Step 3: Initialize MANIFEST.yaml

The MANIFEST.yaml provides human-readable documentation of all workflow artifacts.

**Initial structure:**

```yaml
integration: shodan
created: 2026-01-14T14:30:22Z
output_directory: .claude/.output/integrations/20260114-143022-shodan/

files:
  - path: metadata.json
    description: Workflow status and phase tracking
    phase: "0"
    created: 2026-01-14T14:30:22Z

  - path: MANIFEST.yaml
    description: File inventory with descriptions
    phase: "0"
    created: 2026-01-14T14:30:22Z

# Additional files added as phases execute
```

**MANIFEST updates:** Each phase appends new entries as files are created.

## Integration Type Classification

The `integration_type` field categorizes the integration's primary purpose:

| Type | Description | Examples | Frontend Needed? |
|------|-------------|----------|------------------|
| **asset_discovery** | Discovers and imports external assets | Shodan, Censys, SecurityScorecard | YES (API credentials) |
| **vuln_sync** | Imports vulnerabilities for existing assets | Qualys, Tenable, InsightVM | YES (API credentials) |
| **bidirectional_sync** | Two-way data sync (assets + vulnerabilities) | Wiz, Orca, Prisma Cloud | YES (API credentials) |

**Determination timing:** Phase 1 (Brainstorming) clarifies the integration type, which is then recorded in metadata.json during Phase 0 or Phase 1 completion.

## Phase Completion Tracking

As phases complete, update metadata.json:

```json
{
  "phases": {
    "phase-1": {
      "status": "complete",
      "timestamp": "2026-01-14T15:00:00Z",
      "output_files": ["design.md"]
    },
    "phase-2": {
      "status": "in_progress",
      "started_at": "2026-01-14T15:05:00Z"
    }
  }
}
```

## Gate Checklist

Phase 0 is complete when:

- [ ] Output directory created at `.claude/.output/integrations/YYYYMMDD-HHMMSS-{vendor}/`
- [ ] `metadata.json` initialized with vendor name and integration type
- [ ] `MANIFEST.yaml` created with initial structure
- [ ] `persisting-agent-outputs` skill invoked and patterns understood
- [ ] `orchestrating-multi-agent-workflows` skill invoked and patterns understood
- [ ] OUTPUT_DIR environment variable or reference captured for subsequent phases

## Common Issues

### Issue: Directory Already Exists

**Symptom:** `mkdir: cannot create directory: File exists`

**Solution:** This indicates a previous workflow run. Either:
1. Continue the existing workflow (check metadata.json for phase status)
2. Archive the existing directory and create a new one with fresh timestamp

### Issue: Timestamp Not Unique

**Symptom:** Multiple rapid workflow starts create colliding timestamps

**Solution:** Add milliseconds to timestamp or wait 1 second between runs:

```bash
# With milliseconds
TIMESTAMP=$(date +%Y%m%d-%H%M%S-%3N)

# Or wait between runs
sleep 1 && TIMESTAMP=$(date +%Y%m%d-%H%M%S)
```

### Issue: Vendor Name Formatting

**Symptom:** Vendor name has spaces or capitals

**Solution:** Normalize to lowercase-hyphenated:

```bash
# Transform "Wiz Security" → "wiz-security"
VENDOR=$(echo "Wiz Security" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
```

## Related Phases

- **Phase 1 (Brainstorming)**: Uses OUTPUT_DIR to save design.md
- **Phase 2 (Discovery)**: Reads OUTPUT_DIR from metadata.json
- **All Phases**: Append output files to MANIFEST.yaml

## Related Skills

- `persisting-agent-outputs` - Output directory patterns and metadata schema
- `orchestrating-multi-agent-workflows` - Agent coordination and handoff protocols
- `orchestrating-feature-development` - Similar Phase 0 setup for feature development
- `orchestrating-capability-development` - Similar Phase 0 setup for capability development
