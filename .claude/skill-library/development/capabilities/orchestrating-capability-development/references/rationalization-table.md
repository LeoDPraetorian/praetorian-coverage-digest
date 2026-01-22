# Capability Development Rationalization Table

**Anti-rationalization counters for capability development workflows.**

**Foundational Pattern**: Extends [using-skills/references/rationalization-prevention.md](../../using-skills/references/rationalization-prevention.md) with capability-specific rationalizations.

<EXTREMELY-IMPORTANT>
You MUST read this file BEFORE proceeding past any compaction gate (after phases 3, 8, or 13).

If you detect ANY of these phrases in your thinking, STOP. Return to the phase checklist. Complete all items before proceeding.
</EXTREMELY-IMPORTANT>

---

## Phase-Specific Rationalizations

### Phase 2: Triage

| Rationalization                       | Why It's Wrong                                           | Response                                |
| ------------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| "This is obviously SMALL work"        | Size determination requires Phase 3 discovery            | DENIED. Complete triage criteria.       |
| "VQL query changes are always simple" | VQL changes can affect multiple artifacts and collectors | DENIED. Triage informs discovery scope. |

### Phase 3: Codebase Discovery

| Rationalization                              | Why It's Wrong                                                      | Response                                     |
| -------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| "I know the capability types"                | Discovery finds reusable patterns you forgot about                  | DENIED. Run Explore agents.                  |
| "This is a new capability, nothing to reuse" | Even new capabilities can extend existing detection patterns        | DENIED. Discovery prevents special-casing.   |
| "VQL is simple, just write it"               | VQL artifacts have schemas, collectors, and platform considerations | DENIED. Discovery surfaces complexity.       |
| "Nuclei templates are self-contained"        | Templates can reuse matchers, extractors, variables from existing   | DENIED. Parallel discovery is comprehensive. |

### Phase 4: Skill Discovery

| Rationalization                 | Why It's Wrong                                | Response                               |
| ------------------------------- | --------------------------------------------- | -------------------------------------- |
| "I know which skills to use"    | Gateway discovery ensures completeness        | DENIED. Discover gateways dynamically. |
| "Capability skills are obvious" | Skill manifest enables prompt injection later | DENIED. Write skill-manifest.yaml.     |

### Phase 6: Brainstorming (LARGE only)

| Rationalization                                | Why It's Wrong                                            | Response                                  |
| ---------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| "Detection logic is clear, skip brainstorming" | Brainstorming reveals edge cases and false positive risks | DENIED. Complete brainstorming phase.     |
| "CVE details tell us what to detect"           | CVEs describe impact, not optimal detection strategy      | DENIED. Brainstorming clarifies approach. |
| "We can refine detection during testing"       | Detection logic changes during testing cause rework       | DENIED. Design first, implement second.   |

### Phase 7: Architecture Plan

| Rationalization                                    | Why It's Wrong                                           | Response                               |
| -------------------------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| "Simple detection, minimal plan needed"            | 40% of "simple" capabilities have hidden complexity      | DENIED. Complete planning phase.       |
| "I can design as I implement"                      | Ad-hoc design leads to detection gaps                    | DENIED. Plan before implementation.    |
| "It's just a VQL query, no architecture"           | VQL queries affect artifacts, collectors, output schemas | DENIED. Architecture review required.  |
| "Security review optional for internal capability" | Security capabilities need security review for accuracy  | DENIED. Security lead review required. |

### Phase 8: Implementation

| Rationalization                      | Why It's Wrong                                           | Response                          |
| ------------------------------------ | -------------------------------------------------------- | --------------------------------- |
| "Detection works, good enough"       | Working != accurate, low FP, well-tested                 | DENIED. Follow architecture plan. |
| "I can add edge case handling later" | Edge case handling has ~10% follow-through               | DENIED. Implement edge cases now. |
| "VQL syntax is close enough"         | VQL syntax must be exact or query fails                  | DENIED. Validate syntax.          |
| "Skip TDD for simple matchers"       | Simple matchers become complex. TDD prevents regression. | DENIED. Write test first.         |

### Phase 9: Design Verification

| Rationalization                                 | Why It's Wrong                                | Response                              |
| ----------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| "Implementation looks close to plan"            | Verification requires systematic comparison   | DENIED. Compare each task explicitly. |
| "Minor detection logic deviations don't matter" | Minor deviations compound into detection gaps | DENIED. Document all deviations.      |

### Phase 10: Domain Compliance

| Rationalization                           | Why It's Wrong                                          | Response                           |
| ----------------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| "P0 checks are overhead for capabilities" | P0 catches common capability failures (syntax, FP rate) | DENIED. Run all compliance checks. |
| "VQL compiles, no need to verify"         | Compilation != correct detection logic                  | DENIED. Verify against checklist.  |

### Phase 11: Code Quality

| Rationalization                                     | Why It's Wrong                                           | Response                              |
| --------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| "Security review redundant for security capability" | Security capabilities can have their own vulnerabilities | DENIED. Security review required.     |
| "One retry failed, detection is close enough"       | Two failures indicate systemic detection issues          | DENIED. Escalate via AskUserQuestion. |
| "Reviewer is being too strict about FP rate"        | Strict FP standards prevent alert fatigue                | DENIED. Address all feedback.         |

### Phase 12: Test Planning

| Rationalization                               | Why It's Wrong                                            | Response                         |
| --------------------------------------------- | --------------------------------------------------------- | -------------------------------- |
| "I know what tests to write"                  | Test planning ensures coverage across detection scenarios | DENIED. Create formal test plan. |
| "test-lead is overhead for simple capability" | test-lead catches edge cases you'd miss                   | DENIED. Spawn test-lead agent.   |

