# Consolidation Algorithm

**How investigation files map to control categories, gap accumulation logic, and source attribution.**

## Overview

After each batch completes, the consolidation algorithm:

1. Reads all investigation files (cumulative across all batches)
2. Groups findings by control category
3. Updates standard control category files
4. Accumulates gaps in `control-gaps.json`
5. Updates summary statistics

**Cumulative approach ensures each batch builds on previous batches without data loss.**

## Algorithm Steps

### Step 1: Load All Investigation Files

**Read cumulatively:**

```typescript
// Load all investigation files from all completed batches
const investigationFiles = [
  ...glob("phase-4/investigations/critical/*.json"),
  ...glob("phase-4/investigations/high/*.json"),
  ...glob("phase-4/investigations/medium/*.json"),
  // etc. for all completed severity levels
].filter((file) => !file.endsWith("-ERROR.json")); // Exclude error files

const investigations = investigationFiles.map((file) => JSON.parse(readFile(file)));
```

### Step 2: Group Findings by Control Category

**Extract controls by category:**

```typescript
const controlsByCategory = new Map<ControlCategory, ControlDetail[]>();

for (const investigation of investigations) {
  for (const control of investigation.controls_found) {
    const category = control.control_type; // "authentication", "authorization", etc.

    if (!controlsByCategory.has(category)) {
      controlsByCategory.set(category, []);
    }

    // Add investigation source attribution
    const controlWithSource = {
      ...control,
      investigation_source: `investigations/${investigation.severity}/${investigation.concern_id}-${investigation.concern_name}.json`,
    };

    controlsByCategory.get(category).push(controlWithSource);
  }
}
```

### Step 3: Update Control Category Files

**For each control category:**

```typescript
for (const [category, controls] of controlsByCategory) {
  const categoryFile = `phase-4/${category}.json`;

  const categoryData = {
    category: category,
    controls: controls,
    metadata: {
      generated_from_investigations: investigations
        .filter((inv) => inv.control_categories.includes(category))
        .map((inv) => `investigations/${inv.severity}/${inv.concern_id}-${inv.concern_name}.json`),
      last_updated: new Date().toISOString(),
      batches_completed: getCompletedBatches(), // ["critical", "high"]
      total_controls: controls.length,
      controls_by_strength: {
        strong: controls.filter((c) => c.strength === "strong").length,
        weak: controls.filter((c) => c.strength === "weak").length,
        partial: controls.filter((c) => c.strength === "partial").length,
      },
    },
  };

  writeFile(categoryFile, JSON.stringify(categoryData, null, 2));
}
```

### Step 4: Accumulate Control Gaps

**Consolidate all gaps with source attribution:**

```typescript
const allGaps: ConsolidatedGap[] = [];

for (const investigation of investigations) {
  for (const gap of investigation.control_gaps) {
    const consolidatedGap = {
      gap_id: `${investigation.concern_id}-${gap.gap_id}`, // "001-GAP-001"
      category: investigation.control_categories[0], // Primary category
      severity: gap.gap_severity,
      description: gap.description,
      concern_source: `investigations/${investigation.severity}/${investigation.concern_id}-${investigation.concern_name}.json`,
      concern_name: investigation.concern_name,
      concern_severity: investigation.severity,
      compliance_impact: investigation.compliance_impact
        .filter((ci) => ci.impact === "fails" || ci.impact === "partial")
        .map((ci) => ci.requirement_id),
      recommendation:
        investigation.recommendations.find((r) =>
          r.action.toLowerCase().includes(gap.description.toLowerCase())
        )?.action || null,
      cvss_score: gap.cvss_score || null,
      affected_components: gap.affected_components,
      attack_vector: gap.attack_vector,
    };

    allGaps.push(consolidatedGap);
  }
}

// Sort by severity (critical first) then CVSS score
allGaps.sort((a, b) => {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  if (severityOrder[a.severity] !== severityOrder[b.severity]) {
    return severityOrder[a.severity] - severityOrder[b.severity];
  }
  return (b.cvss_score || 0) - (a.cvss_score || 0);
});

writeFile(
  "phase-4/control-gaps.json",
  JSON.stringify(
    {
      gaps: allGaps,
      metadata: {
        total_gaps: allGaps.length,
        gaps_by_severity: {
          critical: allGaps.filter((g) => g.severity === "critical").length,
          high: allGaps.filter((g) => g.severity === "high").length,
          medium: allGaps.filter((g) => g.severity === "medium").length,
          low: allGaps.filter((g) => g.severity === "low").length,
          info: allGaps.filter((g) => g.severity === "info").length,
        },
        batches_completed: getCompletedBatches(),
        last_updated: new Date().toISOString(),
      },
    },
    null,
    2
  )
);
```

