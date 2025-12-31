# Troubleshooting

Common issues and solutions when orchestrating feature development.

## Lost Context Mid-Workflow

**Symptom**: Session ended, need to resume feature development.

**Solution**:

1. Read progress file:
   ```bash
   cat .claude/features/{feature-id}/progress.json
   ```
2. Check `current_phase` field
3. Load artifacts (design.md, plan.md, architecture.md)
4. Recreate TodoWrite todos based on phase status
5. Continue from `current_phase`

**Prevention**: Always save progress after each phase completion.

---

## Agent Returned Blocked Status

**Symptom**: Agent returns `status: "blocked"` in handoff.

**Solution**:

1. Read `handoff.blockers` array for details
2. Categorize blocker type:

   | Type                   | Action                                     |
   | ---------------------- | ------------------------------------------ |
   | `missing_dependency`   | Implement dependency first, then retry     |
   | `unclear_requirement`  | Use AskUserQuestion to clarify             |
   | `technical_limitation` | Revise architecture/plan                   |
   | `external_service`     | Wait for external team or mock temporarily |

3. Update relevant artifact (plan.md or architecture.md)
4. Re-spawn same agent with resolution context

**Example**:

```
Agent blocked: "Backend API endpoint not available"

1. Determine if we can mock the API
2. If yes: Update plan to use mock data
3. If no: Pause frontend, implement backend first
4. Re-spawn frontend-developer with updated context
```

---

## Build Failing After Implementation

**Symptom**: `verification.build_success: false` in handoff.

**Solution**:

1. Capture full build error:
   ```bash
   npm run build 2>&1 | tee build-error.log
   ```
2. Analyze error type:
   - TypeScript errors → Re-spawn developer with type fixes
   - Import errors → Check file paths
   - Dependency errors → Run `npm install`
3. Create issue context:

   ```
   Build failed with error:
   {error output}

   Fix the implementation to resolve this error.
   ```

4. Re-spawn developer with error context

---

## Tests Failing After Testing Phase

**Symptom**: `verification.tests_passed: false` in handoff.

**Solution**:

1. Run tests and capture output:
   ```bash
   npm test 2>&1 | tee test-error.log
   ```
2. Determine if issue is in implementation or tests:

   | Failure Type       | Action                                       |
   | ------------------ | -------------------------------------------- |
   | Logic bug          | Return to implementation phase               |
   | Flaky test         | Re-spawn test engineer with "fix flaky test" |
   | Wrong assertion    | Re-spawn test engineer with "fix assertion"  |
   | Missing test setup | Re-spawn test engineer with "add setup"      |

3. If implementation bug:

   ```
   Tests failing due to implementation issue:
   {test output}

   Return to Phase 5 (implementation) to fix.
   ```

4. If test bug:

   ```
   Tests have issues:
   {test output}

   Re-spawn test engineer to fix tests.
   ```

---

## Coverage Below Target

**Symptom**: `verification.coverage_percent < 80` in handoff.

**Solution**:

1. Generate coverage report:
   ```bash
   npm test -- --coverage
   ```
2. Identify uncovered lines/branches
3. Re-spawn test engineer:

   ```
   Current coverage: {percent}%
   Target: 80%

   Uncovered files:
   {file list with line numbers}

   Add tests for uncovered branches.
   ```

---

## Agent Ignores Architecture Decisions

**Symptom**: Implementation doesn't follow architecture.md.

**Solution**:

1. Make architecture context more prominent:

   ```
   CRITICAL: Follow these architecture decisions:
   1. {decision 1}
   2. {decision 2}

   FAILURE TO FOLLOW = IMPLEMENTATION REJECTED

   Any deviation requires user approval via AskUserQuestion.
   ```

2. Re-spawn developer with emphasized constraints
3. Verify output against architecture before accepting

---

## Should I Skip Phase X for Simple Features?

**Question**: "This feature is simple, can I skip brainstorming/architecture?"

**Answer**: No. Even "simple" features benefit from systematic phases:

| Phase          | Minimum Time | Why Not Skip                                    |
| -------------- | ------------ | ----------------------------------------------- |
| Brainstorming  | 5-10 min     | Catches edge cases, clarifies requirements      |
| Planning       | 10-15 min    | Identifies affected files, prevents scope creep |
| Architecture   | 10-15 min    | Ensures consistency with existing patterns      |
| Implementation | Variable     | The actual work                                 |
| Testing        | 15-20 min    | Prevents regressions, documents behavior        |

