# TDD Validation: go-developer MANDATORY TDD Requirement

**Date**: 2025-11-19
**Agent**: go-developer
**Current**: TDD mentioned as "Exception" (line 68)
**Gap**: TDD framed as exception rather than MANDATORY requirement
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Current "Exception" Framing

### Current TDD Reference (Line 68)

```markdown
**Exception**: Only create tests yourself when explicitly requested AND following test-driven-development skill
```

**Problems with this framing:**

1. **"Exception" implies tests are abnormal**
   - Frames TDD as special case, not standard practice
   - Suggests default is "don't create tests"
   - "Exception" has negative connotation (deviation from norm)

2. **Conditional: "when explicitly requested"**
   - Agent won't use TDD unless user asks
   - User must know to request TDD
   - Default behavior: implement without tests

3. **Weakest TDD requirement of all developers**
   - react-developer: Was "When using" (conditional) → Now "MANDATORY"
   - integration-developer: "MANDATORY" from start
   - go-developer: "Exception" (weakest framing)

---

### RED Phase Test Scenario

**Prompt**: "Implement a retry mechanism for failed HTTP requests in Go"

**Reading current agent (line 68 - Exception framing):**

Expected behavior:
> "I'll implement the retry mechanism for you:
>
> ```go
> func retryRequest(req *http.Request, maxRetries int) (*http.Response, error) {
>     var resp *http.Response
>     var err error
>
>     for i := 0; i < maxRetries; i++ {
>         resp, err = http.DefaultClient.Do(req)
>         if err == nil && resp.StatusCode < 500 {
>             return resp, nil
>         }
>         time.Sleep(time.Duration(i) * time.Second)
>     }
>     return nil, fmt.Errorf("max retries exceeded: %w", err)
> }
> ```
>
> The retry logic is complete. You can delegate to backend-unit-test-engineer for comprehensive tests."

**Violations:**
- ❌ Implemented directly without tests
- ❌ "Exception" framing didn't trigger TDD
- ❌ User didn't "explicitly request" TDD, so agent skipped it
- ❌ No RED-GREEN-REFACTOR cycle

**Pattern**: "Exception" framing makes TDD opt-in rather than default

---

## RED Phase Complete

**Loophole identified**: "Exception when explicitly requested" = TDD is opt-in, not mandatory

**Worse than react-developer was**: At least react-developer said "When using TDD" (acknowledged TDD exists). go-developer says "Exception" (implies TDD is abnormal).

**Ready for GREEN**: Change "Exception" to "MANDATORY" to match other developers

---

## GREEN Phase: Fix the Loophole

### Proposed Change to go-developer.md

**Change line 68 FROM:**
```markdown
**Exception**: Only create tests yourself when explicitly requested AND following test-driven-development skill
```

**Change TO:**
```markdown
**MANDATORY: Use test-driven-development skill for all Go feature code**

**TDD for Development (YOU CREATE):**
- Write minimal failing test FIRST (RED)
- Implement feature to pass test (GREEN)
- Refactor while keeping test passing (REFACTOR)
- Scope: 1-3 tests proving core behavior

**After feature complete with TDD test:**

Recommend to user spawning test specialists for comprehensive coverage:
> "Feature complete with basic TDD test proving functionality.
>
> **Recommend spawning**: backend-unit-test-engineer for comprehensive suite:
> - Edge cases (nil, empty, boundary conditions)
> - Error scenarios (network failures, timeouts)
> - Concurrency safety (race conditions)"

**You cannot spawn test agents yourself** - only main Claude session can spawn agents.
```

**Rationale:**
- Removes "Exception" negative framing
- Makes TDD MANDATORY (matches react-developer, integration-developer)
- Provides Go-specific TDD guidance
- Clarifies TDD (minimal) vs comprehensive (delegated) split
- Correct delegation model

---

## GREEN Phase Testing

**Test**: Does MANDATORY requirement fix the loophole?

**Prompt**: "Implement retry mechanism for failed HTTP requests in Go"

**Reading UPDATED agent with MANDATORY TDD:**

Expected behavior:
> "Per MANDATORY test-driven-development requirement:
>
> **RED Phase - Write failing test:**
> ```go
> func TestRetryRequestSucceedsAfterFailures(t *testing.T) {
>     attempts := 0
>     server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
>         attempts++
>         if attempts < 3 {
>             w.WriteHeader(http.StatusInternalServerError)
>             return
>         }
>         w.WriteHeader(http.StatusOK)
>     }))
>     defer server.Close()
>
>     req, _ := http.NewRequest("GET", server.URL, nil)
>     resp, err := retryRequest(req, 3)
>
>     assert.NoError(t, err)
>     assert.Equal(t, http.StatusOK, resp.StatusCode)
>     assert.Equal(t, 3, attempts)
> }
> ```
>
> **GREEN Phase - Minimal implementation:**
> [Implements retry logic to pass test]
>
> **REFACTOR Phase:**
> [Improves code while test stays green]"

**Behavior change:**
- Before (Exception): Implements directly unless explicitly requested
- After (MANDATORY): Writes test first always

**Result**: ✅ PASS - MANDATORY closes "exception" loophole

---

## REFACTOR Phase: Pressure Testing

### Pressure Test 1: Time Pressure

**Prompt**: "Implement retry ASAP, production is failing, no time for tests"

**Reading agent with MANDATORY:**
- MANDATORY: No exception for urgency
- test-driven-development skill: AI time calibration (5-10 min)
- No "unless production down" clause

**Result**: ✅ PASS - MANDATORY resists urgency

---

### Pressure Test 2: "User Didn't Request TDD"

**Prompt**: "Just implement the retry logic" (no mention of TDD)

**Reading agent:**
- MANDATORY applies regardless of user mentioning TDD
- Not conditional on explicit request
- TDD is default, not exception

**Result**: ✅ PASS - Works even when user doesn't mention TDD

---

### Pressure Test 3: "Go is Simple, No Tests Needed"

**Prompt**: "This is straightforward Go code, just implement it"

**Reading agent:**
- MANDATORY for ALL Go feature code
- test-driven-development skill: "Too simple" rationalization countered

**Result**: ✅ PASS - Simplicity doesn't bypass MANDATORY

---

## REFACTOR Phase Complete

**All pressure tests pass:**
1. ✅ Time/production urgency
2. ✅ No explicit TDD request
3. ✅ Simplicity argument

**Loophole closed**: "Exception when requested" → "MANDATORY always"

---

## Final Validation

**RED Phase**: ⚠️ "Exception when explicitly requested" makes TDD opt-in

**GREEN Phase**: ✅ "MANDATORY" makes TDD default

**REFACTOR Phase**: ✅ 3/3 pressure tests pass

**Fix**: Replace exception clause with MANDATORY section (~15 lines)

**Ready to apply fix to go-developer.md**
