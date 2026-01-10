# Investigation File Schema

**Complete JSON structure for per-concern investigation files in Phase 4 (Security Controls Mapping).**

## Overview

Each security concern identified in Phase 3 (Code Mapping) gets a dedicated investigation file that documents:
- What was investigated
- Controls found
- Gaps identified
- Evidence collected
- Recommendations

## File Naming Convention

```
{concern-id}-{concern-name}.json
```

**Examples:**
- `001-multi-tenant-isolation.json`
- `002-jwt-signature-validation.json`
- `015-sql-injection-vectors.json`

**Concern IDs:** 001-999 (three-digit zero-padded)

**Concern Names:** kebab-case, descriptive

## Complete Schema

```typescript
interface InvestigationFile {
  // Identification
  concern_id: string;              // "001" through "999"
  concern_name: string;            // "multi-tenant-isolation"
  severity: Severity;              // "critical" | "high" | "medium" | "low" | "info"

  // Investigation Details
  description: string;             // What was investigated
  crown_jewels_affected: string[]; // From Phase 1 (Business Context)
  locations_investigated: LocationDetail[];

  // Findings
  controls_found: ControlDetail[];
  control_categories: ControlCategory[];
  control_gaps: GapDetail[];

  // Recommendations
  recommendations: Recommendation[];

  // Context
  compliance_impact: ComplianceImpact[];
  evidence: Evidence[];
  files_for_phase5: string[];      // Priority files for Phase 5 threat modeling

  // Metadata
  investigation_duration_seconds: number;
  timestamp: string;               // ISO 8601
  agent_id?: string;               // Which agent performed investigation
}

type Severity = "critical" | "high" | "medium" | "low" | "info";

interface LocationDetail {
  file_path: string;
  line_range: {
    start: number;
    end: number;
  };
  context: string;                 // Why this file matters
}

interface ControlDetail {
  control_id: string;              // "AUTH-001"
  control_name: string;            // "Cognito JWT Validation"
  control_type: string;            // "authentication"
  implementation: string;          // How it's implemented
  strength: "strong" | "weak" | "partial";
  file_location: string;
  line_range: {
    start: number;
    end: number;
  };
  effectiveness: string;           // Assessment of how well it works
}

type ControlCategory =
  | "authentication"
  | "authorization"
  | "input-validation"
  | "output-encoding"
  | "cryptography"
  | "secrets-management"
  | "logging-audit"
  | "rate-limiting"
  | "cors-csp"
  | "dependency-security";

interface GapDetail {
  gap_id: string;                  // "GAP-001"
  gap_type: "missing" | "weak" | "incomplete" | "misconfigured";
  gap_severity: Severity;
  description: string;
  affected_components: string[];
  attack_vector: string;           // How this gap could be exploited
  cvss_score?: number;            // Optional CVSS 4.0 score
}

interface Recommendation {
  priority: "immediate" | "high" | "medium" | "low";
  action: string;                  // What to do
  rationale: string;               // Why it matters
  effort_estimate: "low" | "medium" | "high";
  implementation_guidance: string;
  files_to_modify: string[];
}

interface ComplianceImpact {
  requirement_id: string;          // "PCI-DSS 6.5.1"
  requirement_name: string;        // "Input Validation"
  impact: "passes" | "fails" | "partial";
  evidence: string;
  remediation_needed?: string;
}

interface Evidence {
  type: "code-snippet" | "config-file" | "log-entry" | "documentation";
  source_file: string;
  content: string;                 // Actual snippet or excerpt
  context: string;                 // What this proves
}
```

## Example: Complete Investigation File

