---
name: code-review-checklist
description: Use when about to commit code changes, before committing any code, when skipping self-review seems justified by time pressure or manual testing, or when production emergencies tempt bypassing review - provides systematic checklist for reviewing code changes before committing
allowed-tools: "Read, Write, Bash"
---

# Code Review Checklist

## Overview

**Every code change requires systematic self-review before commit.**

This is NOT about external code review (pull requests, peer review). This is about reviewing YOUR OWN changes systematically before committing them.

**Core Principle:** Self-review catches different issues than external review. Both are required. Self-review is non-negotiable.

## When to Use This Skill

Use BEFORE committing any code changes:

- Feature implementations (new or modified)
- Bug fixes (including hotfixes)
- Refactoring
- Configuration changes
- Documentation updates that include code examples

**Trigger point:** The moment you think "ready to commit" - STOP and run this checklist.

## The Iron Law

```
NO COMMIT WITHOUT SELF-REVIEW
```

**This means:**

- Review BEFORE `git commit` (not before deploy, not before PR)
- Every change, every time
- No exceptions for "simple" changes
- No exceptions for emergencies
- No exceptions for "already tested" code
- No exceptions for time pressure

## Common Rationalizations (All Invalid)

| Rationalization                          | Reality                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| "I already manually tested it"           | Testing finds functional bugs. Review finds security flaws, edge cases, maintainability issues      |
| "Code review will catch it"              | External review catches different things. You know context they don't                               |
| "I'll review it later/Monday/after"      | Later never happens. Review before commit, not before deploy                                        |
| "This is a simple 3-line change"         | Simple changes hide the most critical bugs. Size ≠ risk                                             |
| "Production emergency - no time"         | Emergency = MORE reason to review, not less. 5-min review prevents hours of additional firefighting |
| "Low risk / defensive code"              | You thought that before every production incident. Emergency mode impairs risk assessment           |
| "Time pressure / cost too high"          | Review takes 5-15 minutes. Incidents cost hours/days. 5 min review vs 2 hour firefight              |
| "Restore service first, review after"    | 5-minute review doesn't delay restoration. Broken fix delays MORE                                   |
| "System up imperfectly > down perfectly" | Unreviewed fix might make system down worse or longer                                               |
| "Engineering pragmatism in crisis"       | True pragmatism = 5-min focused review, not blind deployment                                        |
| "Perfect is enemy of good"               | 5-min focused review ≠ perfectionism. It's minimum due diligence                                    |
| "Critical System Recovery Principle"     | Recovery = stop bleeding correctly with review, not blindly                                         |

## Self-Review Checklist

Run through this systematically BEFORE `git commit`:

### Security Review (MANDATORY)

- [ ] **Input validation**: All user inputs validated and sanitized?
- [ ] **Authentication**: Auth checks in right places? No bypasses?
- [ ] **Authorization**: RBAC/permissions checked correctly?
- [ ] **Injection**: No SQL injection, XSS, command injection vectors?
- [ ] **Sensitive data**: No secrets, credentials, PII in logs/errors?
- [ ] **Error messages**: No information leakage in errors?

**If authentication/authorization involved:** Double-check bypass attempts.
**If database queries:** Verify parameterization, no string concatenation.
**If API endpoints:** Check rate limiting, input validation.

### Code Quality Review

- [ ] **Duplication**: Any copy-pasted code that should be extracted?
- [ ] **Naming**: Variables/functions clearly named?
- [ ] **Complexity**: Functions under 50 lines? Cyclomatic complexity reasonable?
- [ ] **Error handling**: All errors caught and handled appropriately?
- [ ] **Logging**: Errors logged with sufficient context?
- [ ] **Comments**: Complex logic explained? No commented-out code?

### Edge Cases & Testing

- [ ] **Nil/null checks**: All pointer dereferences safe?
- [ ] **Boundary conditions**: Zero, negative, max values handled?
- [ ] **Concurrency**: Race conditions? Lock ordering correct?
- [ ] **Error paths**: Failure modes tested?
- [ ] **Resource cleanup**: Defer statements, close calls present?

