# Phase 0 Integration - Business Context for Codebase Mapping

**This skill is Phase 1 of threat modeling. It MUST load Phase 0 business context to prioritize analysis.**

---

## Overview

Phase 0 (Business Context Discovery) produces business-critical data that drives Phase 1 codebase mapping:

- **Crown jewels** (most sensitive assets) → Focus 60% effort on components handling them
- **Compliance requirements** → Identify compliance-relevant code paths
- **Threat actors** → Map attack surface relevant to actor capabilities

Without Phase 0 context, codebase mapping treats all components equally (security theater). With Phase 0 context, mapping focuses on protecting what matters most (risk management).

---

## Required Phase 0 Files

### Load at Start (Always)

**`../phase-0/summary.md`** - Quick context overview (<2000 tokens)
- Purpose: Fast orientation on business context
- When: Read before Step 1 (Technology Detection)
- Contains: Crown jewels, threat actors, compliance requirements (compressed)

**`../phase-0/data-classification.json`** - Crown jewels for prioritization
- Purpose: Identify which data types are most sensitive
- When: Read before Step 2 (Component Identification)
- Contains: Crown jewels list with sensitivity levels, regulatory requirements

### Load On-Demand

**`../phase-0/compliance-requirements.json`** - If mapping compliance-relevant components
- Purpose: Identify code paths that must meet specific regulations
- When: Read during Step 2 if compliance context needed
- Contains: Applicable regulations (SOC2, PCI-DSS, HIPAA, GDPR) with specific requirements

---

## How Phase 0 Drives Codebase Mapping

| Phase 0 Input | Impact on Mapping | Example |
|---------------|-------------------|---------|
| **Crown Jewels** | Focus 60% effort on components handling crown jewels | If crown jewels = ["payment_card_data"], prioritize payment processor, tokenization, PCI vault components over marketing site |
| **Compliance** | Identify compliance-relevant code paths | If compliance = HIPAA, identify PHI storage, access logging, encryption components for enhanced scrutiny |
| **Threat Actors** | Map attack surface relevant to actor capabilities | If threat actors = ransomware, identify backup systems, encryption points, recovery mechanisms |

---

## Step 2 Enhancement: Prioritized Component Identification

### Before Phase 0 Integration (OLD)
All components analyzed with equal priority:
```
Component 1 (Marketing Site) → 25% effort
Component 2 (Payment Processor) → 25% effort
Component 3 (User Auth) → 25% effort
Component 4 (Analytics) → 25% effort
```

### After Phase 0 Integration (NEW)
Components prioritized by crown jewel handling:

```bash
# Read crown jewels from Phase 0
CROWN_JEWELS=$(jq -r '.crown_jewels[].data_type' ../phase-0/data-classification.json)
echo "Prioritizing components handling: $CROWN_JEWELS"
```

**Prioritization Strategy (60/30/10 split)**:

**Tier 1 - Crown Jewel Handlers (60% effort)**:
- Components that process, store, or transmit crown jewels
- Search for keywords from crown jewels in file names and imports
- Map complete data flows for sensitive data
- Deep analysis of entry points handling crown jewels

**Tier 2 - External Interfaces (30% effort)**:
- APIs, webhooks, third-party integrations
- Authentication and authorization boundaries
- Data transformation and serialization points
- Cross-component communication

**Tier 3 - Supporting Infrastructure (10% effort)**:
- Build systems, CI/CD pipelines
- Internal utilities and helpers
- Non-security-critical components
- Documentation and tooling

### Example Prioritization

**Scenario**: Phase 0 identifies crown jewels = `["payment_card_data", "user_credentials"]`

**Tier 1 (60% effort)**:
- Payment processor (handles payment_card_data)
- Authentication service (handles user_credentials)
- Credential storage/vault (handles user_credentials)
- Payment tokenization service (handles payment_card_data)

**Tier 2 (30% effort)**:
- User API (external interface, touches user_credentials)
- Admin panel (external interface, elevated privileges)
- Webhook handlers (external data ingress)
- Third-party payment gateway integration

**Tier 3 (10% effort)**:
- Email notification service (no crown jewels)
- Analytics service (aggregated data only)
- Logging infrastructure (no sensitive data)
- Static asset serving (public content)

---

## Component JSON Output Schema Enhancement

### New Fields

