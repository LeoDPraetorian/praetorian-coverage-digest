---
name: gateway-security
description: Use when implementing security features - access Auth, Secrets, Cryptography, Defense, and Threat Modeling patterns. Routes to specialized library skills for security architecture, implementation, and review.
allowed-tools: Read
---

# Security Gateway

## Understanding This Gateway

**This is a gateway skill in Chariot's two-tier skill architecture.**

The two-tier system organizes skills into:

- **Core skills** (are in `.claude/skills/`) - High-frequency skills auto-discovered by Claude Code's Skill tool
- **Library skills** (are in `.claude/skill-library/`) - Specialized skills loaded on-demand via Read tool

**Gateways are routing indices, not implementation guides.** They exist in core to help you discover and load library skills.

## Critical: Two-Tier Skill System

| Tier             | Location                 | How to Invoke | Example                     |
| ---------------- | ------------------------ | ------------- | --------------------------- |
| **Core/Gateway** | `.claude/skills/`        | Skill tool    | `skill: "gateway-security"` |
| **Library**      | `.claude/skill-library/` | Read tool     | `Read("path/to/SKILL.md")`  |

<EXTREMELY_IMPORTANT>
**Library skills cannot be invoked with the Skill tool.** You MUST use the Read tool to load them.

### Common Anti-Patterns

```typescript
// ❌ WRONG: Trying to use Skill tool for library skills
skill: "auth-implementation-patterns"; // FAILS - library skills are NOT in Skill tool

// ❌ WRONG: Guessing or shortening paths
Read(".claude/skill-library/auth-implementation-patterns/..."); // FAILS - missing nested folders

// ❌ WRONG: Using skill name instead of full path
Read("threat-modeling"); // FAILS - must be full path

// ❌ WRONG: Looking in core /skills/ instead of /skill-library/
Read(".claude/skills/secrets-management/..."); // FAILS - library skills are NOT in /skills/
```

### Correct Patterns

```typescript
// ✅ CORRECT: Use gateway to find skill, then Read with FULL path
Read(".claude/skill-library/security/auth-implementation-patterns/SKILL.md");

// ✅ CORRECT: Copy path exactly as shown in this gateway
Read(".claude/skill-library/security/threat-modeling/SKILL.md");

// ✅ CORRECT: Core skills (this gateway) use Skill tool
skill: "gateway-security"; // Core skills work with Skill tool
```

**Workflow:**

1. Invoke this gateway: `skill: "gateway-security"`
2. Find the skill you need in the categorized list below
3. Copy the EXACT path shown (do not modify or shorten)
4. Use Read tool with that path
5. Follow the loaded skill's instructions

</EXTREMELY_IMPORTANT>

## Mandatory Skills by Role

**Load mandatory skills based on your role before starting work.**

### Role Filter

| Your Role                   | Mandatory Sections                                              |
| --------------------------- | --------------------------------------------------------------- |
| **Security Lead/Architect** | ALL ROLES + THREAT MODELING + DEFENSE PATTERNS                  |
| **Security Reviewer**       | ALL ROLES + SECURITY REVIEW                                     |
| **Developer**               | ALL ROLES + SECURITY IMPLEMENTATION                             |
| **Tester**                  | ALL ROLES (security testing skills come from `gateway-testing`) |

**Note:** All skills remain available to any role via the routing tables below. The table shows what you MUST load upfront—not what you're limited to.

---

### ALL ROLES (Everyone Must Read)

**1. Defense in Depth**

`.claude/skill-library/security/defense-in-depth/SKILL.md`

Layered security, principle of least privilege, attack surface reduction, zero trust architecture. **Essential for understanding security architecture principles.**

**2. Auth Implementation Patterns**

`.claude/skill-library/security/auth-implementation-patterns/SKILL.md`

JWT tokens, OAuth flows, session management, RBAC. **Required to understand authentication and authorization basics.**

---

### THREAT MODELING (Mandatory: Security Lead/Architect)

**3. Business Context Discovery (Phase 0)**

`.claude/skill-library/security/business-context-discovery/SKILL.md`

Discovers business context, data classification, threat actors, compliance requirements before technical analysis. **Required for architects starting threat modeling work.**

**4. Codebase Sizing (Phase 1.0)**

