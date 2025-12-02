---
name: detecting-task-domains
description: Use when analyzing implementation tasks to determine which development domains (React/Go/Python/YAML) and agents to spawn - handles ambiguous descriptions with confidence scores, detects keywords for domain classification, and identifies implementation vs testing order.
allowed-tools: Read, Write, Bash
---

# Task Domain Detection

## Overview

Analyze implementation task descriptions to determine which technical domains and specialized agents apply. Provide transparent domain classification with confidence scores, handle ambiguity by suggesting multiple agent options, and abstract specific technologies to generic domains.

## When to Use

Use when:
- User requests feature implementation ("add authentication", "create dashboard", "set up CI/CD")
- Task description is ambiguous about domains (unclear if frontend/backend/both)
- Need to determine which specialized agents to spawn
- Task mentions specific technologies that need abstraction to domains (PostgreSQL → database architecture)
- Must choose between multiple potential agents (go-developer vs go-api-developer)

## Core Domains in Chariot Development Platform

### Frontend Domains

| Domain | Keywords | Agent | Confidence Indicators |
|--------|----------|-------|----------------------|
| **React Components** | component, page, UI, dashboard, form, button, dropdown | react-developer | HIGH if `.tsx` files, UI/UX requirements |
| **React State/Hooks** | hook, state, context, query, cache | react-developer | HIGH if state management mentioned |
| **React Architecture** | component design, patterns, performance | react-architect | HIGH if architecture decisions needed |

### Backend Domains

| Domain | Keywords | Agent | Confidence Indicators |
|--------|----------|-------|----------------------|
| **Go API** | endpoint, REST API, handler, middleware, Lambda | go-api-developer | HIGH if HTTP handlers, routes mentioned |
| **Go Architecture** | service design, patterns, concurrency | go-architect | HIGH if architecture decisions needed |
| **Python CLI** | CLI, command-line, script, tool | python-developer | HIGH if CLI tool or script |

### Infrastructure Domains

| Domain | Keywords | Agent | Confidence Indicators |
|--------|----------|-------|----------------------|
| **YAML Config** | GitHub Actions, CI/CD pipeline, workflow, .yml | yaml-developer | HIGH if workflow files mentioned |
| **Makefile** | build, dependencies, targets, automation | makefile-developer | HIGH if build system updates |
| **DevOps** | CI/CD, deployment, pipeline automation | devops-automator | HIGH if infrastructure automation |
| **AWS Infrastructure** | CloudFormation, Lambda, DynamoDB, staging | aws-infrastructure-specialist | HIGH if AWS resources involved |

### Database Domains

| Domain | Keywords | Agent | Confidence Indicators |
|--------|----------|-------|----------------------|
| **Database Schema** | table, schema, migration, foreign keys | database-architect | HIGH regardless of specific technology (PostgreSQL/MySQL/etc.) |
| **Neo4j Graph** | relationships, graph, nodes, Cypher | database-neo4j-architect | HIGH if graph relationships |
| **DynamoDB** | DynamoDB, single-table, partition key | go-api-developer | HIGH if DynamoDB single-table design |

### Testing Domains

| Domain | When to Identify | Agent | Critical Rule |
|--------|------------------|-------|---------------|
| **Backend Unit Tests** | After backend implementation | backend-unit-test-engineer | ONLY after code written |
| **Backend Integration Tests** | After API/service integration | backend-integration-test-engineer | ONLY after code written |
| **Frontend Unit Tests** | After React component/hook implementation | frontend-unit-test-engineer | ONLY after code written |
| **Frontend Integration Tests** | After API integration in frontend | frontend-integration-test-engineer | ONLY after code written |
| **E2E Browser Tests** | After feature implementation | frontend-e2e-browser-test-engineer | ONLY after code written |

**CRITICAL**: Test agents spawn AFTER implementation agents. Never spawn test agents first.

## Domain Classification Process

### Step 1: Identify All Mentioned Domains

Read task description and extract:
- Explicit domain mentions ("backend API", "frontend component")
- Technology keywords ("WebSocket", "GitHub Actions", "dropdown")
- File type clues (".tsx", ".go", ".yml", "Makefile")

### Step 2: Abstract Technologies to Domains

