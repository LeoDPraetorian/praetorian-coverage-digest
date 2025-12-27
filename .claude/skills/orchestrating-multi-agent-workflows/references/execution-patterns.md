# Execution Patterns

Detailed examples of sequential, parallel, and hybrid execution patterns for multi-agent orchestration.

## Sequential Pattern

**Use when:** Later steps depend on earlier decisions.

### Example: API Endpoint Implementation

```
Phase 1: Architecture
└─> backend-architect designs API contract, database schema
    Output: OpenAPI spec, DynamoDB table design

Phase 2: Infrastructure (depends on architecture)
└─> aws-infrastructure-specialist creates CloudFormation
    Input: Architecture decisions from Phase 1
    Output: Deployed stack

Phase 3: Implementation (depends on infrastructure)
└─> backend-developer implements handler
    Input: Architecture + Infrastructure details
    Output: Working handler code

Phase 4: Unit Tests (depends on implementation)
└─> backend-tester writes tests
    Input: Handler location, patterns used
    Output: Test file with coverage

Phase 5: Acceptance Tests (depends on implementation)
└─> acceptance-test-engineer writes E2E tests
    Input: API endpoint, expected behavior
    Output: Integration test file
```

**Key characteristics:**

- Each phase waits for previous to complete
- Context flows forward through phases
- Errors caught early prevent wasted work downstream

## Parallel Pattern

**Use when:** Tasks are independent and can be explored simultaneously.

### Example: Testing Phase After Implementation

```
                        ┌─ frontend-unit-test-engineer ────────┐
                        │  Task: Component unit tests          │
                        │  Output: 12 tests, 95% coverage      │
                        │                                      │
Implementation ─────────┼─ frontend-integration-test-engineer ─┼─> Synthesize
(complete)              │  Task: MSW API integration tests     │    Results
                        │  Output: 8 tests, API contracts      │
                        │                                      │
                        └─ frontend-e2e-test-engineer ─────────┘
                           Task: Playwright user flows
                           Output: 5 E2E scenarios
```

**Implementation in Claude Code:**

```typescript
// CORRECT: All three agents spawn in a single message
Task(
  "frontend-unit-test-engineer",
  `
  Create unit tests for AssetFilter component.
  Location: src/sections/assets/components/AssetFilter.tsx
  Cover: rendering, filter selection, loading states
`
);
Task(
  "frontend-integration-test-engineer",
  `
  Create MSW integration tests for asset filtering API.
  Endpoints: GET /my?resource=asset&status=...
  Cover: success responses, error handling, pagination
`
);
Task(
  "frontend-e2e-test-engineer",
  `
  Create Playwright E2E tests for asset filtering workflow.
  User flow: Navigate to assets → Apply filters → Verify results
`
);
```

**Key characteristics:**

- All agents receive context simultaneously
- Agents work in parallel (no waiting)
- Results synthesized after all complete
- Check for conflicts before integration

## Hybrid Pattern

**Use when:** Some phases sequential, others can parallelize.

### Example: Feature Implementation with Testing

```
Phase 1: Architecture (sequential)
└─> frontend-architect
    Decision: Tier 2 component pattern with Zustand state

Phase 2: Implementation (sequential - depends on architecture)
└─> frontend-developer
    Creates: Component, hook, API integration

Phase 3: Testing (PARALLEL - independent of each other)
    ┌─ frontend-unit-test-engineer
    │  Input: Component location, Zustand store
    │
    ├─ frontend-integration-test-engineer
    │  Input: API endpoints, query patterns
    │
    └─ frontend-e2e-test-engineer
       Input: User flows to validate

Phase 4: Quality (sequential - after all tests pass)
└─> frontend-reviewer
    Reviews: All files from phases 1-3
```

**Phase transitions:**

```
Phases 1-2: Sequential
  - Must complete in order
  - Context flows forward

Phase 3: Parallel
  - All test agents spawn together
  - Single message with 3 Task calls
  - Wait for all to complete

Phase 4: Sequential
  - Runs after synthesis
  - Has access to all prior outputs
```

