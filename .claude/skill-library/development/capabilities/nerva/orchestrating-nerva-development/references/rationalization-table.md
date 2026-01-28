# Fingerprintx Development Rationalization Table

**Anti-rationalization counters for fingerprintx plugin development workflows.**

**Foundational Pattern**: Extends [using-skills/references/rationalization-prevention.md](.claude/skills/using-skills/references/rationalization-prevention.md) with fingerprintx-specific rationalizations.

<EXTREMELY-IMPORTANT>
You MUST read this file BEFORE proceeding past any compaction gate (after phases 3, 8, or 13).

If you detect ANY of these phrases in your thinking, STOP. Return to the phase checklist. Complete all items before proceeding.
</EXTREMELY-IMPORTANT>

---

## Phase-Specific Rationalizations

### Phase 2: Triage

| Rationalization                            | Why It's Wrong                                 | Response                                |
| ------------------------------------------ | ---------------------------------------------- | --------------------------------------- |
| "This is obviously SMALL work"             | Size determination requires Phase 3 discovery  | DENIED. Complete triage criteria.       |
| "Simple protocol, minimal research needed" | Simple protocols often have complex edge cases | DENIED. Triage informs discovery scope. |

### Phase 3: Codebase Discovery

| Rationalization                                   | Why It's Wrong                                       | Response                                         |
| ------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| "I know the fingerprintx codebase"                | Discovery finds reusable patterns you forgot         | DENIED. Run Explore agents.                      |
| "Protocol is unique, nothing to reuse"            | Even unique protocols share parsing patterns         | DENIED. Discovery prevents special-casing.       |
| "Discovery is slow, I can grep for patterns"      | Manual search misses cross-plugin patterns           | DENIED. Parallel discovery is comprehensive.     |
| "Protocol research is optional"                   | Protocol research is BLOCKING. Prevents bad plugins. | DENIED. Complete protocol research.              |
| "Version markers aren't needed for this protocol" | Version detection differentiates plugins             | DENIED. Research version markers if open-source. |
| "Shodan has limited data for this protocol"       | Even limited data validates detection strategy       | DENIED. Document Shodan query results.           |

### Phase 4: Skill Discovery

| Rationalization                     | Why It's Wrong                                      | Response                               |
| ----------------------------------- | --------------------------------------------------- | -------------------------------------- |
| "I know which skills to use"        | Gateway discovery ensures completeness              | DENIED. Discover gateways dynamically. |
| "Skill manifest is extra paperwork" | Manifest enables prompt injection later             | DENIED. Write skill-manifest.yaml.     |
| "fingerprintx skills are obvious"   | Library skills have evolved. Read current versions. | DENIED. Map technologies to skills.    |

### Phase 6: Brainstorming (LARGE only)

| Rationalization                                   | Why It's Wrong                                       | Response                                            |
| ------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| "Protocol is well-documented, skip brainstorming" | Documentation != detection strategy                  | DENIED. Complete brainstorming phase.               |
| "User knows the protocol, no need to explore"     | Users describe protocols, not detection approaches   | DENIED. Brainstorming clarifies detection strategy. |
| "We can iterate during implementation"            | Detection changes during implementation cause rework | DENIED. Design first, implement second.             |

### Phase 7: Architecture Plan

| Rationalization                               | Why It's Wrong                                      | Response                               |
| --------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| "Simple protocol, minimal plan needed"        | 40% of "simple" protocols have complex edge cases   | DENIED. Complete planning phase.       |
| "I can plan as I implement"                   | Ad-hoc planning leads to rework                     | DENIED. Plan before implementation.    |
| "Banner parsing is straightforward"           | Banner parsing has malformed input edge cases       | DENIED. Architecture review required.  |
| "Security review optional for fingerprinting" | Fingerprinting can leak info, cause DoS via parsing | DENIED. Security lead review required. |

### Phase 8: Implementation