**Total overhead**: ~40-60 minutes for "simple" features
**Value**: Prevents mid-implementation surprises, missed requirements, inconsistent code

**Exception**: True trivial changes (fixing typos, updating strings) can use abbreviated workflow.

---

## Parallel vs Sequential for Full-Stack Features

**Question**: "Should I spawn frontend and backend agents in parallel?"

**Decision tree**:

```
Can frontend work with mocked backend?
├─ Yes → Spawn in parallel
│  Frontend uses mock data during development
│  Backend implements real API
│  Integration testing verifies compatibility
│
└─ No (frontend needs real backend) → Sequential
   1. Backend implementation first
   2. Backend tests pass
   3. Frontend implementation with real API
```

**Indicators for sequential**:

- Frontend depends on backend response structure
- Real-time features (WebSocket, SSE)
- Complex API contracts
- Tight coupling between layers

**Indicators for parallel**:

- Frontend can use typed mocks
- API contract already defined
- Independent development possible
- Backend/frontend teams work separately

---

## Agent Modifies Unexpected Files

**Symptom**: `files_modified` includes files not in plan.

**Solution**:

1. Review modified files:
   ```bash
   git diff {files from handoff}
   ```
2. Use AskUserQuestion:

   ```
   Agent modified these unexpected files:
   {file list}

   Were these modifications necessary?

   Options:
   - Yes, accept all changes
   - No, revert {specific files}
   - Let me review the diffs first
   ```

3. If revert needed:
   ```bash
   git checkout HEAD -- {files to revert}
   ```
4. Re-spawn agent with constraint:

   ```
   CRITICAL: Only modify files listed in plan.md.

   Any additional file changes require user approval via AskUserQuestion.
   ```

---

## How to Handle Changing Requirements Mid-Workflow

**Scenario**: User changes requirements during implementation phase.

**Solution**:

1. Assess impact:

   ```
   Current phase: {phase}
   Change requested: {description}

   Impact analysis:
   - Does this invalidate architecture? {yes/no}
   - Does this require new plan tasks? {yes/no}
   - Can we continue with amendment? {yes/no}
   ```

2. Decision tree:

   ```
   Is architecture still valid?
   ├─ No → Return to Phase 4 (architecture)
   │  Save progress as user-dashboard_20241213_103000-v1
   │  Create new branch for amended feature
   │
   └─ Yes → Can we amend current plan?
      ├─ Yes → Update plan.md, continue
      └─ No → Return to Phase 3 (planning)
   ```

3. Save current state:
   ```json
   {
     "feature_id": "user-dashboard_20241213_103000",
     "status": "amended",
     "amendments": [
       {
         "timestamp": "2024-12-13T14:00:00Z",
         "phase_affected": "implementation",
         "change": "Added real-time updates requirement",
         "action": "Returned to architecture phase"
       }
     ]
   }
   ```

---

## Feature Taking Too Long

**Symptom**: Feature development exceeds expected timeline.

**Solution**:

1. Review progress file duration:

   ```json
   "metadata": {
     "total_duration_minutes": 180,
     "agents_spawned": 8
   }
   ```

2. Identify bottleneck phase:

   ```
   Brainstorming: 15 min (normal)
   Planning: 20 min (normal)
   Architecture: 60 min (HIGH - investigate)
   Implementation: 45 min (normal)
   Testing: 40 min (normal)
   ```

3. Common causes by phase:

   | Phase          | Cause                          | Solution                         |
   | -------------- | ------------------------------ | -------------------------------- |
   | Brainstorming  | Too many alternatives explored | Timebox to 15 minutes max        |
   | Planning       | Overly detailed plan           | Focus on key tasks only          |
   | Architecture   | Over-engineering               | Follow existing patterns         |
   | Implementation | Scope creep                    | Stick to plan.md tasks           |
   | Testing        | Flaky tests                    | Fix flakiness before adding more |

4. Use AskUserQuestion:

   ```
   Feature development at {duration} minutes (Phase: {current}).

   Options:
   - Continue - we're making good progress
   - Simplify - reduce scope to core functionality
   - Pause - revisit requirements
   ```

---

## Related References

- [Progress Persistence](progress-persistence.md) - Resume workflow
- [Agent Handoffs](agent-handoffs.md) - Handling blocked status
- [Phase 5: Implementation](phase-5-implementation.md) - Build failures
- [Phase 8: Testing](phase-8-testing.md) - Test failures
