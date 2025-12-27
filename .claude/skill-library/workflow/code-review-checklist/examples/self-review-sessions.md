# Self-Review Session Examples

## Example 1: Authentication Feature Review

**Context:**

- 650 lines of new code across Go backend and React frontend
- JWT token validation with role-based access control
- Feature complete and manually tested
- Friday evening, code review scheduled Monday

### Review Process (12 minutes)

**Step 1: Read the diff (5 minutes)**

```bash
git diff main..HEAD
```

Identified files:

- `backend/pkg/auth/jwt_validator.go` (450 lines)
- `ui/src/sections/login/AuthFlow.tsx` (200 lines)

**Step 2: Security Review (4 minutes)**

✓ JWT secret handling:

- Secret loaded from environment variable
- Not logged or exposed in errors
- **ISSUE FOUND:** JWT errors return full token in error message
  - **FIX:** Sanitize error messages to remove token values

✓ Role validation:

- Roles checked against user claims
- **ISSUE FOUND:** No validation that required roles list is non-empty
  - **FIX:** Add validation requiring at least one role

✓ Token expiration:

- Expiration checked correctly
- **ISSUE FOUND:** No grace period for clock skew
  - **FIX:** Add 30-second grace period for clock skew

**Step 3: Edge Cases Review (2 minutes)**

✓ Nil checks:

- Token claims pointer dereferenced without nil check
  - **FIX:** Add nil check before accessing claims

✓ Error handling:

- All JWT validation errors wrapped properly
- Logging includes request ID for debugging

**Step 4: Code Quality Review (1 minute)**

✓ Naming clear and consistent
✓ No duplication between validation functions
✓ Functions under 50 lines

### Issues Summary

