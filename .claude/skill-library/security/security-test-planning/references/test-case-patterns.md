# Test Case Patterns

**Threat-driven test case templates organized by vulnerability category.**

## IDOR Test Pattern

```json
{
  "id": "TC-IDOR-001",
  "name": "Cross-Tenant Resource Access via ID Manipulation",
  "relatedThreat": "THREAT-xxx",
  "priority": "P0",
  "category": "Authorization",
  "objective": "Verify tenant isolation prevents unauthorized resource access",
  "preconditions": [
    "Two test tenant accounts (Tenant A, Tenant B)",
    "Each tenant has unique resources",
    "Valid authentication tokens for both"
  ],
  "steps": [
    {
      "step": 1,
      "action": "Authenticate as Tenant A",
      "expectedResult": "Valid JWT token received"
    },
    {
      "step": 2,
      "action": "List resources (GET /api/resources)",
      "expectedResult": "Receive only Tenant A resources"
    },
    {
      "step": 3,
      "action": "Note a resource ID from another tenant (Tenant B)",
      "expectedResult": "ID captured from known test data"
    },
    {
      "step": 4,
      "action": "Request Tenant B's resource: GET /api/resources/{tenant-b-id}",
      "expectedResult": "403 Forbidden"
    },
    {
      "step": 5,
      "action": "Attempt PUT/DELETE on Tenant B's resource",
      "expectedResult": "403 Forbidden"
    }
  ],
  "evidence": ["HTTP request/response pairs", "Response status codes"],
  "passCriteria": "All cross-tenant requests return 403",
  "failureCriteria": "Any cross-tenant request returns 200 with data"
}
```

## Injection Test Pattern

```json
{
  "id": "TC-INJ-001",
  "name": "NoSQL Injection via Filter Parameter",
  "relatedThreat": "THREAT-xxx",
  "priority": "P0",
  "category": "Injection",
  "objective": "Verify input sanitization prevents NoSQL injection",
  "preconditions": [
    "Valid authenticated session",
    "Endpoint accepts filter parameters"
  ],
  "steps": [
    {
      "step": 1,
      "action": "Send normal filter request",
      "payload": {"filter": "name = test"},
      "expectedResult": "200 with filtered results"
    },
    {
      "step": 2,
      "action": "Send injection payload",
      "payload": {"filter": "name = test OR 1=1"},
      "expectedResult": "400 Bad Request or sanitized query"
    },
    {
      "step": 3,
      "action": "Send DynamoDB-specific injection",
      "payload": {"filter": "name = :val", "expressionValues": {":val": {"S": "test"}, ":bypass": {"S": "1"}}},
      "expectedResult": "Rejected or ignored extra attributes"
    }
  ],
  "evidence": ["Request payloads", "Response data volume comparison"],
  "passCriteria": "Injection payloads rejected or sanitized",
  "failureCriteria": "Injection returns more data than expected"
}
```

## Authentication Bypass Pattern

```json
{
  "id": "TC-AUTH-001",
  "name": "MFA Bypass via Recovery Code Brute Force",
  "relatedThreat": "THREAT-xxx",
  "priority": "P0",
  "category": "Authentication",
  "objective": "Verify rate limiting prevents recovery code brute force",
  "preconditions": [
    "Test account with MFA enabled",
    "Valid primary credentials"
  ],
  "steps": [
    {
      "step": 1,
      "action": "Initiate login with valid credentials",
      "expectedResult": "MFA challenge presented"
    },
    {
      "step": 2,
      "action": "Send 10 incorrect recovery codes in rapid succession",
      "expectedResult": "Rate limit triggered (429) or account locked"
    },
    {
      "step": 3,
      "action": "Wait cooldown period, send 10 more incorrect codes",
      "expectedResult": "Rate limit continues or lockout escalates"
    },
    {
      "step": 4,
      "action": "Attempt 1000 codes over extended period",
      "expectedResult": "Account locked or progressively slower responses"
    }
  ],
  "evidence": ["Response timing analysis", "Rate limit headers"],
  "passCriteria": "Brute force blocked within 100 attempts",
  "failureCriteria": "Can attempt unlimited recovery codes"
}
```

## Privilege Escalation Pattern

```json
{
  "id": "TC-PRIVESC-001",
  "name": "Horizontal Privilege Escalation via Role Manipulation",
  "relatedThreat": "THREAT-xxx",
  "priority": "P0",
  "category": "Authorization",
  "objective": "Verify RBAC prevents role escalation",
  "preconditions": [
    "Test accounts: regular user, admin user",
    "Valid tokens for both"
  ],
  "steps": [
    {
      "step": 1,
      "action": "As regular user, access admin endpoint",
      "expectedResult": "403 Forbidden"
    },
    {
      "step": 2,
      "action": "Modify JWT claims to include admin role",
      "expectedResult": "Token validation fails (signature mismatch)"
    },
    {
      "step": 3,
      "action": "Send request with admin user's token to regular user's context",
      "expectedResult": "Request processed as admin (verify isolation)"
    }
  ],
  "evidence": ["Modified tokens", "Response permissions"],
  "passCriteria": "Role manipulation detected and rejected",
  "failureCriteria": "Elevated access granted with manipulated token"
}
```

## XSS Prevention Pattern

```json
{
  "id": "TC-XSS-001",
  "name": "Stored XSS via User Input Field",
  "relatedThreat": "THREAT-xxx",
  "priority": "P1",
  "category": "Injection",
  "objective": "Verify output encoding prevents XSS",
  "preconditions": [
    "Authenticated user session",
    "Form or API accepting user text input"
  ],
  "steps": [
    {
      "step": 1,
      "action": "Submit payload: <script>alert('XSS')</script>",
      "expectedResult": "Stored or rejected, not executed"
    },
    {
      "step": 2,
      "action": "View the stored content",
      "expectedResult": "Script tags escaped or sanitized"
    },
    {
      "step": 3,
      "action": "Submit payload: <img src=x onerror=alert('XSS')>",
      "expectedResult": "Event handler stripped"
    },
    {
      "step": 4,
      "action": "Check CSP headers on response",
      "expectedResult": "script-src restricts inline scripts"
    }
  ],
  "evidence": ["Stored payload", "Rendered output", "CSP headers"],
  "passCriteria": "All XSS payloads neutralized",
  "failureCriteria": "Any payload executes JavaScript"
}
```

## Test Case Naming Convention

```
TC-{CATEGORY}-{NUMBER}

Categories:
- IDOR: Authorization/access control
- INJ: Injection vulnerabilities
- AUTH: Authentication issues
- PRIVESC: Privilege escalation
- XSS: Cross-site scripting
- CSRF: Cross-site request forgery
- SSRF: Server-side request forgery
- FILE: File upload/download
- RATE: Rate limiting/DoS
- CRYPTO: Cryptography issues
- LOG: Logging/audit issues

Example: TC-IDOR-003, TC-INJ-007, TC-AUTH-002
```

## Priority Mapping

| Priority | Risk Score | Timeline | Example |
|----------|------------|----------|---------|
| P0 | 9-12 | Sprint 0 (immediate) | Authentication bypass, injection |
| P1 | 6-8 | Sprint 1 | XSS, SSRF, privilege escalation |
| P2 | 3-5 | Sprint 2-3 | Information disclosure, logging gaps |
| P3 | 1-2 | Backlog | Low-impact issues, hardening |
