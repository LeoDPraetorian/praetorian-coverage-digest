# Phase 4: Batched Parallel Execution Strategy

**Granular batched parallel execution where each security concern gets a dedicated investigation agent, batched strictly by severity level.**

## Overview

Instead of parallelizing by control category (authentication, authorization, etc.), we parallelize by **individual security concerns** identified in Phase 3, executing them in **severity-ordered batches** for precise control mapping and gap analysis.

## Core Principles

### Agent-Per-Concern Allocation

**One dedicated agent per security concern** - not per control category.

**Why:** Each concern requires focused investigation across multiple control categories. A single concern about "multi-tenant isolation" may touch authentication, authorization, input-validation, and cryptography simultaneously.

**Example:**
- Phase 3 identifies: "Multi-tenant DynamoDB isolation relies on username prefix"
- Agent investigates: DynamoDB partitioning, Neo4j filtering, API authorization checks
- Populates: authorization.json, input-validation.json, control-gaps.json

### Batch-by-Severity Strategy

**Execute in severity-ordered batches** where batch size equals the number of concerns at that severity level.

**Never mix severities within a batch.**

**Batch Sequence:** CRITICAL → HIGH → MEDIUM → LOW → INFO

**Example Execution:**
```
Phase 3 identifies 41 concerns:
- 12 CRITICAL
- 13 HIGH
- 3 MEDIUM
- 8 LOW
- 5 INFO

Execution:
Batch 1: Launch 12 agents (CRITICAL concerns) → consolidate → checkpoint
Batch 2: Launch 13 agents (HIGH concerns) → consolidate → checkpoint
Batch 3: Launch 3 agents (MEDIUM concerns) → consolidate → checkpoint
Batch 4: Launch 8 agents (LOW concerns) → consolidate → checkpoint
Batch 5: Launch 5 agents (INFO concerns) → consolidate → checkpoint
```

**Total agents launched = Total concerns (41 in this example)**

## Two-Tier File Structure

### Investigation Files (Per-Concern)

```
phase-4/investigations/{severity}/{concern-id}-{concern-name}.json
```

**Examples:**
```
phase-4/investigations/critical/001-multi-tenant-isolation.json
phase-4/investigations/critical/002-jwt-signature-validation.json
phase-4/investigations/high/003-sql-injection-vectors.json
```

### Control Category Files (For Phase 5/6)

```
phase-4/{category}.json
```

**Standard categories:**
- authentication.json
- authorization.json
- input-validation.json
- output-encoding.json
- cryptography.json
- secrets-management.json
- logging-audit.json
- rate-limiting.json
- cors-csp.json
- dependency-security.json

**Plus:**
- control-gaps.json (consolidated gaps)
- summary.md (handoff document)

### Batch Metadata Files

```
phase-4/investigations/{severity}/batch-summary.json
```

**Tracks:**
- Batch execution time
- Agent count
- Investigation files produced
- Control categories updated
- Gaps discovered

## Batch Execution Protocol

### For Each Severity Batch

**1. Load Concerns**

From Phase 3 `comprehensive-findings.md` or `additional-threat-scenarios.md`:
```markdown
## Critical Findings

### 001: Multi-tenant Isolation Weakness
**Severity:** CRITICAL
**Description:** Username-based partitioning in DynamoDB...
**Locations:** modules/chariot/backend/pkg/handler/handlers/asset/list.go:123-145
**Crown Jewels Affected:** ["customer_data", "financial_records"]
```

**2. Create Investigation Directory**

```bash
mkdir -p phase-4/investigations/critical/
```

**3. Launch N Agents in Parallel**

Where N = concern count at that severity level.

**Agent Prompt Template:**
```
You are investigating a CRITICAL security concern for threat modeling Phase 4.

CONCERN: Multi-tenant Isolation Weakness (ID: 001)

DESCRIPTION:
Username-based partitioning in DynamoDB may allow cross-tenant access if username
validation is insufficient or if Neo4j queries don't filter by username.

LOCATIONS TO INVESTIGATE:
- modules/chariot/backend/pkg/handler/handlers/asset/list.go:123-145
- modules/chariot/backend/pkg/graph/client.go:89-120
- modules/chariot/backend/pkg/middleware/auth.go:45-67

CROWN JEWELS AT RISK:
- customer_data
- financial_records

EXPECTED CONTROL CATEGORIES:
Focus investigation on these standard categories:
- authorization (primary)
- input-validation (username sanitization)
- logging-audit (access tracking)

YOUR TASK:
1. Examine all listed files and understand the implementation
2. Identify controls that address this concern
3. Identify gaps or weaknesses in those controls
4. Document evidence (code snippets, config excerpts)
5. Recommend remediation steps
6. Output investigation JSON to: phase-4/investigations/critical/001-multi-tenant-isolation.json

Use the investigation file schema (see investigation-file-schema.md).
```

