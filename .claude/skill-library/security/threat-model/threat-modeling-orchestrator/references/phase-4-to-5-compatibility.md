# Phase 4 to Phase 5/6 Compatibility

**How subsequent phases load investigation files, use concern_source for traceability, and prioritize based on severity.**

## Overview

Phase 4's batched execution with per-concern investigations provides rich context for:

- **Phase 5 (Threat Modeling)** - STRIDE mapping with control context
- **Phase 6 (Test Planning)** - Prioritized security testing based on gaps

## Phase 5: Threat Modeling Integration

### Standard Control Category Loading

**Phase 5 reads standard control category files at `phase-4/*.json` for STRIDE mapping.**

**Example - Mapping STRIDE threat "Spoofing" to authentication controls:**

```typescript
// Phase 5 loads authentication.json
const authControls = JSON.parse(readFile("phase-4/authentication.json"));

// Map to STRIDE threat
const spoofingThreats = identifyThreats({
  strideCategory: "Spoofing",
  controls: authControls.controls,
  gaps: controlGaps.filter((g) => g.category === "authentication"),
});

// Result: "JWT validation strong, but session cookies weak → Threat: Session hijacking"
```

**STRIDE to Control Category Mapping:**

| STRIDE Threat              | Control Categories                                | Phase 4 Files                                                    |
| -------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| **S**poofing               | authentication, secrets-management                | authentication.json, secrets-management.json                     |
| **T**ampering              | input-validation, output-encoding                 | input-validation.json, output-encoding.json                      |
| **R**epudiation            | logging-audit                                     | logging-audit.json                                               |
| **I**nfo Disclosure        | cryptography, secrets-management, output-encoding | cryptography.json, secrets-management.json, output-encoding.json |
| **D**enial of Service      | rate-limiting                                     | rate-limiting.json                                               |
| **E**levation of Privilege | authorization                                     | authorization.json                                               |

### Optional Investigation Context Loading

**Phase 5 can optionally load specific investigation files for deeper context via `investigation_source` references.**

**Example - Understanding why a control is weak:**

```typescript
// Phase 5 finds weak Neo4j filtering control
const weakControl = authControls.controls.find((c) => c.control_id === "AUTHZ-002");

// Load investigation for full context
const investigationSource = weakControl.investigation_source;
// "investigations/critical/001-multi-tenant-isolation.json"

const investigation = JSON.parse(readFile(investigationSource));

// Access rich context:
// - Why this control is weak (control_gaps)
// - Attack vector details
// - Crown jewels affected
// - Recommendations for remediation
```

**When to load investigations:**

1. **Control weakness explanation** - Understand why control rated "weak"
2. **Attack vector details** - Get specific attack scenarios from gap analysis
3. **Crown jewel mapping** - Link threats to business-critical assets
4. **Compliance traceability** - Show which regulatory requirements are affected

### Threat Scoring with Investigation Context

**Phase 5 uses investigation findings to enhance CVSS scoring:**

```typescript
// Load gap from control-gaps.json
const gap = {
  gap_id: "001-GAP-001",
  category: "authorization",
  severity: "high",
  cvss_score: 8.1,
  concern_source: "investigations/critical/001-multi-tenant-isolation.json",
};

// Load investigation for Environmental Metrics
const investigation = JSON.parse(readFile(gap.concern_source));

// Calculate Environmental Score using Phase 1 + Phase 4 context
const environmentalScore = calculateCVSSEnvironmental({
  baseScore: gap.cvss_score,
  crownJewelsAffected: investigation.crown_jewels_affected,
  complianceImpact: investigation.compliance_impact,
  businessImpactFromPhase1: phase1Summary.business_impact,
});

// Result: Base 8.1 → Environmental 9.2 (crown jewels + compliance)
```

### Prioritized File Loading for DFD Analysis

**Phase 5 uses `files_for_phase5` to focus data flow diagram analysis:**

```typescript
// Collect priority files from all investigations
const priorityFiles = investigations.flatMap((inv) => inv.files_for_phase5).filter(unique);

// Focus DFD analysis on these files
const dataFlows = analyzePriorityFiles(priorityFiles);

// Example priority files from Phase 4:
// - modules/chariot/backend/pkg/graph/client.go (Cypher injection risk)
// - modules/chariot/backend/pkg/handler/handlers/asset/list.go (multi-tenant isolation)
// - modules/chariot/backend/pkg/middleware/auth.go (authentication controls)
```

## Phase 6: Test Planning Integration

### Gap-Driven Test Prioritization

**Phase 6 reads `control-gaps.json` to prioritize security tests.**

**Example - Prioritizing tests by gap severity and concern severity:**

