---
name: codebase-mapping
description: Use when mapping codebases for threat modeling - identifies architecture, components, data flows, entry points, and trust boundaries for any technology stack
allowed-tools: Read, Write, Grep, Glob, Bash, TodoWrite
---

# Codebase Mapping

**Systematic methodology for analyzing any codebase to produce structured security artifacts for threat modeling.**

## When to Use

Use this skill when:
- Performing Phase 1 of threat modeling (architecture understanding)
- Analyzing an unfamiliar codebase for security assessment
- Need to identify attack surface (entry points, data flows, trust boundaries)
- Preparing structured input for STRIDE/PASTA threat analysis
- Analyzing a component for handoff to security controls mapping

**You MUST use TodoWrite** to track progress through all 6 workflow steps.

---

## Phase 0 Context (Required Inputs)

**This skill is Phase 1 of threat modeling. It MUST load Phase 0 business context to prioritize analysis.**

### What Phase 0 Provides

Phase 0 (Business Context Discovery) produces:
- **Crown jewels** - Most sensitive assets that drive prioritization (60% effort on components handling them)
- **Compliance requirements** - Regulations that determine required controls
- **Threat actors** - Relevant attacker profiles that guide attack surface mapping

**Without Phase 0**: All components analyzed equally (security theater).
**With Phase 0**: Analysis focused on protecting what matters most (risk management).

### Required Files

**Load before Step 1**:
- `../phase-0/summary.md` - Quick business context overview
- `../phase-0/data-classification.json` - Crown jewels for component prioritization

**Error Handling**: If Phase 0 files missing, skill MUST error and instruct user to run `business-context-discovery` skill first.

### For Complete Phase 0 Integration Details

**See [references/phase-0-integration.md](references/phase-0-integration.md)** for:
- Crown jewel prioritization strategy (60/30/10 split)
- Component JSON schema with `handles_crown_jewels` flag
- Summary generation with business context reference
- Testing scenarios and error handling patterns
- Complete examples for all three prioritization tiers

---

## Critical Rules

### This is Formal Threat Modeling, Not a Quick Security Scan

**If you're under time pressure:**
- ✅ Reduce SCOPE (analyze fewer components)
- ✅ Request deadline extension
- ✅ Communicate you need X hours for proper methodology
- ❌ Skip steps or produce unstructured output

**Why structured artifacts are non-negotiable:**
- Phase 2 (security controls mapping) requires `entry-points.json` and `components/*.json`
- Phase 3 (threat modeling) requires `data-flows.json` and `trust-boundaries.json`
- Phase 4 (test planning) requires all artifacts to prioritize testing
- Downstream phases CANNOT work without these inputs

### Expertise Does Not Replace Methodology

**Common rationalizations to avoid:**
- ❌ "I've seen this stack before, I know where vulnerabilities are"
- ❌ "Quick grep for auth/password/secret is faster than full mapping"
- ❌ "Summary.md is sufficient, JSON artifacts are overhead"
- ❌ "Being pragmatic means adapting the process"

**Reality:**
- Expertise identifies vulnerability CATEGORIES, not codebase-specific instances
- Quick scans find obvious issues, miss subtle architectural flaws
- JSON artifacts enable machine processing and downstream automation
- Pragmatic means "right process for the context" - this IS threat modeling context

### If You Don't Have Time for All 6 Steps

**You don't have time for threat modeling.**

**NOT acceptable alternatives:**
- ❌ "30-minute architectural survey" - This isn't architecture documentation
- ❌ "Quick scan for obvious issues" - This isn't vulnerability scanning
- ❌ "Partial mapping without artifacts" - This breaks downstream phases
- ❌ "Honest about limitations" - Incomplete Phase 1 = failed threat model

**The ONLY acceptable responses to time pressure:**
1. **Tell stakeholders**: "Threat modeling requires X hours. I can deliver [date]. Meeting should be rescheduled."
2. **Reduce scope**: "I can complete threat model for [single component] in available time. Full codebase requires more time."
3. **Different workflow**: "For urgent needs, I recommend security review (different process) instead of threat modeling."

**Why "just be honest about limitations" doesn't work:**
- Downstream phases REQUIRE the structured artifacts
- Incomplete Phase 1 creates false confidence in Phase 2-4 outputs
- "Quick architectural survey" is a different deliverable, not a partial threat model

