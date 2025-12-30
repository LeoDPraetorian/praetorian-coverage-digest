---
name: gateway-backend
description: Use when developing Go backend applications with AWS services (Lambda, DynamoDB, S3, SQS) - routes to library skills for serverless patterns, cloud infrastructure, security implementations, and third-party API integrations.
allowed-tools: Read
---

# Backend Development Gateway

## Understanding This Gateway

**This is a gateway skill in Chariot's two-tier skill architecture.**

The two-tier system organizes skills into:

- **Core skills** (~25 skills in `.claude/skills/`) - High-frequency skills auto-discovered by Claude Code's Skill tool
- **Library skills** (~120 skills in `.claude/skill-library/`) - Specialized skills loaded on-demand via Read tool

**Gateways are routing indices, not implementation guides.** They exist in core to help you discover and load library skills.

<IMPORTANT>
**Library skills cannot be invoked with the Skill tool.** You MUST use the Read tool to load them.

### Common Anti-Patterns

```go
// ❌ WRONG: Trying to use Skill tool for library skills
skill: "go-errgroup-concurrency"  // FAILS - library skills are NOT in Skill tool

// ❌ WRONG: Guessing or shortening paths
Read(".claude/skill-library/go-errgroup-concurrency/...")  // FAILS - wrong path structure

// ❌ WRONG: Using skill name instead of full path
Read("go-errgroup-concurrency")  // FAILS - must be full path

// ❌ WRONG: Looking in core /skills/ instead of /skill-library/
Read(".claude/skills/go-errgroup-concurrency/...")  // FAILS - library skills are NOT in /skills/
```

### Correct Patterns

```go
// ✅ CORRECT: Use gateway to find skill, then Read with FULL path
Read(".claude/skill-library/development/backend/go-errgroup-concurrency/SKILL.md")

// ✅ CORRECT: Copy path exactly as shown in this gateway
Read(".claude/skill-library/security/auth-implementation-patterns/SKILL.md")

// ✅ CORRECT: Core skills (this gateway) use Skill tool
skill: "gateway-backend"  // Core skills work with Skill tool
```

**Workflow:**

1. Invoke this gateway: `skill: "gateway-backend"`
2. Find the skill you need in the categorized list below
3. Copy the EXACT path shown (do not modify or shorten)
4. Use Read tool with that path
5. Follow the loaded skill's instructions

</IMPORTANT>

## How to Use

This skill serves as a master directory for all backend development skills in the Chariot platform. When you need backend guidance:

**Important:** You MUST use TodoWrite before starting to track all workflow steps.

1. **Identify the skill you need** from the categorized list below
2. **Use the Read tool** with the provided path to load the skill
3. **Do not guess paths** - always use the exact paths shown

Each skill is organized by domain for easy discovery.

## Go Development

**AWS Cognito**: `.claude/skill-library/development/backend/aws-cognito/SKILL.md`

- AWS Cognito integration patterns, user pools, identity federation

**Go Errgroup Concurrency**: `.claude/skill-library/development/backend/go-errgroup-concurrency/SKILL.md`

- Concurrent operations with errgroup, goroutine patterns, error aggregation

**Burp DAST Integration**: `.claude/skill-library/development/backend/burp-integration/SKILL.md`

- Burp Suite GraphQL API integration, scan lifecycle management, site provisioning, result processing

## Error Handling

**Error Handling Patterns**: `.claude/skill-library/development/error-handling-patterns/SKILL.md`

- Error wrapping, context propagation, custom error types

## Code Quality Metrics

**Analyzing Cyclomatic Complexity**: `.claude/skill-library/development/analyzing-cyclomatic-complexity/SKILL.md`

- Measures decision logic complexity, identifies refactoring candidates, sets quality gates for CI/CD

## Database & Persistence

**Neo4j Cypher Guide**: `.claude/skill-library/development/querying-neo4j-with-cypher/SKILL.md`

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

**Integration First Testing**: `.claude/skill-library/testing/writing-integration-tests-first/SKILL.md`

- Testing external API integrations, contract testing

**Integration Step Validator**: `.claude/skill-library/development/integrations/integration-step-validator/SKILL.md`

- Validating integration workflows and multi-step processes

## Go Porting

**Verifying Port Equivalence**: `.claude/skill-library/development/capabilities/verifying-port-equivalence/SKILL.md`

- Side-by-side testing framework for Python-to-Go ports, subprocess harness, comparison logic, macOS arm64 fixes