**`handles_crown_jewels`** (boolean):
- `true` if component processes any crown jewel from Phase 0
- `false` otherwise
- Used to prioritize downstream Phase 2-4 analysis

**`crown_jewels_handled`** (array of strings):
- List of specific crown jewel data types this component handles
- Must match `data_type` values from Phase 0 `data-classification.json`
- Empty array if `handles_crown_jewels = false`

**`business_criticality`** (enum):
- `"critical"` - Handles crown jewels directly
- `"high"` - External interface or authentication boundary
- `"medium"` - Supporting services with indirect access
- `"low"` - Non-security-critical infrastructure

**`analysis_depth`** (enum):
- `"deep"` - Full analysis (Tier 1 - 60% effort)
- `"standard"` - Normal analysis (Tier 2 - 30% effort)
- `"surface"` - High-level only (Tier 3 - 10% effort)

### Example Component JSON

**Tier 1 Component** (handles crown jewels):
```json
{
  "component": "payment-processor",
  "type": "backend",
  "location": "./modules/chariot/backend/pkg/payment",
  "responsibilities": [
    "Process payment card transactions",
    "Tokenize card data via third-party vault",
    "Store tokenized references in DynamoDB"
  ],
  "technologies": ["Go", "AWS Lambda", "Stripe API"],
  "handles_crown_jewels": true,
  "crown_jewels_handled": ["payment_card_data"],
  "business_criticality": "critical",
  "analysis_depth": "deep",
  "external_dependencies": ["Stripe", "DynamoDB"],
  "security_notes": [
    "PCI-DSS Requirement 3: Must not store raw card data",
    "Tokenization reduces PCI scope",
    "Review Stripe SDK usage for secure implementation"
  ]
}
```

**Tier 2 Component** (external interface):
```json
{
  "component": "user-api",
  "type": "backend",
  "location": "./modules/chariot/backend/pkg/api",
  "responsibilities": [
    "REST API for user management",
    "Authentication via Cognito JWT",
    "Authorization via IAM roles"
  ],
  "technologies": ["Go", "AWS Lambda", "API Gateway"],
  "handles_crown_jewels": false,
  "crown_jewels_handled": [],
  "business_criticality": "high",
  "analysis_depth": "standard",
  "external_dependencies": ["AWS Cognito", "API Gateway"],
  "security_notes": [
    "Public-facing API - validate all inputs",
    "Rate limiting required",
    "CORS configuration must be reviewed"
  ]
}
```

**Tier 3 Component** (supporting infrastructure):
```json
{
  "component": "email-service",
  "type": "backend",
  "location": "./modules/chariot/backend/pkg/email",
  "responsibilities": [
    "Send notification emails",
    "Template rendering",
    "Queue processing via SQS"
  ],
  "technologies": ["Go", "AWS SES", "SQS"],
  "handles_crown_jewels": false,
  "crown_jewels_handled": [],
  "business_criticality": "low",
  "analysis_depth": "surface",
  "external_dependencies": ["AWS SES", "SQS"],
  "security_notes": [
    "No sensitive data in email content",
    "Review for email injection vulnerabilities"
  ]
}
```

---

## Summary Generation Enhancement

### New Section: Business Context Reference

Add this section at the top of `summary.md` to connect Phase 0 to Phase 1 findings:

```markdown
# Codebase Analysis Summary

## Business Context (from Phase 0)

**Crown Jewels Identified**:
- `{crown_jewel_1}` - {sensitivity_level} - {regulatory_requirement}
- `{crown_jewel_2}` - {sensitivity_level} - {regulatory_requirement}

**Analysis Prioritization**:
- **60% effort**: Components handling crown jewels ({list})
- **30% effort**: External interfaces and auth boundaries ({list})
- **10% effort**: Supporting infrastructure ({list})

**Compliance Context**:
- {regulation_1}: {brief_requirement}
- {regulation_2}: {brief_requirement}

**Threat Actor Focus** (from Phase 0):
- Primary: {threat_actor_1} - {motivation}
- Secondary: {threat_actor_2} - {motivation}

---

## Technology Stack
...
```

### Example Business Context Section