`.claude/skill-library/security/codebase-sizing/SKILL.md`

Assesses codebase size, categorizes components, outputs parallelization strategy. **Required before Phase 1 to determine approach.**

**5. Codebase Mapping (Phase 1)**

`.claude/skill-library/security/codebase-mapping/SKILL.md`

Systematic codebase analysis - architecture, components, data flows, entry points, trust boundaries. **Required for understanding attack surface.**

**6. Security Controls Mapping (Phase 2)**

`.claude/skill-library/security/security-controls-mapping/SKILL.md`

Maps existing security controls to STRIDE categories, identifies gaps. **Required before identifying threats.**

**7. Threat Modeling (Phase 3)**

`.claude/skill-library/security/threat-modeling/SKILL.md`

STRIDE + PASTA + DFD principles to identify threats, generate abuse cases, create attack trees. **Core threat modeling skill.**

**8. CVSS Scoring (Phase 3 Scoring)**

`.claude/skill-library/security/cvss-scoring/SKILL.md`

Scores threats with CVSS 3.1/4.0, Base/Temporal/Environmental metrics. **Required for risk-based prioritization.**

**9. Security Test Planning (Phase 4)**

`.claude/skill-library/security/security-test-planning/SKILL.md`

Converts threat models into prioritized test plans - code review targets, SAST/DAST recommendations. **Required to complete threat modeling workflow.**

---

### SECURITY REVIEW (Mandatory: Security Reviewer)

**10. Authorization Testing**

`.claude/skill-library/security/authorization-testing/SKILL.md`

Testing access controls, privilege escalation checks, permission boundaries. **Required for reviewing auth implementations.**

**11. Secret Scanner**

`.claude/skill-library/security/secret-scanner/SKILL.md`

Detecting hardcoded secrets, credential scanning, pre-commit hooks. **Required to prevent credential leaks.**

---

### SECURITY IMPLEMENTATION (Mandatory: Developer)

**12. Secrets Management**

`.claude/skill-library/security/secrets-management/SKILL.md`

Credential storage, secret rotation, secure configuration, vault patterns. **Required when implementing features that handle secrets.**

**13. Discover Cryptography**

`.claude/skill-library/security/discover-cryptography/SKILL.md`

Encryption patterns, key management, hashing algorithms, cryptographic best practices. **Required when implementing encryption or hashing.**

---

### Workflow

1. Identify your role from the Role Filter table above
2. Read ALL ROLES skills (2 skills)
3. Based on your role, also read:
   - Security Lead/Architect: THREAT MODELING (7 skills) + DEFENSE PATTERNS
   - Security Reviewer: SECURITY REVIEW (2 skills)
   - Developer: SECURITY IMPLEMENTATION (2 skills)
4. Then load task-specific skills from the routing tables below

**Remember:** These are mandatory minimums. Any role can load any skill from the routing tables when relevant to their task.

## How to Use

This skill serves as a master directory for all security skills in the Chariot platform. When you need security guidance:

1. **Identify the skill you need** from the categorized list below
2. **Use the Read tool** with the provided path to load the skill
3. **Do not guess paths** - always use the exact paths shown

Each skill is organized by domain for easy discovery.

## Authentication & Authorization

**Auth Implementation Patterns**: `.claude/skill-library/security/auth-implementation-patterns/SKILL.md`

- JWT tokens, OAuth flows, session management, role-based access control (RBAC)

**Authorization Testing**: `.claude/skill-library/security/authorization-testing/SKILL.md`

- Testing access controls, privilege escalation checks, permission boundaries

## Secrets & Credentials

**Secrets Management**: `.claude/skill-library/security/secrets-management/SKILL.md`

- Credential storage, secret rotation, secure configuration, vault patterns

**Secret Scanner**: `.claude/skill-library/security/secret-scanner/SKILL.md`

- Detecting hardcoded secrets, credential scanning, pre-commit hooks

## Cryptography

**Discover Cryptography**: `.claude/skill-library/security/discover-cryptography/SKILL.md`

- Encryption patterns, key management, hashing algorithms, cryptographic best practices

## Defense Patterns

**Defense in Depth**: `.claude/skill-library/security/defense-in-depth/SKILL.md`

- Layered security, principle of least privilege, attack surface reduction, zero trust

