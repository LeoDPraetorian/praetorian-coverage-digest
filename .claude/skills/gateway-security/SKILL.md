---
name: gateway-security
description: Use when implementing security - routes to auth, secrets, cryptography, threat modeling, and defense skills via progressive loading.
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

| Task Intent                                                      | Route To                                   |
| ---------------------------------------------------------------- | ------------------------------------------ |
| "auth" / "JWT" / "OAuth" / "login"                               | → `auth-implementation-patterns`           |
| "authorization" / "RBAC" / "permissions"                         | → `authorization-testing`                  |
| "secrets" / "credentials" / "API keys"                           | → `secrets-management`                     |
| "secret scan" / "leak detection"                                 | → `secret-scanner`                         |
| "encryption" / "crypto" / "hashing"                              | → `discover-cryptography`                  |
| "defense" / "hardening" / "layers"                               | → `defense-in-depth`                       |
| "threat model" / "attack surface"                                | → `threat-modeling`                        |
| "threat modeling orchestrator" / "multi-phase"                   | → `threat-modeling-orchestrator`           |
| "business context" / "crown jewels"                              | → `business-context-discovery`             |
| "codebase map" / "architecture analysis"                         | → `mapping-codebases`                      |
| "security controls" / "mitigations"                              | → `security-controls-mapping`              |
| "CVSS" / "severity score" (threat modeling)                      | → `scoring-cvss-threats`                   |
| "CVSS calibration" / "scoring findings" / "avoid over-inflation" | → `scoring-cvss-findings`                  |
| "security test plan" / "pentest" / "Phase 6"                     | → `security-test-planning`                 |
| "codebase size" / "complexity"                                   | → `sizing-codebases`                       |
| "threat report" / "customer impact report" / "KEV + customer"    | → `orchestrating-threat-reports` (FULL workflow: KEV + customer impact + gap remediation) |
| "threat intelligence" / "KEV only" / "vulnerability report"      | → `generating-threat-intelligence-reports` (Phase 1 only: KEV research + attribution) |
| "CVE impact" / "customer exposure" / "asset vulnerability"       | → `analyzing-cve-customer-impact`          |
| "CVE research" / "nuclei template" / "detection gap"             | → `orchestrating-cve-research-jobs`        |
| "security review" / "OWASP" / "Go security"                      | → `reviewing-backend-security`             |
| "frontend security" / "React security" / "XSS"                   | → `reviewing-frontend-security`            |
| "PlexTrac" / "finding format" / "report writing" / "VKB"         | → `formatting-plextrac-findings`           |
| "CIS" / "benchmark" / "compliance mapping"                       | → `mapping-to-cis-benchmarks`              |
| "FDA" / "medical device" / "510(k)" / "SBOM"                     | → `mapping-to-fda-cybersecurity`           |
| "Windows internals" / "kernel" / "CreateProcess"                 | → `windows-internals`                      |
| "Windows authentication" / "Kerberos" / "NTLM"                   | → `windows-security-internals`             |
| "EDR" / "EDR evasion" / "function hooking" / "ETW"               | → `evading-edr`                            |
| "browser extension" / "hypercube" / "Chrome"                     | → `hypercube-browser-extension`            |
| "Prowler" / "AWS findings" / "triage Prowler"                    | → `triaging-aws-prowler-findings`          |
| "Shodan" / "host search" / "recon"                               | → use `gateway-mcp-tools`                  |
| "testing" (general)                                              | → also invoke `gateway-testing`            |

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

### Threat Modeling & Intelligence

