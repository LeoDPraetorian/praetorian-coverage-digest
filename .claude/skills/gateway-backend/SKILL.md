---
name: gateway-backend
description: Routes backend tasks to library skills. Intent detection + progressive loading.
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

# Gateway: Backend

Routes backend tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~400 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                                                                                          | Route To                                 |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| "errgroup" / "concurrent" / "goroutine"                                                              | → `go-errgroup-concurrency`              |
| "semaphore" / "worker pool" / "rate limit" / "bounded concurrency"                                   | → `implementing-go-semaphore-pools`      |
| "GraphQL" / "batch queries" / "cursor pagination" / "GitHub API" / "GitLab API" / "Azure DevOps API" | → `implementing-graphql-clients`         |
| "Burp" / "DAST" / "GraphQL scan"                                                                     | → `burp-integration`                     |
| "Cognito" / "user pool" / "identity"                                                                 | → `aws-cognito`                          |
| "error" / "wrapping" / "context"                                                                     | → `error-handling-patterns`              |
| "complexity" / "cyclomatic" / "refactor"                                                             | → `analyzing-cyclomatic-complexity`      |
| "Neo4j" / "Cypher" / "graph"                                                                         | → `querying-neo4j-with-cypher`           |
| "cloud" / "multi-region" / "HA"                                                                      | → `cloud-advanced-patterns`              |
| "cost" / "optimization" / "budget"                                                                   | → `cloud-cost-optimization`              |
| "Lambda" / "EC2" / "serverless decision"                                                             | → `cloud-lambda-vs-ec2-decisions`        |
| "auth" / "JWT" / "OAuth"                                                                             | → `auth-implementation-patterns`         |
| "defense" / "layered security"                                                                       | → `defense-in-depth`                     |
| "secrets" / "credentials" / "vault"                                                                  | → `secrets-management`                   |
| "secret scan" / "leak detection"                                                                     | → `secret-scanner`                       |
| "encryption" / "crypto" / "KMS"                                                                      | → `discover-cryptography`                |
| "integration test" / "contract test"                                                                 | → `writing-integration-tests-first`      |
| "Python to Go" / "port" / "dependencies"                                                             | → `mapping-python-dependencies-to-go`    |
| "Python idioms" / "Go translation"                                                                   | → `translating-python-idioms-to-go`      |
| "port equivalence" / "testing"                                                                       | → `verifying-port-equivalence`           |
| "capability architecture" / "scanner"                                                                | → `enforcing-go-capability-architecture` |
| "Go structure" / "project layout" / "cmd pkg internal"                                               | → `structuring-go-projects`              |
| "Go CLI" / "pkg/runner" / "function order" / "early return" / "nesting"                              | → `go-best-practices`                    |
| "bash" / "shell script" / "defensive"                                                                | → `bash-defensive-patterns`              |
| "YAML" / "parse" / "template"                                                                        | → `yaml-master`                          |
| "Makefile" / "make target" / "build automation"                                                      | → `adhering-to-makefile-best-practices`  |
| "review" / "code quality" / "PR"                                                                     | → `reviewing-backend-implementations`    |
| "implement tests" / "test plan" / "Go test" / "testify"                                              | → `implementing-golang-tests`            |
| "architecture analysis" / "trace execution"                                                          | → `behavior-first-architecture-analysis` |
| "capability assessment" / "system design"                                                            | → `behavior-first-architecture-analysis` |
| "TypeScript" / "advanced patterns"                                                                   | → also invoke `gateway-typescript`       |
| "testing" (general)                                                                                  | → also invoke `gateway-testing`          |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### Go Development

| Skill                   | Path                                                                                 | Triggers                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Go Best Practices       | `.claude/skill-library/development/backend/go-best-practices/SKILL.md`               | Go CLI, pkg/runner, function order, early return, nesting                    |
| Errgroup Concurrency    | `.claude/skill-library/development/backend/go-errgroup-concurrency/SKILL.md`         | errgroup, concurrent, goroutine                                              |
| Semaphore Pools         | `.claude/skill-library/development/backend/implementing-go-semaphore-pools/SKILL.md` | semaphore, worker pool, rate limit, bounded concurrency, too many goroutines |
| Structuring Go Projects | `.claude/skill-library/development/backend/structuring-go-projects/SKILL.md`         | Go structure, project layout, cmd pkg internal, golang standards             |
| Burp Integration        | `.claude/skill-library/development/backend/burp-integration/SKILL.md`                | Burp, DAST, GraphQL scan                                                     |
| AWS Cognito             | `.claude/skill-library/development/backend/aws-cognito/SKILL.md`                     | Cognito, user pool, identity                                                 |

### Error Handling & Quality

