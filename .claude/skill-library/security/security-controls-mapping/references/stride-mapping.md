# STRIDE Mapping Reference

**Mapping security controls to STRIDE threat categories for Phase 4 analysis.**

---

## STRIDE Overview

| Category                   | Threat             | Property Violated | Question                                  |
| -------------------------- | ------------------ | ----------------- | ----------------------------------------- |
| **S**poofing               | Identity theft     | Authentication    | Can an attacker impersonate someone?      |
| **T**ampering              | Data modification  | Integrity         | Can an attacker modify data?              |
| **R**epudiation            | Deny actions       | Non-repudiation   | Can an attacker deny their actions?       |
| **I**nfo Disclosure        | Data exposure      | Confidentiality   | Can an attacker access unauthorized data? |
| **D**enial of Service      | Service disruption | Availability      | Can an attacker disrupt the service?      |
| **E**levation of Privilege | Gain access        | Authorization     | Can an attacker gain unauthorized access? |

---

## Control Category → STRIDE Mapping

### Spoofing Defense: Authentication

**Controls to map:**

- Identity verification mechanisms
- Token/session management
- Multi-factor authentication
- Password policies
- Credential storage

**Questions to answer:**

1. How is identity verified? (Cognito, custom JWT, etc.)
2. What prevents token theft/replay?
3. Is MFA available/enforced?
4. Are credentials stored securely?
5. What prevents impersonation?

**Red flags:**

- No authentication on sensitive endpoints
- Weak password policies
- Tokens that don't expire
- Credentials in logs/errors

---

### Tampering Defense: Input Validation

**Controls to map:**

- Schema validation (Zod, Joi)
- Type checking
- Sanitization functions
- Parameterized queries
- Content integrity checks

**Questions to answer:**

1. Is all input validated at entry points?
2. Are queries parameterized (not concatenated)?
3. Is file upload content verified?
4. Are data integrity signatures used?
5. Is client input trusted (it shouldn't be)?

**Red flags:**

- SQL/NoSQL string concatenation
- Missing validation on API endpoints
- Trust of client-side validation only
- eval() with user input

---

### Repudiation Defense: Logging & Audit

**Controls to map:**

- Security event logging
- Audit trails
- Log integrity (signed logs)
- User action tracking
- Timestamp accuracy

**Questions to answer:**

1. Are security events logged? (login, access, changes)
2. Can logs be tampered with?
3. Are logs sufficient for forensics?
4. Is there a log retention policy?
5. Can users deny their actions?

**Red flags:**

- No logging of auth events
- Logs stored insecurely
- Missing timestamps
- No user attribution in logs

---

### Information Disclosure Defense: Multiple Controls

**Cryptography:**

- Encryption at rest
- Encryption in transit
- Key management
- Hashing sensitive data

**Secrets Management:**

- Secure secret storage
- Secret rotation
- Access control to secrets
- No hardcoded credentials

**Output Encoding:**

- Response sanitization
- Error message safety
- Data masking in logs
- PII handling

**Questions to answer:**

1. Is sensitive data encrypted at rest?
2. Is all traffic encrypted in transit?
3. Are secrets stored securely (not in code)?
4. Are error messages safe (no stack traces)?
5. Is PII properly masked/redacted?

**Red flags:**

- Unencrypted databases
- HTTP instead of HTTPS
- Secrets in environment files committed to git
- Verbose error messages with internals
- Logs containing credentials/PII

---

### DoS Defense: Rate Limiting

**Controls to map:**

- API rate limiting
- Request throttling
- Circuit breakers
- Resource quotas
- Queue management

**Questions to answer:**

1. Are endpoints rate limited?
2. Are expensive operations protected?
3. Is there per-user/tenant limiting?
4. Are there circuit breakers for failures?
5. Can a user exhaust shared resources?

**Red flags:**

- No rate limiting on public APIs
- Unlimited file upload sizes
- No query complexity limits
- Shared resources without quotas

---

### Elevation of Privilege Defense: Authorization

**Controls to map:**

- Role-based access control
- Permission enforcement
- Tenant isolation
- Privilege separation
- Admin boundaries

**Questions to answer:**

1. Are all resources authorization-checked?
2. Is IDOR prevented (can't access other users' data)?
3. Is there admin/user separation?
4. Are service accounts least-privileged?
5. Is multi-tenancy enforced?

**Red flags:**

- Missing authorization checks
- Direct object references without validation
- Overly permissive IAM policies
- No tenant isolation in queries

---

## Control Assessment Matrix

Use this matrix to assess controls for each STRIDE category:

| Control          | S   | T   | R   | I   | D   | E   | Status   |
| ---------------- | --- | --- | --- | --- | --- | --- | -------- |
| JWT Auth         | ✓   |     |     |     |     |     | Complete |
| Input Validation |     | ✓   |     |     |     |     | Partial  |
| Audit Logging    |     |     | ✓   |     |     |     | Missing  |
| Encryption       |     |     |     | ✓   |     |     | Complete |
| Rate Limiting    |     |     |     |     | ✓   |     | Partial  |
| RBAC             |     |     |     |     |     | ✓   | Complete |

**Status definitions:**

- **Complete**: Control fully implemented and verified
- **Partial**: Control exists but has gaps
- **Missing**: Control not implemented
- **Unverified**: Control may exist but not confirmed

---

## Gap Severity by STRIDE

| Category        | Missing Control Impact | Typical Severity |
| --------------- | ---------------------- | ---------------- |
| Spoofing        | Unauthorized access    | Critical/High    |
| Tampering       | Data corruption        | Critical/High    |
| Repudiation     | No accountability      | Medium           |
| Info Disclosure | Data breach            | Critical/High    |
| DoS             | Service outage         | Medium/High      |
| Elevation       | Full compromise        | Critical         |

**Priority order** (generally):

1. Authentication (Spoofing) - Gate to everything
2. Authorization (EoP) - Prevents escalation
3. Input Validation (Tampering) - Injection attacks
4. Cryptography (Info Disclosure) - Data protection
5. Rate Limiting (DoS) - Availability
6. Logging (Repudiation) - Accountability

---

## Phase 3 Handoff

For each control category, Phase 3 needs:

1. **What controls exist** → Which threats are mitigated
2. **What's the coverage** → Which components are protected
3. **What's missing** → Which threats remain unmitigated
4. **Verification status** → How confident are we

This enables Phase 3 to:

- Focus threat scenarios on gaps
- Identify attack paths through weak controls
- Prioritize threats by control coverage