| Skill                         | Path                                                                                | Triggers                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Business Context              | `.claude/skill-library/security/threat-model/business-context-discovery/SKILL.md`   | business context, crown jewels                                |
| Codebase Sizing               | `.claude/skill-library/security/threat-model/sizing-codebases/SKILL.md`             | codebase size, complexity                                     |
| Codebase Mapping              | `.claude/skill-library/security/threat-model/mapping-codebases/SKILL.md`            | codebase map, architecture                                    |
| Security Controls             | `.claude/skill-library/security/threat-model/security-controls-mapping/SKILL.md`    | security controls, mitigations                                |
| Threat Modeling               | `.claude/skill-library/security/threat-model/threat-modeling/SKILL.md`              | threat model, attack surface                                  |
| Threat Modeling Orchestrator  | `.claude/skill-library/security/threat-model/threat-modeling-orchestrator/SKILL.md` | threat modeling orchestrator, multi-phase, STRIDE, PASTA, DFD |
| Scoring CVSS Threats          | `.claude/skill-library/security/threat-model/scoring-cvss-threats/SKILL.md`         | CVSS, severity score, threat modeling Phase 3                 |
| Scoring CVSS Findings         | `.claude/skill-library/security/threat-model/scoring-cvss-findings/SKILL.md`        | CVSS calibration, scoring findings, avoid over-inflation      |
| Security Test Planning        | `.claude/skill-library/security/threat-model/security-test-planning/SKILL.md`       | security test plan, pentest, Phase 6                          |
| Threat Report Orchestration   | `.claude/skill-library/research/orchestrating-threat-reports/SKILL.md`              | threat report, KEV + customer (FULL: 3-phase workflow)       |
| Threat Intelligence Reporting | `.claude/skill-library/research/generating-threat-intelligence-reports/SKILL.md`    | threat intelligence, KEV only (Phase 1: KEV research + attribution) |
| CVE Customer Impact Analysis  | `.claude/skill-library/research/analyzing-cve-customer-impact/SKILL.md`             | CVE impact, customer exposure (Phase 2: asset vulnerability) |
| CVE Research Orchestration    | `.claude/skill-library/research/orchestrating-cve-research-jobs/SKILL.md`           | CVE research, nuclei template (Phase 3: detection gap remediation) |

### Security Review

| Skill                       | Path                                                                    | Triggers                                      |
| --------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| Backend Security Review     | `.claude/skill-library/security/reviewing-backend-security/SKILL.md`    | security review, OWASP, Go security           |
| Frontend Security Review    | `.claude/skill-library/security/reviewing-frontend-security/SKILL.md`   | frontend security, React security, XSS        |
| PlexTrac Finding Formatting | `.claude/skill-library/reporting/formatting-plextrac-findings/SKILL.md` | PlexTrac, finding format, report writing, VKB |
| Hypercube Browser Extension | `.claude/skill-library/security/hypercube-browser-extension/SKILL.md`   | browser extension, hypercube, Chrome          |

### Security Assessment & Triage

| Skill                         | Path                                                                     | Triggers                                  |
| ----------------------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| Triaging AWS Prowler Findings | `.claude/skill-library/security/triaging-aws-prowler-findings/SKILL.md` | Prowler, AWS findings, triage, exploitability, business risk |

### Windows Security References

| Skill                      | Path                                                                         | Triggers                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Windows Internals          | `.claude/skill-library/security/windows/windows-internals/SKILL.md`          | Windows internals, kernel, process, thread, memory, CreateProcess         |
| Windows Security Internals | `.claude/skill-library/security/windows/windows-security-internals/SKILL.md` | Windows authentication, Kerberos, NTLM, access token, security descriptor |
| Evading EDR                | `.claude/skill-library/security/windows/evading-edr/SKILL.md`                | EDR, EDR evasion, function hooking, ETW, kernel callbacks                 |

### Compliance Frameworks

| Skill                        | Path                                                                     | Triggers                               |
| ---------------------------- | ------------------------------------------------------------------------ | -------------------------------------- |
| Mapping to CIS Benchmarks    | `.claude/skill-library/frameworks/mapping-to-cis-benchmarks/SKILL.md`    | CIS, benchmark, compliance mapping     |
| Mapping to FDA Cybersecurity | `.claude/skill-library/frameworks/mapping-to-fda-cybersecurity/SKILL.md` | FDA, medical device, 510(k), SBOM, CVD |

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
