---
name: threat-modeling
description: Use when identifying security threats - combines STRIDE, PASTA, and DFD principles to generate threat models and abuse cases
allowed-tools: Read, Write, Bash, TodoWrite
---

# Threat Modeling

**Systematic threat identification methodology combining STRIDE, PASTA, and DFD principles for Phase 5 of the threat modeling workflow.**

## When to Use

Use this skill when:
- Orchestrator reaches Phase 5 of threat modeling workflow
- Phase 3 (codebase mapping) and Phase 4 (security controls) are complete
- Need to identify threats, abuse cases, and attack patterns
- Generating risk-scored threat intelligence for security testing
- Phase 6 (security test planning) requires threat model input

## Quick Reference

### STRIDE Categories

| Category | Threat Type | Focus |
|----------|-------------|-------|
| **S**poofing | Identity | Authentication weaknesses |
| **T**ampering | Integrity | Data modification risks |
| **R**epudiation | Accountability | Missing audit trails |
| **I**nfo Disclosure | Confidentiality | Unauthorized data access |
| **D**oS | Availability | Service disruption |
| **E**levation of Privilege | Authorization | Permission bypasses |

### Risk Scoring (CVSS)

**Use CVSS scoring via the `scoring-cvss-threats` skill** (4.0 recommended, 3.1 optional).

```
CVSS Severity Bands:
  Critical (9.0-10.0): Immediate action required
  High (7.0-8.9):      Address in current sprint
  Medium (4.0-6.9):    Plan for remediation
  Low (0.1-3.9):       Accept or defer
  None (0.0):          Informational only

Prioritization: Use Environmental Score (business-contextualized from Phase 1),
                not Base Score (generic severity).
```

**See Step 3 below** for CVSS workflow and [references/scoring-cvss-threats-integration.md](references/scoring-cvss-threats-integration.md) for details.

## Required Inputs

**CRITICAL: Phase 5 requires these inputs from previous phases.**

### From Phase 3 (Codebase Mapping)
```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/
├── summary.md              # <2000 token architecture summary
├── architecture.md         # High-level system design
├── data-flows.json         # How data moves through system
├── trust-boundaries.json   # Where security controls must exist
└── entry-points.json       # Attack surface (APIs, UI, CLI)
```

### From Phase 4 (Security Controls)
```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-4/
├── summary.md              # <2000 token controls summary
├── authentication.json     # Auth mechanisms
├── authorization.json      # RBAC/ABAC/permissions
├── input-validation.json   # Validation patterns
├── cryptography.json       # Encryption/hashing
├── audit-logging.json      # Security events
├── rate-limiting.json      # DoS protections
└── control-gaps.json       # Missing/partial controls
```

**Load Phase 3 and Phase 4 summaries** to understand system before detailed threat analysis.

### From Phase 1 (Business Context) **MANDATORY**
```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-1/
├── summary.md                  # <2000 token business context summary
├── threat-actors.json          # Relevant attacker profiles (filter STRIDE)
├── business-impact.json        # Actual financial impact data (risk scoring)
└── data-classification.json    # Crown jewels (threat prioritization)
```

**Phase 1 drives risk-based threat modeling**:
- **Threat actors** filter STRIDE (apply ONLY actors from Phase 1, skip all others)
- **Business impact** provides actual financial data (not generic "high/medium/low")
- **Crown jewels** add +2 priority bonus to high-value asset threats
- **Compliance** adds +1 priority bonus to regulatory violation threats

**CRITICAL: Phase 1 must be loaded BEFORE starting STRIDE. Cannot retrofit business context after threat analysis.**

**No exceptions**:
- Don't skip Phase 1 under time pressure
- Don't use generic scoring even with authority approval
- Don't retrofit business_context fields after completing analysis
- Don't estimate business impact yourself - use actual Phase 1 data

**If Phase 1 files missing**: Stop. Cannot proceed to Phase 5 without Phase 1 completion.

**For detailed Phase 1 integration guidance, see [Phase 1 Integration Guide](references/phase-1-integration.md)**.

## Core Workflow

**You MUST use TodoWrite** to track progress through all steps.

### Step 1: Load Context

Load compressed summaries from previous phases:
```bash
# Read Phase 3 summary
cat .claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/summary.md

# Read Phase 4 summary
cat .claude/.output/threat-modeling/{timestamp}-{slug}/phase-4/summary.md
```

**Understanding check**: Can you articulate the system architecture and existing controls in 2-3 sentences?

### Step 2: Apply STRIDE Systematically (Filtered by Phase 1 Threat Actors)