### Domain-Specific Checks

**Go Backend:**

- [ ] Context propagation correct?
- [ ] Defer for cleanup present?
- [ ] Interface usage appropriate?

**React Frontend:**

- [ ] Hooks rules followed?
- [ ] State updates immutable?
- [ ] Effect cleanup functions present?
- [ ] Accessibility attributes present?

**Database:**

- [ ] Indexes on filter fields?
- [ ] N+1 query avoided?
- [ ] Transactions where needed?

## How to Review

### 1. Read Your Diff

```bash
git diff  # Unstaged changes
git diff --staged  # Staged changes
git diff main..HEAD  # All changes on branch
```

Read EVERY line you changed. Line by line.

### 2. Think Like an Attacker

For each change, ask:

- "How would I exploit this?"
- "What happens if input is malicious?"
- "What if this fails at the worst possible time?"

### 3. Think Like a Maintainer

For each change, ask:

- "Will I understand this in 6 months?"
- "Can someone else modify this safely?"
- "Is this the simplest approach?"

### 4. Document Your Review

Add to commit message:

```
Self-review completed:
- Security: [specific checks done]
- Edge cases: [scenarios tested]
- Follow-up: [any identified TODOs]
```

## Emergency Protocol

**CRITICAL: Production emergencies require 5-minute focused review BEFORE commit.**

### The Emergency Trap

**Common rationalization:**

> "Production is down, bleeding $15k/min. We need to restore service NOW. I'll review after."

**Reality:**

- 5-minute review = $75k cost
- Unreviewed fix breaking more things = $150k+ additional downtime
- **You cannot assess risk correctly in emergency mode**
- Emergency pressure impairs judgment - that's EXACTLY when you need the checklist

**The Math:**

```
Time to review: 5 minutes = $75k
Time to fix broken fix: 30+ minutes = $450k+
Time to rollback + re-fix: 1+ hour = $900k+

5-minute review is CHEAP insurance against making things worse.
```

### Mandatory 5-Minute Emergency Review

**SET A TIMER. Review these 3 things. THEN commit.**

1. **Security implications (2 minutes)**
   - Does this fix introduce new attack vectors?
   - Could this bypass authentication/authorization?
   - Are there injection risks?
   - Could this leak sensitive data in logs/errors?

2. **Side effects analysis (2 minutes)**
   - What else could this break?
   - Check all callers - do they handle new error cases?
   - Are there similar patterns elsewhere that also need fixing?
   - Could this mask a deeper problem?

3. **Quick validation (1 minute)**
   - Is error handling appropriate?
   - Is logging sufficient for debugging?
   - Are variable names clear for next responder?

### Document Your Emergency Review

```
hotfix: add nil check to payment processor

CRITICAL PRODUCTION FIX - Revenue impact $15k/min

Emergency review completed (5 min):
✓ Security: Defensive nil check, no new attack vectors, no injection risk
✓ Side effects: All 8 callers handle ErrInvalidTransaction correctly
✓ Broader issue: Found 3 similar nil risks in txn processing paths
✓ Validation: Error logging includes txn ID for debugging

Follow-up required:
- TODO: Comprehensive nil handling audit across payment flows (CHA-5678)
- TODO: Investigate upstream cause of nil Details (CHA-5679)
- TODO: Add metrics for nil transaction occurrences (CHA-5680)

Post-incident comprehensive review scheduled: [timestamp]
```

### Post-Incident Comprehensive Review

**After service is restored:**

1. **Monitor system** (5 minutes) - verify fix works, no new issues
2. **Comprehensive review** (30 minutes) - full checklist on the fix
3. **Broader audit** (1 hour) - find and fix similar patterns
4. **Root cause analysis** - why did the bug occur?
5. **Prevention** - how do we prevent this class of bug?

### Emergency Rationalization Counters