**4. Wait for All Agents to Complete**

```typescript
const agentIds = [/* 12 agent IDs for CRITICAL batch */];
const results = await Promise.all(
  agentIds.map(id => TaskOutput({ task_id: id, block: true }))
);
```

**5. Save All Investigation Files**

Verify all agents produced valid JSON files.

**6. Run Consolidation**

Cumulative consolidation across all batches completed so far (see consolidation-algorithm.md).

**7. Create Batch Summary**

```json
{
  "batch": 1,
  "severity": "critical",
  "concerns_investigated": 12,
  "investigation_files": [
    "investigations/critical/001-multi-tenant-isolation.json",
    "investigations/critical/002-jwt-signature-validation.json"
  ],
  "controls_found_by_category": {
    "authentication": 8,
    "authorization": 15,
    "input-validation": 5
  },
  "gaps_found_by_severity": {
    "critical": 3,
    "high": 7,
    "medium": 2
  },
  "execution_time_seconds": 420,
  "timestamp": "2024-12-20T10:30:00Z"
}
```

**8. Present Checkpoint**

See "Checkpoint Between Batches" section below.

## Checkpoint Between Batches

**After each batch consolidation, present:**

```markdown
## Phase 4 Batch {N} Complete: {SEVERITY} Concerns

### Execution Summary:
- **Severity Level:** {CRITICAL|HIGH|MEDIUM|LOW|INFO}
- **Concerns Investigated:** {12}
- **Agents Launched:** {12}
- **Execution Time:** {7 minutes}

### Concerns Investigated:
1. **001: Multi-tenant Isolation Weakness** - Username partitioning gaps
2. **002: JWT Signature Validation** - HS256 vs RS256 risks
3. **003: API Rate Limiting Bypass** - Header-based circumvention
... (show all titles)

### Investigation Files Produced:
- investigations/critical/001-multi-tenant-isolation.json
- investigations/critical/002-jwt-signature-validation.json
... (show all paths)

### Controls Found (Top 5 by Category):
1. **Authorization** - 15 controls updated
   - DynamoDB username filtering
   - Neo4j query parameterization
   - IAM policy enforcement
2. **Authentication** - 8 controls updated
   - Cognito JWT validation
   - API key verification
3. **Input Validation** - 5 controls updated
   - Username sanitization
   - Request parameter validation

### Gaps Found:
- **3 Critical Gaps** - Missing controls requiring immediate remediation
- **7 High Gaps** - Weak controls requiring strengthening
- **2 Medium Gaps** - Improvement opportunities

### Compliance Status:
- **PCI-DSS 6.5.1** - Input validation gaps identified
- **SOC2 CC6.1** - Authorization controls validated

### Next Batch Estimate:
- **Severity:** HIGH
- **Concerns:** 13
- **Estimated Time:** ~9 minutes

### Options:
1. **Continue** - Proceed to HIGH severity batch
2. **Stop and Save** - Mark session as 'partial-critical', resume later
3. **Revert Batch** - Discard this batch and retry with adjusted scope

**Approve to proceed to HIGH severity batch?** [Continue/Stop/Revert]
```

## Severity Discovery

**During investigation, agents may discover additional concerns at any severity level.**

### Discovery Directory Structure

```
phase-4/investigations/discovered-{severity}/
```

**Example:**
```
phase-4/investigations/discovered-critical/
phase-4/investigations/discovered-high/
```

### Discovery Metadata

Each discovered concern includes:
```json
{
  "concern_id": "D001",
  "concern_name": "session-fixation-vulnerability",
  "severity": "high",
  "discovered_by": "investigations/critical/002-jwt-signature-validation.json",
  "discovery_reason": "While investigating JWT validation, found session cookies lack HttpOnly flag",
  "requires_investigation": true
}
```

