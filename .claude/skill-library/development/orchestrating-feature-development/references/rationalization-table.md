# Feature Development Rationalization Table

**Anti-rationalization counters for feature development workflows.**

Feature-specific rationalizations for orchestrating-feature-development.

<EXTREMELY-IMPORTANT>
You MUST read this file BEFORE proceeding past any compaction gate (after phases 3, 8, or 13).

If you detect ANY of these phrases in your thinking, STOP. Return to the phase checklist. Complete all items before proceeding.
</EXTREMELY-IMPORTANT>

---

## Phase-Specific Rationalizations

### Phase 2: Triage

| Rationalization                       | Why It's Wrong                                | Response                                |
| ------------------------------------- | --------------------------------------------- | --------------------------------------- |
| "This is obviously SMALL work"        | Size determination requires Phase 3 discovery | DENIED. Complete triage criteria.       |
| "I know the codebase, skip discovery" | Discovery surfaces forgotten patterns         | DENIED. Triage informs discovery scope. |

### Phase 3: Codebase Discovery

| Rationalization                                  | Why It's Wrong                                      | Response                                     |
| ------------------------------------------------ | --------------------------------------------------- | -------------------------------------------- |
| "I know the codebase"                            | Discovery finds reusable patterns you forgot about  | DENIED. Run Explore agents.                  |
| "This is a new feature, nothing to reuse"        | Even new features can extend existing patterns      | DENIED. Discovery prevents special-casing.   |
| "Discovery is slow, I can search manually"       | Manual search misses cross-domain patterns          | DENIED. Parallel discovery is comprehensive. |
| "Explore agents are overhead for small features" | Small features still benefit from pattern detection | DENIED. Discovery is always required.        |

### Phase 4: Skill Discovery

| Rationalization                     | Why It's Wrong                          | Response                               |
| ----------------------------------- | --------------------------------------- | -------------------------------------- |
| "I know which skills to use"        | Gateway discovery ensures completeness  | DENIED. Discover gateways dynamically. |
| "Skill manifest is extra paperwork" | Manifest enables prompt injection later | DENIED. Write skill-manifest.yaml.     |

### Phase 6: Brainstorming (LARGE only)

| Rationalization                              | Why It's Wrong                                    | Response                                      |
| -------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| "Requirements are clear, skip brainstorming" | Brainstorming reveals hidden complexity           | DENIED. Complete brainstorming phase.         |
| "User knows what they want"                  | Users describe solutions, not problems            | DENIED. Brainstorming clarifies requirements. |
| "We can iterate during implementation"       | Design changes during implementation cause rework | DENIED. Design first, implement second.       |

### Phase 7: Architecture Plan

| Rationalization                                 | Why It's Wrong                                  | Response                               |
| ----------------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| "Simple feature, minimal plan needed"           | 40% of "simple" features are actually complex   | DENIED. Complete planning phase.       |
| "I can plan as I implement"                     | Ad-hoc planning leads to rework                 | DENIED. Plan before implementation.    |
| "UI-only change, no architecture needed"        | UI changes affect state, routing, accessibility | DENIED. Architecture review required.  |
| "Security review optional for internal feature" | Internal features often become external         | DENIED. Security lead review required. |

### Phase 8: Implementation

| Rationalization                  | Why It's Wrong                                            | Response                              |
| -------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| "Working code is good enough"    | Working ≠ maintainable, secure, tested                    | DENIED. Follow architecture plan.     |
| "I can add error handling later" | Error handling has ~10% follow-through                    | DENIED. Implement error handling now. |
| "Types can be `any` for now"     | TypeScript `any` spreads and defeats type safety          | DENIED. Proper types required.        |
| "Skip TDD for simple functions"  | Simple functions become complex. TDD prevents regression. | DENIED. Write test first.             |

### Phase 9: Design Verification

| Rationalization                      | Why It's Wrong                              | Response                              |
| ------------------------------------ | ------------------------------------------- | ------------------------------------- |
| "Implementation looks close to plan" | Verification requires systematic comparison | DENIED. Compare each task explicitly. |
| "Minor deviations don't matter"      | Minor deviations compound into major drift  | DENIED. Document all deviations.      |

### Phase 10: Domain Compliance

| Rationalization                          | Why It's Wrong                         | Response                           |
| ---------------------------------------- | -------------------------------------- | ---------------------------------- |
| "P0 checks are overhead"                 | P0 catches common feature failures     | DENIED. Run all compliance checks. |
| "I followed patterns, no need to verify" | Verification catches unconscious drift | DENIED. Verify against checklist.  |

### Phase 11: Code Quality

| Rationalization                                  | Why It's Wrong                                       | Response                              |
| ------------------------------------------------ | ---------------------------------------------------- | ------------------------------------- |
| "Security review not needed for styling changes" | CSS can leak data via timing attacks, z-index issues | DENIED. Security review required.     |
| "One retry failed, just ship it"                 | Two failures indicate systemic issues                | DENIED. Escalate via AskUserQuestion. |
| "Reviewer is being too strict"                   | Strict review prevents production bugs               | DENIED. Address all feedback.         |

