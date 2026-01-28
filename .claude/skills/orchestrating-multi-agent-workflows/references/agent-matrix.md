# Agent Matrix

**Agent selection guide for multi-agent orchestration workflows.**

## Agent Type Matrix

| Type            | Discovery | Leads                        | Developers                             | Reviewers                            | Testers           | Validators    |
| --------------- | --------- | ---------------------------- | -------------------------------------- | ------------------------------------ | ----------------- | ------------- |
| **Frontend**    | Explore   | frontend-lead                | frontend-developer                     | frontend-reviewer, frontend-security | frontend-tester   | uiux-designer |
| **Backend**     | Explore   | backend-lead                 | backend-developer, python-developer    | backend-reviewer, backend-security   | backend-tester    | -             |
| **Full-stack**  | Explore   | frontend-lead + backend-lead | frontend-developer + backend-developer | All reviewers                        | All testers       | uiux-designer |
| **Capability**  | Explore   | capability-lead              | capability-developer                   | capability-reviewer                  | capability-tester | -             |
| **Integration** | Explore   | integration-lead             | integration-developer                  | backend-reviewer, backend-security   | backend-tester    | -             |
| **Tool/MCP**    | Explore   | tool-lead                    | tool-developer                         | tool-reviewer                        | tool-tester       | -             |

## Selection Rules

### Rule 1: Match Agents to Task Domain

**Frontend task** → Spawn frontend-lead, frontend-developer, frontend-reviewer, frontend-tester

**Backend task** → Spawn backend-lead, backend-developer, backend-reviewer, backend-tester

**Full-stack task** → Spawn ALL domain agents in parallel (frontend + backend)

### Rule 2: Full-Stack Tasks Spawn ALL Domain Agents

When a task involves BOTH frontend and backend:

```typescript
// WRONG: Spawn only one agent type
Task("frontend-developer", "Build asset management feature"); // Misses backend

// RIGHT: Spawn all relevant agents in parallel
Task("frontend-lead", "Design frontend architecture for asset management...");
Task("backend-lead", "Design backend API architecture for asset management...");

// After architecture approval:
Task("frontend-developer", "Implement asset management UI...");
Task("backend-developer", "Implement asset management API...");

// After implementation:
Task("frontend-reviewer", "Review UI implementation...");
Task("backend-reviewer", "Review API implementation...");
Task("frontend-tester", "Test UI...");
Task("backend-tester", "Test API...");
```

### Rule 3: Discovery Before Architecture

**Always spawn Explore agent first** for codebase discovery before architectural planning.

```typescript
// Phase 1: Discovery
Task("Explore", "Find existing asset management patterns...");

// Phase 2: Architecture (after discovery complete)
Task("frontend-lead", "Using discovery findings, design architecture...");
```

### Rule 4: Security Review for Sensitive Domains

**Always include security reviewer when:**

- Handling authentication/authorization
- Processing user input
- Interacting with external APIs
- Storing/transmitting sensitive data

```typescript
// Standard review
Task("frontend-reviewer", "Review asset list component...");

// Security-sensitive review (spawn both)
Task("frontend-reviewer", "Review login component...");
Task("frontend-security", "Security review of login component...");
```

## Agent Responsibilities

### Discovery Agents

- **Explore**: Fast codebase exploration, pattern discovery
- Output: Existing patterns, file locations, architectural insights

### Lead Agents

- **\*-lead**: Architecture, design decisions, implementation planning
- Output: Architecture diagrams, component breakdowns, task decomposition

### Developer Agents

- **\*-developer**: Implementation, bug fixes, feature development
- Output: Code changes, file modifications

### Reviewer Agents

- **\*-reviewer**: Code quality, best practices, maintainability
- **\*-security**: Security vulnerabilities, threat assessment
- Output: Approval/rejection, improvement recommendations

### Tester Agents

- **\*-tester**: Test creation, execution, coverage analysis
- Output: Test files, test results, coverage reports

### Validator Agents

- **uiux-designer**: UI/UX validation, accessibility (WCAG 2.1 AA)
- Output: Design feedback, accessibility issues

## Sequential vs Parallel Execution

### Always Sequential

1. Discovery → Architecture
2. Architecture → Implementation
3. Implementation → Review
4. Implementation → Testing
5. Testing → Validation

### Always Parallel (when both apply)

- Frontend Implementation ↔ Backend Implementation (no file overlap)
- Frontend Testing ↔ Backend Testing
- Code Review ↔ Security Review
- Unit Testing ↔ E2E Testing

## Specialized Workflows

For domain-specific workflows with detailed phase documentation, checkpoints, and P0 compliance requirements, see the dedicated orchestration skills:

| Domain       | Orchestration Skill                                                             | Invoke                                                                                 |
| ------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Features     | `orchestrating-feature-development`                                             | `Read(".claude/skill-library/development/orchestrating-feature-development/SKILL.md")` |
| Integrations | `orchestrating-integration-development`                                         | `Skill("orchestrating-integration-development")`                                       |
| Capabilities | `orchestrating-capability-development`                                          | `Skill("orchestrating-capability-development")`                                        |
| Fingerprintx | `orchestrating-nerva-development`                                        | `Skill("orchestrating-nerva-development")`                                      |
| MCP/Tools    | See `.claude/skill-library/claude/mcp-management/orchestrating-mcp-development` | `Read()` library skill                                                                 |

**This skill (orchestrating-multi-agent-workflows)** provides the foundational patterns that all specialized orchestrations inherit:

- Agent selection rules (this file)
- Delegation templates
- Feedback loops
- Context management
- Progress persistence

**The specialized orchestration skills** provide domain-specific:

- Phase sequences and checkpoints
- P0 compliance requirements
- Agent prompt templates
- Domain-specific validation

## Anti-Patterns

### ❌ Wrong: Single Agent for Full-Stack

```typescript
Task("frontend-developer", "Build complete asset management feature with API");
// Misses: backend architecture, backend review, backend tests
```

### ❌ Wrong: Skipping Discovery

```typescript
Task("frontend-lead", "Design architecture...");
// Should have run Explore first to find existing patterns
```

### ❌ Wrong: Sequential When Parallel Possible

```typescript
await Task("frontend-tester", "...");
await Task("backend-tester", "...");
// These are independent - should spawn in single message
```

### ✅ Right: Parallel Full-Stack with All Agents

```typescript
// Architecture phase (parallel leads)
Task("frontend-lead", "...");
Task("backend-lead", "...");

// Implementation phase (parallel developers)
Task("frontend-developer", "...");
Task("backend-developer", "...");

// Review phase (parallel reviewers)
Task("frontend-reviewer", "...");
Task("backend-reviewer", "...");
Task("frontend-security", "...");
Task("backend-security", "...");
```

## Effort Scaling

| Complexity   | Agents | Pattern                                                                              |
| ------------ | ------ | ------------------------------------------------------------------------------------ |
| Simple       | 1-2    | Single lead + developer                                                              |
| Medium       | 3-5    | Lead + developer + reviewer + tester                                                 |
| Complex      | 6-10   | Full pipeline (discovery, architecture, implementation, review, testing, validation) |
| Very Complex | 10+    | Full-stack with parallel execution across all phases                                 |

See [effort-scaling.md](effort-scaling.md) for detailed tier definitions.