```json
{
  "concern_id": "001",
  "concern_name": "multi-tenant-isolation",
  "severity": "critical",
  "description": "Investigated username-based partitioning in DynamoDB and Neo4j for multi-tenant isolation. Concern was that insufficient validation or missing filters could allow cross-tenant data access.",
  "crown_jewels_affected": [
    "customer_data",
    "financial_records",
    "user_credentials"
  ],
  "locations_investigated": [
    {
      "file_path": "modules/chariot/backend/pkg/handler/handlers/asset/list.go",
      "line_range": {
        "start": 123,
        "end": 145
      },
      "context": "DynamoDB query construction with username partitioning"
    },
    {
      "file_path": "modules/chariot/backend/pkg/graph/client.go",
      "line_range": {
        "start": 89,
        "end": 120
      },
      "context": "Neo4j Cypher query generation with username filtering"
    },
    {
      "file_path": "modules/chariot/backend/pkg/middleware/auth.go",
      "line_range": {
        "start": 45,
        "end": 67
      },
      "context": "JWT token validation and username extraction"
    }
  ],
  "controls_found": [
    {
      "control_id": "AUTH-001",
      "control_name": "Cognito JWT Validation",
      "control_type": "authentication",
      "implementation": "JWT tokens validated using Cognito public keys. Username extracted from 'cognito:username' claim.",
      "strength": "strong",
      "file_location": "modules/chariot/backend/pkg/middleware/auth.go",
      "line_range": {
        "start": 45,
        "end": 67
      },
      "effectiveness": "Strong validation with proper signature verification and expiration checks"
    },
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
      "effectiveness": "Effective isolation at database layer - impossible to query another user's data"
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
      "effectiveness": "Relies on application-level filtering. Query construction errors could bypass filter."
    }
  ],
  "control_categories": [
    "authentication",
    "authorization",
    "input-validation"
  ],
  "control_gaps": [
    {
      "gap_id": "GAP-001",
      "gap_type": "weak",
      "gap_severity": "high",
      "description": "Neo4j username filtering relies on application-level WHERE clause that could be bypassed if query construction has bugs",
      "affected_components": [
        "modules/chariot/backend/pkg/graph/client.go"
      ],
      "attack_vector": "Attacker could exploit query construction bugs (e.g., Cypher injection) to bypass username filter and access other users' graph data",
      "cvss_score": 8.1
    },
    {
      "gap_id": "GAP-002",
      "gap_type": "missing",
      "gap_severity": "medium",
      "description": "No audit logging of cross-tenant access attempts or failed authorization checks",
      "affected_components": [
        "modules/chariot/backend/pkg/middleware/auth.go",
        "modules/chariot/backend/pkg/graph/client.go"
      ],
      "attack_vector": "Successful attacks would go undetected. No forensic evidence for incident response.",
      "cvss_score": 5.3
    }
  ],
  "recommendations": [
    {
      "priority": "immediate",
      "action": "Implement Neo4j Row-Level Security (RLS) or database-level username filtering",
      "rationale": "Application-level filtering is insufficient for critical isolation. Database-level enforcement prevents bypass via query bugs.",
      "effort_estimate": "high",
      "implementation_guidance": "Use Neo4j 5.x labels and property-based access control to enforce username isolation at the database layer. Requires schema migration.",
      "files_to_modify": [
        "modules/chariot/backend/pkg/graph/client.go",
        "modules/chariot/backend/pkg/graph/schema.cql"
      ]
    },
    {
      "priority": "high",
      "action": "Add audit logging for all authorization checks",
      "rationale": "Enables detection of attacks and provides forensic evidence for incident response.",
      "effort_estimate": "low",
      "implementation_guidance": "Add structured logging to middleware and graph client to record username, requested resource, and authorization decision (allow/deny).",
      "files_to_modify": [
        "modules/chariot/backend/pkg/middleware/auth.go",
        "modules/chariot/backend/pkg/graph/client.go"
      ]
    },
    {
      "priority": "medium",
      "action": "Add integration tests for cross-tenant isolation",
      "rationale": "Automated tests prevent regressions in isolation logic during refactoring.",
      "effort_estimate": "medium",
      "implementation_guidance": "Create tests that attempt cross-tenant access using JWT tokens from different users. Verify 403 responses.",
      "files_to_modify": [
        "modules/chariot/backend/test/integration/isolation_test.go"
      ]
    }
  ],
  "compliance_impact": [
    {
      "requirement_id": "SOC2-CC6.1",
      "requirement_name": "Logical Access Controls",
      "impact": "partial",
      "evidence": "DynamoDB partition keys provide strong isolation. Neo4j application-level filtering is weak.",
      "remediation_needed": "Strengthen Neo4j filtering to database-level enforcement"
    },
    {
      "requirement_id": "PCI-DSS-7.1",
      "requirement_name": "Restrict access to system components and cardholder data",
      "impact": "partial",
      "evidence": "Username-based partitioning restricts access, but weak Neo4j filtering creates risk",
      "remediation_needed": "Implement database-level isolation in Neo4j"
    }
  ],
  "evidence": [
    {
      "type": "code-snippet",
      "source_file": "modules/chariot/backend/pkg/handler/handlers/asset/list.go",
      "content": "input := &dynamodb.QueryInput{\n    TableName: aws.String(\"chariot-assets\"),\n    KeyConditionExpression: aws.String(\"username = :username\"),\n    ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{\n        \":username\": {S: aws.String(username)},\n    },\n}",
      "context": "Shows strong DynamoDB username partitioning - username is part of query key condition"
    },
    {
      "type": "code-snippet",
      "source_file": "modules/chariot/backend/pkg/graph/client.go",
      "content": "query := fmt.Sprintf(\n    \"MATCH (a:Asset) WHERE a.username = '%s' RETURN a\",\n    username,\n)",
      "context": "Shows weak Neo4j filtering - string interpolation creates Cypher injection risk and bypasses username filter"
    }
  ],
  "files_for_phase5": [
    "modules/chariot/backend/pkg/graph/client.go",
    "modules/chariot/backend/pkg/handler/handlers/asset/list.go",
    "modules/chariot/backend/pkg/middleware/auth.go"
  ],
  "investigation_duration_seconds": 420,
  "timestamp": "2024-12-20T10:35:00Z",
  "agent_id": "agent-phase4-001"
}
```