### Phase 12: Test Planning

| Rationalization                            | Why It's Wrong                                   | Response                         |
| ------------------------------------------ | ------------------------------------------------ | -------------------------------- |
| "I know what tests to write"               | Test planning ensures coverage across test types | DENIED. Create formal test plan. |
| "test-lead is overhead for small features" | test-lead catches edge cases you'd miss          | DENIED. Spawn test-lead agent.   |

### Phase 13: Testing

| Rationalization                  | Why It's Wrong                            | Response                               |
| -------------------------------- | ----------------------------------------- | -------------------------------------- |
| "Unit tests are enough"          | Unit tests miss integration issues        | DENIED. All three test modes required. |
| "E2E tests are flaky, skip them" | Flaky tests indicate real race conditions | DENIED. Fix flakiness, don't skip.     |
| "70% coverage is acceptable"     | Coverage targets exist for a reason       | DENIED. Meet coverage requirements.    |

### Phase 14: Coverage Verification

| Rationalization                      | Why It's Wrong                                 | Response                           |
| ------------------------------------ | ---------------------------------------------- | ---------------------------------- |
| "Tests pass, validation unnecessary" | Tests may not cover plan requirements          | DENIED. Verify coverage threshold. |
| "Close enough to target"             | Coverage targets are minimums, not suggestions | DENIED. Meet exact threshold.      |

### Phase 15: Test Quality

| Rationalization                               | Why It's Wrong                   | Response                                         |
| --------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| "Flaky test doesn't count toward retry limit" | All non-passing results count    | DENIED. All failures count.                      |
| "Only 2/10 tests failed, mostly works"        | 1 failure = retry consumed       | DENIED. Fix all failures or escalate.            |
| "Infrastructure failure, not my code"         | All failures count toward limits | DENIED. Infrastructure failures consume retries. |

### Phase 16: Completion

| Rationalization                       | Why It's Wrong                         | Response                      |
| ------------------------------------- | -------------------------------------- | ----------------------------- |
| "Build passes locally, skip CI check" | CI catches environment-specific issues | DENIED. Verify CI passes.     |
| "Lint warnings are minor"             | Lint warnings become lint errors       | DENIED. Zero warnings policy. |

---

## Compaction Gate Rationalizations

| Rationalization                                      | Why It's Wrong                                                   | Response                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| "Momentum bias - tasks completing successfully"      | Success breeds complacency. Context exhaustion happens silently. | DENIED. Check context at gates 3, 8, 13.            |
| "MANIFEST is updating, that's enough persistence"    | MANIFEST ≠ compaction. Compaction removes inline content.        | DENIED. Invoke persisting-progress-across-sessions. |
| "Context seems fine, no need to compact"             | You cannot assess context health subjectively                    | DENIED. Compaction is mandatory, not conditional.   |
| "I can compact later"                                | "Later" has ~5% completion rate. Gates are blocking.             | DENIED. Compact NOW before next phase.              |
| "Feature is small, compaction overhead not worth it" | Small features have generated 25K+ tokens                        | DENIED. Follow gate protocol.                       |
| "I'm in flow, don't want to break momentum"          | Momentum bias causes skipped steps                               | DENIED. Compaction takes 2 minutes.                 |

---

## Cross-Phase Rationalizations

| Rationalization                                   | Why It's Wrong                                  | Response                                   |
| ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| "Parallel execution means I can skip some agents" | Parallel = efficiency, not optional             | DENIED. All agents must complete.          |
| "Human checkpoint is formality"                   | Human checkpoints catch misaligned requirements | DENIED. Wait for human approval.           |
| "Full-stack is overkill, just do frontend"        | Backend implications often exist                | Ask user to confirm scope.                 |
| "Different agent name means fresh start"          | Retry counts track PHASE, not agent identity    | DENIED. Counter persists in MANIFEST.yaml. |
| "This phase is simple, skip to next"              | Simple phases have mandatory outputs            | DENIED. Complete phase outputs.            |
| "We're almost done, skip verification"            | Verification catches last-mile errors           | DENIED. Complete all verification.         |

---

## Statistical Evidence

From observed patterns:

| Anti-Pattern           | Observed Outcome                     |
| ---------------------- | ------------------------------------ |
| "I'll add tests later" | ~10% follow-through rate             |
| "Skip brainstorming"   | 40% of "simple" features are complex |
| "Error handling later" | ~10% actually added                  |
| "Close enough to spec" | 25% require significant rework       |
| "Compact later"        | ~5% completion rate                  |

---

## Response Protocol

When you detect rationalization:

1. **STOP** - Do not proceed with the rationalized action
2. **READ** - Re-read the phase checklist
3. **COMPLETE** - Finish all checklist items
4. **VERIFY** - Confirm completion before proceeding
5. **DOCUMENT** - If override is user-approved, document in MANIFEST.yaml

**Override Protocol (RARE):**

Only with explicit user approval via AskUserQuestion:

```markdown
Skipping {step} due to user override.

Risk: {specific_risk}

Alternative: {what_would_normally_happen}

Document override in MANIFEST.yaml.
```