| Rationalization                                | Reality                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| "Restore service first, review after"          | 5 minutes doesn't delay restoration. Broken fix delays MORE                |
| "System being up imperfectly > down perfectly" | Unreviewed fix might make it down worse or longer                          |
| "Engineering pragmatism in crisis"             | Pragmatism = 5-min review before commit, not skipping it                   |
| "Perfect is the enemy of good"                 | 5-min focused review ≠ perfectionism. It's minimum due diligence           |
| "Critical System Recovery Principle"           | Recovery principle = stop the bleeding correctly, not blindly              |
| "This fix is low risk / defensive code"        | You're in emergency mode. You CANNOT assess risk correctly. Use checklist. |

### The Pattern You'll See

**Without emergency review:**

1. Fix obvious bug in 2 minutes
2. Deploy
3. Works initially
4. 30 minutes later: New bug surfaces from unreviewed side effect
5. Emergency escalates
6. Total time: 2 hours+ of firefighting

**With 5-minute emergency review:**

1. Fix obvious bug in 2 minutes
2. **Review for 5 minutes - find side effect**
3. **Fix side effect before deploying**
4. Deploy comprehensive fix
5. Service restored
6. Total time: 7 minutes

**5 minutes of review prevents hours of additional firefighting.**

### When to Skip Emergency Review

**Never.**

Even in emergencies:

- 5 minutes doesn't materially delay restoration
- Prevents making the emergency worse
- Prevents creating secondary emergencies
- Your judgment is impaired - trust the checklist

**Emergency = Focused 5-Minute Review (NON-NEGOTIABLE)**
**Emergency ≠ Skip Review**

## Red Flags - STOP

If you think any of these, you're about to violate the principle:

- ❌ "I'll review it Monday before code review"
- ❌ "Manual testing covered this"
- ❌ "It's only 3 lines"
- ❌ "Manager says deploy now"
- ❌ "Too tired to review, need to commit"
- ❌ "Code review will catch problems"
- ❌ "This is low risk"
- ❌ "Emergency situation - no time"
- ❌ "Restore service first, review after"
- ❌ "System being up imperfectly is better than down perfectly"
- ❌ "Engineering pragmatism in crisis situations"
- ❌ "Perfect is the enemy of good"
- ❌ "Critical System Recovery Principle"
- ❌ "This fix is defensive/simple - can't make things worse"

**All of these are rationalizations. Run the checklist.**

**Especially in emergencies:** Your judgment is impaired. Trust the 5-minute emergency protocol.

## What Self-Review Catches (That External Review Misses)

**You know:**

- Why you made specific choices
- What alternatives you considered
- Edge cases from testing
- Shortcuts you took under pressure
- The commit message context

**External reviewers don't know:**

- Your full context and reasoning
- All the scenarios you manually tested
- Why certain patterns were chosen
- What "later" work you planned

**Both reviews are essential. Neither substitutes for the other.**

## Time Investment

**Self-review takes:** 5-15 minutes typically

**Self-review prevents:**

- Security incidents (hours/days to fix)
- Production bugs (hours to diagnose + fix)
- Technical debt (weeks accumulating fixes)
- Emergency midnight deployments (your sleep)

**5-15 minutes is nothing compared to incident response time.**

## Integration with Workflow

### Recommended Flow

```bash
# 1. Development
[Write code, manual testing, iterate...]

# 2. Self-Review (YOU ARE HERE)
git diff
[Run through checklist systematically]

# 3. Commit with documentation
git commit -m "feat: implement X

[Feature description]

Self-review completed:
- Security: Input validation, auth checks verified
- Edge cases: Nil checks, boundary conditions tested
- Code quality: No duplication, clear naming
"

# 4. External Review (later)
[Create PR, get peer review]
```

### Don't Skip Step 2

External review (step 4) does NOT replace self-review (step 2).

## Examples

See [examples/self-review-sessions.md](examples/self-review-sessions.md) for documented review sessions showing the checklist in action.

## Checklist Template

Copy from [templates/review-checklist.md](templates/review-checklist.md) to use in commit messages.

## Summary

**Before every commit:**

1. Run systematic self-review checklist
2. Document what you checked
3. Commit with self-review notes
4. No exceptions

**Self-review is separate from external code review. Both required. Neither optional.**

Review catches bugs BEFORE they enter the codebase. That's when they're cheapest to fix.