```typescript
// Load all gaps
const gaps = JSON.parse(readFile("phase-4/control-gaps.json")).gaps;

// Prioritize by:
// 1. Gap severity (critical > high > medium > low)
// 2. Concern severity (from concern_source)
// 3. CVSS score
// 4. Compliance impact

const prioritizedGaps = gaps.sort((a, b) => {
  // Primary: Gap severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  if (severityOrder[a.severity] !== severityOrder[b.severity]) {
    return severityOrder[a.severity] - severityOrder[b.severity];
  }

  // Secondary: Concern severity (critical concerns > high concerns)
  if (severityOrder[a.concern_severity] !== severityOrder[b.concern_severity]) {
    return severityOrder[a.concern_severity] - severityOrder[b.concern_severity];
  }

  // Tertiary: CVSS score
  return (b.cvss_score || 0) - (a.cvss_score || 0);
});

// Result: Test critical gaps from critical concerns first
```

**Test Plan Output Example:**

```json
{
  "test_id": "001",
  "test_name": "Validate Neo4j Username Filtering",
  "priority": "immediate",
  "gap_id": "001-GAP-001",
  "gap_source": "investigations/critical/001-multi-tenant-isolation.json",
  "test_type": "manual",
  "attack_vector": "Cypher injection to bypass username filter",
  "test_steps": [
    "Craft malicious Cypher query with username filter bypass",
    "Send query through API endpoint",
    "Verify cross-tenant data is NOT accessible"
  ],
  "expected_result": "403 Forbidden response",
  "files_to_test": ["modules/chariot/backend/pkg/graph/client.go"]
}
```

### Loading Investigation Context for Test Design

**Phase 6 loads investigation files to understand gap context:**

```typescript
// From prioritized gap
const gap = prioritizedGaps[0];

// Load investigation for test design context
const investigation = JSON.parse(readFile(gap.concern_source));

// Use investigation data for test design:
const testCase = {
  test_id: generateTestId(gap.gap_id),
  test_name: generateTestName(gap.description),

  // Attack vector from investigation
  attack_vector: gap.attack_vector,

  // Files to test from investigation
  files_to_test: investigation.files_for_phase5,

  // Evidence to validate against
  current_behavior: investigation.evidence
    .filter((e) => e.type === "code-snippet")
    .map((e) => e.content),

  // Expected behavior from recommendations
  expected_behavior:
    investigation.recommendations.find((r) => r.priority === "immediate")
      ?.implementation_guidance || null,

  // Compliance validation
  compliance_requirements: investigation.compliance_impact
    .filter((ci) => ci.impact === "fails")
    .map((ci) => ci.requirement_id),
};
```

### Test Categories from Control Categories

**Phase 6 maps control categories to test categories:**

| Control Category   | Test Category            | Test Types                                         |
| ------------------ | ------------------------ | -------------------------------------------------- |
| authentication     | Identity & Access        | Session fixation, credential stuffing, token theft |
| authorization      | Privilege Escalation     | Horizontal/vertical privilege escalation, IDOR     |
| input-validation   | Injection                | SQL, NoSQL, Cypher, command, XSS, XXE              |
| output-encoding    | XSS Prevention           | Reflected, stored, DOM-based XSS                   |
| cryptography       | Cryptographic Validation | Weak algorithms, key strength, IV reuse            |
| secrets-management | Secret Exposure          | Hardcoded secrets, environment variable leaks      |
| logging-audit      | Monitoring & Detection   | Log injection, missing audit events                |
| rate-limiting      | DoS Prevention           | Brute force, API abuse, resource exhaustion        |

### SAST/DAST Recommendations from Investigations

**Phase 6 generates targeted static/dynamic analysis recommendations:**

```json
{
  "sast_recommendations": [
    {
      "tool": "Semgrep",
      "rule_focus": "go-security.injection.cypher-injection",
      "target_files": ["modules/chariot/backend/pkg/graph/client.go"],
      "rationale": "Investigation 001 found Cypher injection risk via string interpolation",
      "investigation_source": "investigations/critical/001-multi-tenant-isolation.json"
    }
  ],
  "dast_recommendations": [
    {
      "tool": "Burp Suite",
      "test_type": "Injection Testing",
      "target_endpoints": ["GET /api/assets", "POST /api/graph/query"],
      "payload_set": "Cypher injection",
      "rationale": "Test username filter bypass identified in gap 001-GAP-001",
      "investigation_source": "investigations/critical/001-multi-tenant-isolation.json"
    }
  ]
}
```

## Source Traceability Flow

**Complete traceability from Phase 1 → Phase 6:**

