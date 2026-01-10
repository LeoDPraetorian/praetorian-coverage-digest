# Test Prioritization Matrix

**CVSS 4.0-based test prioritization for Phase 6 security test planning.**

## Overview

Phase 6 maps CVSS Environmental scores from Phase 5 threats to test priorities (P0-P4). This ensures business-contextualized risk drives testing effort allocation.

## CVSS-to-Priority Mapping

### Priority Bands

| CVSS Score Range | CVSS Severity | Test Priority | Timeline | Resource Allocation |
|------------------|---------------|---------------|----------|---------------------|
| **9.0 - 10.0** | Critical | **P0** | Immediate (before ANY deployment) | Top 30% of security testing resources |
| **7.0 - 8.9** | High | **P1** | Current sprint | 40% of security testing resources |
| **4.0 - 6.9** | Medium | **P2** | Next sprint | 20% of security testing resources |
| **0.1 - 3.9** | Low | **P3** | When capacity allows | 10% of security testing resources |
| **0.0** | None | **P4** | Informational only | No testing resources |

### Decision Logic

```
For each threat in Phase 5 threat-model.json:
  1. Read cvss.environmental.score
  2. Map score to priority band using table above
  3. Assign test priority to all tests derived from that threat
  4. Sort tests by priority (P0 → P1 → P2 → P3)
  5. Within same priority, sort by cvss.environmental.score (descending)
```

## Why Environmental Score?

**NOT Base Score**: CVSS Base scores are generic (attacker perspective only)
**YES Environmental Score**: Incorporates Phase 1 business context (Confidentiality/Integrity/Availability Requirements)

### Example Comparison

**Threat**: SQL injection in user search endpoint

**Base Score**: 8.2 (High)
- Attack Vector: Network
- Attack Complexity: Low
- Privileges Required: None
- User Interaction: None
- Confidentiality Impact: High
- Integrity Impact: Low

**Environmental Score**: 9.3 (Critical)
- Confidentiality Requirement: High (targets payment_card_data from Phase 1)
- Integrity Requirement: High (financial data from Phase 1)
- Availability Requirement: Medium (SLA from Phase 1)

**Priority Assignment**:
- Using Base Score (8.2) → P1 (current sprint)
- Using Environmental Score (9.3) → **P0 (immediate)** ← CORRECT

**Outcome**: Environmental scoring elevates priority for threats targeting crown jewels, ensuring business-critical assets get tested first.

## Priority Band Details

### P0: Critical (CVSS 9.0-10.0)

**Characteristics**:
- Targets crown jewels from Phase 1
- Easily exploitable (Attack Complexity: Low)
- High business impact (>$10M from Phase 1)
- Regulatory violations (PCI-DSS, HIPAA, SOC 2)

**Test Scope**:
- Code review MANDATORY
- SAST scan with custom rules
- DAST scan with exploit payloads
- Manual penetration testing
- Validation testing for compliance

**Timeline**:
- Block deployments until P0 tests pass
- Hotfix process if found in production
- Executive notification required

**Example Threats**:
- SQL injection in payment processing (CVSS 9.3)
- Authentication bypass in admin panel (CVSS 9.5)
- Encryption key exposure in logs (CVSS 9.8)

### P1: High (CVSS 7.0-8.9)

**Characteristics**:
- Moderate business impact ($1M-$10M)
- Requires some skill to exploit (Attack Complexity: Low-Medium)
- May target non-crown-jewel sensitive data
- Could impact availability

**Test Scope**:
- Code review for critical paths
- SAST scan (standard rules)
- DAST scan (automated)
- Targeted manual testing

**Timeline**:
- Must complete in current sprint
- Can deploy with documented risk acceptance
- Product owner approval required

**Example Threats**:
- XSS in user profile (CVSS 7.5)
- CSRF in account settings (CVSS 7.2)
- Information disclosure in error messages (CVSS 8.1)

### P2: Medium (CVSS 4.0-6.9)

