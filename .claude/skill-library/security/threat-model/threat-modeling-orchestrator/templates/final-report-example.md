# Threat Model Report: Chariot Attack Surface Management Platform

**Session ID:** tm-20241220-a1b2c3
**Date:** 2024-12-20
**Methodology:** Hybrid (STRIDE + PASTA + DFD)
**CVSS Version:** 4.0
**Scope:** `./modules/chariot/backend/pkg/handler` (API handlers)

---

## Executive Summary

This threat model analyzed the Chariot attack surface management platform's API handler layer, focusing on authentication, data storage, and external integrations. The analysis identified **15 security threats** across 8 components, with **3 CRITICAL** and **5 HIGH** severity findings.

**Key Findings:**

- ❌ **CRITICAL**: Missing JWT audience validation enables cross-application token reuse
- ❌ **HIGH**: No token revocation mechanism (compromised tokens valid until expiration)
- ❌ **HIGH**: SQL injection risk in graph query builder (string concatenation)
- ✅ Strong cryptographic controls (TLS 1.3, encryption at rest)
- ✅ Comprehensive audit logging for SOC 2 compliance

**Business Impact:**

- **Crown Jewels at Risk**: User credentials, API keys, vulnerability reports, payment data
- **Regulatory Exposure**: PCI-DSS, SOC 2, GDPR violations possible
- **Financial Impact**: Estimated $5M-$50M for breach (fines, legal, customer compensation)

**Recommended Priority:**

1. Implement JWT audience validation (2 hours, eliminates CRITICAL threat)
2. Add token revocation list with Redis (1 week, reduces HIGH threat to MEDIUM)
3. Migrate graph queries to parameterized queries (2 weeks, eliminates HIGH SQL injection)

---

## Business Context (Phase 1)

### Application Purpose

Attack surface management SaaS platform enabling continuous security monitoring for enterprise customers.

### Crown Jewels

| Asset                 | Sensitivity | Rationale                                          |
| --------------------- | ----------- | -------------------------------------------------- |
| user_credentials      | CRITICAL    | Account takeover enables data exfiltration         |
| api_keys              | CRITICAL    | Programmatic access to customer security data      |
| payment_data          | CRITICAL    | PCI-DSS regulated, financial liability             |
| vulnerability_reports | HIGH        | Unpatched vulnerabilities exploitable by attackers |

### Threat Actors

1. **External Attacker (Opportunistic)** - High likelihood, medium capability, targets login/API
2. **External Attacker (Targeted)** - Medium likelihood, high capability, targets customer data
3. **Malicious Insider** - Low likelihood, high capability, targets data exfiltration

### Compliance Requirements

- **PCI-DSS v4.0 Level 1**: Payment processing (>6M transactions/year)
- **SOC 2 Type II**: Security, Availability, Confidentiality controls
- **GDPR**: EU customer data protection

---

## Architecture Overview (Phase 1)

**Components Analyzed:** 8
**Entry Points:** 23 REST API endpoints
**Data Flows:** 15 mapped
**Trust Boundaries:** 5 identified

### Key Components

- **Authentication Handler** - Cognito JWT validation
- **Asset Handler** - CRUD operations on discovered assets (DynamoDB)
- **Risk Handler** - Vulnerability management
- **Graph Query Handler** - Neo4j relationship queries

### Trust Boundaries

1. External → API Gateway (JWT validation, rate limiting)
2. API Gateway → Lambda (IAM roles)
3. Lambda → DynamoDB (encryption at rest, IAM)
4. Lambda → Neo4j (Cypher queries, connection encryption)

---

## Security Controls Assessment (Phase 2)

**Controls Evaluated:** 47
**Control Gaps:** 12 (3 CRITICAL, 5 HIGH, 4 MEDIUM)

### Strong Controls ✅

- JWT signature verification (RS256)
- TLS 1.3 for all external connections
- Encryption at rest (DynamoDB, S3)
- Comprehensive audit logging (CloudWatch)

### Critical Gaps ❌

- Missing JWT audience (aud) claim validation
- No token revocation mechanism
- SQL injection risk in graph query builder

---

