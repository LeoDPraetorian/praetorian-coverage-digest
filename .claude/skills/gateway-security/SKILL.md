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

## Quick Reference

| Need | Read This Skill |
|------|----------------|
| JWT/OAuth implementation | auth-implementation-patterns |
| Testing access controls | authorization-testing |
| Storing secrets securely | secrets-management |
| Finding hardcoded creds | secret-scanner |
| Encryption/hashing | discover-cryptography |
| Security architecture | defense-in-depth |

## When to Use This Gateway

Use this gateway skill when:
- Implementing authentication or authorization features
- Working with secrets, credentials, or API keys
- Adding encryption or cryptographic operations
- Reviewing code for security vulnerabilities
- Designing security architecture

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Security Review Workflow

When doing security work, consider this sequence:

1. **Architecture**: Start with `defense-in-depth` for design principles
2. **Auth**: Use `auth-implementation-patterns` for identity management
3. **Secrets**: Apply `secrets-management` for credential handling
4. **Validation**: Run `authorization-testing` to verify controls
5. **Scan**: Use `secret-scanner` before committing code

## Related Gateways

- **gateway-backend**: Backend patterns (includes some security)
- **gateway-testing**: Testing patterns (for security test automation)