**Do NOT block on specific technologies.** Abstract to generic domains:

| Specific Technology | Abstract to Domain | Agent |
|-------------------|-------------------|-------|
| PostgreSQL | Database schema architecture | database-architect |
| MySQL | Database schema architecture | database-architect |
| MongoDB | Database schema architecture | database-architect |
| GitHub Actions | YAML configuration + DevOps | yaml-developer, devops-automator |
| CloudFormation | YAML configuration + AWS | yaml-developer, aws-infrastructure-specialist |
| WebSocket | Backend API + Frontend client | go-api-developer, react-developer |

**Example**: Task says "PostgreSQL table" but Chariot uses DynamoDB:
- ❌ WRONG: Block and say "PostgreSQL not in Chariot stack"
- ✅ CORRECT: Abstract to "database schema architecture" → spawn appropriate database architect

### Step 3: Handle Ambiguous Keywords

Some keywords appear in multiple domains. Use context to disambiguate:

| Keyword | Context Clues | Likely Domain |
|---------|---------------|---------------|
| **"API"** | "frontend hook", "useQuery", "fetch" | Frontend (API client) |
| **"API"** | "endpoint", "handler", "Lambda" | Backend (API server) |
| **"database"** | "query", "schema", "migration" | Database architecture |
| **"database"** | "DynamoDB client", "query builder" | Backend implementation |
| **"testing"** | After implementation mentioned | Testing domain |
| **"testing"** | "CI/CD", "pipeline", "PR checks" | DevOps + YAML |

### Step 4: Determine Full-Stack vs Single-Domain

**CRITICAL**: Always explicitly state whether a task is FULL-STACK, FRONTEND-ONLY, or BACKEND-ONLY.

| Pattern | Classification | Agents |
|---------|----------------|--------|
| "Add authentication" | **FULL-STACK** (no qualifier) | go-api-developer + react-developer |
| "Add login page" | **FRONTEND-ONLY** (UI focus) | react-developer |
| "Add /auth endpoint" | **BACKEND-ONLY** (API focus) | go-api-developer |
| "API already exists" | **FRONTEND-ONLY** (backend done) | react-developer |
| "Frontend will call API" | **BACKEND-ONLY** (frontend done) | go-api-developer |

**Default for ambiguous requests**: Assume FULL-STACK unless explicitly stated otherwise.

**Example explicit declarations**:
```
Task: "Add authentication to platform"
Classification: FULL-STACK (both frontend AND backend required)
Confidence: MEDIUM (70%) - typical authentication requires both login UI and API endpoints
Agents: security-architect, go-api-developer, react-developer
```

### Step 5: Assign Confidence Scores with Explicit Reasoning

For each domain identified, provide confidence level WITH reasoning:

- **HIGH (90-100%)**: Explicit mention, clear requirements, unambiguous keywords
- **MEDIUM (60-89%)**: Inferred from context, reasonable assumption, some ambiguity
- **LOW (30-59%)**: Speculative, minimal context, high ambiguity

**Template for confidence scores**:
```
[Domain]: [CONFIDENCE]% ([reasoning with keywords and context])
```

**Example**:
```
Task: "Add filter dropdown to assets page. Backend API already supports filtering."

Domain Classification:
- React/Frontend: HIGH (95%) - Explicit UI keywords ("dropdown", "assets page") + existing filter patterns in codebase
- Go/Backend: LOW (10%) - Explicit statement "Backend API already exists" means no backend work needed
- Testing: MEDIUM (70%) - Implementation implies tests needed after, but not explicitly mentioned
```

### Step 6: Choose Specific vs Generic Agents

**CRITICAL**: Always prefer specific agents over generic agents.

| When | Generic Agent (❌ Avoid) | Specific Agent (✅ Prefer) |
|------|-------------------------|---------------------------|
| Simple CRUD API | go-developer | **go-api-developer** |
| Complex architecture | backend-architect | **go-architect** |
| Standard React component | frontend-developer | **react-developer** |
| React state/hooks | frontend-developer | **react-developer** |
| Database schema | backend-developer | **database-architect** |
| CLI tool | backend-developer | **python-developer** |
| CI/CD workflows | devops-automator | **yaml-developer** + devops-automator |