### Phase 13: Testing

| Rationalization                        | Why It's Wrong                                    | Response                               |
| -------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| "Detection tests are enough"           | Detection tests miss false positive scenarios     | DENIED. All three test modes required. |
| "FP tests are overkill"                | False positives cause alert fatigue in production | DENIED. FP testing mandatory.          |
| "90% detection accuracy is acceptable" | Detection targets exist for a reason              | DENIED. Meet detection requirements.   |

### Phase 14: Coverage Verification

| Rationalization                      | Why It's Wrong                                  | Response                           |
| ------------------------------------ | ----------------------------------------------- | ---------------------------------- |
| "Tests pass, validation unnecessary" | Tests may not cover all detection scenarios     | DENIED. Verify coverage threshold. |
| "Close enough to detection target"   | Detection targets are minimums, not suggestions | DENIED. Meet exact threshold.      |

### Phase 15: Test Quality

| Rationalization                               | Why It's Wrong                   | Response                                      |
| --------------------------------------------- | -------------------------------- | --------------------------------------------- |
| "Flaky detection test doesn't count"          | All non-passing results count    | DENIED. All failures count.                   |
| "Only 2/10 scenarios failed, mostly works"    | 1 failure = retry consumed       | DENIED. Fix all failures or escalate.         |
| "Test environment issue, not detection logic" | All failures count toward limits | DENIED. Environment failures consume retries. |

### Phase 16: Completion

| Rationalization                          | Why It's Wrong                          | Response                      |
| ---------------------------------------- | --------------------------------------- | ----------------------------- |
| "Detection works locally, skip CI check" | CI catches environment-specific issues  | DENIED. Verify CI passes.     |
| "Lint warnings in VQL are minor"         | Lint warnings indicate potential issues | DENIED. Zero warnings policy. |

---

## Compaction Gate Rationalizations

| Rationalization                                   | Why It's Wrong                                                         | Response                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| "Momentum bias - detection tests completing"      | Success breeds complacency. Context exhaustion happens silently.       | DENIED. Check context at gates 3, 8, 13.            |
| "MANIFEST is updating, that's enough persistence" | MANIFEST != compaction. Compaction removes inline content.             | DENIED. Invoke persisting-progress-across-sessions. |
| "Context seems fine, no need to compact"          | You cannot assess context health subjectively                          | DENIED. Compaction is mandatory, not conditional.   |
| "I can compact later"                             | "Later" has ~5% completion rate. Gates are blocking.                   | DENIED. Compact NOW before next phase.              |
| "VQL queries are small, compaction not needed"    | VQL + artifacts + tests + reviews = heavy context                      | DENIED. Follow gate protocol.                       |
| "Still debugging detection, need all context"     | Debugging context goes in files. Fresh context enables clear thinking. | DENIED. Persist to file, then compact.              |

---

## Capability-Type Specific Rationalizations

### VQL Capabilities

| Rationalization                         | Why It's Wrong                                                  | Response                        |
| --------------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| "VQL is just a query language"          | VQL has artifacts, collectors, schemas, platform considerations | DENIED. Full workflow required. |
| "Velociraptor will catch syntax errors" | Runtime errors are more costly than compile-time                | DENIED. Validate syntax early.  |

### Nuclei Templates

| Rationalization                       | Why It's Wrong                                          | Response                            |
| ------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| "It's just YAML, minimal complexity"  | Matchers, extractors, conditions require careful design | DENIED. Full architecture required. |
| "Template validates, detection works" | Validation != low FP rate                               | DENIED. FP testing mandatory.       |

### Janus/Fingerprintx

| Rationalization              | Why It's Wrong                              | Response                              |
| ---------------------------- | ------------------------------------------- | ------------------------------------- |
| "Go code compiles, it works" | Compilation != correct protocol handling    | DENIED. Integration testing required. |
| "Interface is simple"        | Interface contracts must be exactly correct | DENIED. Verify interface compliance.  |

### Scanner Integrations

| Rationalization                   | Why It's Wrong                                        | Response                              |
| --------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| "API is documented, just call it" | Rate limiting, pagination, error handling are complex | DENIED. Full implementation required. |
| "Data mapping is straightforward" | Field mapping requires careful normalization          | DENIED. Verify mapping accuracy.      |

---

## Cross-Phase Rationalizations

| Rationalization                                   | Why It's Wrong                                 | Response                                   |
| ------------------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| "Parallel execution means I can skip some agents" | Parallel = efficiency, not optional            | DENIED. All agents must complete.          |
| "Human checkpoint is formality"                   | Human checkpoints catch detection logic errors | DENIED. Wait for human approval.           |
| "VQL-only, skip Go-related phases"                | VQL capabilities still need testing and review | Ask user to confirm scope.                 |
| "Different agent name means fresh start"          | Retry counts track PHASE, not agent identity   | DENIED. Counter persists in MANIFEST.yaml. |
| "This phase is simple, skip to next"              | Simple phases have mandatory outputs           | DENIED. Complete phase outputs.            |
| "Detection tests pass, skip validation"           | Validation catches edge cases and FP scenarios | DENIED. Complete all verification.         |

---

## Statistical Evidence

From observed patterns:

| Anti-Pattern                | Observed Outcome                         |
| --------------------------- | ---------------------------------------- |
| "I'll add edge cases later" | ~10% follow-through rate                 |
| "Skip brainstorming"        | 40% of "simple" capabilities are complex |
| "FP handling later"         | ~10% actually added                      |
| "Close enough to spec"      | 25% require significant detection rework |
| "Compact later"             | ~5% completion rate                      |

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
