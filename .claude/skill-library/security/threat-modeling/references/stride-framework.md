# STRIDE Framework

**Systematic threat identification methodology developed by Microsoft for security threat modeling.**

## Overview

STRIDE is a mnemonic for six threat categories that help identify security threats systematically. Each letter represents a category of threat that can be applied to components, data flows, and trust boundaries.

## STRIDE Categories

### S - Spoofing Identity

**Definition**: Pretending to be something or someone other than yourself.

**Examples**:
- User impersonation (stolen credentials)
- Service impersonation (fake API endpoints)
- IP address spoofing
- Email spoofing for phishing
- Certificate forgery

**Control Mapping**:
- Authentication (Phase 2: authentication.json)
- MFA enforcement
- Certificate validation
- Identity verification

**CVSS Considerations**:
- Attack Vector: Network if remote, Local if physical access
- Privileges Required: None if weak auth, Low if MFA bypassed
- User Interaction: Required if phishing, None if credential stuffing

### T - Tampering with Data

**Definition**: Malicious modification of data.

**Examples**:
- SQL injection modifying database records
- Man-in-the-middle attacks altering network traffic
- File system tampering
- Memory corruption attacks
- Log file manipulation

**Control Mapping**:
- Input validation (Phase 2: input-validation.json)
- Integrity checks (checksums, signatures)
- Encryption in transit (TLS)
- Access controls on data stores

**CVSS Considerations**:
- Attack Vector: Network for MITM, Adjacent for local network
- Attack Complexity: Low if no validation, High if defenses present
- Integrity Impact: High (data modification is primary goal)

### R - Repudiation

**Definition**: Claiming to not have performed an action without proof.

**Examples**:
- User denies making a purchase (no audit logs)
- Admin denies deleting records (no activity tracking)
- Attacker covers tracks (log deletion)
- Non-signed transactions

**Control Mapping**:
- Audit logging (Phase 2: audit-logging.json)
- Digital signatures
- Non-repudiation mechanisms (blockchain)
- Immutable logs

**CVSS Considerations**:
- Attack Complexity: Low if no logging, High if must evade monitoring
- Privileges Required: Low/High depending on log access
- Scope: May change if affects accountability across systems

### I - Information Disclosure

**Definition**: Exposure of information to unauthorized individuals.

**Examples**:
- SQL injection extracting database contents
- Directory traversal revealing files
- Information leakage in error messages
- Unencrypted sensitive data transmission
- Improper access controls

**Control Mapping**:
- Authorization (Phase 2: authorization.json)
- Encryption at rest/transit (Phase 2: cryptography.json)
- Data classification (Phase 1: data-classification.json)
- Access controls

**CVSS Considerations**:
- Confidentiality Impact: High if exposes crown jewels
- Confidentiality Requirement (Environmental): High if Phase 1 identifies sensitive data
- Attack Vector: Depends on exposure mechanism

### D - Denial of Service (DoS)

**Definition**: Denying or degrading valid access to service.

**Examples**:
- Network flooding (DDoS)
- Resource exhaustion attacks
- Algorithmic complexity attacks
- Application-layer DoS
- Ransomware

**Control Mapping**:
- Rate limiting (Phase 2: rate-limiting.json)
- Resource quotas
- Load balancing
- Input validation (reject malformed requests)

**CVSS Considerations**:
- Availability Impact: High (service disruption is primary goal)
- Availability Requirement (Environmental): High if Phase 1 identifies SLA requirements
- Attack Complexity: Low if no rate limiting, High if defenses present

### E - Elevation of Privilege

**Definition**: Gaining capabilities without proper authorization.