| Skill                   | Path                                                                         | Triggers                         |
| ----------------------- | ---------------------------------------------------------------------------- | -------------------------------- |
| Error Handling Patterns | `.claude/skill-library/development/error-handling-patterns/SKILL.md`         | error, wrapping, context         |
| Cyclomatic Complexity   | `.claude/skill-library/development/analyzing-cyclomatic-complexity/SKILL.md` | complexity, cyclomatic, refactor |

### Database & Persistence

| Skill        | Path                                                                    | Triggers             |
| ------------ | ----------------------------------------------------------------------- | -------------------- |
| Neo4j Cypher | `.claude/skill-library/development/querying-neo4j-with-cypher/SKILL.md` | Neo4j, Cypher, graph |

### Cloud Infrastructure

| Skill                   | Path                                                                          | Triggers                   |
| ----------------------- | ----------------------------------------------------------------------------- | -------------------------- |
| Cloud Advanced Patterns | `.claude/skill-library/infrastructure/cloud-advanced-patterns/SKILL.md`       | cloud, multi-region, HA    |
| Cloud Cost Optimization | `.claude/skill-library/infrastructure/cloud-cost-optimization/SKILL.md`       | cost, optimization, budget |
| Lambda vs EC2 Decisions | `.claude/skill-library/infrastructure/cloud-lambda-vs-ec2-decisions/SKILL.md` | Lambda, EC2, serverless    |

### Security

| Skill              | Path                                                                   | Triggers                    |
| ------------------ | ---------------------------------------------------------------------- | --------------------------- |
| Auth Patterns      | `.claude/skill-library/security/auth-implementation-patterns/SKILL.md` | auth, JWT, OAuth            |
| Defense in Depth   | `.claude/skill-library/security/defense-in-depth/SKILL.md`             | defense, layered security   |
| Secrets Management | `.claude/skill-library/security/secrets-management/SKILL.md`           | secrets, credentials, vault |
| Secret Scanner     | `.claude/skill-library/security/secret-scanner/SKILL.md`               | secret scan, leak detection |
| Cryptography       | `.claude/skill-library/security/discover-cryptography/SKILL.md`        | encryption, crypto, KMS     |

### Integration & API

| Skill             | Path                                                                              | Triggers                                                                                           |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| GraphQL Clients   | `.claude/skill-library/development/backend/implementing-graphql-clients/SKILL.md` | GraphQL, batch queries, rate limiting, cursor pagination, GitHub API, GitLab API, Azure DevOps API |
| Integration Tests | `.claude/skill-library/testing/writing-integration-tests-first/SKILL.md`          | integration test, contract                                                                         |

### Go Testing

| Skill                     | Path                                                                        | Triggers                                     |
| ------------------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| Implementing Golang Tests | `.claude/skill-library/testing/backend/implementing-golang-tests/SKILL.md` | implement tests, test plan, Go test, testify |

### Go Porting

| Skill                      | Path                                                                                           | Triggers                      |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| Port Equivalence           | `.claude/skill-library/development/capabilities/verifying-port-equivalence/SKILL.md`           | port equivalence, testing     |
| Python Dependencies to Go  | `.claude/skill-library/development/capabilities/mapping-python-dependencies-to-go/SKILL.md`    | Python to Go, dependencies    |
| Python Idioms to Go        | `.claude/skill-library/development/capabilities/translating-python-idioms-to-go/SKILL.md`      | Python idioms, Go translation |
| Go Capability Architecture | `.claude/skill-library/development/capabilities/enforcing-go-capability-architecture/SKILL.md` | capability architecture       |

### Development Practices

| Skill                             | Path                                                                                     | Triggers                                |
| --------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| Bash Defensive Patterns           | `.claude/skill-library/development/shell/bash-defensive-patterns/SKILL.md`               | bash, shell, defensive                  |
| YAML Master                       | `.claude/skill-library/development/capabilities/yaml-master/SKILL.md`                    | YAML, parse, template                   |
| Makefile Best Practices           | `.claude/skill-library/development/backend/adhering-to-makefile-best-practices/SKILL.md` | Makefile, make target, build automation |
| Reviewing Backend Implementations | `.claude/skill-library/development/backend/reviewing-backend-implementations/SKILL.md`   | review, code quality, PR                |

### Architecture Analysis

| Skill                                | Path                                                                           | Triggers                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Behavior-First Architecture Analysis | `.claude/skill-library/analysis/behavior-first-architecture-analysis/SKILL.md` | architecture analysis, trace execution, capability assessment |

## Cross-Gateway Routing

| If Task Involves           | Also Invoke            |
| -------------------------- | ---------------------- |
| TypeScript, advanced types | `gateway-typescript`   |
| Testing patterns           | `gateway-testing`      |
| Frontend/React             | `gateway-frontend`     |
| Security patterns          | `gateway-security`     |
| Third-party integrations   | `gateway-integrations` |
| Capabilities, scanners     | `gateway-capabilities` |

## Loading Skills

**Path convention:** `.claude/skill-library/development/backend/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/development/backend/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.