**Characteristics**:
- Limited business impact (<$1M)
- Requires significant skill or resources (Attack Complexity: High)
- Affects non-sensitive data or low-traffic features
- Mitigations partially effective

**Test Scope**:
- Code review (optional, focus on patterns)
- SAST scan (standard rules)
- DAST scan (if time permits)
- Manual testing (not required)

**Timeline**:
- Plan for next sprint
- Can be deferred if resource constrained
- Include in regular security review cycles

**Example Threats**:
- Rate limiting bypass on public API (CVSS 5.3)
- Weak session timeout (CVSS 4.8)
- Directory traversal in non-sensitive files (CVSS 6.2)

### P3: Low (CVSS 0.1-3.9)

**Characteristics**:
- Minimal or theoretical business impact
- Very difficult to exploit (Attack Complexity: High, Attack Requirements: Present)
- Affects only informational data
- Strong mitigations exist

**Test Scope**:
- Code review (when convenient)
- SAST scan (if flagged)
- DAST scan (not prioritized)
- Manual testing (not required)

**Timeline**:
- Test when capacity allows
- Can remain in backlog indefinitely
- Fix opportunistically during refactoring

**Example Threats**:
- Verbose error messages (CVSS 2.1)
- Missing HTTP security headers on static assets (CVSS 3.2)
- Deprecated TLS cipher support (CVSS 3.7)

### P4: Informational (CVSS 0.0)

**Characteristics**:
- No exploitability (theoretical only)
- No business impact
- Best practices recommendations
- Hardening opportunities

**Test Scope**:
- Documentation only
- No active testing required
- Security awareness/training topics

**Timeline**:
- No timeline
- Optional improvements
- Include in security guidelines

**Example Findings**:
- Code comments contain developer names
- Unused API endpoints exist
- Redundant security controls implemented

## CVSS Vector Traceability

**CRITICAL**: Include CVSS vector strings in all test outputs for traceability.

### Why Vectors Matter

1. **Reproducibility**: Others can verify score calculation
2. **Audit Trail**: Compliance auditors can validate risk assessment
3. **Tooling Integration**: SIEM/SOAR can consume vectors
4. **Stakeholder Communication**: Executives can see risk components

### Vector Format (CVSS 4.0)

```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N/E:A/CR:H/IR:H/AR:M
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Base Metrics
                                                                     ^^^^^^^^^^^^^^ Threat Metrics
                                                                                    ^^^^^^^^^^^^^^^ Environmental Metrics
```

### Include in Test Outputs

**code-review-plan.json**:
```json
{
  "target_id": "CR-001",
  "file": "pkg/handler/user/login.go",
  "threat_id": "THREAT-001",
  "cvss_vector": "CVSS:4.0/AV:N/AC:L/..."
}
```

**manual-test-cases.json**:
```json
{
  "test_id": "TEST-001",
  "threat_id": "THREAT-001",
  "cvss": {
    "environmental_score": 9.3,
    "vector": "CVSS:4.0/AV:N/AC:L/..."
  }
}
```

**test-priorities.json**:
```json
{
  "test_id": "TEST-001",
  "priority": "P0",
  "cvss": {
    "environmental_score": 9.3,
    "overall_score": 9.3,
    "severity": "Critical",
    "vector": "CVSS:4.0/AV:N/AC:L/..."
  }
}
```

## Resource Allocation Strategy

### Security Testing Budget Distribution

Recommended allocation across priority bands:

| Priority | Percentage | Rationale |
|----------|----------|-----------|
| P0 (Critical) | 30% | High-impact, must complete before deployment |
| P1 (High) | 40% | Majority of security work, balance depth vs coverage |
| P2 (Medium) | 20% | Important but can be deferred if needed |
| P3 (Low) | 10% | Opportunistic testing, low ROI |
| P4 (None) | 0% | No testing resources |

### Sprint Capacity Planning

**Example**: 100 hours of security testing per sprint

