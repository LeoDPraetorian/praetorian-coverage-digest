---
name: gateway-security
description: Routes security tasks to library skills. Intent detection + progressive loading.
allowed-tools: Read
---

<EXTREMELY-IMPORTANT>
# STOP. READ THIS FIRST. DO NOT SKIP.

## The 1% Rule (NON-NEGOTIABLE)

If there is even a **1% chance** a skill might apply to your task:

- You MUST invoke that skill
- This is not optional
- This is not negotiable
- You cannot rationalize your way out of this

Uncertainty = Invocation. Period.

## Skill Announcement (MANDATORY)

Before using any skill, you MUST announce it in your response:

"I am invoking `{skill-name}` because {reason}."

This announcement must appear BEFORE you begin work.
No announcement = no invocation = PROTOCOL VIOLATION = FAILURE!
</EXTREMELY-IMPORTANT>

# Gateway: Security

Routes security tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~300 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                                    | Route To                         |
| ---------------------------------------------- | -------------------------------- |
| "auth" / "JWT" / "OAuth" / "login"             | → `auth-implementation-patterns` |
| "authorization" / "RBAC" / "permissions"       | → `authorization-testing`        |
| "secrets" / "credentials" / "API keys"         | → `secrets-management`           |
| "secret scan" / "leak detection"               | → `secret-scanner`               |
| "encryption" / "crypto" / "hashing"            | → `discover-cryptography`        |
| "defense" / "hardening" / "layers"             | → `defense-in-depth`             |
| "threat model" / "attack surface"              | → `threat-modeling`              |
| "business context" / "crown jewels"            | → `business-context-discovery`   |
| "codebase map" / "architecture analysis"       | → `codebase-mapping`             |
| "security controls" / "mitigations"            | → `security-controls-mapping`    |
| "CVSS" / "severity score"                      | → `cvss-scoring`                 |
| "security test plan" / "pentest" / "Phase 6"   | → `planning-security-tests`      |
| "codebase size" / "complexity"                 | → `codebase-sizing`              |
| "security review" / "OWASP" / "Go security"    | → `reviewing-backend-security`   |
| "frontend security" / "React security" / "XSS" | → `reviewing-frontend-security`  |
| "CIS" / "benchmark" / "compliance mapping"     | → `mapping-to-cis-benchmarks`    |
| "FDA" / "medical device" / "510(k)" / "SBOM"   | → `mapping-to-fda-cybersecurity` |
| "Shodan" / "host search" / "recon"             | → use `gateway-mcp-tools`        |
| "testing" (general)                            | → also invoke `gateway-testing`  |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### Authentication & Authorization

| Skill                 | Path                                                                   | Triggers                         |
| --------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| Auth Patterns         | `.claude/skill-library/security/auth-implementation-patterns/SKILL.md` | auth, JWT, OAuth, login          |
| Authorization Testing | `.claude/skill-library/security/authorization-testing/SKILL.md`        | authorization, RBAC, permissions |

### Secrets & Cryptography

| Skill              | Path                                                            | Triggers                       |
| ------------------ | --------------------------------------------------------------- | ------------------------------ |
| Secrets Management | `.claude/skill-library/security/secrets-management/SKILL.md`    | secrets, credentials, API keys |
| Secret Scanner     | `.claude/skill-library/security/secret-scanner/SKILL.md`        | secret scan, leak detection    |
| Cryptography       | `.claude/skill-library/security/discover-cryptography/SKILL.md` | encryption, crypto, hashing    |

### Defense & Architecture

| Skill            | Path                                                       | Triggers                   |
| ---------------- | ---------------------------------------------------------- | -------------------------- |
| Defense in Depth | `.claude/skill-library/security/defense-in-depth/SKILL.md` | defense, hardening, layers |

### Threat Modeling

| Skill                  | Path                                                                 | Triggers                             |
| ---------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Business Context       | `.claude/skill-library/security/business-context-discovery/SKILL.md` | business context, crown jewels       |
| Codebase Sizing        | `.claude/skill-library/security/codebase-sizing/SKILL.md`            | codebase size, complexity            |
| Codebase Mapping       | `.claude/skill-library/security/codebase-mapping/SKILL.md`           | codebase map, architecture           |
| Security Controls      | `.claude/skill-library/security/mapping-security-controls/SKILL.md`  | security controls, mitigations       |
| Threat Modeling        | `.claude/skill-library/security/threat-modeling/SKILL.md`            | threat model, attack surface         |
| CVSS Scoring           | `.claude/skill-library/security/cvss-scoring/SKILL.md`               | CVSS, severity score                 |
| Security Test Planning | `.claude/skill-library/security/planning-security-tests/SKILL.md`    | security test plan, pentest, Phase 6 |

### Security Review

| Skill                    | Path                                                                  | Triggers                               |
| ------------------------ | --------------------------------------------------------------------- | -------------------------------------- |
| Backend Security Review  | `.claude/skill-library/security/reviewing-backend-security/SKILL.md`  | security review, OWASP, Go security    |
| Frontend Security Review | `.claude/skill-library/security/reviewing-frontend-security/SKILL.md` | frontend security, React security, XSS |

### Compliance Frameworks

| Skill                           | Path                                                                           | Triggers                               |
| ------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| Mapping to CIS Benchmarks       | `.claude/skill-library/frameworks/mapping-to-cis-benchmarks/SKILL.md`          | CIS, benchmark, compliance mapping     |
| Mapping to FDA Cybersecurity    | `.claude/skill-library/frameworks/mapping-to-fda-cybersecurity/SKILL.md`       | FDA, medical device, 510(k), SBOM, CVD |

### Reconnaissance Tools

See `gateway-mcp-tools` for Shodan API (moved to MCP tools category).

## Cross-Gateway Routing

| If Task Involves    | Also Invoke          |
| ------------------- | -------------------- |
| React security      | `gateway-frontend`   |
| Go security         | `gateway-backend`    |
| Security testing    | `gateway-testing`    |
| TypeScript security | `gateway-typescript` |

## Loading Skills

**Path convention:** `.claude/skill-library/security/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/security/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.
