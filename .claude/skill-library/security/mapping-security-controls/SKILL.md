---
name: mapping-security-controls
description: Use when mapping security controls during threat modeling Phase 4 - provides mode detection (per-concern vs full mapping), per-concern 5-step investigation workflow, full mapping 10-category methodology with STRIDE alignment, gap analysis severity classification, and output schema requirements.
allowed-tools: Read, Grep, Glob
---

# Mapping Security Controls

**Security controls mapping methodology for threat modeling Phase 4.**

This skill provides the complete methodology for identifying, cataloging, and assessing security controls across codebases during threat modeling Phase 4. It supports two operating modes: **per-concern** investigation (focused analysis) and **full mapping** (comprehensive 10-category analysis).

## When to Use

Use this skill when:

- Mapping security controls during threat modeling Phase 4
- Investigating specific security concerns (per-concern mode)
- Performing comprehensive control inventories (full mapping mode)
- Assessing control effectiveness and identifying gaps
- Producing structured control artifacts for Phase 5 threat analysis

This skill is typically invoked by the `security-controls-mapper` agent or loaded via `gateway-security`.

---

## Operating Modes

### Mode Detection

Determine mode from prompt keywords:

| Mode             | Trigger Keywords                                        | Output                                  |
| ---------------- | ------------------------------------------------------- | --------------------------------------- |
| **Per-Concern**  | "concern-id", "investigate concern", "locations"        | Single investigation JSON               |
| **Full Mapping** | "map all controls", "complete Phase 4", "10 categories" | 12 files (10 controls + gaps + summary) |

**How to choose:**

- **Per-Concern Mode**: Use when the orchestrator provides a specific concern to investigate with file locations
- **Full Mapping Mode**: Use when performing comprehensive Phase 4 analysis across all control categories

---

## Per-Concern Investigation (Mode 1)

When the orchestrator provides concern details for investigation, follow this 5-step workflow:

### 1. Load Concern Details

Extract from the prompt:

- **Concern ID**: Unique identifier (e.g., `STRIDE-S-001`)
- **Concern Name**: Descriptive name (e.g., `JWT Token Validation`)
- **Severity**: Critical/High/Medium/Low
- **Locations**: Files/modules to investigate (provided by orchestrator)

**Example:**

```
Concern ID: STRIDE-S-001
Name: JWT Token Validation
Severity: High
Locations: backend/auth/jwt.go, backend/middleware/auth.go
```

### 2. Investigate Listed Files

For each location provided:

1. **Read source code** - Use Read tool to examine implementations
2. **Identify relevant security controls** - Look for authentication, validation, error handling
3. **Cite specific implementations** - Reference exact file:line locations
4. **Note control effectiveness** - Assess whether controls fully mitigate the concern

**Evidence-based citations:**

```
backend/auth/jwt.go - func ValidateToken() - JWT signature verification
backend/middleware/auth.go:45 - Authorization header parsing
```

### 3. Identify Controls Addressing Concern

Map findings to relevant control categories:

- **Authentication** - Identity verification mechanisms
- **Authorization** - Access control checks
- **Input Validation** - Data sanitization
- **Cryptography** - Encryption, hashing
- **Logging/Audit** - Security event tracking

Document:

- How each control mitigates the concern
- Implementation completeness
- Control effectiveness assessment

### 4. Identify Gaps

Document missing or incomplete controls:

- **What controls are absent?** - Required controls not found in listed files
- **Where are implementations partial?** - Incomplete validation, missing edge cases
- **What improvements are needed?** - Specific recommendations for closing gaps

**Gap classification:**

- Critical - Control completely missing, exploitable
- High - Partial implementation, gaps exploitable
- Medium - Implementation present but unverified
- Low - Control verified, minor improvements only

### 5. Output Investigation JSON

Write single file following investigation schema:

**Path structure:**

```
.claude/.threat-model/$SESSION/phase-4/investigations/{severity}/{concern-id}-{name}.json
```

**Example:**

```
.claude/.threat-model/20240315-backend/phase-4/investigations/High/STRIDE-S-001-jwt-token-validation.json
```

**Schema requirements:**

- Concern metadata (ID, name, severity)
- Controls identified (category, location, effectiveness)
- Gaps documented (severity, description, recommendation)
- Evidence citations (file:line references)

---

## Full Mapping Methodology (Mode 2)

### Control Categories (10 total)

**You MUST complete all 10 categories. Create TodoWrite items for each.**

| Category                | Focus Area              | Examples                                |
| ----------------------- | ----------------------- | --------------------------------------- |
| **Authentication**      | Identity verification   | Cognito, JWT, OAuth, MFA                |
| **Authorization**       | Access control          | RBAC, permissions, policies             |
| **Input Validation**    | Data sanitization       | Zod schemas, encoding, escaping         |
| **Output Encoding**     | XSS prevention          | CSP headers, escaping, safe rendering   |
| **Cryptography**        | Encryption/hashing      | AES encryption, bcrypt, key rotation    |
| **Secrets Management**  | Credential storage      | Environment variables, vaults, AWS SSM  |
| **Logging/Audit**       | Security event tracking | Access logs, modification tracking      |
| **Rate Limiting**       | DoS protection          | Throttling, circuit breakers            |
| **CORS/CSP**            | Browser security        | CORS headers, CSP policies, same-origin |
| **Dependency Security** | Supply chain protection | Dependabot, lockfiles, SCA tools        |

