---
name: gateway-backend
description: Use when developing backend applications - access Go, AWS, Infrastructure, and Integration patterns.
allowed-tools: Read
---

# Backend Development Gateway

## How to Use

This skill serves as a master directory for all backend development skills in the Chariot platform. When you need backend guidance:

1. **Identify the skill you need** from the categorized list below
2. **Use the Read tool** with the provided path to load the skill
3. **Do not guess paths** - always use the exact paths shown

Each skill is organized by domain for easy discovery.

## Go Development

**Go Errgroup Concurrency**: `.claude/skill-library/development/backend/go-errgroup-concurrency/SKILL.md`
- Concurrent operations with errgroup, goroutine patterns, error aggregation

**Burp DAST Integration**: `.claude/skill-library/development/backend/burp-integration/SKILL.md`
- Burp Suite GraphQL API integration, scan lifecycle management, site provisioning, result processing

## Error Handling

**Error Handling Patterns**: `.claude/skill-library/development/error-handling-patterns/SKILL.md`
- Error wrapping, context propagation, custom error types

## Code Quality Metrics

**Analyzing Cyclomatic Complexity**: `.claude/skill-library/quality/analyzing-cyclomatic-complexity/SKILL.md`
- Measures decision logic complexity, identifies refactoring candidates, sets quality gates for CI/CD

## Database & Persistence

**Neo4j Cypher Guide**: `.claude/skill-library/development/neo4j-cypher-guide/SKILL.md`
- Graph database queries, Cypher patterns, relationship modeling

## Cloud Infrastructure

**Cloud Advanced Patterns**: `.claude/skill-library/infrastructure/cloud-advanced-patterns/SKILL.md`
- Multi-region architecture, disaster recovery, high availability

**Cloud Cost Optimization**: `.claude/skill-library/infrastructure/cloud-cost-optimization/SKILL.md`
- Cost analysis, resource optimization, budget management

**Lambda vs EC2 Decisions**: `.claude/skill-library/infrastructure/cloud-lambda-vs-ec2-decisions/SKILL.md`
- Compute decision framework, serverless vs container trade-offs

## Security

**Auth Implementation Patterns**: `.claude/skill-library/security/auth-implementation-patterns/SKILL.md`
- JWT, OAuth, session management, role-based access control

**Defense in Depth**: `.claude/skill-library/security/defense-in-depth/SKILL.md`
- Layered security, principle of least privilege, attack surface reduction

**Secrets Management**: `.claude/skill-library/security/secrets-management/SKILL.md`
- Credential storage, secret rotation, secure configuration

**Secret Scanner**: `.claude/skill-library/security/secret-scanner/SKILL.md`
- Detecting hardcoded secrets, credential scanning patterns

**Discover Cryptography**: `.claude/skill-library/security/discover-cryptography/SKILL.md`
- Encryption patterns, key management, cryptographic best practices

## API Integration

**Integration Chariot Patterns**: `.claude/skill-library/development/integrations/integration-chariot-patterns/SKILL.md`
- Chariot-specific API patterns and platform integration

**Integration First Testing**: `.claude/skill-library/testing/integration-first-testing/SKILL.md`
- Testing external API integrations, contract testing

**Integration Step Validator**: `.claude/skill-library/development/integrations/integration-step-validator/SKILL.md`
- Validating integration workflows and multi-step processes

## Development Practices

**Bash Defensive Patterns**: `.claude/skill-library/development/bash-defensive-patterns/SKILL.md`
- Safe shell scripting, error handling, input validation

## Quick Reference

| Need | Read This Skill |
|------|----------------|
| Concurrent Go code | go-errgroup-concurrency |
| Burp Suite integration | burp-integration |
| Error handling | error-handling-patterns |
| Code complexity metrics | analyzing-cyclomatic-complexity |
| Graph database queries | neo4j-cypher-guide |
| Cloud architecture | cloud-advanced-patterns |
| Cost optimization | cloud-cost-optimization |
| Serverless decisions | cloud-lambda-vs-ec2-decisions |
| Authentication | auth-implementation-patterns |
| Security layers | defense-in-depth |
| Secret management | secrets-management |
| API integration | integration-chariot-patterns |
| Shell scripts | bash-defensive-patterns |

## When to Use This Gateway

Use this gateway skill when:
- Starting backend development work
- Unsure which backend skill to use
- Need overview of available backend resources
- Want to discover relevant patterns for your task

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Related Gateways

- **gateway-testing**: Testing patterns (API testing, mocking, performance)
- **gateway-frontend**: Frontend patterns (for full-stack work)
- **gateway-mcp-tools**: External API calls (Linear, Praetorian CLI, Context7)