**This skill is specifically for Phase 1 of formal threat modeling. Use it completely or not at all.**

---

## Quick Reference

| Step | Purpose | Output |
|------|---------|--------|
| 1. Technology Detection | Identify languages, frameworks, infrastructure | `manifest.json` |
| 2. Component Identification | Map logical components and boundaries | `components/*.json` |
| 3. Entry Point Discovery | Find attack surface (APIs, UI, CLI, webhooks) | `entry-points.json` |
| 4. Data Flow Mapping | Trace how data moves through system | `data-flows.json` |
| 5. Trust Boundary Identification | Find where security controls must exist | `trust-boundaries.json` |
| 6. Summary Generation | Compress findings for handoff (<2000 tokens) | `summary.md` |

---

## Core Workflow

### Step 1: Technology Detection

**Goal**: Identify the technology stack without assumptions.

**Detection Heuristics** (check in order):

| Indicator File | Technology | Framework Detection |
|----------------|------------|---------------------|
| `package.json` | Node.js/TypeScript | Check dependencies for React, Express, Next.js, etc. |
| `go.mod` | Go | Check for gin, echo, fiber, aws-lambda-go |
| `requirements.txt` / `pyproject.toml` | Python | Check for Flask, Django, FastAPI |
| `Cargo.toml` | Rust | Check for actix, rocket, axum |
| `pom.xml` / `build.gradle` | Java | Check for Spring, Quarkus |
| `Dockerfile` | Containerized | Parse for base image hints |
| `serverless.yml` / `template.yaml` | Serverless | AWS SAM, Serverless Framework |
| `terraform/` / `*.tf` | Infrastructure as Code | Cloud provider detection |

**Commands**:
```bash
# Find all indicator files
find {scope} -name "package.json" -o -name "go.mod" -o -name "requirements.txt" \
  -o -name "Cargo.toml" -o -name "Dockerfile" -o -name "*.tf" 2>/dev/null

# Detect primary language by file count
find {scope} -type f \( -name "*.go" -o -name "*.ts" -o -name "*.tsx" \
  -o -name "*.py" -o -name "*.rs" -o -name "*.java" \) | \
  sed 's/.*\.//' | sort | uniq -c | sort -rn | head -5
```

**Output**: `manifest.json` with detected stack

---

### Step 2: Component Identification

**Goal**: Map logical components and their responsibilities, prioritized by crown jewel handling from Phase 0.

**Prioritization Strategy** (from Phase 0 crown jewels):
- **Tier 1 (60% effort)**: Components handling crown jewels
- **Tier 2 (30% effort)**: External interfaces and auth boundaries
- **Tier 3 (10% effort)**: Supporting infrastructure

**See [references/phase-0-integration.md](references/phase-0-integration.md)** for complete prioritization logic, component JSON schema with `handles_crown_jewels` flag, and examples.

**Component Types to Identify**:

| Type | Indicators | Security Relevance |
|------|------------|-------------------|
| **Frontend** | React/Vue/Angular, static assets, UI routes | XSS, CSRF, client-side storage |
| **Backend API** | HTTP handlers, REST/GraphQL endpoints | Injection, AuthN/AuthZ, rate limiting |
| **Database Layer** | ORM models, SQL queries, NoSQL operations | SQL injection, data exposure |
| **Authentication** | Auth middleware, token handling, session mgmt | Credential theft, session hijacking |
| **External Integrations** | API clients, webhooks, third-party SDKs | SSRF, secret exposure, trust issues |
| **Infrastructure** | IaC files, deployment configs | Misconfiguration, privilege escalation |
| **Background Jobs** | Queue processors, cron jobs, workers | Privilege abuse, DoS |

**Directory Heuristics**:
```bash
# Common component directory patterns
ls -d {scope}/*/ 2>/dev/null | grep -E "(api|backend|frontend|ui|web|cmd|pkg|internal|src|lib|services|handlers|controllers|models|database|auth|infra)"
```

**Output**: `components/{component-name}.json` for each identified component

---

### Step 3: Entry Point Discovery

**Goal**: Identify all ways external actors can interact with the system (attack surface).

**Entry Point Categories**:

