---
name: gateway-security
description: Use when implementing security features, performing threat modeling, or testing security controls - access Auth, Secrets, Cryptography, Defense, and Threat Modeling patterns for authentication, authorization, encryption, vulnerability analysis, and security testing.
allowed-tools: Read
---

# Security Gateway

## Understanding This Gateway

This is a **gateway skill** that routes you to specialized library skills. The Chariot platform uses a two-tier skill system:

1. **Core Skills** (~25): High-frequency skills in `.claude/skills/` - invoked with `skill: "name"`
2. **Library Skills** (~120): Specialized skills in `.claude/skill-library/` - loaded with `Read` tool

This gateway helps you discover security library skills. **You cannot invoke library skills with the Skill tool** - you must use the Read tool with the full path.

**Invoking this gateway:**

```
skill: "gateway-security"
```

<IMPORTANT>
**Library skills cannot be invoked with the Skill tool.** You MUST use the Read tool to load them.

### Common Anti-Patterns

```bash
# ❌ WRONG: Trying to use Skill tool for library skills
skill: "auth-implementation-patterns"  # FAILS - library skills are NOT in Skill tool

# ❌ WRONG: Guessing or shortening paths
Read(".claude/skill-library/auth-implementation-patterns/...")  # FAILS - missing nested folders

# ❌ WRONG: Using skill name instead of full path
Read("auth-implementation-patterns")  # FAILS - must be full path

# ❌ WRONG: Looking in core /skills/ instead of /skill-library/
Read(".claude/skills/auth-implementation-patterns/...")  # FAILS - library skills are NOT in /skills/

# ✅ CORRECT: Full path to library skill
Read(".claude/skill-library/security/auth-implementation-patterns/SKILL.md")
```

</IMPORTANT>

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

**Codebase Mapping** (Phase 1): `.claude/skill-library/security/codebase-mapping/SKILL.md`

- Systematic codebase analysis for threat modeling, identifies architecture, components, data flows, entry points, trust boundaries

**Security Controls Mapping** (Phase 2): `.claude/skill-library/security/security-controls-mapping/SKILL.md`

- Maps security controls to STRIDE categories, identifies authentication, authorization, validation, cryptography, logging controls and gaps

**Threat Modeling** (Phase 3): `.claude/skill-library/security/threat-modeling/SKILL.md`

- Combines STRIDE, PASTA, and DFD principles to identify threats, generate abuse cases, create attack trees, and produce risk-scored threat intelligence

**Security Test Planning** (Phase 4): `.claude/skill-library/security/security-test-planning/SKILL.md`

- Converts threat models into prioritized code review targets, SAST/DAST/SCA recommendations, and threat-driven manual test cases

## Quick Reference

| Need                     | Skill Path                                                             |
| ------------------------ | ---------------------------------------------------------------------- |
| JWT/OAuth implementation | `.claude/skill-library/security/auth-implementation-patterns/SKILL.md` |
| Testing access controls  | `.claude/skill-library/security/authorization-testing/SKILL.md`        |
| Storing secrets securely | `.claude/skill-library/security/secrets-management/SKILL.md`           |
| Finding hardcoded creds  | `.claude/skill-library/security/secret-scanner/SKILL.md`               |
| Encryption/hashing       | `.claude/skill-library/security/discover-cryptography/SKILL.md`        |
| Security architecture    | `.claude/skill-library/security/defense-in-depth/SKILL.md`             |
| Threat modeling Phase 0  | `.claude/skill-library/security/business-context-discovery/SKILL.md`   |
| Threat modeling Phase 1  | `.claude/skill-library/security/codebase-mapping/SKILL.md`             |
| Threat modeling Phase 2  | `.claude/skill-library/security/security-controls-mapping/SKILL.md`    |
| Threat modeling Phase 3  | `.claude/skill-library/security/threat-modeling/SKILL.md`              |
| Threat modeling Phase 4  | `.claude/skill-library/security/security-test-planning/SKILL.md`       |