### Step 5: Update Summary Statistics

**Create comprehensive summary:**

```typescript
const summary = {
  session_id: sessionId,
  phase: 4,
  status: "in-progress", // or "complete"

  // Investigation stats
  total_concerns_investigated: investigations.length,
  batches_completed: getCompletedBatches(), // ["critical", "high"]
  batches_remaining: getRemainingBatches(), // ["medium", "low", "info"]

  // Controls found
  controls_found: {
    total: Array.from(controlsByCategory.values())
      .reduce((sum, controls) => sum + controls.length, 0),
    by_category: Object.fromEntries(
      Array.from(controlsByCategory.entries())
        .map(([category, controls]) => [category, controls.length])
    ),
    by_strength: {
      strong: investigations.flatMap(i => i.controls_found)
        .filter(c => c.strength === "strong").length,
      weak: investigations.flatMap(i => i.controls_found)
        .filter(c => c.strength === "weak").length,
      partial: investigations.flatMap(i => i.controls_found)
        .filter(c => c.strength === "partial").length
    }
  },

  // Gaps found
  gaps_found: {
    total: allGaps.length,
    by_severity: {
      critical: allGaps.filter(g => g.severity === "critical").length,
      high: allGaps.filter(g => g.severity === "high").length,
      medium: allGaps.filter(g => g.severity === "medium").length,
      low: allGaps.filter(g => g.severity === "low").length,
      info: allGaps.filter(g => g.severity === "info").length
    },
    by_category: /* Group gaps by control category */
  },

  // Compliance status
  compliance_status: {
    requirements_evaluated: getUniqueComplianceRequirements(investigations),
    requirements_passing: countPassingRequirements(investigations),
    requirements_failing: countFailingRequirements(investigations),
    requirements_partial: countPartialRequirements(investigations)
  },

  // Recommendations
  recommendations: {
    immediate: countRecommendationsByPriority(investigations, "immediate"),
    high: countRecommendationsByPriority(investigations, "high"),
    medium: countRecommendationsByPriority(investigations, "medium"),
    low: countRecommendationsByPriority(investigations, "low")
  },

  // Metadata
  last_updated: new Date().toISOString(),
  investigation_duration_total_seconds: investigations
    .reduce((sum, inv) => sum + inv.investigation_duration_seconds, 0)
};

writeFile('phase-4/summary.md', generateSummaryMarkdown(summary));
writeFile('phase-4/summary.json', JSON.stringify(summary, null, 2));
```

## Example: Control Category File

**phase-4/authorization.json (after 2 batches):**