```
Phase 1: Business Context
└─ Crown Jewels: ["customer_data", "financial_records"]
   Compliance: ["SOC2-CC6.1", "PCI-DSS-7.1"]

↓

Phase 3: Codebase Mapping
└─ Concern 001: "Multi-tenant Isolation Weakness"
   Severity: CRITICAL
   Files: modules/chariot/backend/pkg/graph/client.go

↓

Phase 4: Security Controls Mapping (Batched)
└─ Investigation: investigations/critical/001-multi-tenant-isolation.json
   ├─ Controls Found: AUTHZ-002 (weak Neo4j filtering)
   ├─ Gaps: GAP-001 (application-level filtering, CVSS 8.1)
   ├─ Crown Jewels Affected: ["customer_data", "financial_records"]
   └─ Compliance Impact: SOC2-CC6.1 (partial), PCI-DSS-7.1 (partial)

↓

Phase 5: Threat Modeling
└─ Threat: "STRIDE-E: Privilege Escalation via Cypher Injection"
   ├─ CVSS Base: 8.1
   ├─ CVSS Environmental: 9.2 (crown jewels + compliance)
   ├─ Investigation Source: investigations/critical/001-multi-tenant-isolation.json
   └─ Control Context: Weak AUTHZ-002 enables attack

↓

Phase 6: Test Planning
└─ Test Case: "Validate Neo4j Username Filtering"
   ├─ Priority: Immediate (critical gap from critical concern)
   ├─ Gap Source: investigations/critical/001-multi-tenant-isolation.json
   ├─ Files to Test: modules/chariot/backend/pkg/graph/client.go
   ├─ Attack Vector: Cypher injection to bypass username filter
   └─ Compliance Validation: SOC2-CC6.1, PCI-DSS-7.1
```

## Metadata Fields for Integration

### Control Category Files

```json
{
  "metadata": {
    "generated_from_investigations": [
      "investigations/critical/001-multi-tenant-isolation.json",
      "investigations/high/005-iam-privilege-escalation.json"
    ],
    "last_updated": "2024-12-20T11:15:00Z",
    "batches_completed": ["critical", "high"]
  }
}
```

**Used by Phase 5 to:**

- Load corresponding investigations for context
- Understand which batches contributed to this category
- Trace control findings to original concerns

### Control Gaps File

```json
{
  "gap_id": "001-GAP-001",
  "concern_source": "investigations/critical/001-multi-tenant-isolation.json",
  "concern_name": "multi-tenant-isolation",
  "concern_severity": "critical"
}
```

**Used by Phase 6 to:**

- Load investigation for test design
- Prioritize by concern severity
- Trace gap to original business context

## Performance Optimization

**For large Phase 4 outputs (100+ investigations):**

### Phase 5 Optimization

```typescript
// Don't load all investigations - use metadata first
const controlCategories = loadControlCategoryFiles(); // Fast

// Only load investigations when needed for specific threats
const relevantInvestigations = controlCategories
  .flatMap((cat) => cat.metadata.generated_from_investigations)
  .filter(unique)
  .filter((inv) => inv.includes("critical/") || inv.includes("high/")); // Focus on high-severity

// Load on-demand
const investigationCache = new Map();
function getInvestigation(path: string) {
  if (!investigationCache.has(path)) {
    investigationCache.set(path, JSON.parse(readFile(path)));
  }
  return investigationCache.get(path);
}
```

### Phase 6 Optimization

```typescript
// Load gaps file (small, already consolidated)
const gaps = JSON.parse(readFile("phase-4/control-gaps.json")).gaps;

// Prioritize without loading investigations
const topGaps = gaps.sort(bySeverityAndCVSS).slice(0, 50); // Focus on top 50 gaps

// Load investigations only for top gaps
for (const gap of topGaps) {
  const investigation = JSON.parse(readFile(gap.concern_source));
  generateTestCase(gap, investigation);
}
```

## Backward Compatibility

**If Phase 4 used old parallel-by-category approach:**

**Phase 5/6 still work, but with reduced context:**

- Standard control category files still exist
- No `investigation_source` fields (won't break, just missing context)
- No per-concern investigations (no additional context to load)
- `control-gaps.json` uses simpler schema (no `concern_source`)

**Migration strategy:**

- New Phase 4 executions use batched approach
- Old threat models continue to work with reduced context
- Re-run Phase 4 on old models to gain full context

## Summary

**Phase 5 Benefits:**

- STRIDE mapping uses standard control categories (fast)
- Optional investigation loading for deep context (as needed)
- Enhanced CVSS scoring with crown jewels + compliance
- Prioritized file analysis via `files_for_phase5`

**Phase 6 Benefits:**

- Gap-driven test prioritization (severity + CVSS + compliance)
- Investigation context for test design (attack vectors, evidence)
- Source traceability to Phase 1 business context
- Targeted SAST/DAST recommendations

**Key Design:**

- **Standard files for speed** - Phase 5/6 don't need to load 100+ investigations
- **Investigation files for context** - Load on-demand when deep context needed
- **Source attribution everywhere** - Full traceability from Phase 1 → Phase 6