## Concrete Use Case Examples

### Example 1: Adding JWT Authentication to an API

**Scenario**: You need to implement JWT-based authentication for a new REST API endpoint.

**Steps**:

1. Load the auth skill: `Read(".claude/skill-library/security/auth-implementation-patterns/SKILL.md")`
2. Follow the JWT token generation patterns
3. Implement token validation middleware
4. Add refresh token handling

### Example 2: Rotating API Keys in Production

**Scenario**: Your application has hardcoded API keys that need to be moved to secure storage.

**Steps**:

1. First, scan for secrets: `Read(".claude/skill-library/security/secret-scanner/SKILL.md")`
2. Then implement secure storage: `Read(".claude/skill-library/security/secrets-management/SKILL.md")`
3. Follow the rotation patterns for zero-downtime migration

### Example 3: Full Threat Model for a New Feature

**Scenario**: You're adding a payment processing feature and need a complete security assessment.

**Steps**:

1. Start with business context (Phase 0): `Read(".claude/skill-library/security/business-context-discovery/SKILL.md")`
2. Map the codebase (Phase 1): `Read(".claude/skill-library/security/codebase-mapping/SKILL.md")`
3. Identify existing controls (Phase 2): `Read(".claude/skill-library/security/security-controls-mapping/SKILL.md")`
4. Model threats (Phase 3): `Read(".claude/skill-library/security/threat-modeling/SKILL.md")`
5. Generate test plan (Phase 4): `Read(".claude/skill-library/security/security-test-planning/SKILL.md")`

## Troubleshooting Guide

**"Which skill for API key rotation?"**
→ Use `secrets-management` for rotation patterns, then `secret-scanner` to verify no keys remain hardcoded

**"Which skill for RBAC implementation?"**
→ Use `auth-implementation-patterns` for role-based access control patterns

**"Which skill for encrypting sensitive data at rest?"**
→ Use `discover-cryptography` for encryption patterns and key management

**"Which skill for security code review?"**
→ Start with `defense-in-depth` for principles, then use `authorization-testing` for verification

**"Which skill for compliance requirements?"**
→ Use `business-context-discovery` (Phase 0) which includes compliance requirement mapping

**"Which skill for identifying attack vectors?"**
→ Use `threat-modeling` (Phase 3) which includes attack tree generation and STRIDE analysis

## When to Use This Gateway

Use this gateway skill when:

- Implementing authentication or authorization features
- Working with secrets, credentials, or API keys
- Adding encryption or cryptographic operations
- Reviewing code for security vulnerabilities
- Designing security architecture
- Performing threat modeling on codebases

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Security Review Workflow

**You MUST use TodoWrite before starting to track all steps.** Security work involves multiple phases that must be completed systematically - mental tracking leads to missed steps.

When doing security work, consider this sequence:

1. **Threat Model Phase 0**: Start with `business-context-discovery` to understand business purpose, crown jewels, threat actors, and compliance requirements
2. **Threat Model Phase 1**: Use `codebase-mapping` to understand attack surface and technical architecture
3. **Threat Model Phase 2**: Use `security-controls-mapping` to identify existing controls and gaps
4. **Threat Model Phase 3**: Use `threat-modeling` to identify threats and abuse cases
5. **Threat Model Phase 4**: Use `security-test-planning` to generate prioritized test plans
6. **Architecture**: Use `defense-in-depth` for design principles
7. **Auth**: Use `auth-implementation-patterns` for identity management
8. **Secrets**: Apply `secrets-management` for credential handling
9. **Validation**: Run `authorization-testing` to verify controls
10. **Scan**: Use `secret-scanner` before committing code

**Why TodoWrite is mandatory**: This 10-step workflow is complex. Skipping steps (especially Phase 0 business context or Phase 4 test planning) leads to incomplete security assessments. Track each phase explicitly.

## Related Gateways

- **gateway-backend**: Backend patterns (includes some security)
- **gateway-testing**: Testing patterns (for security test automation)
