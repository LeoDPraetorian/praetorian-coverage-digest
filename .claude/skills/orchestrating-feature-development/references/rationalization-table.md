# Feature Development Rationalization Table

Extends [shared rationalization prevention](../../using-skills/references/rationalization-prevention.md).

## Phase-Specific Rationalizations

### Phase 1: Brainstorming

| Rationalization                              | Why It's Wrong                                                             | Response                                      |
| -------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| 'Requirements are clear, skip brainstorming' | Brainstorming reveals hidden complexity and edge cases                     | DENIED. Complete brainstorming phase.         |
| 'User knows what they want'                  | Users describe solutions, not problems. Brainstorming surfaces real needs. | DENIED. Brainstorming clarifies requirements. |

### Phase 2: Discovery

| Rationalization                            | Why It's Wrong                                     | Response                                     |
| ------------------------------------------ | -------------------------------------------------- | -------------------------------------------- |
| 'I know the codebase'                      | Discovery finds reusable patterns you forgot about | DENIED. Run discovery agents.                |
| 'This is a new feature, nothing to reuse'  | Even new features can extend existing patterns     | DENIED. Discovery prevents special-casing.   |
| 'Discovery is slow, I can search manually' | Manual search misses cross-domain patterns         | DENIED. Parallel discovery is comprehensive. |

### Phase 3: Planning

| Rationalization                       | Why It's Wrong                                | Response                            |
| ------------------------------------- | --------------------------------------------- | ----------------------------------- |
| 'Simple feature, minimal plan needed' | 40% of 'simple' features are actually complex | DENIED. Complete planning phase.    |
| 'I can plan as I implement'           | Ad-hoc planning leads to rework               | DENIED. Plan before implementation. |

### Phase 4: Architecture

| Rationalization                                 | Why It's Wrong                                  | Response                               |
| ----------------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| 'UI-only change, no architecture needed'        | UI changes affect state, routing, accessibility | DENIED. Architecture review required.  |
| 'Security review optional for internal feature' | Internal features often become external         | DENIED. Security lead review required. |
| 'Tech debt analysis is overhead'                | Untracked tech debt accumulates silently        | DENIED. Update tech debt registry.     |

### Phase 5: Implementation

| Rationalization                  | Why It's Wrong                                 | Response                              |
| -------------------------------- | ---------------------------------------------- | ------------------------------------- |
| 'Working code is good enough'    | Working != maintainable, secure, tested        | DENIED. Follow architecture plan.     |
| 'I can add error handling later' | Error handling has ~10% follow-through         | DENIED. Implement error handling now. |
| 'Types can be any for now'       | TypeScript any spreads and defeats type safety | DENIED. Proper types required.        |

### Phase 6: Code Review

| Rationalization                                  | Why It's Wrong                                       | Response                              |
| ------------------------------------------------ | ---------------------------------------------------- | ------------------------------------- |
| 'Security review not needed for styling changes' | CSS can leak data via timing attacks, z-index issues | DENIED. Security review required.     |
| 'One retry failed, just ship it'                 | Two failures indicate systemic issues                | DENIED. Escalate via AskUserQuestion. |
| 'Reviewer is being too strict'                   | Strict review prevents production bugs               | DENIED. Address all feedback.         |

### Phase 7-9: Testing

| Rationalization                      | Why It's Wrong                            | Response                               |
| ------------------------------------ | ----------------------------------------- | -------------------------------------- |
| 'Unit tests are enough'              | Unit tests miss integration issues        | DENIED. All three test modes required. |
| 'E2E tests are flaky, skip them'     | Flaky tests indicate real race conditions | DENIED. Fix flakiness, don't skip.     |
| 'Tests pass, validation unnecessary' | Tests may not cover plan requirements     | DENIED. test-lead validation required. |
| '70% coverage is acceptable'         | Coverage targets exist for a reason       | DENIED. Meet coverage requirements.    |

### Phase 10: Completion

| Rationalization                       | Why It's Wrong                         | Response                      |
| ------------------------------------- | -------------------------------------- | ----------------------------- |
| 'Build passes locally, skip CI check' | CI catches environment-specific issues | DENIED. Verify CI passes.     |
| 'Lint warnings are minor'             | Lint warnings become lint errors       | DENIED. Zero warnings policy. |

## Cross-Phase Rationalizations

| Rationalization                                   | Why It's Wrong                                  | Response                                   |
| ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| 'Parallel execution means I can skip some agents' | Parallel = efficiency, not optional             | DENIED. All agents must complete.          |
| 'Human checkpoint is formality'                   | Human checkpoints catch misaligned requirements | DENIED. Wait for human approval.           |
| 'Full-stack is overkill, just do frontend'        | Backend implications often exist                | Ask user to confirm scope before assuming. |