**Why prefer specific agents**: They have domain expertise, understand platform patterns, and provide better implementations.

**Chariot-specific naming**:
- ✅ Use "react-developer" NOT "frontend-developer" (Chariot is React-based)
- ✅ Use "go-api-developer" NOT "backend-developer" (Chariot backend is Go)
- ✅ Use "python-developer" NOT "cli-developer" (Chariot CLI is Python)

## Implementation vs Testing Order

**CRITICAL RULE**: Implementation agents ALWAYS spawn before test agents. NEVER mix phases.

### Correct Workflow (Strict Phase Separation)

```
Phase 1: Implementation ONLY
- Spawn domain-specific agents (react-developer, go-api-developer, etc.)
- Write feature code
- Commit changes
- Phase 1 MUST complete before Phase 2 starts

Phase 2: Testing ONLY (AFTER Phase 1 complete)
- Spawn test agents (frontend-unit-test-engineer, backend-unit-test-engineer, etc.)
- Write tests for implemented code
- Validate coverage
```

### Incorrect Workflow (What to Avoid)

```
❌ WRONG: Spawn test agents first
❌ WRONG: Spawn test agents in parallel with implementation agents
❌ WRONG: Mix implementation and testing in same phase
❌ WRONG: List test agents in "Phase 2" of implementation plan

Example of WRONG approach:
Phase 1 (Parallel):
  - go-api-developer
  - react-developer
Phase 2 (Parallel):
  - makefile-developer
  - backend-unit-test-engineer  ❌ WRONG - testing in implementation plan
```

**Correct approach**:
```
✅ Implementation Plan:
Phase 1: go-api-developer, react-developer (parallel)
Phase 2: makefile-developer (sequential)

✅ Testing Plan (SEPARATE - after implementation):
Phase 1: backend-unit-test-engineer, frontend-unit-test-engineer (parallel)
Phase 2: frontend-e2e-browser-test-engineer (sequential)
```

**Why**: Tests validate implemented code. Can't test what doesn't exist yet. Mixing phases causes confusion about what spawns when.

## Multi-Domain Task Handling

For tasks spanning multiple domains, use parallel execution:

### Example: Real-time Notifications

```
Task: "Add real-time notifications when scans complete"
Requirements:
- Backend sends notifications via WebSocket
- Frontend displays toast notifications
- Update Makefile for WebSocket dependencies

Classification:
1. Go/Backend: HIGH (95%) - WebSocket server
2. React/Frontend: HIGH (95%) - Toast notifications
3. Makefile: HIGH (90%) - Dependency management

Execution Plan:
Phase 1 (Parallel):
  - go-api-developer (WebSocket server)
  - react-developer (Toast UI)

Phase 2 (Sequential - after Phase 1):
  - makefile-developer (Dependencies)

Phase 3 (Parallel - after code committed):
  - backend-unit-test-engineer
  - frontend-unit-test-engineer
  - frontend-e2e-browser-test-engineer
```

**Key**: Independent domains execute in parallel. Dependent domains execute sequentially.

## Confidence Score Examples

### Example 1: High Confidence

```
Task: "Create a dashboard component showing security metrics"

Domain Classification:
- React/Frontend: HIGH (98%)
  - Reason: "dashboard component" explicitly frontend
  - Keywords: "component", "showing" (UI verb)
  - Agent: react-developer

- Testing: MEDIUM (75%)
  - Reason: Implied by implementation
  - Agent: frontend-unit-test-engineer (AFTER implementation)
```

### Example 2: Medium Confidence

```
Task: "Add authentication to the platform"

Domain Classification:
- Go/Backend: MEDIUM (70%)
  - Reason: Authentication usually requires backend
  - Ambiguity: Could be OAuth (backend) or UI-only (frontend)
  - Agent: go-api-developer

- React/Frontend: MEDIUM (70%)
  - Reason: Login UI typically needed
  - Ambiguity: Could be backend-only API with external UI
  - Agent: react-developer

- Security Architecture: HIGH (90%)
  - Reason: Authentication is security-critical
  - Agent: security-architect (spawn FIRST for architecture)

Recommendation: Assume FULL-STACK (spawn both) unless user clarifies
```

### Example 3: Low Confidence with Alternatives