### Processing Discovered Concerns

**After all planned batches complete:**

1. Summarize discovered concerns by severity
2. Ask user if they want to investigate them:
   - **Yes** - Create additional batches (Batch N+1 for discovered CRITICAL, etc.)
   - **No** - Mark as known limitations in `known-limitations.json`

**Example:**
```markdown
## Discovered Concerns Summary

During investigation, agents discovered **8 additional concerns**:
- **2 CRITICAL** - Session fixation, hardcoded secrets
- **3 HIGH** - CORS misconfiguration, weak hashing, missing CSRF
- **3 MEDIUM** - Verbose error messages, missing security headers

**Investigate discovered concerns?**
- **Yes** - Run 2 additional batches (CRITICAL → HIGH)
- **No** - Document as known limitations for future threat models
```

## Session State Tracking

**Update `config.json` after each batch:**

```json
{
  "sessionId": "20241220-103000",
  "scope": "full-application",
  "phase": 4,
  "phase-4": {
    "status": "in-progress",
    "batches_completed": ["critical", "high"],
    "current_batch": "medium",
    "investigations_count": 25,
    "control_categories_populated": [
      "authentication",
      "authorization",
      "input-validation",
      "cryptography"
    ],
    "gaps_found_count": {
      "critical": 3,
      "high": 12,
      "medium": 8,
      "low": 5
    }
  }
}
```

**This enables precise resume from any batch boundary.**

## Error Recovery

**If agent in batch fails:**

### Error File

```
phase-4/investigations/{severity}/{concern-id}-ERROR.json
```

**Contents:**
```json
{
  "concern_id": "005",
  "concern_name": "api-authentication-bypass",
  "severity": "critical",
  "error_message": "Agent timed out after 15 minutes",
  "partial_output": "/* Any partial investigation data */",
  "retry_count": 1,
  "timestamp": "2024-12-20T10:45:00Z"
}
```

### Recovery Options

**After batch, report failed concerns and offer:**

1. **Retry** - Re-run failed agents (up to 3 attempts)
2. **Skip** - Mark as `investigation-blocked` in `control-gaps.json`:
   ```json
   {
     "gap_id": "G005",
     "category": "authentication",
     "severity": "critical",
     "description": "API authentication bypass (investigation blocked)",
     "status": "investigation-blocked",
     "concern_source": "investigations/critical/005-ERROR.json"
   }
   ```
3. **Reduce Scope** - Narrow investigation scope and retry

**Never proceed to next batch with unresolved failures.**

## Performance Optimization

### Large Batch Monitoring

**For batches with 15+ agents:**

**Progress Monitoring:**
```markdown
## Batch 1 (CRITICAL) - In Progress

Agents: 18 total
- ✅ Completed: 12
- ⏳ Running: 5
- ❌ Failed: 1

Slow Agents (running >5 min longer than median):
- Agent 007 (10 minutes) - investigating complex Neo4j query chains
- Agent 015 (12 minutes) - analyzing cryptography across 50 files

Options:
- **Wait** - Allow slow agents to complete
- **Cancel** - Cancel slow agents, reduce scope and retry
```

### Batch Timeout

**If any agent exceeds 15 minutes:**

1. Interrupt agent
2. Save partial results to investigation file
3. Mark as `partial-investigation`
4. Offer to reduce scope and retry

**Example:**
```markdown
## Agent 007 Timeout

Investigation: 007-neo4j-injection-vectors.json
Status: Partial (50% complete - examined 5 of 10 files)

Options:
1. **Resume** - Continue from checkpoint (if supported)
2. **Reduce Scope** - Investigate top 3 files only
3. **Skip** - Mark as investigation-blocked
```

## Integration with Phase 5/6

See [phase-4-to-5-compatibility.md](phase-4-to-5-compatibility.md) for details.

**Key points:**
- Phase 5 reads standard control category files at `phase-4/*.json` for STRIDE mapping
- Phase 5 can optionally load specific investigation files via `investigation_source` references
- Phase 6 reads `control-gaps.json` for test prioritization
- Phase 6 uses `concern_source` to trace gaps back to original concerns
- Phase 6 loads investigation files to understand gap context and retrieve the `files_for_phase5` list (files that Phase 5 threat analysis identified as requiring security testing in Phase 6)