## Top Threats (Phase 3)

### CRITICAL Threats (CVSS 9.0-10.0)

#### T-001: JWT Token Reuse Across Applications

- **CVSS 4.0 Environmental:** 9.2 (CRITICAL)
- **Category:** STRIDE-Spoofing
- **Impact:** Unauthorized access to crown jewel data (api_keys, vulnerability reports)
- **Likelihood:** Medium (requires valid creds for different app in same Cognito pool)
- **Mitigation:** Add audience validation (2 hours, high effectiveness)

### HIGH Threats (CVSS 7.0-8.9)

#### T-003: SQL Injection in Graph Query Builder

- **CVSS 4.0 Environmental:** 8.5 (HIGH)
- **Category:** STRIDE-Tampering
- **Impact:** Database compromise, data exfiltration
- **Likelihood:** Medium (requires API access)
- **Mitigation:** Migrate to parameterized queries (2 weeks)

#### T-005: Lack of Token Revocation

- **CVSS 4.0 Environmental:** 7.8 (HIGH)
- **Category:** STRIDE-Elevation of Privilege
- **Impact:** Compromised tokens valid until expiration (1 hour)
- **Likelihood:** Low (requires token theft)
- **Mitigation:** Implement Redis-backed revocation list (1 week)

_(See full report for remaining 12 threats)_

---

## Security Test Plan (Phase 4)

**Test Cases Generated:** 23
**Manual Tests:** 15
**Automated (SAST/DAST):** 8

### Priority 1 Tests (Execute First)

1. **TC-001**: Verify JWT audience validation (CRITICAL)
2. **TC-003**: SQL injection testing on graph queries (HIGH)
3. **TC-005**: Token revocation validation (HIGH)

### SAST Recommendations

- Enable Semgrep rules for JWT validation
- Add SQL injection detection (Cypher queries)
- Scan for hardcoded secrets

### DAST Recommendations

- OWASP ZAP against API Gateway endpoints
- Burp Suite for authenticated session testing
- Custom scripts for JWT manipulation

### Code Review Targets

| Priority | Files                     | Focus                  |
| -------- | ------------------------- | ---------------------- |
| P0       | `pkg/auth/jwt.go`         | JWT validation logic   |
| P0       | `pkg/graph/query.go`      | Query parameterization |
| P1       | `pkg/handler/handlers/*/` | Input validation       |

---

## Remediation Roadmap

### Immediate (Week 1)

- [ ] Add JWT audience validation (2 hours) → Eliminates T-001 (CRITICAL)
- [ ] Add Semgrep to CI/CD (4 hours) → Prevents future regressions

### Short-Term (Month 1)

- [ ] Implement token revocation (1 week) → Reduces T-005 to MEDIUM
- [ ] Migrate graph queries to parameterized (2 weeks) → Eliminates T-003 (HIGH)

### Long-Term (Quarter 1)

- [ ] Reduce JWT TTL to 15 minutes (with refresh tokens)
- [ ] Implement MFA for high-privilege operations
- [ ] Add DAST to CI/CD pipeline

---

## Compliance Alignment

### PCI-DSS v4.0

- ✅ **8.2.1** - Strong authentication (JWT with signature verification)
- ❌ **6.5.1** - Injection flaws (SQL injection in graph queries)
- ✅ **10.2** - Audit logging (CloudWatch comprehensive logs)

### SOC 2 Type II

- ✅ **CC6.1** - Logical access controls (JWT validation)
- ❌ **CC6.6** - Penetration testing (not performed, recommend annual)
- ✅ **CC7.2** - System monitoring (CloudWatch, alerts configured)

---

## Appendices

### A. Threat Matrix

_(Full 15 threats with CVSS scores, mitigations, references)_

### B. Attack Trees

_(Visual attack path diagrams for top 5 threats)_

### C. Data Flow Diagrams

_(15 DFDs showing trust boundaries and data movement)_

### D. Control Inventory

_(47 controls with effectiveness ratings)_

---

**Report Generated:** 2024-12-20T18:00:00Z
**Next Review:** 2025-03-20 (quarterly cadence)
**Contact:** security@example.com