## Choosing the Right Pattern

| Scenario                   | Pattern    | Why                                                        |
| -------------------------- | ---------- | ---------------------------------------------------------- |
| New feature end-to-end     | Hybrid     | Architecture → Implementation sequential, Testing parallel |
| Bug fix with tests         | Sequential | Fix first, then verify                                     |
| Multiple test types needed | Parallel   | Tests don't depend on each other                           |
| Security + Quality review  | Parallel   | Independent assessments                                    |
| Refactoring with migration | Sequential | Each step depends on previous                              |

## Pattern Selection Flowchart

```
Start with task requirements
         │
         ▼
┌─────────────────────────────┐
│ Does phase B need output    │──Yes──> Sequential
│ from phase A?               │
└─────────────────────────────┘
         │ No
         ▼
┌─────────────────────────────┐
│ Would phases conflict       │──Yes──> Sequential
│ (edit same files)?          │
└─────────────────────────────┘
         │ No
         ▼
┌─────────────────────────────┐
│ Can phases be understood    │──No───> Sequential
│ independently?              │
└─────────────────────────────┘
         │ Yes
         ▼
      Parallel
```

## Synthesis After Parallel Execution

When parallel agents return, synthesis requires:

1. **Collect all outputs** - Wait for every agent to complete
2. **Check for conflicts** - Did multiple agents edit same files?
3. **Resolve conflicts** - If yes, decide which changes to keep
4. **Run verification** - Full test suite with all changes
5. **Document results** - Update TodoWrite, note any issues

### Conflict Resolution

```markdown
Agent 1 (unit tests) modified: src/components/Filter.tsx (added test IDs)
Agent 2 (e2e tests) modified: src/components/Filter.tsx (different test IDs)

Resolution options:

1. Keep Agent 1's changes, re-run Agent 2 with new context
2. Merge manually (inspect both changesets)
3. Spawn integration agent to resolve
```

## Real Example: Job Processing Pipeline

**User request:** "Implement job processing pipeline with retry logic and full test coverage"

### Phase 1: Architecture (sequential)

```
Spawn: backend-architect
Task: Design job processing with retry patterns
Expected: Queue design, retry strategy, failure handling

Result:
- SQS with DLQ for failures
- Exponential backoff: 1s, 2s, 4s, 8s
- Max 3 retries before DLQ
```

### Phase 2: Infrastructure (sequential)

```
Spawn: aws-infrastructure-specialist
Task: Create SQS queues and DLQ
Context: Architecture from Phase 1

Result:
- job-processing-queue created
- job-processing-dlq created
- CloudFormation deployed
```

### Phase 3: Implementation (sequential)

```
Spawn: backend-developer
Task: Implement job processor with retry
Context: Architecture + Infrastructure

Result:
- pkg/jobs/processor.go created
- Retry logic with backoff
- DLQ routing on failure
```

### Phase 4: Testing (PARALLEL)

```
// Single message, all spawn together
Task("backend-tester", "Unit tests for processor.go...")
Task("backend-tester", "SQS integration tests...")
Task("acceptance-test-engineer", "E2E job workflow tests...")

Results (collected after all complete):
- Unit: 15 tests, 92% coverage
- Integration: 8 tests, SQS mocking
- E2E: 5 scenarios, real queues
```

### Phase 5: Quality (sequential)

```
Spawn: backend-reviewer
Task: Review all implementation
Context: All files from phases 1-4

Result: Approved, minor suggestions for logging
```

**Total execution:**

- Phases 1-3: Sequential (dependencies)
- Phase 4: Parallel (3 agents concurrent)
- Phase 5: Sequential (needs all test results)

**Time comparison:**

- Sequential all phases: ~45 minutes agent time
- Hybrid with parallel testing: ~30 minutes agent time
- Savings: ~33% from parallel test execution
