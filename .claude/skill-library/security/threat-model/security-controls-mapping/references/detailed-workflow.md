# Security Controls Mapping - Detailed Workflow

**Complete step-by-step workflow for mapping security controls across all categories.**

This workflow applies to **legacy full-mapping mode** where a single agent maps ALL controls across all categories.

For the **modern per-concern mode**, see the main SKILL.md Parallelization Strategy section - agents investigate individual concerns across relevant categories.

---

## Step 1: Load Phase 1 Artifacts

**Goal**: Get architecture context before mapping controls.

**Required inputs from Phase 1:**

- `summary.md` - Technology stack, components overview
- `components/*.json` - Per-component analysis
- `entry-points.json` - Attack surface (where controls must exist)
- `trust-boundaries.json` - Where security transitions occur

**Load command:**

```bash
cat {timestamp}-{slug}/phase-1/summary.md
ls {timestamp}-{slug}/phase-1/components/
```

---

## Step 2: Authentication Controls

**STRIDE Defense**: Spoofing

**What to find:**

- Identity providers (Cognito, Auth0, Okta, custom)
- Token types (JWT, session cookies, API keys)
- MFA implementation
- Password policies
- Session management

**Detection patterns:**

```bash
# Find auth-related code
grep -rn "cognito\|jwt\|session\|token\|auth\|login\|logout" {scope}
grep -rn "Authenticat\|Bearer\|Authorization" {scope}
grep -rn "mfa\|totp\|otp\|2fa" {scope}
```

**Output**: `authentication.json` - See [output-schemas.md](output-schemas.md)

---

## Step 3: Authorization Controls

**STRIDE Defense**: Elevation of Privilege

**What to find:**

- Role definitions (RBAC, ABAC)
- Permission checks
- Policy enforcement points
- Tenant isolation mechanisms
- Admin/user separation

**Detection patterns:**

```bash
# Find authz-related code
grep -rn "role\|permission\|policy\|rbac\|abac" {scope}
grep -rn "isAdmin\|canAccess\|authorize\|Allow\|Deny" {scope}
grep -rn "tenant\|account.id\|user.id" {scope}
```

**Output**: `authorization.json`

---

## Step 4: Input Validation Controls

**STRIDE Defense**: Tampering

**What to find:**

- Schema validation (Zod, Joi, JSON Schema)
- Input sanitization
- Type checking
- Length/format validation
- SQL/NoSQL injection prevention

**Detection patterns:**

```bash
# Find validation patterns
grep -rn "validate\|sanitize\|escape\|schema" {scope}
grep -rn "Zod\|Joi\|yup\|validator" {scope}
grep -rn "parameterized\|prepared.statement\|bind" {scope}
```

**Output**: `input-validation.json`

---

## Step 5: Output Encoding Controls

**STRIDE Defense**: Information Disclosure (XSS prevention)

**What to find:**

- HTML encoding
- URL encoding
- JSON escaping
- Content-Type headers
- CSP implementation

**Detection patterns:**

```bash
# Find encoding patterns
grep -rn "encode\|escape\|sanitize" {scope}
grep -rn "innerHTML\|dangerouslySetInnerHTML" {scope}
grep -rn "Content-Type\|Content-Security-Policy" {scope}
```

**Output**: `output-encoding.json`

---

## Step 6: Cryptography Controls

**STRIDE Defense**: Information Disclosure

**What to find:**

- Encryption at rest (AES, KMS)
- Encryption in transit (TLS)
- Hashing (bcrypt, SHA-256)
- Key management
- Certificate handling

**Detection patterns:**

```bash
# Find crypto patterns
grep -rn "encrypt\|decrypt\|hash\|bcrypt\|argon" {scope}
grep -rn "KMS\|kms\|AES\|RSA" {scope}
grep -rn "tls\|ssl\|certificate\|https" {scope}
```

**Output**: `cryptography.json`

---

## Step 7: Secrets Management Controls

**STRIDE Defense**: Information Disclosure

**What to find:**

- Secret storage (SSM, Vault, env vars)
- Credential rotation
- API key management
- Connection string handling

**Detection patterns:**

```bash
# Find secrets patterns
grep -rn "SSM\|Parameter.Store\|Vault\|secret" {scope}
grep -rn "api.key\|apiKey\|credential\|password" {scope}
grep -rn "\.env\|process\.env\|os\.Getenv" {scope}
```

**Output**: `secrets-management.json`

---

## Step 8: Supporting Controls

Map remaining control categories:

**8a. Logging & Audit (STRIDE: Repudiation)**

```bash
grep -rn "log\.\|logger\|audit\|CloudWatch" {scope}
```

**Output**: `logging-audit.json`

**8b. Rate Limiting (STRIDE: Denial of Service)**

```bash
grep -rn "rate.limit\|throttle\|circuit.breaker" {scope}
```

**Output**: `rate-limiting.json`

**8c. CORS/CSP (Browser Security)**

```bash
grep -rn "CORS\|cors\|Access-Control\|CSP\|Content-Security" {scope}
```

**Output**: `cors-csp.json`

**8d. Dependency Security**

```bash
# Check for security scanning config
ls {scope}/**/dependabot.yml {scope}/**/renovate.json 2>/dev/null
grep -rn "npm.audit\|snyk\|trivy" {scope}
```

**Output**: `dependency-security.json`

---

## Step 9: Gap Analysis

**Goal**: Identify missing or weak controls.

**Gap categories:**

1. **Missing** - Control doesn't exist
2. **Partial** - Control exists but incomplete
3. **Unverified** - Control exists but effectiveness unknown

**For each control category, ask:**

- Does every entry point have this control?
- Does every trust boundary enforce this?
- Are there exceptions or bypasses?

**Output**: `control-gaps.json` with severity (Critical/High/Medium/Low)

---

## Step 10: Summary Generation

**Goal**: Compress findings for Phase 3 handoff (<2000 tokens).

**Template:**

```markdown
# Phase 2: Security Controls Summary

## Controls Inventory

- Authentication: {count} mechanisms identified
- Authorization: {count} policies found
- Input Validation: {coverage}%
- [continue for each category]

## Control Gaps ({total count})

- Critical: {count}
- High: {count}
- Medium: {count}

## Top 5 Gaps

1. {gap-1}: {brief description}
2. {gap-2}: {brief description}
   ...

## STRIDE Coverage

| Category  | Defense          | Status   |
| --------- | ---------------- | -------- |
| Spoofing  | Authentication   | {status} |
| Tampering | Input Validation | {status} |

...

## Recommended Phase 3 Focus

1. {area-1}
2. {area-2}
```

**Output**: `summary.md`

---

## Related

- [Main SKILL.md](../SKILL.md) - Quick Reference and Parallelization Strategy
- [output-schemas.md](output-schemas.md) - JSON schemas for all artifacts
- [detection-patterns.md](detection-patterns.md) - Extended detection patterns
- [stride-mapping.md](stride-mapping.md) - STRIDE threat category details
