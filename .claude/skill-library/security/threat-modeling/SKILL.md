---
name: threat-modeling
description: Use when identifying security threats - combines STRIDE, PASTA, and DFD principles to generate threat models and abuse cases
allowed-tools: Read, Write, Bash, TodoWrite
---

# Threat Modeling

**Systematic threat identification methodology combining STRIDE, PASTA, and DFD principles for Phase 3 of the threat modeling workflow.**

## When to Use

Use this skill when:

- Orchestrator reaches Phase 3 of threat modeling workflow
- Phase 1 (codebase mapping) and Phase 2 (security controls) are complete
- Need to identify threats, abuse cases, and attack patterns
- Generating risk-scored threat intelligence for security testing
- Phase 4 (security test planning) requires threat model input

## Quick Reference

### STRIDE Categories

| Category                   | Threat Type     | Focus                     |
| -------------------------- | --------------- | ------------------------- |
| **S**poofing               | Identity        | Authentication weaknesses |
| **T**ampering              | Integrity       | Data modification risks   |
| **R**epudiation            | Accountability  | Missing audit trails      |
| **I**nfo Disclosure        | Confidentiality | Unauthorized data access  |
| **D**oS                    | Availability    | Service disruption        |
| **E**levation of Privilege | Authorization   | Permission bypasses       |

### Risk Scoring Matrix

```
Risk Score = Business Impact × Likelihood

Business Impact:
  Critical (4) - Business-ending, regulatory violation, mass data breach
  High (3)     - Significant revenue loss, major data exposure
  Medium (2)   - Limited impact, contained incident
  Low (1)      - Minimal business impact

Likelihood:
  High (3)   - Easily exploitable, public knowledge
  Medium (2) - Requires skill or insider knowledge
  Low (1)    - Difficult, requires significant resources

Risk Matrix:
  Critical (9-12): Immediate action required
  High (6-8):      Address in current sprint
  Medium (3-5):    Plan for remediation
  Low (1-2):       Accept or defer
```

## Required Inputs

**CRITICAL: Phase 3 requires these inputs from previous phases.**

### From Phase 1 (Codebase Mapping)

```
.claude/.threat-model/{session}/phase-1/
├── summary.md              # <2000 token architecture summary
├── architecture.md         # High-level system design
├── data-flows.json         # How data moves through system
├── trust-boundaries.json   # Where security controls must exist
└── entry-points.json       # Attack surface (APIs, UI, CLI)
```

### From Phase 2 (Security Controls)

```
.claude/.threat-model/{session}/phase-2/
├── summary.md              # <2000 token controls summary
├── authentication.json     # Auth mechanisms
├── authorization.json      # RBAC/ABAC/permissions
├── input-validation.json   # Validation patterns
├── cryptography.json       # Encryption/hashing
├── audit-logging.json      # Security events
├── rate-limiting.json      # DoS protections
└── control-gaps.json       # Missing/partial controls
```

**Load Phase 1 and Phase 2 summaries** to understand system before detailed threat analysis.

### From Phase 0 (Business Context) **MANDATORY**

```
.claude/.threat-model/{session}/phase-0/
├── summary.md                  # <2000 token business context summary
├── threat-actors.json          # Relevant attacker profiles (filter STRIDE)
├── business-impact.json        # Actual financial impact data (risk scoring)
└── data-classification.json    # Crown jewels (threat prioritization)
```

**Phase 0 drives risk-based threat modeling**:

- **Threat actors** filter STRIDE (apply ONLY actors from Phase 0, skip all others)
- **Business impact** provides actual financial data (not generic "high/medium/low")
- **Crown jewels** add +2 priority bonus to high-value asset threats
- **Compliance** adds +1 priority bonus to regulatory violation threats

**CRITICAL: Phase 0 must be loaded BEFORE starting STRIDE. Cannot retrofit business context after threat analysis.**

**No exceptions**:

- Don't skip Phase 0 under time pressure
- Don't use generic scoring even with authority approval
- Don't retrofit business_context fields after completing analysis
- Don't estimate business impact yourself - use actual Phase 0 data

**If Phase 0 files missing**: Stop. Cannot proceed to Phase 3 without Phase 0 completion.

**For detailed Phase 0 integration guidance, see [Phase 0 Integration Guide](references/phase-0-integration.md)**.

## Core Workflow

**You MUST use TodoWrite** to track progress through all steps.

### Step 1: Load Context

Load compressed summaries from previous phases:

```bash
# Read Phase 1 summary
cat .claude/.threat-model/{session}/phase-1/summary.md

# Read Phase 2 summary
cat .claude/.threat-model/{session}/phase-2/summary.md
```

**Understanding check**: Can you articulate the system architecture and existing controls in 2-3 sentences?

