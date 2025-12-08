# Progress File Format

Structure for persisting orchestration progress across sessions.

> **Note:** For complete progress persistence patterns including when to create, update, and cleanup progress files, see the `persisting-progress-across-sessions` skill.

## File Location

```
.claude/progress/<domain>-<feature-name>.md

Examples:
- .claude/progress/frontend-asset-filtering.md
- .claude/progress/backend-job-processing.md
- .claude/progress/fullstack-user-auth.md
```

## File Structure

```markdown
# Orchestration: <Feature Name>

## Status: in_progress | complete | blocked
## Started: <ISO timestamp>
## Last Updated: <ISO timestamp>

## Overview

Brief description of what this orchestration is accomplishing.

---

## Completed Phases

- [x] **Phase 1: Architecture** - <result summary>
  - Agent: backend-architect
  - Completed: <timestamp>
  - Key decisions: [list]

- [x] **Phase 2: Implementation** - <result summary>
  - Agent: backend-developer
  - Completed: <timestamp>
  - Files created: [list]

## Current Phase

- [ ] **Phase 3: Testing** - <what's in progress>
  - Agent: backend-unit-test-engineer (in progress)
  - Started: <timestamp>
  - Notes: [any context]

## Pending Phases

- [ ] **Phase 4: Code Review**
- [ ] **Phase 5: Security Review**

---

## Context for Resume

Critical information needed to resume from current phase:

### Architecture Decisions
- Pattern: Microservices with separate auth service
- Database: DynamoDB single-table with GSI for user lookups
- Queue: SQS with DLQ for async processing

### Key File Paths
- Handler: pkg/handler/handlers/asset/create.go
- Service: pkg/service/asset/service.go
- Tests: pkg/handler/handlers/asset/create_test.go

### API Endpoints
- POST /api/assets - Create asset
- GET /api/assets/:id - Get asset
- PUT /api/assets/:id - Update asset

### Dependencies
- Depends on: AuthService (must be deployed first)
- Blocks: Frontend integration

### Blockers
- None currently
- OR: Waiting for [specific thing]

---

## Agent Outputs

### backend-architect (completed)
```json
{
  "status": "complete",
  "summary": "Designed microservices architecture with separate auth",
  "decisions": {
    "pattern": "microservices",
    "database": "DynamoDB single-table",
    "auth": "JWT with Cognito"
  }
}
```

### backend-developer (completed)
```json
{
  "status": "complete",
  "summary": "Implemented CreateAsset handler with validation",
  "files_created": [
    "pkg/handler/handlers/asset/create.go",
    "pkg/service/asset/service.go"
  ],
  "tests_passing": true
}
```

### backend-unit-test-engineer (in_progress)
```json
{
  "status": "in_progress",
  "started": "2024-01-15T10:30:00Z",
  "partial_output": "Created 8/15 tests..."
}
```

---

## Error Log

### 2024-01-15T10:45:00Z - Test Failure
- Phase: Testing
- Agent: backend-unit-test-engineer
- Error: Mock configuration incorrect for DynamoDB
- Resolution: Updated mock setup, re-running tests

---

## Notes

Any additional context that would help future sessions:
- User prefers detailed commit messages
- Should use existing auth patterns from pkg/auth/
- Performance target: <100ms response time
```

## Minimal Progress File

For simpler orchestrations, a minimal format:

```markdown
# Orchestration: <Feature Name>

## Status: in_progress
## Last Updated: <timestamp>

## Completed
- [x] Architecture - Tier 2 component pattern
- [x] Implementation - AssetFilter.tsx created

## Current
- [ ] Testing - Unit tests in progress

## Context
- Component: src/sections/assets/components/AssetFilter.tsx
- API: GET /my?resource=asset&status=...

## Agent Output (latest)
{last agent's JSON output}
```

## Progress File Lifecycle

### Creation
Create at orchestration start when:
- Task spans 3+ phases
- Task may exceed context window
- Multiple agents will contribute

### Updates
Update progress file:
- After each agent completes
- When blockers encountered
- When scope changes
- After resolving errors

### Cleanup
After successful completion:
- Update status to "complete"
- Keep for reference (useful for similar tasks)
- OR move to `.claude/progress/archived/`

## Reading Progress Files

When resuming:

1. **Check status** - Is it blocked? Where did we stop?
2. **Read context section** - What decisions were made?
3. **Review agent outputs** - What has each agent produced?
4. **Check error log** - Any unresolved issues?
5. **Resume from current phase** - Continue where we left off

## Integration with TodoWrite

Progress files complement TodoWrite:
- **TodoWrite**: Real-time task tracking within session
- **Progress file**: Cross-session persistence

At session start:
1. Read progress file
2. Create TodoWrite todos from pending phases
3. Mark completed phases from progress file

At phase completion:
1. Mark TodoWrite todo complete
2. Update progress file
3. Capture agent output