| Category | Detection Pattern | Risk Level |
|----------|-------------------|------------|
| **HTTP Endpoints** | Route definitions, handler functions | High - direct user input |
| **GraphQL** | Schema definitions, resolvers | High - complex queries |
| **WebSocket** | WS handlers, real-time connections | High - persistent connections |
| **CLI Commands** | Main functions, cobra/click commands | Medium - local execution |
| **Message Queues** | SQS/Kafka/RabbitMQ consumers | Medium - internal trust |
| **Scheduled Jobs** | Cron expressions, Lambda schedules | Low - no direct input |
| **File Uploads** | Multipart handlers, S3 presigned URLs | High - arbitrary content |

**Detection Commands by Stack**:

```bash
# Go - find HTTP handlers
grep -rn "func.*http.HandlerFunc\|\.HandleFunc\|\.GET\|\.POST\|\.PUT\|\.DELETE" {scope}

# TypeScript/Express - find route definitions
grep -rn "app\.\(get\|post\|put\|delete\|patch\)\|router\.\(get\|post\|put\|delete\)" {scope}

# Python/Flask/FastAPI - find route decorators
grep -rn "@app\.route\|@router\.\(get\|post\|put\|delete\)" {scope}

# GraphQL - find resolvers
grep -rn "Query:\|Mutation:\|Resolver" {scope}
```

**Output**: `entry-points.json` with categorized entry points

---

### Step 4: Data Flow Mapping

**Goal**: Trace how data moves through the system.

**Data Flow Elements**:

| Element | What to Find | Security Concern |
|---------|--------------|------------------|
| **Data Sources** | User input, external APIs, file uploads | Input validation |
| **Data Stores** | Databases, caches, file systems, S3 | Data at rest encryption |
| **Data Sinks** | External APIs, logs, exports, responses | Data leakage |
| **Transformations** | Serialization, encoding, encryption | Injection points |
| **Transport** | HTTP, gRPC, message queues | Data in transit encryption |

**Detection Patterns**:

```bash
# Database operations
grep -rn "SELECT\|INSERT\|UPDATE\|DELETE\|\.find\|\.create\|\.update\|\.delete\|dynamodb\|mongo" {scope}

# External API calls
grep -rn "http\.Client\|axios\|fetch\|requests\.\(get\|post\)\|urllib" {scope}

# File operations
grep -rn "os\.Open\|ioutil\|fs\.\(read\|write\)\|open\(" {scope}

# Logging (potential data exposure)
grep -rn "log\.\|console\.log\|print\|logger\." {scope}
```

**Output**: `data-flows.json` mapping source → transformation → sink

---

### Step 5: Trust Boundary Identification

**Goal**: Find where trust levels change (where security controls MUST exist).

**Common Trust Boundaries**:

| Boundary | Location | Required Controls |
|----------|----------|-------------------|
| **Internet → Application** | Load balancer, API Gateway | WAF, rate limiting, TLS |
| **User → Backend** | Authentication layer | AuthN, session management |
| **Backend → Database** | Data access layer | AuthZ, input validation |
| **Service → Service** | Internal APIs | Service authentication |
| **Application → External** | Third-party integrations | Secret management, validation |
| **Privileged → Unprivileged** | Admin functions | Role-based access control |

**Detection Patterns**:

```bash
# Authentication/Authorization middleware
grep -rn "auth\|middleware\|guard\|policy\|permission\|role\|jwt\|token\|session" {scope}

# Network boundaries (infrastructure)
grep -rn "vpc\|subnet\|security.group\|firewall\|ingress\|egress" {scope}

# Service-to-service auth
grep -rn "api.key\|service.account\|iam\|assume.role" {scope}
```

**Output**: `trust-boundaries.json` with boundary definitions

---

### Step 6: Summary Generation

**Goal**: Compress all findings into <2000 tokens for downstream handoff.

**Summary Template**:

```markdown
# Codebase Analysis Summary

## Technology Stack
- Primary Language: {detected}
- Frameworks: {list}
- Infrastructure: {cloud/on-prem/hybrid}

## Components ({count})
- {component-1}: {brief description}
- {component-2}: {brief description}

## Attack Surface
- Entry Points: {count} ({breakdown by type})
- External Integrations: {count}
- Data Stores: {count}

## Key Trust Boundaries
1. {boundary-1}: {location}
2. {boundary-2}: {location}

## Security-Relevant Findings
- {finding-1}
- {finding-2}

## Recommended Focus Areas for Threat Modeling
1. {area-1}
2. {area-2}
```