## Threat Modeling

**Business Context Discovery** (Phase 0): `.claude/skill-library/security/business-context-discovery/SKILL.md`

- Discovers business context, data classification, threat actors, compliance requirements, and security objectives before technical analysis - PASTA Stage 1

**Codebase Sizing** (Phase 1.0): `.claude/skill-library/security/codebase-sizing/SKILL.md`

- Assesses codebase size before Phase 1, counts files per component, categorizes as small/medium/large, outputs sizing-report.json with parallelization strategy

**Codebase Mapping** (Phase 1): `.claude/skill-library/security/codebase-mapping/SKILL.md`

- Systematic codebase analysis for threat modeling, identifies architecture, components, data flows, entry points, trust boundaries

**Security Controls Mapping** (Phase 2): `.claude/skill-library/security/security-controls-mapping/SKILL.md`

- Maps security controls to STRIDE categories, identifies authentication, authorization, validation, cryptography, logging controls and gaps

**Threat Modeling** (Phase 3): `.claude/skill-library/security/threat-modeling/SKILL.md`

- Combines STRIDE, PASTA, and DFD principles to identify threats, generate abuse cases, create attack trees, and produce risk-scored threat intelligence

**CVSS Scoring** (Phase 3 Scoring): `.claude/skill-library/security/cvss-scoring/SKILL.md`

- Scores threats with CVSS 3.1/4.0, guides version selection, Base metric assessment for theoretical threats, Temporal/Threat scoring, Environmental metrics from Phase 0 business context

**Security Test Planning** (Phase 4): `.claude/skill-library/security/security-test-planning/SKILL.md`

- Converts threat models into prioritized code review targets, SAST/DAST/SCA recommendations, and threat-driven manual test cases

## Usage Examples

### Example 1: Security Architect Designing Auth System

```
1. Invoke gateway: skill: "gateway-security"
2. Load ALL ROLES skills:
   Read(".claude/skill-library/security/defense-in-depth/SKILL.md")
   Read(".claude/skill-library/security/auth-implementation-patterns/SKILL.md")
3. Load THREAT MODELING skills for architecture:
   Read(".claude/skill-library/security/business-context-discovery/SKILL.md")
   Read(".claude/skill-library/security/threat-modeling/SKILL.md")
   Read(".claude/skill-library/security/cvss-scoring/SKILL.md")
4. Design auth architecture following patterns
```

### Example 2: Developer Implementing Secret Storage

```
1. Invoke gateway: skill: "gateway-security"
2. Load ALL ROLES skills:
   Read(".claude/skill-library/security/defense-in-depth/SKILL.md")
   Read(".claude/skill-library/security/auth-implementation-patterns/SKILL.md")
3. Load SECURITY IMPLEMENTATION skills:
   Read(".claude/skill-library/security/secrets-management/SKILL.md")
   Read(".claude/skill-library/security/discover-cryptography/SKILL.md")
4. Implement secret storage following patterns
```

## Quick Reference

**⭐ = Mandatory for ALL ROLES | 🛡️ = Mandatory for THREAT MODELING | 🔍 = Mandatory for SECURITY REVIEW | 🔒 = Mandatory for SECURITY IMPLEMENTATION**

| Need                           | Skill Path                                                             |
| ------------------------------ | ---------------------------------------------------------------------- |
| ⭐ Defense patterns            | `.claude/skill-library/security/defense-in-depth/SKILL.md`             |
| ⭐ Auth/RBAC basics            | `.claude/skill-library/security/auth-implementation-patterns/SKILL.md` |
| 🛡️ Business context (Phase 0)  | `.claude/skill-library/security/business-context-discovery/SKILL.md`   |
| 🛡️ Codebase sizing (Phase 1.0) | `.claude/skill-library/security/codebase-sizing/SKILL.md`              |
| 🛡️ Codebase mapping (Phase 1)  | `.claude/skill-library/security/codebase-mapping/SKILL.md`             |
| 🛡️ Controls mapping (Phase 2)  | `.claude/skill-library/security/security-controls-mapping/SKILL.md`    |
| 🛡️ Threat modeling (Phase 3)   | `.claude/skill-library/security/threat-modeling/SKILL.md`              |
| 🛡️ CVSS scoring (Phase 3)      | `.claude/skill-library/security/cvss-scoring/SKILL.md`                 |
| 🛡️ Test planning (Phase 4)     | `.claude/skill-library/security/security-test-planning/SKILL.md`       |
| 🔍 Authorization testing       | `.claude/skill-library/security/authorization-testing/SKILL.md`        |
| 🔍 Secret scanner              | `.claude/skill-library/security/secret-scanner/SKILL.md`               |
| 🔒 Secrets management          | `.claude/skill-library/security/secrets-management/SKILL.md`           |
| 🔒 Cryptography                | `.claude/skill-library/security/discover-cryptography/SKILL.md`        |