| Rationalization                       | Why It's Wrong                                         | Response                              |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| "Working code is good enough"         | Working != robust to malformed input                   | DENIED. Follow architecture plan.     |
| "I can add error handling later"      | Error handling has ~10% follow-through                 | DENIED. Implement error handling now. |
| "Type constant can be added later"    | Type registration is P0 compliance                     | DENIED. Add type constant first.      |
| "Skip TDD for simple detection logic" | Simple logic becomes complex. TDD prevents regression. | DENIED. Write test first.             |
| "Plugin import order doesn't matter"  | Alphabetical ordering is P0 compliance                 | DENIED. Maintain alphabetical order.  |

### Phase 9: Design Verification

| Rationalization                      | Why It's Wrong                              | Response                               |
| ------------------------------------ | ------------------------------------------- | -------------------------------------- |
| "Implementation looks close to plan" | Verification requires systematic comparison | DENIED. Compare each task explicitly.  |
| "Minor deviations don't matter"      | Minor deviations compound into major drift  | DENIED. Document all deviations.       |
| "Detection works on test data"       | Test data != real-world service banners     | DENIED. Verify against Shodan samples. |

### Phase 10: Domain Compliance

| Rationalization                            | Why It's Wrong                               | Response                           |
| ------------------------------------------ | -------------------------------------------- | ---------------------------------- |
| "P0 checks are overhead"                   | P0 catches common plugin failures            | DENIED. Run all compliance checks. |
| "I followed patterns, no need to verify"   | Verification catches unconscious drift       | DENIED. Verify against checklist.  |
| "Error handling is optional for detection" | Connection errors cause crashes if unhandled | DENIED. Error handling is P0.      |
| "Default ports are documented elsewhere"   | Default ports must be in plugin code         | DENIED. Add default ports.         |

### Phase 11: Code Quality

| Rationalization                          | Why It's Wrong                         | Response                              |
| ---------------------------------------- | -------------------------------------- | ------------------------------------- |
| "Security review not needed for parsing" | Parsing is a security-critical surface | DENIED. Security review required.     |
| "One retry failed, just ship it"         | Two failures indicate systemic issues  | DENIED. Escalate via AskUserQuestion. |
| "Reviewer is being too strict"           | Strict review prevents production bugs | DENIED. Address all feedback.         |

### Phase 12: Test Planning

| Rationalization                            | Why It's Wrong                                   | Response                         |
| ------------------------------------------ | ------------------------------------------------ | -------------------------------- |
| "I know what tests to write"               | Test planning ensures coverage across test types | DENIED. Create formal test plan. |
| "test-lead is overhead for simple plugins" | test-lead catches edge cases you'd miss          | DENIED. Spawn test-lead agent.   |
| "Unit tests are enough"                    | Docker + Shodan validation required              | DENIED. Plan all test types.     |

### Phase 13: Testing

| Rationalization                 | Why It's Wrong                            | Response                               |
| ------------------------------- | ----------------------------------------- | -------------------------------------- |
| "Unit tests are enough"         | Unit tests miss version-specific behavior | DENIED. All three test modes required. |
| "Docker tests are flaky"        | Flaky tests indicate timing/setup issues  | DENIED. Fix flakiness, don't skip.     |
| "80% coverage is acceptable"    | Coverage targets exist for a reason       | DENIED. Meet coverage requirements.    |
| "Shodan validation is optional" | Live validation catches real-world issues | DENIED. Shodan validation required.    |

### Phase 14: Coverage Verification

| Rationalization                      | Why It's Wrong                                 | Response                           |
| ------------------------------------ | ---------------------------------------------- | ---------------------------------- |
| "Tests pass, validation unnecessary" | Tests may not cover all version ranges         | DENIED. Verify coverage threshold. |
| "Close enough to target"             | Coverage targets are minimums, not suggestions | DENIED. Meet exact threshold.      |
| "Detection rate is good enough"      | 80% detection rate is minimum                  | DENIED. Meet detection threshold.  |

### Phase 15: Test Quality

| Rationalization                               | Why It's Wrong                   | Response                                         |
| --------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| "Flaky test doesn't count toward retry limit" | All non-passing results count    | DENIED. All failures count.                      |
| "Only 2/10 tests failed, mostly works"        | 1 failure = retry consumed       | DENIED. Fix all failures or escalate.            |
| "Docker timeout is infrastructure, not code"  | All failures count toward limits | DENIED. Infrastructure failures consume retries. |

