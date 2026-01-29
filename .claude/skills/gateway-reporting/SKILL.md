---
name: gateway-reporting
description: Use when generating or formatting security reports and documentation - routes to report formatting, finding documentation, and client-specific writing standards via progressive loading.
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

# Gateway: Reporting

Routes report generation and formatting tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~200 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                                                            | Route To                                   |
| ---------------------------------------------------------------------- | ------------------------------------------ |
| "NRF" / "Norton Rose Fulbright" / "legal writing" / "defensive writing" / "prophylactic" | → `nrf-reviewer`                           |
| "PlexTrac" / "VKB" / "finding format" / "vulnerability write-up"       | → `formatting-plextrac-findings`           |
| "Praetorian Cloud" / "CVSS 4.0" / "6-section finding"                  | → `praetorian-cloud-finding-format`        |
| "test plan" / "security testing instructions" / "test cases"           | → `generating-security-test-instructions`  |
| "threat report" / "KEV" / "threat intelligence"                        | → `generating-threat-intelligence-reports` |
| "blog post" / "article" / "content generation"                         | → `generate-blogpost`                      |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### Client-Specific Formatting

| Skill                     | Path                                                                       | Triggers                                  |
| ------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| NRF Reviewer              | `.claude/skill-library/reporting/nrf/nrf-reviewer/SKILL.md`                | NRF, Norton Rose Fulbright, legal writing, prophylactic |
| Praetorian Cloud Findings | `.claude/skill-library/reporting/praetorian-cloud-finding-format/SKILL.md` | Praetorian Cloud, CVSS 4.0, 6-section     |

### Report Platforms

| Skill             | Path                                                                 | Triggers                          |
| ----------------- | -------------------------------------------------------------------- | --------------------------------- |
| PlexTrac Findings | `.claude/skill-library/reporting/formatting-plextrac-findings/SKILL.md` | PlexTrac, VKB, finding format     |

### Documentation Generation

| Skill                       | Path                                                                             | Triggers                                |
| --------------------------- | -------------------------------------------------------------------------------- | --------------------------------------- |
| Security Test Instructions  | `.claude/skill-library/reporting/generating-security-test-instructions/SKILL.md` | test plan, testing instructions         |
| Threat Intelligence Reports | `.claude/skill-library/reporting/generating-threat-intelligence-reports/SKILL.md` | threat report, KEV, threat intelligence |
| Blog Post Generator         | `.claude/skill-library/content/generate-blogpost/SKILL.md`                       | blog post, article, content generation  |

## Cross-Gateway Routing

If your task involves multiple domains, also invoke:

| If Task Involves          | Also Invoke          | Reason                                      |
| ------------------------- | -------------------- | ------------------------------------------- |
| Security findings + testing | `gateway-security`   | Finding creation and security test planning |
| Report formatting + frontend | `gateway-frontend`   | UI components for report display            |
| Threat modeling → report  | `gateway-security`   | Threat modeling then report generation      |

## Loading Skills

**Convention**: All paths relative to repo root (`.claude/skill-library/...`)

**Example**:

```
Read(".claude/skill-library/reporting/nrf/nrf-reviewer/SKILL.md")
```

## Related Gateways

| Gateway  | Invoke With                 | Use For                                      |
| -------- | --------------------------- | -------------------------------------------- |
| Security | `skill: "gateway-security"` | Security patterns, threat modeling, findings |
| Testing  | `skill: "gateway-testing"`  | Test generation and validation               |
| Backend  | `skill: "gateway-backend"`  | API documentation generation                 |