**Output**: `summary.md` (<2000 tokens)

---

## Output Artifacts

All outputs go to: `.claude/.threat-model/{session}/phase-1/`

| File | Purpose | Consumer |
|------|---------|----------|
| `manifest.json` | Technology stack detection | All phases |
| `architecture.md` | Human-readable architecture | Review checkpoint |
| `components/*.json` | Per-component analysis | Phase 2 (controls mapping) |
| `entry-points.json` | Attack surface inventory | Phase 3 (threat modeling) |
| `data-flows.json` | Data movement map | Phase 3 (threat modeling) |
| `trust-boundaries.json` | Security boundary map | Phase 3 (threat modeling) |
| `summary.md` | Compressed handoff (<2000 tokens) | Orchestrator, next phase |

See [references/output-schemas.md](references/output-schemas.md) for complete JSON schemas.

---

## Critical Rules

### DO
- ✅ Detect technology dynamically - never assume stack
- ✅ Use grep/glob for discovery - don't rely on conventions
- ✅ Verify findings with file reads - grep can miss context
- ✅ Keep summary under 2000 tokens - essential for handoff
- ✅ Document uncertainty - "possibly X" is better than wrong assertion

### DON'T
- ❌ Hardcode technology-specific patterns - skill must be generic
- ❌ Skip entry point discovery - this IS the attack surface
- ❌ Trust directory names alone - verify with file content
- ❌ Include full file contents in summary - compress to key findings
- ❌ Analyze code quality - focus on security-relevant structure

---

## Parallelization Strategy

For large codebases (>50 files), parallelize by component:

```
Orchestrator spawns:
├── Task("codebase-mapper", "Analyze component: frontend/")
├── Task("codebase-mapper", "Analyze component: backend/")
├── Task("codebase-mapper", "Analyze component: infrastructure/")
└── Consolidates results into unified artifacts
```

Each parallel instance:
1. Receives scope (single component directory)
2. Runs Steps 1-5 on that scope
3. Returns component-specific artifacts
4. Orchestrator merges into unified view

---

## Handling Large Codebases

**Problem**: Codebases >100k LOC exceed context windows.

**Solution**: Hierarchical analysis with sampling.

| Codebase Size | Strategy |
|---------------|----------|
| < 1,000 files | Analyze all files directly |
| 1,000 - 10,000 files | Analyze by component, sample within |
| > 10,000 files | Directory heuristics + anchor files + targeted sampling |

**Anchor Files** (always analyze):
- Configuration: `package.json`, `go.mod`, `Dockerfile`, `*.tf`
- Entry points: `main.*`, `index.*`, `app.*`, `server.*`
- Security: `auth*`, `middleware*`, `security*`, `*policy*`
- Schema: `schema.*`, `models/*`, `types/*`

---

## Troubleshooting

**Problem**: No entry points detected
**Solution**: Check for framework-specific patterns not in detection list. Add custom grep for the specific framework.

**Problem**: Too many files to analyze
**Solution**: Use sampling strategy. Focus on anchor files and entry points.

**Problem**: Polyglot codebase
**Solution**: Run technology detection per directory, not just root. Map which components use which stack.

**Problem**: Monorepo structure
**Solution**: Treat each package/module as separate component. Look for workspace configuration (`pnpm-workspace.yaml`, `go.work`).

---

## References

- [references/output-schemas.md](references/output-schemas.md) - Complete JSON schemas for all artifacts
- [references/detection-patterns.md](references/detection-patterns.md) - Extended detection patterns by language
- [references/dfd-principles.md](references/dfd-principles.md) - Data Flow Diagram methodology

## Related Skills

- `business-context-discovery` - Phase 0: REQUIRED before this skill - discovers crown jewels, compliance requirements, threat actors
- `security-controls-mapping` - Phase 2: Maps security controls to components
- `threat-modeling` - Phase 3: STRIDE + PASTA threat identification
- `security-test-planning` - Phase 4: Generates security test plan