**Mapping Python Dependencies to Go**: `.claude/skill-library/development/capabilities/mapping-python-dependencies-to-go/SKILL.md`

- Systematic dependency research, web search workflow, Go equivalents for Python packages

**Translating Python Idioms to Go**: `.claude/skill-library/development/capabilities/translating-python-idioms-to-go/SKILL.md`

- Pattern dictionary for Python→Go translation, iter.Seq generators, interface patterns, Go 1.25+ features

**Enforcing Go Capability Architecture**: `.claude/skill-library/development/capabilities/enforcing-go-capability-architecture/SKILL.md`

- File organization for 100+ capabilities, tier-based structure, registry pattern, embedded resources

## Development Practices

**Bash Defensive Patterns**: `.claude/skill-library/development/shell/bash-defensive-patterns/SKILL.md`

- Safe shell scripting, error handling, input validation

**YAML Master**: `.claude/skill-library/development/shell/yaml-master/SKILL.md`

- YAML parsing, validation, templating, and generation patterns

**TypeScript Advanced**: `.claude/skill-library/development/typescript/typescript-advanced/SKILL.md`

- Advanced TypeScript patterns, utility types, conditional types, advanced generics

**TypeScript Command Interfaces**: `.claude/skill-library/development/typescript/typescript-command-interfaces/SKILL.md`

- CLI development patterns, command parsing, type-safe argument handling

**TypeScript Review**: `.claude/skill-library/development/typescript/typescript-review/SKILL.md`

- TypeScript code review patterns, best practices, anti-patterns

**TypeScript Workspace Packages**: `.claude/skill-library/development/typescript/structuring-workspace-packages/SKILL.md`

- npm workspace dependencies, package exports, named imports, bundler moduleResolution

## Quick Reference

| Need                           | Skill Path                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| Concurrent Go code             | `.claude/skill-library/development/backend/go-errgroup-concurrency/SKILL.md`                |
| Burp Suite integration         | `.claude/skill-library/development/backend/burp-integration/SKILL.md`                       |
| Error handling                 | `.claude/skill-library/development/error-handling-patterns/SKILL.md`                        |
| Code complexity metrics | `.claude/skill-library/development/analyzing-cyclomatic-complexity/SKILL.md`           |
| Graph database queries  | `.claude/skill-library/development/querying-neo4j-with-cypher/SKILL.md`                |
| Cloud architecture      | `.claude/skill-library/infrastructure/cloud-advanced-patterns/SKILL.md`                |
| Cost optimization       | `.claude/skill-library/infrastructure/cloud-cost-optimization/SKILL.md`                |
| Serverless decisions    | `.claude/skill-library/infrastructure/cloud-lambda-vs-ec2-decisions/SKILL.md`          |
| Authentication          | `.claude/skill-library/security/auth-implementation-patterns/SKILL.md`                 |
| Security layers         | `.claude/skill-library/security/defense-in-depth/SKILL.md`                             |
| Secret management       | `.claude/skill-library/security/secrets-management/SKILL.md`                           |
| API integration         | `.claude/skill-library/development/integrations/integration-chariot-patterns/SKILL.md` |
| Shell scripts           | `.claude/skill-library/development/shell/bash-defensive-patterns/SKILL.md`             |
| YAML parsing            | `.claude/skill-library/development/shell/yaml-master/SKILL.md`                         |
| TS advanced patterns    | `.claude/skill-library/development/typescript/typescript-advanced/SKILL.md`            |
| TS CLI development      | `.claude/skill-library/development/typescript/typescript-command-interfaces/SKILL.md`  |
| TS code review          | `.claude/skill-library/development/typescript/typescript-review/SKILL.md`              |
| TS workspace packages   | `.claude/skill-library/development/typescript/structuring-workspace-packages/SKILL.md` |

## When to Use This Gateway

Use this gateway skill when:

- Starting backend development work
- Unsure which backend skill to use
- Need overview of available backend resources
- Want to discover relevant patterns for your task

For specific implementations, always load the individual skill rather than working from this gateway alone.

## Related Gateways

- **gateway-integrations**: Third-party API integrations (Jira, Microsoft Defender, HackerOne)
- **gateway-testing**: Testing patterns (API testing, mocking, performance)
- **gateway-frontend**: Frontend patterns (for full-stack work)
- **gateway-mcp-tools**: External API calls (Linear, Praetorian CLI, Context7)