**Load threat actors from Phase 1 first**:
```bash
cat .claude/.output/threat-modeling/{timestamp}-{slug}/phase-1/threat-actors.json
```

For EACH component identified in Phase 3, apply STRIDE **filtered by relevant threat actors**:

1. **Spoofing**: Can attacker impersonate users/services? (Check if relevant to threat actors)
2. **Tampering**: Can attacker modify data in transit/at rest? (Check if relevant to threat actors)
3. **Repudiation**: Can attacker deny actions? Are audit logs sufficient?
4. **Info Disclosure**: Can attacker access sensitive data? (High priority if targets crown jewels)
5. **DoS**: Can attacker disrupt service availability? (Check if ransomware is threat actor tactic)
6. **Elevation of Privilege**: Can attacker escalate permissions?

**Key principle**: If Phase 1 identifies "financially_motivated_cybercriminals", apply payment fraud and ransomware threats. If Phase 1 does NOT identify "nation-state APTs", skip advanced persistent threat scenarios.

**Map to control gaps from Phase 4**: Missing authentication = Spoofing risk

**For detailed threat actor filtering, see [Phase 1 Integration Guide](references/phase-1-integration.md#section-2-applying-stride-with-threat-actor-context)**.

### Step 3: Score Threats with CVSS

**After identifying all threats in STRIDE analysis**, score each threat using CVSS 4.0:

For each threat identified:
1. Prepare Phase 1 business context and Phase 3 architecture context
2. Invoke `scoring-cvss-threats` skill with threat details and context
3. Capture CVSS scores (base, threat, environmental, overall)
4. Add CVSS structure to threat entry

**Brief workflow**:
```
For each threat:
  → Skill: "scoring-cvss-threats" with threat + Phase 1 context
  → Capture: Base score, Environmental score, Overall score, Severity
  → Store: Full CVSS structure in threat entry
```

**For detailed CVSS integration workflow, see [CVSS Scoring Integration](references/scoring-cvss-threats-integration.md)**:
- When to score (after STRIDE, before prioritization)
- How to invoke scoring-cvss-threats skill with context
- Updated threat schema with CVSS structure
- Efficient parallel scoring for large threat models

### Step 4: Execute PASTA Risk Analysis

Apply 7-stage PASTA methodology:

| Stage | Purpose | Key Questions |
|-------|---------|---------------|
| 1. Define Objectives | Business context | What assets matter most? Who are the users? |
| 2. Define Technical Scope | Architecture understanding | What's in scope from Phase 3? |
| 3. Application Decomposition | Component breakdown | What are trust boundaries? |
| 4. Threat Analysis | Identify threat actors | External attackers? Insiders? Competitors? |
| 5. Vulnerability Analysis | Map weaknesses to threats | Which control gaps enable which threats? |
| 6. Attack Modeling | Build attack trees | What are the attack paths? |
| 7. Risk/Impact Analysis | Prioritize by business impact | Which threats hurt the business most? |

See [references/pasta-methodology.md](references/pasta-methodology.md) for detailed stage guidance.

### Step 5: Map Threats to DFD Elements

Map identified threats to Data Flow Diagram elements:

| DFD Element | Security Consideration | Threat Examples |
|-------------|------------------------|-----------------|
| External Entities | Untrusted inputs | Injection, XSS, CSRF |
| Processes | Input validation | Logic bugs, race conditions |
| Data Stores | Encryption at rest | SQL injection, data breaches |
| Data Flows | Encryption in transit | MITM, eavesdropping |
| Trust Boundaries | Security controls | Authentication bypass, elevation |

**Load data-flows.json and trust-boundaries.json from Phase 3** to map threats.

### Step 6: Generate Abuse Cases

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

### Step 7: Build Attack Trees

For Critical/High threats, visualize attack paths from attacker perspective.

**Example**:
```markdown
## Attack Tree: Credential Theft

**Goal**: Gain unauthorized access to user account

├── Path 1: Phishing
│   ├── Craft convincing phishing email
│   ├── Victim clicks and enters credentials
│   └── [SUCCESS if MFA disabled]
│
├── Path 2: Credential Stuffing
│   ├── Obtain leaked password database
│   ├── Automated login attempts
│   └── [SUCCESS if no rate limiting]
│
└── Path 3: Session Hijacking
    ├── Intercept session token (XSS/MITM)
    ├── Replay token
    └── [SUCCESS if weak session management]
```

See [references/attack-tree-patterns.md](references/attack-tree-patterns.md) for detailed guidance.

### Step 8: Prioritize with CVSS Environmental Scores

**Use CVSS Environmental scores from Step 3** to prioritize threats:

```
Primary Sort: CVSS Environmental Score (0.0-10.0)
Secondary Sort: CVSS Overall Score (0.0-10.0)
Tertiary Sort: Business Impact from Phase 1

Priority Bands:
  Critical (9.0-10.0): Immediate action required
  High (7.0-8.9):      Address in current sprint
  Medium (4.0-6.9):    Plan for remediation
  Low (0.1-3.9):       Accept or defer
```

**Sort threats by Environmental Score**:
```bash
# Sort threat-model.json by cvss.environmental.score (descending)
jq '.threats | sort_by(-.cvss.environmental.score)' threat-model.json > sorted-threats.json
```

**Why CVSS Environmental Score?**
- Incorporates Phase 1 business context (Confidentiality/Integrity/Availability Requirements)
- Industry-standard methodology (comparable across organizations)
- More precise than 1-12 matrix (10-point scale with decimals)
- Business-contextualized risk (not generic CVSS Base scores)

**For detailed CVSS-based prioritization, see [CVSS Scoring Integration](references/scoring-cvss-threats-integration.md)**:
- How Environmental scores incorporate Phase 1 data
- Updated risk-matrix.json schema with CVSS bands
- Migration from old 1-12 matrix to CVSS scoring

### Step 9: Generate Structured Outputs

**CRITICAL: Phase 6 requires ALL of these files.**

Create output directory structure:
```bash
mkdir -p .claude/.output/threat-modeling/{timestamp}-{slug}/phase-5/abuse-cases
mkdir -p .claude/.output/threat-modeling/{timestamp}-{slug}/phase-5/attack-trees
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
11. **summary.md** - <2000 token summary with top 5 risks **and Phase 1 business context**

**Each threat in threat-model.json must include**:
- **cvss section** (from Step 3): Base, Threat, Environmental, Overall scores
- **business_context section** (from Phase 1): Crown jewels, financial impact, threat actors

```json
{
  "threat_id": "THR-001",
  "cvss": {
    "version": "4.0",
    "environmental": {
      "score": 9.3,
      "vector": "CVSS:4.0/CR:H/IR:H/AR:M/..."
    },
    "overall": {
      "score": 9.3,
      "severity": "Critical"
    }
  },
  "business_context": {
    "targets_crown_jewel": true,
    "crown_jewel": "payment_card_data",
    "business_impact_financial": "$365M (from Phase 1)",
    "relevant_threat_actor": "financially_motivated_cybercriminals"
  }
}
```

**Threats must be sorted by cvss.environmental.score (descending)**.

See [references/output-schemas.md](references/output-schemas.md) for exact JSON schemas, [Phase 1 Integration Guide](references/phase-1-integration.md#section-5-updated-output-schema) for business_context details, and [CVSS Scoring Integration](references/scoring-cvss-threats-integration.md) for full CVSS structure.

### Step 10: Generate Summary for Phase 6

Create compressed summary (<2000 tokens) highlighting:
- Top 5 Critical/High threats
- Key control gaps enabling threats
- Recommended test priorities
- Attack vectors to validate

**Template**:
```markdown
# Phase 5 Summary: Threat Model

## Top Threats (CVSS 4.0 Scored)

1. **THREAT-001**: Credential Theft via Weak MFA (CVSS: 9.3 Critical)
   - Environmental Score: 9.3 | Base Score: 8.5
   - STRIDE: Spoofing, Elevation of Privilege
   - Control Gaps: No MFA enforcement, weak session management
   - Business Impact: Targets user_credentials crown jewel

2. **THREAT-007**: SQL Injection in User Endpoints (CVSS: 8.5 High)
   - Environmental Score: 8.5 | Base Score: 7.5
   - STRIDE: Tampering, Information Disclosure
   - Control Gaps: Insufficient input validation in Phase 4
   - Business Impact: Potential PCI-DSS violation

## Key Findings

- X threats at CVSS 9.0-10.0 (Critical)
- Y threats at CVSS 7.0-8.9 (High)
- Control gaps from Phase 4 enable Z attack paths
- Top attack vectors: [credential theft, injection, privilege escalation]

## Recommendations for Phase 6

Priority test targets (CVSS-ordered):
1. Authentication endpoints (CVSS 9.3 - credential stuffing, session hijacking)
2. User input handlers (CVSS 8.5 - SQL injection, XSS)
3. Authorization checks (CVSS 7.8 - horizontal/vertical privilege escalation)
```

### Step 11: Verify Completeness

Before handing off to Phase 6, verify:

- [ ] All 11+ required files generated
- [ ] threat-model.json contains ALL threats with risk scores
- [ ] Abuse cases created for Critical/High threats
- [ ] Attack trees visualize key attack paths
- [ ] summary.md is <2000 tokens
- [ ] Outputs match schemas from references/output-schemas.md

**Phase 6 cannot proceed without complete Phase 5 artifacts.**

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

**Why**: Phase 6 prioritizes tests by risk score, not intuition.

### ❌ Don't Use Arbitrary Output Format

**WRONG**: Create single `threats.md` with markdown bullets
**RIGHT**: Follow exact schema from references/output-schemas.md (11+ files)

**Why**: Phase 6 orchestrator expects specific file structure. Wrong format = Phase 6 cannot consume.

### ✅ Always Load Phase 3 & 4 Summaries First

Before analyzing threats, understand:
- System architecture (Phase 3)
- Existing controls and gaps (Phase 4)

Threat modeling without context = generic threats that don't help.

### ✅ Always Map Threats to Control Gaps

Every threat should trace back to:
- Missing control from Phase 4 (e.g., "No rate limiting" → DoS threat)
- Weak control from Phase 4 (e.g., "Basic auth, no MFA" → Credential theft)

This creates actionable recommendations for Phase 6.

### ✅ Always Compress Summary to <2000 Tokens

Phase 6 orchestrator loads summary.md into context. If >2000 tokens, agent context window fills up.

**Compression strategy**:
- Top 5 threats only (not all 50+)
- 1-2 sentence descriptions
- Bulleted key findings
- Reference full details in threat-model.json

## Troubleshooting

### Issue: No Control Gaps Found in Phase 4

**Cause**: Phase 4 summary shows "all controls present"
**Solution**: Analyze control *effectiveness*, not just presence. Is MFA enforced? Is input validation comprehensive? Are logs monitored?

### Issue: Too Many Threats (100+)

**Cause**: Every potential issue classified as threat
**Solution**: Focus on *exploitable* threats. If control exists and is effective, risk is LOW (document but don't create abuse case).

### Issue: Can't Score Business Impact

**Cause**: No business context from Phase 1
**Solution**: Read Phase 1 business-context files. What does this system do? Who uses it? What data is critical?

### Issue: Phase 6 Rejects Outputs

**Cause**: Output schema mismatch
**Solution**: Verify all files match schemas in references/output-schemas.md exactly. Use JSON schema validation if possible.

## References

- **[references/execution-context.md](references/execution-context.md) - Agent execution, invocation pattern, and workflow position**
- **[references/scoring-cvss-threats-integration.md](references/scoring-cvss-threats-integration.md) - CVSS 4.0 integration workflow (NEW)**
- **[references/phase-1-integration.md](references/phase-1-integration.md) - Phase 1 business context integration**
- [references/stride-framework.md](references/stride-framework.md) - Detailed STRIDE methodology with CVSS scoring step
- [references/pasta-methodology.md](references/pasta-methodology.md) - 7-stage PASTA process
- [references/dfd-threat-mapping.md](references/dfd-threat-mapping.md) - Data flow diagram analysis
- [references/abuse-case-patterns.md](references/abuse-case-patterns.md) - Abuse case templates
- [references/attack-tree-patterns.md](references/attack-tree-patterns.md) - Attack tree visualization
- [references/risk-scoring-guide.md](references/risk-scoring-guide.md) - Risk assessment examples (DEPRECATED - use CVSS)
- [references/output-schemas.md](references/output-schemas.md) - Required JSON schemas for all outputs

## Execution Context

This skill is executed by the `threat-modeler` agent when spawned by the threat-modeling-orchestrator during Phase 5. The agent operates sequentially (not parallelized) with access to Phase 1 business context, Phase 3 architecture, and Phase 4 security controls.

**For complete execution details**, see [references/execution-context.md](references/execution-context.md):
- Agent invocation pattern
- Available context and artifacts
- Why sequential execution is required
- Agent responsibilities

## Related Skills

- `scoring-cvss-threats` - CVSS 4.0 scoring with business context integration **NEW**
- `business-context-discovery` - Phase 1 methodology (produces business context inputs)
- `codebase-sizing` - Phase 2 methodology (produces sizing analysis)
- `codebase-mapping` - Phase 3 methodology (produces architecture inputs)
- `security-controls-mapping` - Phase 4 methodology (produces control gap inputs)
- `security-test-planning` - Phase 6 methodology (consumes threat model outputs)
- `gateway-security` - Routes to all security skills
