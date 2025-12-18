---
name: gateway-security
description: Use when implementing security features - access Auth, Secrets, Cryptography, and Defense patterns.
allowed-tools: Read
---

# Security Gateway

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

| Need | Read This Skill |
|------|----------------|
| JWT/OAuth implementation | auth-implementation-patterns |
| Testing access controls | authorization-testing |
| Storing secrets securely | secrets-management |
| Finding hardcoded creds | secret-scanner |
| Encryption/hashing | discover-cryptography |
| Security architecture | defense-in-depth |
| Threat modeling Phase 0 (business context) | business-context-discovery |
| Threat modeling Phase 1 (architecture) | codebase-mapping |
| Threat modeling Phase 2 (controls) | security-controls-mapping |
| Threat modeling Phase 3 (threats) | threat-modeling |
| Threat modeling Phase 4 (test plan) | security-test-planning |

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

## Related Gateways

- **gateway-backend**: Backend patterns (includes some security)
- **gateway-testing**: Testing patterns (for security test automation)