### Step 2: Apply STRIDE Systematically (Filtered by Phase 0 Threat Actors)

**Load threat actors from Phase 0 first**:

```bash
cat .claude/.threat-model/{session}/phase-0/threat-actors.json
```

For EACH component identified in Phase 1, apply STRIDE **filtered by relevant threat actors**:

1. **Spoofing**: Can attacker impersonate users/services? (Check if relevant to threat actors)
2. **Tampering**: Can attacker modify data in transit/at rest? (Check if relevant to threat actors)
3. **Repudiation**: Can attacker deny actions? Are audit logs sufficient?
4. **Info Disclosure**: Can attacker access sensitive data? (High priority if targets crown jewels)
5. **DoS**: Can attacker disrupt service availability? (Check if ransomware is threat actor tactic)
6. **Elevation of Privilege**: Can attacker escalate permissions?

**Key principle**: If Phase 0 identifies "financially_motivated_cybercriminals", apply payment fraud and ransomware threats. If Phase 0 does NOT identify "nation-state APTs", skip advanced persistent threat scenarios.

**Map to control gaps from Phase 2**: Missing authentication = Spoofing risk

**For detailed threat actor filtering, see [Phase 0 Integration Guide](references/phase-0-integration.md#section-2-applying-stride-with-threat-actor-context)**.

### Step 3: Execute PASTA Risk Analysis

Apply 7-stage PASTA methodology:

| Stage                        | Purpose                       | Key Questions                               |
| ---------------------------- | ----------------------------- | ------------------------------------------- |
| 1. Define Objectives         | Business context              | What assets matter most? Who are the users? |
| 2. Define Technical Scope    | Architecture understanding    | What's in scope from Phase 1?               |
| 3. Application Decomposition | Component breakdown           | What are trust boundaries?                  |
| 4. Threat Analysis           | Identify threat actors        | External attackers? Insiders? Competitors?  |
| 5. Vulnerability Analysis    | Map weaknesses to threats     | Which control gaps enable which threats?    |
| 6. Attack Modeling           | Build attack trees            | What are the attack paths?                  |
| 7. Risk/Impact Analysis      | Prioritize by business impact | Which threats hurt the business most?       |

See [references/pasta-methodology.md](references/pasta-methodology.md) for detailed stage guidance.

### Step 4: Map Threats to DFD Elements

Map identified threats to Data Flow Diagram elements:

| DFD Element       | Security Consideration | Threat Examples                  |
| ----------------- | ---------------------- | -------------------------------- |
| External Entities | Untrusted inputs       | Injection, XSS, CSRF             |
| Processes         | Input validation       | Logic bugs, race conditions      |
| Data Stores       | Encryption at rest     | SQL injection, data breaches     |
| Data Flows        | Encryption in transit  | MITM, eavesdropping              |
| Trust Boundaries  | Security controls      | Authentication bypass, elevation |

**Load data-flows.json and trust-boundaries.json from Phase 1** to map threats.

### Step 5: Generate Abuse Cases

For top threats (High/Critical risk), create abuse cases showing attack scenarios.

**Template**:

```json
{
  "id": "ABUSE-001",
  "name": "Credential Theft via Phishing",
  "threatActor": "External attacker",
  "motivation": "Financial gain, data exfiltration",
  "scenario": "Attacker sends phishing email...",
  "preconditions": ["Weak MFA enforcement", "No email security training"],
  "attackSteps": [
    "1. Craft phishing email mimicking internal domain",
    "2. Victim clicks link, enters credentials",
    "3. Attacker captures credentials",
    "4. Attacker logs in using stolen credentials"
  ],
  "assetsAtRisk": ["User accounts", "Customer data"],
  "businessImpact": "Data breach, regulatory fines",
  "relatedThreats": ["THREAT-001", "THREAT-007"],
  "relatedControls": ["authentication", "audit-logging"],
  "controlGaps": ["No MFA", "Weak session management"],
  "testCases": ["Test credential stuffing", "Test session hijacking"]
}
```

See [references/abuse-case-patterns.md](references/abuse-case-patterns.md) for more examples.

### Step 6: Build Attack Trees

For Critical/High threats, visualize attack paths from attacker perspective.

**Example**:

```markdown
## Attack Tree: Credential Theft

**Goal**: Gain unauthorized access to user account

├── Path 1: Phishing
│ ├── Craft convincing phishing email
│ ├── Victim clicks and enters credentials
│ └── [SUCCESS if MFA disabled]
│
├── Path 2: Credential Stuffing
│ ├── Obtain leaked password database
│ ├── Automated login attempts
│ └── [SUCCESS if no rate limiting]
│
└── Path 3: Session Hijacking
├── Intercept session token (XSS/MITM)
├── Replay token
└── [SUCCESS if weak session management]
```

See [references/attack-tree-patterns.md](references/attack-tree-patterns.md) for detailed guidance.

### Step 7: Score Risks (Using Phase 0 Business Impact Data)

**Load business impact scenarios from Phase 0**:

```bash
cat .claude/.threat-model/{session}/phase-0/business-impact.json
cat .claude/.threat-model/{session}/phase-0/data-classification.json
```

Apply risk scoring with **actual business impact numbers** (not generic estimates):

```
Risk Score = Business Impact (from Phase 0) × Likelihood (from analysis)
Priority = Risk Score + Crown Jewel Bonus + Compliance Bonus

Business Impact Score (from Phase 0 scenarios):
  Critical (4) = >$50M, business-ending, regulatory violation
  High (3)     = $5M-$50M, significant data exposure
  Medium (2)   = $500K-$5M, limited impact
  Low (1)      = <$500K, minimal impact

Likelihood (from threat analysis):
  High (3)   = Easily exploitable, public knowledge
  Medium (2) = Requires skill or insider knowledge
  Low (1)    = Difficult, requires significant resources

Crown Jewel Bonus = +2 if targets crown jewel from Phase 0
Compliance Bonus = +1 if causes regulatory violation from Phase 0
```

**Example**:

- Threat: SQL injection in payment processor
- Phase 0 scenario: "data_breach_1M_card_records" = $365M
- Business Impact: 4 (Critical)
- Likelihood: 3 (High - no input validation)
- Base Risk: 12
- Crown Jewel Bonus: +2 (targets payment_card_data)
- Compliance Bonus: +1 (PCI-DSS violation)
- **Final Priority: 15 (CRITICAL)**

**For detailed risk scoring with Phase 0 data, see [Phase 0 Integration Guide](references/phase-0-integration.md#section-3-risk-scoring-with-business-impact-data)**.

### Step 8: Generate Structured Outputs

**CRITICAL: Phase 4 requires ALL of these files.**

Create output directory structure:

```bash
mkdir -p .claude/.threat-model/{session}/phase-3/abuse-cases
mkdir -p .claude/.threat-model/{session}/phase-3/attack-trees
```

**Required output files**:

1. **threat-model.json** - Structured threat entries (ALL threats, scored) **with business_context section**
2. **abuse-cases/authentication-abuse.json** - Auth-related abuse cases
3. **abuse-cases/authorization-abuse.json** - Authz-related abuse cases
4. **abuse-cases/data-abuse.json** - Data handling abuse cases
5. **abuse-cases/api-abuse.json** - API-specific abuse cases
6. **attack-trees/credential-theft.md** - Attack paths for credential theft
7. **attack-trees/data-exfiltration.md** - Attack paths for data exfil
8. **attack-trees/privilege-escalation.md** - Attack paths for privesc
9. **dfd-threats.json** - Threats mapped to DFD elements
10. **risk-matrix.json** - Risk scores and prioritization
11. **summary.md** - <2000 token summary with top 5 risks **and Phase 0 business context**

**NEW: Each threat in threat-model.json must include business_context section**:

```json
{
  "threat_id": "THR-001",
  "business_context": {
    "targets_crown_jewel": true,
    "crown_jewel": "payment_card_data",
    "business_impact_financial": "$365M (from Phase 0)",
    "relevant_threat_actor": "financially_motivated_cybercriminals"
  }
}
```

See [references/output-schemas.md](references/output-schemas.md) for exact JSON schemas and [Phase 0 Integration Guide](references/phase-0-integration.md#section-5-updated-output-schema) for business_context schema details.

### Step 9: Generate Summary for Phase 4

Create compressed summary (<2000 tokens) highlighting:

- Top 5 Critical/High threats
- Key control gaps enabling threats
- Recommended test priorities
- Attack vectors to validate

**Template**:

```markdown
# Phase 3 Summary: Threat Model

## Top Threats (Critical/High)

1. **THREAT-001**: Credential Theft via Weak MFA (Risk: 12/12)
   - Impact: Critical (Data breach, regulatory violation)
   - Likelihood: High (Weak/missing MFA found in Phase 2)
   - Control Gaps: No MFA enforcement, weak session management

2. **THREAT-007**: SQL Injection in User Endpoints (Risk: 9/12)
   ...

## Key Findings

- X Critical threats identified
- Y High-priority threats
- Control gaps from Phase 2 enable Z attack paths
- Top attack vectors: [credential theft, injection, privilege escalation]

## Recommendations for Phase 4

Priority test targets:

1. Authentication endpoints (credential stuffing, session hijacking)
2. User input handlers (SQL injection, XSS)
3. Authorization checks (horizontal/vertical privilege escalation)
```

### Step 10: Verify Completeness

Before handing off to Phase 4, verify:

- [ ] All 11+ required files generated
- [ ] threat-model.json contains ALL threats with risk scores
- [ ] Abuse cases created for Critical/High threats
- [ ] Attack trees visualize key attack paths
- [ ] summary.md is <2000 tokens
- [ ] Outputs match schemas from references/output-schemas.md

**Phase 4 cannot proceed without complete Phase 3 artifacts.**

## Critical Rules

### ❌ Don't Skip STRIDE Analysis

**WRONG**: "This component looks secure, skipping STRIDE"
**RIGHT**: Apply all 6 STRIDE categories to EVERY component, even if no threats found.

**Why**: Systematic coverage ensures no threat categories are missed.

### ❌ Don't Generate Generic Threats

**WRONG**: "SQL injection is a risk" (generic OWASP threat)
**RIGHT**: "User search endpoint lacks parameterized queries, enabling SQL injection to extract customer PII from user_profiles table" (specific to this system)

**Why**: Phase 4 needs specific threats to generate targeted tests.

### ❌ Don't Skip Risk Scoring

**WRONG**: "This seems bad" (subjective assessment)
**RIGHT**: "Business Impact: Critical (4) - exposes 100K+ customer records. Likelihood: High (3) - no input validation found. Risk Score: 12" (quantified)

**Why**: Phase 4 prioritizes tests by risk score, not intuition.

### ❌ Don't Use Arbitrary Output Format

**WRONG**: Create single `threats.md` with markdown bullets
**RIGHT**: Follow exact schema from references/output-schemas.md (11+ files)

**Why**: Phase 4 orchestrator expects specific file structure. Wrong format = Phase 4 cannot consume.

### ✅ Always Load Phase 1 & 2 Summaries First

Before analyzing threats, understand:

- System architecture (Phase 1)
- Existing controls and gaps (Phase 2)

Threat modeling without context = generic threats that don't help.

### ✅ Always Map Threats to Control Gaps

Every threat should trace back to:

- Missing control from Phase 2 (e.g., "No rate limiting" → DoS threat)
- Weak control from Phase 2 (e.g., "Basic auth, no MFA" → Credential theft)

This creates actionable recommendations for Phase 4.

### ✅ Always Compress Summary to <2000 Tokens

Phase 4 orchestrator loads summary.md into context. If >2000 tokens, agent context window fills up.

**Compression strategy**:

- Top 5 threats only (not all 50+)
- 1-2 sentence descriptions
- Bulleted key findings
- Reference full details in threat-model.json

## Troubleshooting

### Issue: No Control Gaps Found in Phase 2

**Cause**: Phase 2 summary shows "all controls present"
**Solution**: Analyze control _effectiveness_, not just presence. Is MFA enforced? Is input validation comprehensive? Are logs monitored?

### Issue: Too Many Threats (100+)

**Cause**: Every potential issue classified as threat
**Solution**: Focus on _exploitable_ threats. If control exists and is effective, risk is LOW (document but don't create abuse case).

### Issue: Can't Score Business Impact

**Cause**: No business context from Phase 1
**Solution**: Read Phase 1 architecture.md and business-context.md. What does this system do? Who uses it? What data is critical?

### Issue: Phase 4 Rejects Outputs

**Cause**: Output schema mismatch
**Solution**: Verify all files match schemas in references/output-schemas.md exactly. Use JSON schema validation if possible.

## References

- **[references/phase-0-integration.md](references/phase-0-integration.md) - Phase 0 business context integration (NEW)**
- [references/stride-framework.md](references/stride-framework.md) - Detailed STRIDE methodology
- [references/pasta-methodology.md](references/pasta-methodology.md) - 7-stage PASTA process
- [references/dfd-threat-mapping.md](references/dfd-threat-mapping.md) - Data flow diagram analysis
- [references/abuse-case-patterns.md](references/abuse-case-patterns.md) - Abuse case templates
- [references/attack-tree-patterns.md](references/attack-tree-patterns.md) - Attack tree visualization
- [references/risk-scoring-guide.md](references/risk-scoring-guide.md) - Risk assessment examples
- [references/output-schemas.md](references/output-schemas.md) - Required JSON schemas for all outputs

## Related Skills

- `business-context-discovery` - Phase 0 methodology (produces business context inputs) **NEW**
- `codebase-mapping` - Phase 1 methodology (produces architecture inputs)
- `security-controls-mapping` - Phase 2 methodology (produces control gap inputs)
- `security-test-planning` - Phase 4 methodology (consumes threat model outputs)
- `gateway-security` - Routes to all security skills