- **P0 Critical**: 30 hours (3-5 tests with deep analysis)
- **P1 High**: 40 hours (10-15 tests with moderate depth)
- **P2 Medium**: 20 hours (20-30 tests, automated focus)
- **P3 Low**: 10 hours (opportunistic, if capacity available)

### Overflow Handling

**If P0/P1 tests exceed capacity**:
1. Move P2 → Next sprint
2. Move P3 → Backlog
3. Request additional security resources
4. Escalate to product/engineering leadership

**Do NOT**:
- ❌ Reduce P0 test depth
- ❌ Skip P1 tests
- ❌ "Batch test" multiple threats together
- ❌ Defer P0 tests to next sprint

## Migration from Old Risk Matrix

### Old Format (DEPRECATED)

```
Risk Score = Business Impact (1-4) × Likelihood (1-3)
Priority:
  - Risk 9-12: P0
  - Risk 6-8: P1
  - Risk 3-5: P2
  - Risk 1-2: P3
```

**Problems**:
- Coarse granularity (12 discrete values)
- Not industry-standard
- No traceability to vulnerability databases
- Subjective Impact/Likelihood assessment

### New Format (CVSS 4.0)

```
CVSS Environmental Score (0.0-10.0)
Priority:
  - CVSS 9.0-10.0: P0
  - CVSS 7.0-8.9: P1
  - CVSS 4.0-6.9: P2
  - CVSS 0.1-3.9: P3
```

**Advantages**:
- Fine granularity (decimal precision)
- Industry-standard (NVD, CVE)
- Traceability (CVSS vectors)
- Systematic Environmental scoring (incorporates Phase 1)

### Mapping Old to New

**If threat-model.json contains old risk_score field**:

| Old Risk Score | Approximate CVSS | New Priority |
|----------------|------------------|--------------|
| 12 | 9.5 | P0 |
| 11-10 | 8.5-9.0 | P0 or P1 |
| 9-8 | 7.5-8.0 | P1 |
| 7-6 | 6.0-7.0 | P1 or P2 |
| 5-4 | 4.5-5.5 | P2 |
| 3-2 | 3.0-4.0 | P2 or P3 |
| 1 | 2.0 | P3 |

**CRITICAL**: This is approximate mapping only. Re-score threats with CVSS for accuracy.

## Anti-Patterns

### ❌ Don't Use Base Score for Prioritization

**WRONG**: "THREAT-001 has CVSS Base 8.2, mark as P1"
**RIGHT**: "THREAT-001 has CVSS Environmental 9.3, mark as P0"

**Why**: Base score ignores business context. A threat with Base 8.2 targeting payment data (Environmental 9.3) needs immediate attention.

### ❌ Don't Manually Adjust Priorities

**WRONG**: "This CVSS 6.5 threat seems critical to me, mark as P0"
**RIGHT**: "This CVSS 6.5 threat is P2. If business context changed, update Phase 1 and re-score."

**Why**: Manual overrides break systematic prioritization. Fix Phase 1 business context if wrong, don't override CVSS.

### ❌ Don't Average CVSS Scores

**WRONG**: "These 5 threats average CVSS 7.8, allocate P1 testing budget"
**RIGHT**: "These 5 threats range CVSS 5.2-9.1: 1 P0, 2 P1, 2 P2. Allocate accordingly."

**Why**: Averaging obscures Critical threats. Test each threat according to its individual score.

### ❌ Don't Skip P0 Tests

**WRONG**: "P0 tests take too long, we'll test in production"
**RIGHT**: "P0 tests are mandatory. Delay deployment or get risk acceptance from exec team."

**Why**: P0 = Critical business risk. Deploying without testing = accepting potential $10M+ breach.

## Related

- Main skill: `security-test-planning` - Phase 6 test planning methodology
- Phase 5 skill: `threat-modeling` - Produces CVSS-scored threats
- Phase 5 skill: `cvss-scoring` - CVSS 4.0 scoring with Phase 1 integration
- Phase 1 skill: `business-context-discovery` - Provides business context for Environmental scoring