### Phase 16: Completion

| Rationalization                                | Why It's Wrong                         | Response                              |
| ---------------------------------------------- | -------------------------------------- | ------------------------------------- |
| "Build passes locally, skip CI check"          | CI catches environment-specific issues | DENIED. Verify CI passes.             |
| "go vet warnings are minor"                    | vet warnings indicate bugs             | DENIED. Zero warnings policy.         |
| "TODO comments can stay for version detection" | TODO comments indicate incomplete work | DENIED. Resolve or document deferred. |

---

## Compaction Gate Rationalizations

| Rationalization                                     | Why It's Wrong                                                     | Response                                            |
| --------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| "Momentum bias - tasks completing successfully"     | Success breeds complacency. Context exhaustion happens silently.   | DENIED. Check context at gates 3, 8, 13.            |
| "MANIFEST is updating, that's enough persistence"   | MANIFEST != compaction. Compaction removes inline content.         | DENIED. Invoke persisting-progress-across-sessions. |
| "Context seems fine, no need to compact"            | You cannot assess context health subjectively                      | DENIED. Compaction is mandatory, not conditional.   |
| "I can compact later"                               | "Later" has ~5% completion rate. Gates are blocking.               | DENIED. Compact NOW before next phase.              |
| "Protocol research was short"                       | Even short research generates banner examples, queries, edge cases | DENIED. Follow gate protocol.                       |
| "Plugin is small, compaction overhead not worth it" | Small plugins have generated 20K+ tokens from Shodan research      | DENIED. Follow gate protocol.                       |
| "I'm in flow, don't want to break momentum"         | Momentum bias causes skipped steps                                 | DENIED. Compaction takes 2 minutes.                 |

---

## Fingerprintx-Specific Rationalizations

| Rationalization                                    | Why It's Wrong                                  | Response                                   |
| -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| "Protocol is closed-source, skip version research" | Version research is conditional, not skipped    | DENIED. Document closed-source status.     |
| "Similar protocol exists, copy and modify"         | Each protocol has unique banner formats         | DENIED. Research this specific protocol.   |
| "Shodan doesn't have this protocol"                | Use alternative sources: Censys, manual testing | DENIED. Find real-world test data.         |
| "Version extraction is best-effort"                | Version extraction must be accurate or omitted  | DENIED. Accurate or documented limitation. |
| "Edge cases are rare"                              | Rare edge cases cause production failures       | DENIED. Handle documented edge cases.      |
| "Detection accuracy doesn't need to be 100%"       | 80% is minimum. Lower rates indicate problems.  | DENIED. Meet detection threshold.          |

---

## Cross-Phase Rationalizations

| Rationalization                                   | Why It's Wrong                                  | Response                                   |
| ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| "Parallel execution means I can skip some agents" | Parallel = efficiency, not optional             | DENIED. All agents must complete.          |
| "Human checkpoint is formality"                   | Human checkpoints catch misaligned requirements | DENIED. Wait for human approval.           |
| "Detection-only, skip security review"            | Detection can expose service info, cause DoS    | DENIED. Security review required.          |
| "Different agent name means fresh start"          | Retry counts track PHASE, not agent identity    | DENIED. Counter persists in MANIFEST.yaml. |
| "This phase is simple, skip to next"              | Simple phases have mandatory outputs            | DENIED. Complete phase outputs.            |
| "We're almost done, skip verification"            | Verification catches last-mile errors           | DENIED. Complete all verification.         |

---

## Statistical Evidence

From observed patterns:

| Anti-Pattern                 | Observed Outcome                  |
| ---------------------------- | --------------------------------- |
| "I'll add tests later"       | ~10% follow-through rate          |
| "Skip protocol research"     | 60% of plugins required redesign  |
| "Error handling later"       | ~10% actually added               |
| "Close enough to spec"       | 25% require significant rework    |
| "Compact later"              | ~5% completion rate               |
| "Version detection optional" | 40% of users request version info |

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