### Full Mapping Workflow

1. **Create TodoWrite items** - One todo per category (10 total)
2. **Systematically analyze each category** - Use Read, Grep, Glob tools
3. **Document controls found** - Cite file:line references
4. **Assess effectiveness** - Classify as implemented/partial/missing
5. **Identify gaps** - Document weaknesses per category
6. **Map to STRIDE** - Align controls with threat categories (see STRIDE Alignment below)
7. **Generate 12 files** - 10 control files + gaps + summary

### Gap Analysis Levels

Classify gaps by severity:

| Level        | Criteria                                  | Impact                        |
| ------------ | ----------------------------------------- | ----------------------------- |
| **Critical** | Control completely missing, exploitable   | Immediate threat, high impact |
| **High**     | Partial implementation, gaps exploitable  | Significant risk              |
| **Medium**   | Implementation present but unverified     | Moderate risk                 |
| **Low**      | Control verified, minor improvements only | Low risk, hardening           |

### STRIDE Alignment

Map every control to STRIDE threat categories:

| Control Category        | STRIDE Defense                      | Threat Mitigated               |
| ----------------------- | ----------------------------------- | ------------------------------ |
| **Authentication**      | Spoofing defense                    | Prevents identity spoofing     |
| **Authorization**       | Elevation of Privilege defense      | Prevents unauthorized access   |
| **Input Validation**    | Tampering defense                   | Prevents data manipulation     |
| **Output Encoding**     | Tampering defense (secondary)       | Prevents injection attacks     |
| **Cryptography**        | Information Disclosure defense      | Protects confidentiality       |
| **Secrets Management**  | Information Disclosure defense      | Protects credentials           |
| **Logging/Audit**       | Repudiation defense                 | Provides accountability        |
| **Rate Limiting**       | Denial of Service defense           | Prevents resource exhaustion   |
| **CORS/CSP**            | Tampering + Info Disclosure defense | Prevents browser-based attacks |
| **Dependency Security** | Multi-threat defense                | Reduces supply chain risks     |

**Usage in Phase 5:** Threat analysis agents use this mapping to match threats with existing controls.

---

## Output Schemas

### Per-Concern Mode Directory Structure

```
.claude/.threat-model/{session-id}/phase-4/
└── investigations/
    ├── Critical/{concern-id}-{name}.json
    ├── High/{concern-id}-{name}.json
    ├── Medium/{concern-id}-{name}.json
    └── Low/{concern-id}-{name}.json
```

**File naming:**

- `{concern-id}` - Unique identifier (e.g., `STRIDE-S-001`)
- `{name}` - Kebab-case concern name (e.g., `jwt-token-validation`)

**Schema validation:**

- Must include concern metadata
- Must cite file:line evidence
- Must classify gap severity
- Must provide recommendations

### Full Mapping Mode File List (12 files)

```
.claude/.threat-model/{session-id}/phase-4/
├── authentication.json
├── authorization.json
├── input-validation.json
├── output-encoding.json
├── cryptography.json
├── secrets-management.json
├── logging-audit.json
├── rate-limiting.json
├── cors-csp.json
├── dependency-security.json
├── control-gaps.json
└── summary.md
```

**File requirements:**

- **10 control files** - One per category (JSON format)
- **control-gaps.json** - Consolidated gap analysis across all categories
- **summary.md** - Executive summary with counts, gap highlights, STRIDE coverage

**Schema validation:**

- Each control file must list controls found with file:line citations
- Each control file must assess effectiveness (implemented/partial/missing)
- control-gaps.json must classify by severity (Critical/High/Medium/Low)
- summary.md must include STRIDE alignment matrix

---

## Related Skills

- `persisting-agent-outputs` - Defines output directory discovery, file naming, MANIFEST updates
- `enforcing-evidence-based-analysis` - Ensures file:line citations, prevents hallucination
- `using-todowrite` - Tracks progress through 10 categories or 5-step workflow
- `verifying-before-completion` - Validates all 12 files produced before claiming done

---

## Progressive Disclosure

**For detailed information:**

- **[Control Detection Patterns](references/control-detection-patterns.md)** - Grep patterns for finding controls (authentication regex, validation patterns, crypto usage)
- **[Investigation Examples](references/investigation-examples.md)** - Complete per-concern workflow with real code citations
- **[Full Mapping Examples](references/full-mapping-examples.md)** - End-to-end 10-category analysis with output files

---

**Remember:**

- Choose mode based on prompt keywords (per-concern vs full mapping)
- Per-concern: 5 steps, single JSON output
- Full mapping: 10 categories, 12 files output
- Always cite file:line evidence
- Classify gaps by severity
- Map controls to STRIDE threats
- Use `persisting-agent-outputs` for file paths
- Verify schemas before claiming done