```json
{
  "category": "authorization",
  "controls": [
    {
      "control_id": "AUTHZ-001",
      "control_name": "DynamoDB Username Partitioning",
      "control_type": "authorization",
      "implementation": "All DynamoDB queries include username as partition key prefix",
      "strength": "strong",
      "file_location": "modules/chariot/backend/pkg/handler/handlers/asset/list.go",
      "line_range": {
        "start": 123,
        "end": 145
      },
      "effectiveness": "Effective isolation at database layer",
      "investigation_source": "investigations/critical/001-multi-tenant-isolation.json"
    },
    {
      "control_id": "AUTHZ-002",
      "control_name": "Neo4j Username Filtering",
      "control_type": "authorization",
      "implementation": "Cypher queries include WHERE username = $username clause",
      "strength": "weak",
      "file_location": "modules/chariot/backend/pkg/graph/client.go",
      "line_range": {
        "start": 89,
        "end": 120
      },
      "effectiveness": "Relies on application-level filtering",
      "investigation_source": "investigations/critical/001-multi-tenant-isolation.json"
    },
    {
      "control_id": "AUTHZ-003",
      "control_name": "IAM Role-Based API Access",
      "control_type": "authorization",
      "implementation": "Lambda execution roles restrict DynamoDB/S3 access by username prefix",
      "strength": "strong",
      "file_location": "modules/chariot/devops/cloudformation/iam-roles.yml",
      "line_range": {
        "start": 45,
        "end": 89
      },
      "effectiveness": "Strong AWS-level isolation",
      "investigation_source": "investigations/high/005-iam-privilege-escalation.json"
    }
  ],
  "metadata": {
    "generated_from_investigations": [
      "investigations/critical/001-multi-tenant-isolation.json",
      "investigations/high/005-iam-privilege-escalation.json"
    ],
    "last_updated": "2024-12-20T11:15:00Z",
    "batches_completed": ["critical", "high"],
    "total_controls": 3,
    "controls_by_strength": {
      "strong": 2,
      "weak": 1,
      "partial": 0
    }
  }
}
```

## Example: Consolidated Gaps File

**phase-4/control-gaps.json (after 2 batches):**

```json
{
  "gaps": [
    {
      "gap_id": "001-GAP-001",
      "category": "authorization",
      "severity": "high",
      "description": "Neo4j username filtering relies on application-level WHERE clause that could be bypassed",
      "concern_source": "investigations/critical/001-multi-tenant-isolation.json",
      "concern_name": "multi-tenant-isolation",
      "concern_severity": "critical",
      "compliance_impact": ["SOC2-CC6.1", "PCI-DSS-7.1"],
      "recommendation": "Implement Neo4j Row-Level Security (RLS) or database-level username filtering",
      "cvss_score": 8.1,
      "affected_components": ["modules/chariot/backend/pkg/graph/client.go"],
      "attack_vector": "Cypher injection to bypass username filter"
    },
    {
      "gap_id": "001-GAP-002",
      "category": "logging-audit",
      "severity": "medium",
      "description": "No audit logging of cross-tenant access attempts",
      "concern_source": "investigations/critical/001-multi-tenant-isolation.json",
      "concern_name": "multi-tenant-isolation",
      "concern_severity": "critical",
      "compliance_impact": ["SOC2-CC7.2"],
      "recommendation": "Add audit logging for all authorization checks",
      "cvss_score": 5.3,
      "affected_components": [
        "modules/chariot/backend/pkg/middleware/auth.go",
        "modules/chariot/backend/pkg/graph/client.go"
      ],
      "attack_vector": "Successful attacks go undetected"
    },
    {
      "gap_id": "005-GAP-001",
      "category": "authorization",
      "severity": "high",
      "description": "Overly permissive IAM role allows privilege escalation",
      "concern_source": "investigations/high/005-iam-privilege-escalation.json",
      "concern_name": "iam-privilege-escalation",
      "concern_severity": "high",
      "compliance_impact": ["SOC2-CC6.1"],
      "recommendation": "Apply least-privilege principle to Lambda execution roles",
      "cvss_score": 7.8,
      "affected_components": ["modules/chariot/devops/cloudformation/iam-roles.yml"],
      "attack_vector": "Compromised Lambda function gains broader access"
    }
  ],
  "metadata": {
    "total_gaps": 3,
    "gaps_by_severity": {
      "critical": 0,
      "high": 2,
      "medium": 1,
      "low": 0,
      "info": 0
    },
    "batches_completed": ["critical", "high"],
    "last_updated": "2024-12-20T11:15:00Z"
  }
}
```

