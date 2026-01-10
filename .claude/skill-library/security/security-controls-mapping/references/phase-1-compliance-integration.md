# Phase 1 Integration - Compliance-Driven Control Evaluation

**Phase 4 evaluates security controls against Phase 1 compliance requirements.**

---

## Overview

Phase 1 (Business Context Discovery) produces compliance requirements that drive Phase 4 security controls evaluation:

- **Compliance requirements** (SOC2, PCI-DSS, HIPAA, GDPR) → Validate specific regulatory controls
- **Regulatory gaps** → Document which requirements are not met
- **Compliance status** → Track progress toward compliance (requirements met/gaps)

Without Phase 1 context, control mapping is generic (finds controls, but doesn't validate compliance). With Phase 1 context, mapping validates regulatory requirements (compliance-driven evaluation).

---

## Required Phase 1 Files

### Load at Start (Always)

**`../phase-1/summary.md`** - Quick compliance overview
- Purpose: Fast orientation on applicable regulations
- When: Read before control category analysis
- Contains: List of regulations (SOC2, PCI-DSS, HIPAA, GDPR) with key requirements

**`../phase-1/compliance-requirements.json`** - Required standards
- Purpose: Specific regulatory requirements to validate
- When: Read before control category analysis
- Contains: Regulations with sub-requirements, each with validation criteria

### Schema Example

```json
{
  "applicable_regulations": [
    {
      "regulation": "PCI-DSS",
      "level": "Level 1",
      "requirements": [
        {
          "requirement_id": "3.4",
          "name": "Render PAN unreadable",
          "description": "Protect stored cardholder data via encryption, tokenization, or hashing",
          "control_categories": ["cryptography", "data-protection"],
          "validation_criteria": [
            "No plaintext card numbers in database",
            "Tokenization or encryption applied before storage",
            "Encryption uses AES-256 or stronger"
          ]
        },
        {
          "requirement_id": "8.2",
          "name": "Unique user credentials",
          "description": "Assign unique ID to each person with computer access",
          "control_categories": ["authentication", "access-control"],
          "validation_criteria": [
            "No shared accounts",
            "Multi-factor authentication for administrative access",
            "Password complexity enforced"
          ]
        }
      ]
    },
    {
      "regulation": "SOC2 Type II",
      "trust_service_criteria": [
        {
          "criterion_id": "CC6.1",
          "name": "Logical and physical access controls",
          "description": "Restrict access to authorized users",
          "control_categories": ["authentication", "authorization"],
          "validation_criteria": [
            "Access controls implemented at application and infrastructure layers",
            "Principle of least privilege enforced",
            "Access reviews performed quarterly"
          ]
        }
      ]
    }
  ]
}
```

---

## How Phase 1 Drives Control Evaluation

| Phase 1 Input | Impact on Controls Mapping | Example |
|---------------|---------------------------|---------|
| **PCI-DSS Level 1** | Validate all 12 requirements | Check Req 3 (protect stored card data), Req 4 (encrypt transmission), Req 6 (secure development), Req 7-8 (access controls), Req 10 (logging) |
| **HIPAA** | Validate §164.312 technical safeguards | Check §164.312(a) access control, §164.312(b) audit logging, §164.312(c) integrity, §164.312(e) transmission security |
| **SOC2 Type II** | Validate CC6 security criteria | Check CC6.1 (access controls), CC6.7 (encryption), CC6.8 (vulnerability management), CC7.2 (audit logging) |

---

## Control Gap Detection Enhancement

### Before Phase 1 Integration (OLD)

Generic gap identification:
```json
{
  "control_category": "cryptography",
  "gap_description": "No encryption at rest for database",
  "severity": "high"
}
```

### After Phase 1 Integration (NEW)

Compliance-driven gap identification:

```bash
# Load compliance requirements from Phase 1
COMPLIANCE=$(jq -r '.applicable_regulations[].regulation' ../phase-1/compliance-requirements.json)
echo "Validating controls for: $COMPLIANCE"
```

**For each compliance requirement from Phase 1**:

1. **Load required controls** from compliance-requirements.json
2. **Check if control exists** in codebase
3. **Document gap with compliance reference** if missing

**Example** (PCI-DSS Requirement 3):

```json
{
  "requirement": "PCI-DSS Requirement 3: Protect stored cardholder data",
  "sub_requirements": [
    "3.4: Render PAN unreadable (encryption, tokenization, hashing)",
    "3.5: Document key-management procedures"
  ],
  "findings": {
    "3.4": {
      "status": "partial",
      "evidence": "Tokenization found in payment-processor.go:L42",
      "gap": "No encryption at rest for archived transactions in S3",
      "severity": "critical"
    },
    "3.5": {
      "status": "missing",
      "evidence": null,
      "gap": "No key management documentation found in codebase or wiki",
      "severity": "critical"
    }
  },
  "risk_level": "critical",
  "compliance_impact": "PCI-DSS audit failure, potential card brand fines ($5K-$100K monthly)"
}
```

---

## Compliance Validation Workflow

### Step 1: Load Compliance Requirements

```bash
# Read applicable regulations
jq -r '.applicable_regulations[] | "\(.regulation): \(.requirements | length) requirements"' \
  ../phase-1/compliance-requirements.json
```

**Output**:
```
PCI-DSS: 12 requirements
SOC2 Type II: 18 controls
HIPAA: 8 safeguards
```

### Step 2: Map Requirements to Control Categories

| Regulation | Requirement | Control Categories |
|------------|-------------|-------------------|
| PCI-DSS 3.4 | Render PAN unreadable | `cryptography.json`, `secrets-management.json` |
| PCI-DSS 8.2 | Unique user credentials | `authentication.json`, `authorization.json` |
| SOC2 CC6.7 | Encryption | `cryptography.json` |
| SOC2 CC7.2 | Audit logging | `logging-audit.json` |
| HIPAA §164.312(a) | Access control | `authentication.json`, `authorization.json` |

### Step 3: Validate Each Requirement

**For PCI-DSS Requirement 3.4** (example):

```bash
# Check cryptography.json for card data encryption
ENCRYPTION_FOUND=$(jq -r '.controls[] | select(.data_protected | contains("payment_card_data"))' \
  phase-2/cryptography.json)

if [ -z "$ENCRYPTION_FOUND" ]; then
  # Document gap with compliance reference
  jq '.gaps += [{
    "control_category": "cryptography",
    "gap_description": "No encryption at rest for payment card data",
    "compliance_requirement": "PCI-DSS Requirement 3.4",
    "severity": "critical",
    "business_impact": "PCI-DSS audit failure, potential fines",
    "remediation": "Implement AES-256 encryption for stored card data"
  }]' phase-2/control-gaps.json > temp.json && mv temp.json phase-2/control-gaps.json
fi
```

### Step 4: Generate Compliance Status

Track met vs. missing requirements:

```json
{
  "regulation": "PCI-DSS Level 1",
  "total_requirements": 12,
  "requirements_met": 8,
  "requirements_partial": 2,
  "requirements_missing": 2,
  "compliance_percentage": 66.7,
  "gaps": [
    {
      "requirement_id": "3.4",
      "status": "partial",
      "gap": "No encryption for archived transactions"
    },
    {
      "requirement_id": "10.2",
      "status": "missing",
      "gap": "Audit logs do not cover all system access"
    }
  ]
}
```

---

## control-gaps.json Schema Enhancement

### New Field: `compliance_requirement`

**Before** (generic gaps):
```json
{
  "gaps": [
    {
      "control_category": "cryptography",
      "gap_description": "No encryption at rest for archived transactions",
      "severity": "critical"
    }
  ]
}
```

**After** (compliance-driven gaps):
```json
{
  "gaps": [
    {
      "control_category": "cryptography",
      "gap_description": "No encryption at rest for archived transactions",
      "compliance_requirement": "PCI-DSS Requirement 3.4",
      "severity": "critical",
      "business_impact": "Audit failure, potential card brand fines ($5K-$100K monthly)",
      "remediation": "Implement AES-256 encryption for transaction archive in S3",
      "estimated_effort": "2-3 days",
      "priority": "critical"
    },
    {
      "control_category": "logging-audit",
      "gap_description": "Audit logs do not cover privileged account access",
      "compliance_requirement": "SOC2 CC7.2",
      "severity": "high",
      "business_impact": "SOC2 audit finding, potential customer concerns",
      "remediation": "Extend audit logging to capture admin role assumptions",
      "estimated_effort": "1 day",
      "priority": "high"
    }
  ]
}
```

### Complete Schema

```typescript
interface ControlGap {
  control_category: string;              // Which control file this relates to
  gap_description: string;               // What's missing
  compliance_requirement?: string;       // NEW: Regulation requirement ID (e.g., "PCI-DSS Req 3.4")
  severity: "critical" | "high" | "medium" | "low";
  business_impact?: string;              // NEW: From Phase 1 - what happens if not fixed
  remediation: string;                   // How to fix
  estimated_effort?: string;             // NEW: Time to remediate
  priority: "critical" | "high" | "medium" | "low"; // NEW: From Phase 1 business risk
}
```

---

## Summary Generation Enhancement

### New Section: Compliance Evaluation

Add this section to `summary.md` after control inventory:

```markdown
# Security Controls Summary

## Control Inventory
[Existing section...]

## Compliance Evaluation (from Phase 1)

### PCI-DSS Level 1
- **Status**: 8/12 requirements met (66.7%)
- **Critical Gaps**:
  - ❌ Requirement 3.4 (partial): No encryption for archived transactions
  - ❌ Requirement 10.2 (missing): Audit logs incomplete for system access
- **Met Requirements**:
  - ✅ Requirement 3.2: Do not store sensitive authentication data
  - ✅ Requirement 4.1: Encrypt transmission over public networks
  - ✅ Requirement 6.5.1: Injection flaws validation
  - ✅ Requirement 8.2: Unique user IDs
  - ✅ [... 4 more]

### SOC2 Type II
- **Status**: 15/18 controls met (83.3%)
- **Critical Gaps**:
  - ❌ CC6.7 (partial): Key rotation not automated
  - ❌ CC7.2 (partial): Audit logging incomplete
  - ❌ CC9.2 (missing): Vendor security management
- **Met Controls**:
  - ✅ CC6.1: Logical and physical access controls
  - ✅ CC6.6: Vulnerability management
  - ✅ [... 13 more]

### HIPAA (if applicable)
- **Status**: Not applicable per Phase 1 (no PHI handling)

---

## Next Phase Guidance (for Phase 3)

Focus Phase 3 threats on compliance gaps:

1. **PCI-DSS Requirement 3.4** (Critical Priority)
   - Threat: Data breach via unencrypted archived transactions
   - STRIDE category: Information Disclosure
   - Business impact: $365M breach cost + $100K monthly fines

2. **SOC2 CC7.2** (High Priority)
   - Threat: Audit log tampering
   - STRIDE category: Repudiation
   - Business impact: SOC2 audit failure, customer trust loss
```

---

## Error Handling

### Missing Phase 1 Files

**Cannot proceed without Phase 1 compliance requirements**:

```bash
# Check for Phase 1 compliance file
if [ ! -f "../phase-1/compliance-requirements.json" ]; then
  echo "ERROR: Phase 1 (Business Context Discovery) not complete."
  echo "Phase 4 requires compliance requirements to validate controls."
  echo ""
  echo "Run: skill: \"business-context-discovery\""
  echo ""
  echo "Phase 1 discovers WHICH regulations apply (SOC2, PCI-DSS, HIPAA, GDPR)."
  echo "Without this context, control mapping cannot validate compliance."
  exit 1
fi
```

### Validate Compliance Requirements Schema

```bash
# Verify compliance-requirements.json has required structure
if ! jq -e '.applicable_regulations | length > 0' ../phase-1/compliance-requirements.json > /dev/null 2>&1; then
  echo "ERROR: compliance-requirements.json missing applicable_regulations array"
  echo "Phase 1 must identify at least one regulation for validation"
  exit 1
fi
```

---

## Testing Phase 1 Integration

### Test Scenario 1: With PCI-DSS Compliance

**Setup**:
```json
// phase-1/compliance-requirements.json
{
  "applicable_regulations": [
    {
      "regulation": "PCI-DSS",
      "level": "Level 1",
      "requirements": [
        {
          "requirement_id": "3.4",
          "name": "Render PAN unreadable",
          "control_categories": ["cryptography"],
          "validation_criteria": ["No plaintext card numbers"]
        }
      ]
    }
  ]
}
```

**Expected Behavior**:
1. Control mapping validates PCI-DSS Requirement 3.4
2. `control-gaps.json` includes `compliance_requirement: "PCI-DSS Requirement 3.4"` if gap found
3. Summary shows "PCI-DSS: 1/1 requirements" (met or gap)
4. Next phase guidance focuses on PCI-DSS gaps

### Test Scenario 2: Without Phase 1

**Setup**: Delete `phase-1/` directory

**Expected Behavior**:
1. Skill errors immediately: "Phase 1 not complete"
2. Provides guidance to run `business-context-discovery` skill
3. Does NOT proceed to control category analysis
4. Explains WHY Phase 1 is required (compliance validation, not generic control inventory)

---

## Compliance Validation Examples

### Example 1: PCI-DSS Requirement 3.4 Validation

**Requirement**: "Render primary account number (PAN) unreadable"

**Control Categories to Check**:
- `cryptography.json` - Encryption at rest
- `secrets-management.json` - Tokenization services

**Validation Logic**:
```bash
# Check for card data encryption
ENCRYPTION=$(jq -r '.controls[] | select(.data_protected | contains("payment_card_data"))' \
  phase-2/cryptography.json)

# Check for tokenization
TOKENIZATION=$(jq -r '.controls[] | select(.mechanism == "tokenization")' \
  phase-2/secrets-management.json)

if [ -n "$ENCRYPTION" ] || [ -n "$TOKENIZATION" ]; then
  STATUS="met"
else
  STATUS="missing"
  GAP="No encryption or tokenization found for payment card data"
fi
```

### Example 2: SOC2 CC6.1 Validation

**Control**: "Logical and physical access controls"

**Control Categories to Check**:
- `authentication.json` - Identity verification
- `authorization.json` - Access restrictions

**Validation Logic**:
```bash
# Check for authentication mechanisms
AUTH=$(jq -r '.controls[] | select(.mechanism | contains("jwt", "cognito", "oauth"))' \
  phase-2/authentication.json)

# Check for authorization policies
AUTHZ=$(jq -r '.controls[] | select(.policy_type == "rbac" or .policy_type == "abac")' \
  phase-2/authorization.json)

if [ -n "$AUTH" ] && [ -n "$AUTHZ" ]; then
  STATUS="met"
else
  STATUS="partial"
  GAP="Authorization policies not comprehensive"
fi
```

---

## Related Sections in Main Skill

This reference file is loaded from:
- **Control Category Analysis** - Compliance validation per category
- **Control Gaps Detection** - Compliance-driven gap identification
- **Summary Generation** - Compliance status section

**Main skill includes**:
- Brief overview of Phase 1 compliance integration (3-5 sentences)
- Link to this reference for detailed validation patterns
- Error handling if Phase 1 missing

---

## References

- `threat-model-business-integration.md` - Task 3: Complete integration requirements
- `../phase-1/summary.md` - Compliance overview from Phase 1
- `../phase-1/compliance-requirements.json` - Detailed requirements with validation criteria
- `control-gaps.json` - Enhanced schema with compliance_requirement field
