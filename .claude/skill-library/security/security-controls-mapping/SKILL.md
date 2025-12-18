---
name: security-controls-mapping
description: Use when mapping security controls for threat modeling - identifies authentication, authorization, validation, cryptography, logging controls and gaps per STRIDE categories
allowed-tools: Read, Write, Grep, Glob, Bash, TodoWrite
---

# Security Controls Mapping

**Systematic methodology for mapping existing security controls and identifying gaps for Phase 2 of threat modeling.**

## When to Use

Use this skill when:
- Performing Phase 2 of threat modeling (security controls analysis)
- Analyzing security mechanisms after codebase mapping (Phase 1)
- Need to map controls to STRIDE threat categories
- Preparing structured input for Phase 3 (threat identification)
- Identifying control gaps for security test planning

**You MUST use TodoWrite** to track progress through all 8 control categories.

---

## Phase 0 Context (Required Inputs)

**Phase 2 evaluates security controls against Phase 0 compliance requirements.**

### What Phase 0 Provides

Phase 0 (Business Context Discovery) produces:
- **Compliance requirements** (SOC2, PCI-DSS, HIPAA, GDPR) → Validate specific regulatory controls
- **Regulatory gaps** → Document which requirements are not met
- **Compliance status** → Track progress toward compliance (requirements met/gaps)