## Source Attribution

**Every control and gap includes source attribution:**

| Field                  | Purpose                             | Example                                                   |
| ---------------------- | ----------------------------------- | --------------------------------------------------------- |
| `investigation_source` | Trace control back to investigation | `investigations/critical/001-multi-tenant-isolation.json` |
| `concern_source`       | Trace gap back to original concern  | `investigations/high/005-iam-privilege-escalation.json`   |
| `concern_name`         | Human-readable concern identifier   | `iam-privilege-escalation`                                |
| `concern_severity`     | Original concern severity           | `high`                                                    |

**Why source attribution matters:**

1. **Traceability** - Know which investigation found each control/gap
2. **Context** - Load investigation file for full context
3. **Prioritization** - Gaps from CRITICAL concerns rank higher
4. **Phase 5 Integration** - Threat modeling references investigation files
5. **Phase 6 Integration** - Test planning uses `files_for_phase5` from investigations

## Cumulative Algorithm Guarantees

**Batch 1 (CRITICAL):**

- Processes 12 CRITICAL investigations
- Updates control category files with 12 investigations' controls
- Creates initial control-gaps.json

**Batch 2 (HIGH):**

- Processes 13 HIGH investigations
- Re-reads Batch 1 investigations (cumulative)
- **Appends** HIGH controls to existing control category files
- **Accumulates** HIGH gaps to control-gaps.json
- Updates metadata: `batches_completed: ["critical", "high"]`

**Batch 3 (MEDIUM):**

- Processes 3 MEDIUM investigations
- Re-reads Batch 1 + 2 investigations (cumulative)
- Continues appending...

**No data loss:** Each batch builds on all previous batches.

## Performance Considerations

**For large consolidations (100+ investigations):**

1. **Index by concern_id** - Use Map for O(1) lookups
2. **Parallelize category updates** - Write control category files in parallel
3. **Stream processing** - Don't load all investigations into memory at once
4. **Incremental updates** - Track which investigations were processed in previous batch

**Optimization example:**

```typescript
// Only re-process new investigations in this batch
const previousInvestigations = loadFromCache();
const newInvestigations = currentBatchInvestigations;

// Merge results
const allInvestigations = [...previousInvestigations, ...newInvestigations];

// Update cache for next batch
saveToCache(allInvestigations);
```

## Validation

**After consolidation, verify:**

```bash
# All investigation files have corresponding control category entries
for file in phase-4/investigations/*/*.json; do
  concern_id=$(jq -r '.concern_id' "$file")
  categories=$(jq -r '.control_categories[]' "$file")

  for category in $categories; do
    # Check category file contains reference to this investigation
    grep -q "$concern_id" "phase-4/${category}.json" || echo "Missing: $file in ${category}.json"
  done
done

# All gaps in control-gaps.json have valid concern_source
jq -r '.gaps[].concern_source' phase-4/control-gaps.json | while read source; do
  [[ -f "$source" ]] || echo "Missing investigation file: $source"
done
```

## Error Handling

**If consolidation fails mid-batch:**

1. **Rollback** - Revert control category files to pre-batch state
2. **Preserve investigations** - Keep investigation files (they're valid)
3. **Retry** - Re-run consolidation with same investigations
4. **Partial consolidation** - Mark in config.json which categories succeeded

**Recovery:**

```json
{
  "phase-4": {
    "status": "consolidation-failed",
    "last_successful_batch": "critical",
    "failed_at": "high",
    "partial_consolidation": {
      "successful_categories": ["authentication", "authorization"],
      "failed_categories": ["input-validation"],
      "error": "File write permission denied"
    }
  }
}
```