## When to Use This Gateway

Use this gateway skill when:

- Designing security architecture or threat modeling
- Implementing authentication or authorization features
- Working with secrets, credentials, or API keys
- Adding encryption or cryptographic operations
- Reviewing code for security vulnerabilities
- Planning security testing strategies

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Quick Decision Guide

**What are you trying to do?**

```
Security architecture? (Security Lead/Architect role)
├── Starting threat model → business-context-discovery 🛡️
├── Understanding codebase → codebase-sizing 🛡️ + codebase-mapping 🛡️
├── Mapping existing controls → security-controls-mapping 🛡️
├── Identifying threats → threat-modeling 🛡️ + cvss-scoring 🛡️
├── Planning security tests → security-test-planning 🛡️
└── General security design → defense-in-depth ⭐

Implementing security features? (Developer role)
├── Storing secrets → secrets-management 🔒
├── Encryption/hashing → discover-cryptography 🔒
├── Authentication → auth-implementation-patterns ⭐
└── Authorization → auth-implementation-patterns ⭐

Reviewing for security? (Security Reviewer role)
├── Testing access controls → authorization-testing 🔍
├── Scanning for secrets → secret-scanner 🔍
└── Understanding auth → auth-implementation-patterns ⭐

General security knowledge?
└── Security principles → defense-in-depth ⭐
```

## Troubleshooting

### "Skill not found" or "Cannot read file"

**Problem:** Read tool returns error about missing file.

**Solutions:**

1. **Verify path exactly** - Copy the full path from this gateway
2. **Check nested folders** - Paths have `/security/` folder: `.claude/skill-library/security/...`
3. **Don't shorten paths** - Must include all folders
4. **Case-sensitive** - Match capitalization exactly

### "Which skill should I use?"

**Problem:** Multiple skills seem relevant.

**Solutions:**

1. **Start with mandatory** - Load ALL ROLES skills first
2. **Follow phases** - Threat modeling has sequential phases (0 → 1.0 → 1 → 2 → 3 → 4)
3. **Check Quick Reference table** - Maps common needs to skills
4. **Use decision tree** - Follow the Quick Decision Guide above

### "Skill doesn't cover my use case"

**Problem:** Loaded skill doesn't address your specific scenario.

**Solutions:**

1. **Check related skills** - Skills often reference other skills for advanced cases
2. **Combine skills** - Load multiple complementary skills
3. **Try Defense in Depth** - Applies broadly to security architecture

### "I'm still confused about core vs library"

**Quick reference:**

- **Core skills** (~35): In `.claude/skills/` → Use `skill: "name"`
- **Library skills** (~120): In `.claude/skill-library/` → Use `Read("full/path")`
- **This gateway**: Core skill that helps you find library skills
- **Rule**: If path contains `skill-library`, you MUST use Read tool

## Related Gateways

Other domain gateways you can invoke via Skill tool:

| Gateway      | Invoke With                     | Use For                                           |
| ------------ | ------------------------------- | ------------------------------------------------- |
| Frontend     | `skill: "gateway-frontend"`     | React, TypeScript, UI components                  |
| Backend      | `skill: "gateway-backend"`      | Go, AWS Lambda, DynamoDB, Infrastructure          |
| Testing      | `skill: "gateway-testing"`      | API tests, E2E, Mocking, Performance              |
| MCP Tools    | `skill: "gateway-mcp-tools"`    | Linear, Praetorian CLI, Context7, Chrome DevTools |
| Integrations | `skill: "gateway-integrations"` | Third-party APIs, Jira, HackerOne, MS Defender    |