## Field Descriptions

### Identification Fields

| Field | Type | Description |
|-------|------|-------------|
| `concern_id` | string | Three-digit ID (001-999) |
| `concern_name` | string | Kebab-case descriptive name |
| `severity` | enum | critical/high/medium/low/info |

### Investigation Details

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Comprehensive investigation summary |
| `crown_jewels_affected` | string[] | From Phase 1 business context |
| `locations_investigated` | LocationDetail[] | All files examined with line ranges |

### Findings

| Field | Type | Description |
|-------|------|-------------|
| `controls_found` | ControlDetail[] | Security mechanisms discovered |
| `control_categories` | ControlCategory[] | Standard categories this concern maps to |
| `control_gaps` | GapDetail[] | Weaknesses, missing controls |

### Recommendations

| Field | Type | Description |
|-------|------|-------------|
| `recommendations` | Recommendation[] | Prioritized remediation steps |

### Context

| Field | Type | Description |
|-------|------|-------------|
| `compliance_impact` | ComplianceImpact[] | Regulatory requirements affected |
| `evidence` | Evidence[] | Code snippets, configs proving findings |
| `files_for_phase5` | string[] | Priority files for Phase 5 threat modeling |

### Metadata

| Field | Type | Description |
|-------|------|-------------|
| `investigation_duration_seconds` | number | How long investigation took |
| `timestamp` | string | ISO 8601 timestamp |
| `agent_id` | string | Optional agent identifier |

## Usage in Consolidation

The consolidation algorithm reads these files and:

1. **Groups by control_categories** → Updates standard control category files
2. **Extracts control_gaps** → Adds to `control-gaps.json` with `concern_source` field
3. **Tracks compliance_impact** → Updates `compliance-status.json`
4. **Prioritizes files_for_phase5** → Creates `priority-files.json` for Phase 5

See [consolidation-algorithm.md](consolidation-algorithm.md) for details.

## Validation Rules

**Required Fields:**
- `concern_id`
- `concern_name`
- `severity`
- `description`
- `locations_investigated` (at least 1)
- `control_categories` (at least 1)

**Optional but Recommended:**
- `controls_found` (should be present unless no controls found)
- `control_gaps` (should be present unless no gaps found)
- `recommendations` (should be present if gaps found)

**Validation Script:**

```bash
# Validate all investigation files
for file in phase-4/investigations/*/*.json; do
  npx ajv validate -s investigation-schema.json -d "$file"
done
```

## Error Handling

**If investigation fails, create ERROR file:**

```json
{
  "concern_id": "005",
  "concern_name": "api-authentication-bypass",
  "severity": "critical",
  "error_message": "Agent timed out after 15 minutes",
  "partial_output": {
    "locations_investigated": [
      /* Partial investigation data */
    ]
  },
  "retry_count": 1,
  "timestamp": "2024-12-20T10:45:00Z"
}
```

## Discovery Metadata

**For concerns discovered during investigation:**

```json
{
  "concern_id": "D001",
  "concern_name": "session-fixation-vulnerability",
  "severity": "high",
  "discovered_by": "investigations/critical/002-jwt-signature-validation.json",
  "discovery_reason": "While investigating JWT validation, found session cookies lack HttpOnly flag",
  "requires_investigation": true,
  "discovery_timestamp": "2024-12-20T10:42:00Z"
}
```