**Examples**:
- Horizontal privilege escalation (accessing peer's data)
- Vertical privilege escalation (user → admin)
- Exploiting misconfigured permissions
- SQL injection to gain admin access
- Container escape to host

**Control Mapping**:
- Authorization (Phase 2: authorization.json)
- Least privilege enforcement
- Role-based access control (RBAC)
- Input validation (prevent injection)

**CVSS Considerations**:
- Privileges Required: Low if user can escalate to admin
- Scope: Changed if breaks isolation (e.g., container escape)
- Impact: High across Confidentiality, Integrity, Availability

## STRIDE Workflow with CVSS

### Step 1: Identify Components

From Phase 1 (codebase mapping), identify all components:
- External entities (users, external systems)
- Processes (services, APIs, functions)
- Data stores (databases, file systems, caches)
- Data flows (API calls, file I/O, network traffic)
- Trust boundaries (network perimeter, authentication gates)

### Step 2: Apply STRIDE to Each Component

For **each component**, ask all 6 STRIDE questions:

| Component Type | STRIDE Categories to Focus On |
|----------------|------------------------------|
| External Entity | S, R (authentication, non-repudiation) |
| Process | All 6 (comprehensive analysis) |
| Data Store | T, I, D (integrity, confidentiality, availability) |
| Data Flow | T, I (tampering in transit, disclosure) |
| Trust Boundary | S, E (authentication bypass, privilege escalation) |

**Filter by Phase 1 Threat Actors**: Only apply threats relevant to identified attackers.

### Step 3: Document Each Threat

For each threat identified:
```json
{
  "threat_id": "THR-001",
  "name": "SQL Injection in User Search",
  "stride_category": "Tampering",
  "component": "User Search API",
  "description": "Endpoint lacks parameterized queries, allowing SQL injection...",
  "attack_scenario": "Attacker sends crafted input to extract/modify database records",
  "assets_at_risk": ["User PII", "Payment data"],
  "control_gaps": ["No parameterized queries", "No input validation", "No WAF"]
}
```

### Step 4: Score Each Threat with CVSS (NEW)

**Immediately after documenting a threat**, invoke `cvss-scoring` skill:

```
Skill: "cvss-scoring"

Input:
- Threat: THR-001 details
- Phase 1 Business Context: Crown jewels, financial impact
- Phase 1 Architecture: Attack vectors, system design
- Control Gaps: From Phase 2 analysis

Output:
- Base Score (exploitability + impact)
- Threat Score (likelihood, exploit maturity)
- Environmental Score (business context from Phase 1)
- Overall Score (final risk rating)
```

**Add CVSS structure to threat entry**:
```json
{
  "threat_id": "THR-001",
  "cvss": {
    "version": "4.0",
    "base": { "score": 8.2, "vector": "CVSS:4.0/AV:N/AC:L/..." },
    "threat": { "score": 8.1, "vector": "CVSS:4.0/E:A/..." },
    "environmental": { "score": 9.3, "vector": "CVSS:4.0/CR:H/IR:H/..." },
    "overall": { "score": 9.3, "severity": "Critical" }
  }
}
```

**See [CVSS Scoring Integration](cvss-scoring-integration.md) for complete workflow.**

### Step 5: Prioritize by CVSS Environmental Score

Sort all threats by `cvss.environmental.score` (descending):
- **Critical (9.0-10.0)**: Immediate action
- **High (7.0-8.9)**: Current sprint
- **Medium (4.0-6.9)**: Backlog
- **Low (0.1-3.9)**: Accept/defer

## STRIDE + DFD Mapping

Threats map to Data Flow Diagram (DFD) elements:

| DFD Element | Primary STRIDE Threats |
|-------------|------------------------|
| **External Entity** | Spoofing (can attacker impersonate?), Repudiation (can deny actions?) |
| **Process** | All STRIDE (processes handle data and logic) |
| **Data Store** | Tampering (can modify data?), Information Disclosure (can read data?), DoS (can delete/corrupt?) |
| **Data Flow** | Tampering (MITM?), Information Disclosure (eavesdropping?) |
| **Trust Boundary** | Spoofing (auth bypass?), Elevation of Privilege (permission escalation?) |

## STRIDE + Control Gaps Correlation

Every threat should trace to a control gap from Phase 2:

| STRIDE Category | Control Gap Examples |
|-----------------|----------------------|
| **Spoofing** | No MFA, weak password policy, missing certificate validation |
| **Tampering** | No input validation, no integrity checks, no TLS |
| **Repudiation** | No audit logging, logs not immutable, missing signatures |
| **Information Disclosure** | No encryption, weak access controls, overly verbose errors |
| **DoS** | No rate limiting, no resource quotas, algorithmic complexity |
| **Elevation of Privilege** | Weak RBAC, privilege not checked, injection vulnerabilities |

**If no control gap exists for a threat**: Either control is effective (threat is LOW risk) or Phase 2 missed a control (re-analyze).

## Example: Applying STRIDE to Login Endpoint

**Component**: User Login API (`POST /api/auth/login`)

### STRIDE Analysis

| Category | Threat | Control Gap | CVSS Score |
|----------|--------|-------------|------------|
| **S** Spoofing | Credential stuffing attack | No rate limiting, no MFA | 8.8 High |
| **T** Tampering | MITM attack during login | TLS implemented ✓ | N/A (mitigated) |
| **R** Repudiation | User denies login attempt | Audit logging present ✓ | N/A (mitigated) |
| **I** Info Disclosure | Verbose error messages leak usernames | Error messages reveal "user exists" | 5.3 Medium |
| **D** DoS | Brute force exhausts resources | No rate limiting | 7.5 High |
| **E** Elevation | SQL injection in login query | Parameterized queries ✓ | N/A (mitigated) |

**Result**: 3 threats identified (Spoofing, Info Disclosure, DoS), 3 mitigated by existing controls.

### CVSS Scoring Example

**Threat**: Credential Stuffing (Spoofing)

**CVSS 4.0 Scoring**:
```
Base Score: 7.5 (AV:N/AC:L/PR:N/UI:N/VC:L/VI:L/VA:N)
- Attack Vector: Network (attacker is remote)
- Attack Complexity: Low (no rate limiting)
- Privileges Required: None
- User Interaction: None
- Confidentiality Impact: Low (gains access to one account)
- Integrity Impact: Low (can modify user's data)
- Availability Impact: None

Threat Score: 8.0 (E:A/U:Green)
- Exploit Maturity: Attacked (credential stuffing is common)
- Remediation Level: Official-Fix (MFA available)
- Report Confidence: Confirmed (found in Phase 2)

Environmental Score: 8.8 (CR:H/IR:H/AR:M)
- Confidentiality Requirement: High (user PII from Phase 1)
- Integrity Requirement: High (payment data accessible)
- Availability Requirement: Medium (SLA impact moderate)

Overall Score: 8.8 (High)
```

**Priority**: High - Address in current sprint

## STRIDE Checklist

For each component in Phase 1:

- [ ] **Spoofing**: Can attacker impersonate users/services?
- [ ] **Tampering**: Can attacker modify data in transit/at rest?
- [ ] **Repudiation**: Can attacker deny actions without proof?
- [ ] **Information Disclosure**: Can attacker access sensitive data?
- [ ] **DoS**: Can attacker disrupt service availability?
- [ ] **Elevation of Privilege**: Can attacker escalate permissions?

For each threat identified:

- [ ] Documented with threat ID, name, description
- [ ] Mapped to STRIDE category
- [ ] Traced to control gap from Phase 2
- [ ] Scored with CVSS 4.0 (via `cvss-scoring` skill)
- [ ] Added to threat-model.json with full CVSS structure

## Anti-Patterns

### ❌ Don't Skip STRIDE Categories

**WRONG**: "This component looks secure, only checking Spoofing"
**RIGHT**: Apply all 6 STRIDE categories to every component systematically

**Why**: Comprehensive coverage ensures no threat categories missed.

### ❌ Don't Generate Generic Threats

**WRONG**: "This endpoint is vulnerable to SQL injection" (generic OWASP threat)
**RIGHT**: "User search endpoint at /api/users/search lacks parameterized queries in searchTerm parameter, enabling SQL injection to extract records from users table via UNION-based attack" (specific)

**Why**: Phase 4 needs specific threats to generate targeted tests.

### ❌ Don't Score Threats Without Context

**WRONG**: Use CVSS Base score only (generic scoring)
**RIGHT**: Use CVSS Environmental score with Phase 1 business context (business-contextualized)

**Why**: Base score doesn't reflect organizational risk. Environmental score incorporates crown jewels and business impact.

### ❌ Don't Ignore Mitigated Threats

**WRONG**: "TLS is implemented, skipping Tampering"
**RIGHT**: "Tampering in transit mitigated by TLS 1.3" (document in threat model with risk: LOW)

**Why**: Phase 4 needs to verify mitigations actually work. Document all threats, even mitigated ones.

## Related

- [CVSS Scoring Integration](cvss-scoring-integration.md) - How to score STRIDE threats with CVSS
- [Phase 1 Integration Guide](phase-1-integration.md) - Business context for threat filtering
- [Output Schemas](output-schemas.md) - threat-model.json schema with CVSS structure
- Main skill: `threat-modeling` - Complete threat modeling workflow
- Related skill: `cvss-scoring` - CVSS 4.0 scoring with business context