**Without Phase 0**: Control mapping is generic (finds controls, but doesn't validate compliance).
**With Phase 0**: Mapping validates regulatory requirements (compliance-driven evaluation).

### Required Files

**Load before control analysis**:
- `../phase-0/summary.md` - Quick compliance overview
- `../phase-0/compliance-requirements.json` - Specific regulatory requirements to validate

**Error Handling**: If Phase 0 files missing, skill MUST error and instruct user to run `business-context-discovery` skill first.

### For Complete Phase 0 Integration Details

**See [references/phase-0-compliance-integration.md](references/phase-0-compliance-integration.md)** for:
- Compliance validation workflow (load requirements, map to control categories, validate, generate status)
- `control-gaps.json` schema with `compliance_requirement` field
- Summary generation with compliance evaluation section
- Testing scenarios and validation examples
- Complete examples for PCI-DSS, SOC2, HIPAA validation

---

## Critical Rules

### This is Formal Threat Modeling, Not a Quick Security Review

**If you're under time pressure:**
- ✅ Reduce SCOPE (analyze fewer control categories)
- ✅ Request deadline extension
- ✅ Communicate you need X hours for proper methodology
- ❌ Skip categories or produce ad-hoc output structure

**Why structured artifacts are non-negotiable:**
- Phase 3 (threat modeling) requires specific JSON files per control category
- STRIDE threat mapping depends on consistent control categorization
- Phase 4 (test planning) prioritizes based on control gaps
- Ad-hoc output = Phase 3 cannot consume your results

### Output Schema is Non-Negotiable

**MUST produce these exact files (per architecture spec):**
```
phase-2/
├── authentication.json
├── authorization.json
├── input-validation.json
├── output-encoding.json
├── cryptography.json
├── secrets-management.json
├── logging-audit.json
├── rate-limiting.json
├── cors-csp.json           # Browser security only (skip for backend-only)
├── dependency-security.json
├── control-gaps.json
└── summary.md
```

**NOT acceptable alternatives:**
- ❌ "security-controls-inventory.json" (wrong name)
- ❌ "stride-control-mapping.json" (not in spec)
- ❌ "consolidated-controls.json" (Phase 3 can't find it)

### Expertise Does Not Replace Methodology

**Common rationalizations to avoid:**
- ❌ "I can see the auth is Cognito, no need to document"
- ❌ "Quick grep for validation patterns is sufficient"
- ❌ "Single JSON file is cleaner than 12 files"
- ❌ "I'll note gaps inline instead of separate file"

**Reality:**
- Documenting controls creates audit trail
- Systematic detection catches edge cases
- Separate files enable parallel analysis
- Gaps file enables prioritized test planning

### "Substance Over Structure" is a Trap

<EXTREMELY_IMPORTANT>
The 12-file output structure is NOT arbitrary preference. It is MANDATORY for Phase 3 automation.

**FACT**: The `threat-modeling-orchestrator` skill (`.claude/skills/threat-modeling-orchestrator/`) loads these files by exact name:
```
Phase 3 loads: authentication.json, authorization.json, input-validation.json, etc.
Phase 3 CANNOT load: security-controls-inventory.json, stride-control-mapping.json
```

If you produce wrong file names, Phase 3 orchestrator fails. This is not opinion - this is code dependency.
</EXTREMELY_IMPORTANT>

**Common rationalizations to reject:**

❌ **"The work is substantively complete, just wrong structure"**
- Reality: Phase 3 orchestrator cannot load your files → Phase 3 fails → Threat model incomplete
- This isn't about quality - it's about interface contract

❌ **"7 files contain same information as 12 files"**
- Reality: Information is useless if consumer can't find it
- Phase 3 does `Read authentication.json` - file must exist with that exact name

❌ **"I'll restructure tomorrow when fresh"**
- Reality: "Tomorrow" means Phase 2 incomplete tonight → Phase 3 blocked → Workflow stops
- Reality: Restructuring takes 2-3 minutes for AI (not 1-2 hours) - exhaustion is irrelevant

❌ **"Skills are guidance, not law - adapt to context"**
- Reality: Interface contracts ARE law - Phase 3 expects specific inputs
- Reality: This skill IS the contract between Phase 2 and Phase 3
- Adapting = breaking the contract = blocking downstream work

❌ **"YAGNI - no tooling exists for this format"**
- Reality: The tooling IS Phase 3's orchestrator - already written, already expects these files
- Reality: You're not building for hypothetical future - you're building for next phase TODAY

❌ **"Single consolidated file is cleaner/better organized"**
- Reality: "Better" is irrelevant - what matters is "compatible with Phase 3"
- Reality: Separate files enable parallel agent work on different categories
- Reality: You don't get to redesign interfaces mid-workflow

❌ **"Keep both formats / Convert later"**
- Reality: Maintaining duplicate state violates DRY and creates sync bugs
- Reality: "Convert later" = technical debt when conversion takes 2-3 minutes now

**The ONLY acceptable responses:**
1. ✅ Delete wrong format, create correct format (takes 2-3 minutes for AI)
2. ✅ Reduce scope (map fewer categories, but use correct schema)
3. ✅ Stop entirely and communicate "Phase 2 incomplete" (don't ship wrong format)

**NOT acceptable:**
- ❌ Ship wrong format and claim it's "substantively equivalent"
- ❌ Ship wrong format and defer fixing to "tomorrow"
- ❌ Ship both formats (duplicate state)
- ❌ Argue the skill is wrong (follow it, then propose update)

**Bottom line**: You don't have 7 files of good work. You have 0 files of usable work for Phase 3. Restructure now (2-3 minutes) or communicate Phase 2 failed.

---

## Quick Reference

| Step | Purpose | Output |
|------|---------|--------|
| 1. Load Phase 1 Artifacts | Get architecture context | Phase 1 summary loaded |
| 2. Authentication Controls | Map auth mechanisms | `authentication.json` |
| 3. Authorization Controls | Map authz patterns | `authorization.json` |
| 4. Input Validation | Map validation patterns | `input-validation.json` |
| 5. Output Encoding | Map output security | `output-encoding.json` |
| 6. Cryptography | Map encryption/hashing | `cryptography.json` |
| 7. Secrets Management | Map secret handling | `secrets-management.json` |
| 8. Supporting Controls | Logging, rate limiting, CORS, deps | 4 JSON files |
| 9. Gap Analysis | Identify missing controls | `control-gaps.json` |
| 10. Summary | Compress for handoff | `summary.md` (<2000 tokens) |

---

## Core Workflow

### Step 1: Load Phase 1 Artifacts

**Goal**: Get architecture context before mapping controls.

**Required inputs from Phase 1:**
- `summary.md` - Technology stack, components overview
- `components/*.json` - Per-component analysis
- `entry-points.json` - Attack surface (where controls must exist)
- `trust-boundaries.json` - Where security transitions occur

**Load command:**
```bash
cat {session}/phase-1/summary.md
ls {session}/phase-1/components/
```

---

### Step 2: Authentication Controls

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

**Output**: `authentication.json` - See [references/output-schemas.md](references/output-schemas.md)

---

### Step 3: Authorization Controls

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

### Step 4: Input Validation Controls

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

### Step 5: Output Encoding Controls

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

### Step 6: Cryptography Controls

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

### Step 7: Secrets Management Controls

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

### Step 8: Supporting Controls

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

### Step 9: Gap Analysis

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

### Step 10: Summary Generation

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
| Category | Defense | Status |
|----------|---------|--------|
| Spoofing | Authentication | {status} |
| Tampering | Input Validation | {status} |
...

## Recommended Phase 3 Focus
1. {area-1}
2. {area-2}
```

**Output**: `summary.md`

---

## Output Artifacts

All outputs go to: `.claude/.threat-model/{session}/phase-2/`

| File | STRIDE Defense | Consumer |
|------|----------------|----------|
| `authentication.json` | Spoofing | Phase 3 threat scenarios |
| `authorization.json` | Elevation of Privilege | Phase 3 threat scenarios |
| `input-validation.json` | Tampering | Phase 3 threat scenarios |
| `output-encoding.json` | Information Disclosure | Phase 3 threat scenarios |
| `cryptography.json` | Information Disclosure | Phase 3 threat scenarios |
| `secrets-management.json` | Information Disclosure | Phase 3 threat scenarios |
| `logging-audit.json` | Repudiation | Phase 3 threat scenarios |
| `rate-limiting.json` | Denial of Service | Phase 3 threat scenarios |
| `cors-csp.json` | Browser Security | Phase 3 (frontend only) |
| `dependency-security.json` | Supply Chain | Phase 3 threat scenarios |
| `control-gaps.json` | All | Phase 4 test planning |
| `summary.md` | - | Orchestrator handoff |

See [references/output-schemas.md](references/output-schemas.md) for JSON schemas.

---

## Parallelization Strategy

For large codebases, parallelize by control category:

```
Orchestrator spawns:
├── Task("security-controls-mapper", "Map authentication controls")
├── Task("security-controls-mapper", "Map authorization controls")
├── Task("security-controls-mapper", "Map input validation")
├── Task("security-controls-mapper", "Map cryptography usage")
├── Task("security-controls-mapper", "Map audit logging")
└── Consolidates results + generates control-gaps.json
```

---

## Troubleshooting

**Problem**: No auth controls detected
**Solution**: Check for custom auth middleware. Look for request interceptors, middleware chains.

**Problem**: Can't verify control effectiveness
**Solution**: Mark as "unverified" in gap analysis. Flag for penetration testing in Phase 4.

**Problem**: Mixed frontend/backend codebase
**Solution**: Run separately for each. Frontend needs CORS/CSP, backend doesn't.

**Problem**: Microservices architecture
**Solution**: Map controls per service. Note service-to-service auth separately.

---

## References

- [references/output-schemas.md](references/output-schemas.md) - JSON schemas for all artifacts
- [references/detection-patterns.md](references/detection-patterns.md) - Extended detection patterns
- [references/stride-mapping.md](references/stride-mapping.md) - STRIDE threat category details

## Related Skills

- `business-context-discovery` - Phase 0: REQUIRED before this skill - discovers compliance requirements (SOC2, PCI-DSS, HIPAA, GDPR)
- `codebase-mapping` - Phase 1: Maps architecture before controls mapping
- `threat-modeling` - Phase 3: Uses control maps for threat identification
- `security-test-planning` - Phase 4: Uses control gaps for test prioritization