```
Task: "Set up database for user comments"

Domain Classification:
- Database Architecture: HIGH (95%)
  - Reason: "database" and "schema" keywords
  - Agent Options:
    1. database-neo4j-architect (if graph relationships)
    2. database-architect (if relational schema)
    3. go-api-developer (if DynamoDB single-table)
  - Confidence: Cannot determine specific DB without context

- Backend Implementation: LOW (40%)
  - Reason: Schema design may not need immediate implementation
  - Agent: go-api-developer (ONLY if API also needed)

Recommendation: Ask user which database type, OR default to Chariot standard (DynamoDB)
```

## Common Mistakes to Avoid

| Mistake | Problem | Solution |
|---------|---------|----------|
| **Spawning test agents first** | Can't test non-existent code | Spawn implementation agents FIRST, then test agents |
| **Blocking on technology mismatch** | "PostgreSQL not in Chariot" stops progress | Abstract to "database schema" domain |
| **Missing YAML domain** | GitHub Actions uses YAML | Always identify YAML for workflow files |
| **No confidence scores** | Unclear how certain classification is | Always provide HIGH/MEDIUM/LOW with percentages |
| **Ignoring "API already exists"** | Spawns unnecessary backend agents | Read explicit statements carefully |
| **Single agent for full-stack** | Only spawns frontend OR backend | Default to BOTH unless explicitly single-domain |

## Quick Reference: Task Patterns

| Task Description | Likely Domains | Agents | Confidence |
|-----------------|----------------|--------|------------|
| "Add [feature] page" | Frontend | react-developer | HIGH |
| "Create /api/[endpoint]" | Backend | go-api-developer | HIGH |
| "Add authentication" | Full-stack | go-api-developer, react-developer, security-architect | MEDIUM |
| "Set up CI/CD pipeline" | DevOps, YAML | devops-automator, yaml-developer | HIGH |
| "Add [X] table" | Database | database-architect (abstract technology) | HIGH |
| "Update Makefile" | Build system | makefile-developer | HIGH |
| "Add filter dropdown (API exists)" | Frontend-only | react-developer | HIGH |
| "Real-time [feature]" | Full-stack (WebSocket) | go-api-developer, react-developer | HIGH |

## Decision Tree: Full-Stack vs Single-Domain

```
Is the task explicitly frontend-only (UI component, page, styling)?
  YES → Frontend-only (react-developer)
  NO → Continue

Is the task explicitly backend-only (API endpoint, handler, service)?
  YES → Backend-only (go-api-developer)
  NO → Continue

Does task mention "API already exists" or "backend done"?
  YES → Frontend-only (react-developer)
  NO → Continue

Does task mention "UI done" or "frontend ready"?
  YES → Backend-only (go-api-developer)
  NO → Continue

Task is ambiguous?
  → Default to FULL-STACK (spawn both frontend AND backend agents)
```

## Classification Template

Use this template for every task analysis:

```markdown
## Task Analysis: "[Task Description]"

### Domain Classification

1. **[Domain Name]**: [CONFIDENCE]%
   - **Keywords**: [relevant keywords from task]
   - **Reasoning**: [why this domain applies]
   - **Agent**: [specific agent name]
   - **Alternatives**: [other agent options if applicable]

2. **[Domain Name]**: [CONFIDENCE]%
   - **Keywords**: [relevant keywords]
   - **Reasoning**: [why this domain applies]
   - **Agent**: [specific agent name]

### Execution Plan

**Phase 1** ([Parallel/Sequential]):
- [agent-name]: [specific task]
- [agent-name]: [specific task]

**Phase 2** ([Parallel/Sequential]):
- [agent-name]: [specific task]

### Rationale

[Explain WHY this classification and execution plan was chosen]
```

## Summary

**Core Principles**:
1. Provide confidence scores (HIGH/MEDIUM/LOW) for transparency
2. Abstract specific technologies to generic domains
3. Default to FULL-STACK for ambiguous requests
4. Spawn implementation agents BEFORE test agents
5. Identify YAML domain for infrastructure files
6. Use parallel execution for independent domains
7. Offer alternatives when confidence is low

**Goal**: Eliminate classification uncertainty, prevent blocked progress, and ensure correct agent selection for every implementation task.