```markdown
## Business Context (from Phase 0)

**Crown Jewels Identified**:
- `payment_card_data` - Critical - PCI-DSS Requirement 3 (protect stored cardholder data)
- `user_credentials` - High - NIST 800-63B (password storage and authentication)

**Analysis Prioritization**:
- **60% effort**: Payment processor, Authentication service, Credential vault (handle crown jewels)
- **30% effort**: User API, Admin panel, Webhook handlers (external interfaces)
- **10% effort**: Email service, Analytics, Logging infrastructure (supporting services)

**Compliance Context**:
- PCI-DSS Level 1: Requirement 3 (data protection), Requirement 6 (secure development), Requirement 10 (logging)
- SOC2 Type II: CC6.1 (access controls), CC6.7 (encryption), CC7.2 (audit logging)

**Threat Actor Focus** (from Phase 0):
- Primary: Financially motivated cybercriminals - Card data theft for fraud/resale, credential stuffing
- Secondary: Insider threats - Abuse privileged access to payment data
```

---

## Next Phase Guidance Enhancement

At the end of `summary.md`, include forward-looking guidance for Phase 2:

```markdown
## Recommended Focus Areas for Phase 2 (Security Controls Mapping)

Based on crown jewels and compliance requirements from Phase 0:

1. **PCI-DSS Requirement 3 Validation** (Critical Priority)
   - Components: Payment processor, Tokenization service
   - Focus: Verify no raw card data storage, validate encryption at rest
   - Phase 0 reference: PCI-DSS Level 1 requirement

2. **Authentication Control Review** (High Priority)
   - Components: Authentication service, User API
   - Focus: Credential storage (hashing, salting), session management, MFA implementation
   - Phase 0 reference: user_credentials crown jewel

3. **Access Logging Validation** (High Priority - Compliance)
   - Components: All Tier 1 components
   - Focus: Audit trail for crown jewel access, tamper-evident logging
   - Phase 0 reference: SOC2 CC7.2, PCI-DSS Requirement 10
```

---

## Error Handling

### Missing Phase 0 Files

**Cannot proceed without Phase 0**. If Phase 0 files are missing:

```bash
# Check for Phase 0 summary
if [ ! -f "../phase-0/summary.md" ]; then
  echo "ERROR: Phase 0 (Business Context Discovery) not complete."
  echo "Phase 1 requires business context to prioritize analysis."
  echo ""
  echo "Run: skill: \"business-context-discovery\""
  echo ""
  echo "Phase 0 discovers WHAT you're protecting (crown jewels) and WHY (business impact)."
  echo "Without this context, codebase mapping treats all components equally."
  exit 1
fi
```

### Validate Crown Jewels Schema

```bash
# Verify data-classification.json has required structure
if ! jq -e '.crown_jewels | length > 0' ../phase-0/data-classification.json > /dev/null 2>&1; then
  echo "ERROR: data-classification.json missing crown_jewels array"
  echo "Phase 0 must identify at least one crown jewel for prioritization"
  exit 1
fi
```

---

## Testing Phase 0 Integration

### Test Scenario 1: With Crown Jewels

**Setup**:
```json
// phase-0/data-classification.json
{
  "crown_jewels": [
    {
      "data_type": "payment_card_data",
      "sensitivity": "critical",
      "regulatory_requirement": "PCI-DSS Requirement 3"
    }
  ]
}
```

**Expected Behavior**:
1. Payment processor identified as Tier 1 (60% effort)
2. `handles_crown_jewels: true` in payment processor JSON
3. Summary highlights payment components in "60% effort" section
4. Next phase guidance focuses on PCI-DSS Requirement 3

### Test Scenario 2: Without Phase 0

**Setup**: Delete `phase-0/` directory

**Expected Behavior**:
1. Skill errors immediately: "Phase 0 not complete"
2. Provides guidance to run `business-context-discovery` skill
3. Does NOT proceed to technology detection
4. Explains WHY Phase 0 is required (prioritization, not security theater)

---

## Related Sections in Main Skill

This reference file is loaded from:
- **Step 2: Component Identification** - Crown jewel prioritization logic
- **Step 6: Summary Generation** - Business context reference section

**Main skill includes**:
- Brief overview of Phase 0 integration (3-5 sentences)
- Link to this reference for detailed patterns
- Error handling if Phase 0 missing

---

## References

- `threat-model-business-integration.md` - Task 2: Complete integration requirements
- `../phase-0/summary.md` - Business context from Phase 0
- `../phase-0/data-classification.json` - Crown jewels schema
- `../phase-0/compliance-requirements.json` - Regulatory requirements