**Found:** 4 security/edge case issues
**Fixed:** All 4 before commit
**Time:** 12 minutes total (review found issues that external review likely wouldn't catch)

### Commit Message

```
feat: implement JWT-based authentication with RBAC

- Add JWT token validation with role-based access control
- Implement React authentication flow with token refresh
- Add comprehensive error handling and logging

Self-review completed (12 min):
- Security: JWT secret handling verified, sanitized error messages
  to prevent token leakage, role validation requires non-empty list
- Edge cases: Added nil checks for claims, 30s clock skew grace period
- Testing: Manual testing + edge case validation
- Code quality: No duplication, clear naming, comprehensive logging

Issues found and fixed during review: 4
Ready for external code review.
```

---

## Example 2: Production Hotfix Review

**Context:**

- Production down, $15k/min revenue loss
- Simple 3-line nil check fix
- Manager demanding immediate deploy
- Emergency situation

### Emergency Review Process (5 minutes)

**Step 1: Security-focused review (2 minutes)**

✓ Does this fix introduce any security issues?

- Nil check is defensive, cannot make things worse
- Error return is standard pattern
- No new attack vectors introduced

✓ Could this be an injection point?

- No user input involved
- Transaction object from internal service

**Step 2: Side effects analysis (2 minutes)**

✓ What else could break?

- Checked all callers of `Process()` function
- All properly handle `ErrInvalidTransaction`
- No breaking changes to API contract

✓ Is this masking a deeper problem?

- **FINDING:** Nil Details suggests upstream validation missing
- **ACTION:** Created follow-up ticket to audit transaction creation

**Step 3: Broader implications (1 minute)**

✓ Are there other similar nil pointer risks?

- **FINDING:** Yes, 3 other transaction processing paths
- **ACTION:** Added TODO comment and follow-up ticket for audit

### Emergency Commit

```
hotfix: add nil check to payment processor

CRITICAL PRODUCTION FIX - Revenue impact $15k/min

- Add nil check for txn.Details before gateway submission
- Prevents null pointer panic crashing payment processing
- Return ErrInvalidTransaction for nil Details

Emergency self-review (5 min):
- Security: Defensive nil check, no new attack vectors
- Side effects: All callers handle error correctly, no breaking changes
- Broader issue: Identified 3 similar risks in other transaction paths

Follow-up required:
- TODO: Comprehensive nil handling audit (CHA-5678)
- TODO: Investigate upstream cause of nil Details (CHA-5679)
- TODO: Add observability for transaction validation failures (CHA-5680)

Tested locally, validated fix, deployed to production.
Post-incident review scheduled: [timestamp]
```

### Post-Incident Comprehensive Review (30 minutes - after production stable)

**Step 1: Nil handling audit (15 minutes)**

- Reviewed all transaction processing paths
- Found 3 additional nil pointer risks
- Created PRs with fixes and tests

**Step 2: Upstream investigation (10 minutes)**

- Traced transaction creation flow
- Found validation gap in API handler
- Created PR with validation + tests

**Step 3: Observability (5 minutes)**

- Added metrics for transaction validation failures
- Added logging for nil Details occurrences
- Set up alert for repeated failures

**Lesson:** Emergency review (5 min) stopped the bleeding. Comprehensive review (30 min) fixed the root cause and prevented recurrence.

---

## Example 3: "Simple" Bug Fix Review

**Context:**

- Simple 1-line change to fix sorting bug
- "Just changing > to <"
- Seems trivial, tempting to skip review

### Review Process (7 minutes)

**The Change:**

```diff
- if a.Priority > b.Priority {
+ if a.Priority < b.Priority {
```

**Step 1: Impact analysis (3 minutes)**

✓ Where is this sorting function used?

- Used in 8 different contexts
- **ISSUE FOUND:** One context expects descending sort (high priority first)
  - **FIX:** Need different sort function for that context

**Step 2: Edge cases (2 minutes)**

✓ What if priorities are equal?

- **ISSUE FOUND:** Equal priorities not handled
  - **FIX:** Add secondary sort by timestamp

✓ What if Priority field is nil/zero?

- **ISSUE FOUND:** Zero priorities sorted incorrectly
  - **FIX:** Handle zero as lowest priority explicitly

**Step 3: Testing (2 minutes)**

✓ Are there tests for this?

- **ISSUE FOUND:** No tests for sort function
  - **FIX:** Add comprehensive sort tests

### Issues Summary

**Appeared to be:** 1-line trivial fix
**Actually was:** Complex change affecting 8 contexts
**Found during review:** 4 additional issues
**Time saved:** Hours of debugging production sorting bugs

### Commit Message

```
fix: correct priority sorting in task list

- Change comparison operator for ascending sort
- Add secondary sort by timestamp for equal priorities
- Handle zero priorities explicitly (treat as lowest)
- Split sort function for contexts needing descending sort
- Add comprehensive test coverage for sorting logic

Self-review completed (7 min):
- Impact: Checked all 8 usage contexts, found 1 needing descending
- Edge cases: Equal priorities, zero priorities now handled
- Testing: Added 12 test cases covering all scenarios
- Code quality: Extracted helper functions, clear documentation

Issues found during review: 4 (what looked like 1-line fix was complex)
Original "simple fix" would have caused 3 production bugs.
```

**Lesson:** "Simple" changes are often the most dangerous. Always review.

---

## Example 4: Configuration Change Review

**Context:**

- Changing timeout value in config
- `request_timeout: 30` → `request_timeout: 60`
- Seems like pure config, but...

### Review Process (5 minutes)

**Step 1: Impact analysis (3 minutes)**

✓ What uses this timeout?

- API requests to external service
- **ISSUE FOUND:** Some endpoints already take 45-55 seconds
  - **ACTION:** Increasing to 60s is appropriate

✓ What are the side effects of longer timeout?

- **ISSUE FOUND:** Connection pool might exhaust faster
  - **FIX:** Increase connection pool size proportionally
- **ISSUE FOUND:** API gateway has 60s timeout, will race
  - **FIX:** Increase API gateway timeout to 90s

**Step 2: Monitoring (1 minute)**

✓ How will we know if this helps/hurts?

- **ISSUE FOUND:** No metrics on timeout occurrences
  - **FIX:** Add metrics before deploying config change

**Step 3: Rollback plan (1 minute)**

✓ How do we roll back if this causes problems?

- Config change can be reverted immediately
- **ACTION:** Document rollback command in commit message

### Commit Message

```
config: increase external API request timeout to 60s

- Increase request_timeout from 30s to 60s for external API
- Increase connection pool from 100 to 150 to handle longer requests
- Coordinate with API gateway timeout increase to 90s (prevents race)

Self-review completed (5 min):
- Impact: Some requests taking 45-55s, increase necessary
- Side effects: Connection pool sized appropriately, gateway timeout coordinated
- Monitoring: Added timeout metrics before config change
- Rollback: Immediate config revert available

Deployment plan:
1. Deploy metrics collection (this PR)
2. Monitor baseline for 24h
3. Deploy timeout increase (separate PR)
4. Monitor for issues

Rollback command if needed:
  kubectl set env deployment/api REQUEST_TIMEOUT=30
```

**Lesson:** Even config changes need review. Side effects are everywhere.

---

## Key Takeaways from Examples

1. **"Simple" ≠ Safe** - Example 3 shows 1-line change was actually complex
2. **Emergency ≠ Skip** - Example 2 shows 5-min emergency review still valuable
3. **Side effects hide** - Example 4 shows config change affected 3 systems
4. **Self-review finds different issues** - Example 1 found 4 issues external review wouldn't catch
5. **Document your review** - All examples show how to capture review in commit message
6. **Time investment pays off** - All examples show review time < bug fix time

**Self-review is not negotiable. It catches issues when they're cheapest to fix.**
