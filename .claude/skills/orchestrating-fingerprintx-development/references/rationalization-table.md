# Rationalization Prevention Table

Complete list of agent rationalizations for skipping gates and the correct responses.

## Phase 3 Gate (Protocol Research) Rationalizations

| Rationalization                                | Why It's Wrong                                                        | Correct Response                                               |
| ---------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| "The protocol is simple, I know it"            | Lab testing reveals edge cases you don't anticipate                   | DENIED. Research reveals edge cases. Complete Phase 3.         |
| "I've implemented {protocol} before"           | Past experience doesn't capture new versions or deployment variations | DENIED. Research this specific deployment. Complete Phase 3.   |
| "Just need basic detection, details later"     | "Later" has ~10% completion rate                                      | DENIED. Complete research now or it won't get done.            |
| "Can skip lab, I'll test after implementation" | Post-implementation testing finds design flaws too late               | DENIED. Lab testing first prevents implementation rework.      |
| "Similar protocol already has a plugin"        | Similar != identical, subtle differences cause false positives        | DENIED. False positive mitigation requires research.           |
| "Docker container not available"               | Use alternative lab setup (local install, cloud service)              | NOT ACCEPTED. Find alternative lab setup. See troubleshooting. |
| "False positive mitigation is optional"        | False positives are a critical failure mode                           | DENIED. False positive mitigation is required.                 |
| "4 out of 5 gate items is close enough"        | Gates are all-or-nothing                                              | DENIED. Complete all 5 items.                                  |

## Phase 4 Gate (Version Marker Research) Rationalizations

| Rationalization                        | Why It's Wrong                                                      | Correct Response                                            |
| -------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| "Version detection can be added later" | CPE precision is a requirement, not optional                        | DENIED. CPE precision required. Complete Phase 4.           |
| "Banner parsing is enough"             | Banners are often missing, spoofed, or non-standard                 | DENIED. Source analysis provides deterministic markers.     |
| "Only 2 version ranges found"          | Minimum 3 ranges required for useful version detection              | GATE FAILS. Expand analysis to find 3+ ranges.              |
| "Version markers have low confidence"  | LOW confidence markers are acceptable if documented                 | ACCEPTED if documented as LOW confidence with fallback CPE. |
| "Source code analysis is overwhelming" | Focus on major version boundaries, sample strategically             | NOT ACCEPTED. Use sampling strategy. See troubleshooting.   |
| "All versions look the same"           | Expand search: constants, defaults, feature flags, protocol changes | NOT ACCEPTED. Expand search. See troubleshooting.           |
| "Time pressure, skip version research" | Skipping causes 10x rework later                                    | DENIED. Technical debt has ~10% fix rate. Complete now.     |
| "Closed-source but I found source"     | If source exists, version research is REQUIRED                      | NOT ACCEPTED. Treat as open-source, complete Phase 4.       |

## Phase 5 (Implementation) Rationalizations

| Rationalization                            | Why It's Wrong                                            | Correct Response                                     |
| ------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------- |
| "I already have detection code working"    | Working != Complete. Must pass gate checklist.            | DENIED. Complete implementation checklist.           |
| "Two-phase detection is overhead"          | Standard fingerprintx pattern, required for consistency   | DENIED. Implement detect and enrich phases.          |
| "Version extraction can be TODO"           | No TODO comments allowed for version or CPE               | DENIED. Complete version extraction now.             |
| "CPE format looks right"                   | Must validate against CPE 2.3 spec and NVD                | NOT ACCEPTED. Validate CPE format.                   |
| "Tests pass, manual verification overkill" | Manual verification catches integration issues tests miss | DENIED. Both tests AND manual verification required. |

## Phase 6 Gate (Validation) Rationalizations

| Rationalization                                 | Why It's Wrong                                 | Correct Response                                 |
| ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| "Tests pass, that's good enough"                | Manual verification tests different code paths | DENIED. Manual verification required.            |
| "70% version accuracy is acceptable"            | Minimum 80% accuracy required                  | GATE FAILS. Refine detection logic to reach 80%. |
| "Just one TODO left"                            | No TODOs allowed for CPE or version            | DENIED. Complete TODO now.                       |
| "Manual verification failed but I'll fix later" | Gate requires passing manual verification      | GATE FAILS. Fix issues, re-validate.             |
| "Can't test all versions, tested 3"             | Must test all version ranges from matrix       | NOT ACCEPTED. Test all matrix ranges.            |
| "CPE format close enough"                       | Must match exact CPE 2.3 format                | GATE FAILS. Fix CPE format.                      |

## Cross-Phase Rationalizations

| Rationalization                           | Why It's Wrong                                                      | Correct Response                                |
| ----------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| "The gate is too strict"                  | Gate exists because past modules failed without it                  | DENIED. Gates prevent known failure modes.      |
| "Just this once"                          | "Just this once" is how every bad pattern starts                    | DENIED. No exceptions.                          |
| "User said to skip"                       | User doesn't override workflow. Explain why gates matter.           | DENIED. Explain technical debt cost to user.    |
| "Experienced developer, don't need gates" | Gates catch errors regardless of experience                         | DENIED. Gates apply to everyone.                |
| "Time pressure, ship now iterate later"   | Technical debt has ~10% fix rate                                    | DENIED. Complete now or it won't get completed. |
| "This is a special case"                  | All cases feel special. Gates exist because "special" cases failed. | DENIED. Gates have no exceptions.               |

## Orchestrator-Level Rationalizations

| Rationalization                              | Why It's Wrong                                             | Correct Response                                 |
| -------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| "I'll just use the individual skills"        | You'll skip gates. Orchestrator enforces them.             | DENIED. Use orchestrator as entry point.         |
| "Orchestrator is overhead"                   | Overhead prevents 10x rework from skipped research         | DENIED. Overhead is intentional quality gate.    |
| "I know the workflow"                        | Knowing != Following. Orchestrator ensures following.      | DENIED. Orchestrator ensures workflow adherence. |
| "Simple protocol doesn't need full workflow" | Simple protocols have edge cases too                       | DENIED. All protocols require full workflow.     |
| "Can I skip Phase X?"                        | All phases are required (except Phase 4 for closed-source) | DENIED unless Phase 4 and closed-source.         |

## Gate Override Criteria (EXTREMELY RARE)

The ONLY valid gate override is explicit user acknowledgment via AskUserQuestion.

### Valid Override Scenario

```
AskUserQuestion:
'Phase 3 gate has not passed. Proceeding without complete protocol
research will likely result in:
- Poor detection accuracy
- Missing edge cases
- Failed plugin

Do you want to proceed anyway?'

Options:
- No, let me complete the research (RECOMMENDED)
- Yes, I accept the risks and will fix issues later
```

**If user selects "Yes"**: Document override in PR and changelog, proceed with Phase 4.

### Invalid Override Scenarios

- Agent decides to override without asking user
- User says "just do it" in casual conversation (must use formal AskUserQuestion)
- Agent rationalizes "user implied they want to skip" (explicit only)
- Time pressure without user acknowledgment
- "I know better than the gate" (agents don't override gates)

## Rationalization Detection Pattern

**Watch for these phrases**:

- "I think we can skip..."
- "This is probably optional..."
- "Let's come back to this..."
- "Close enough..."
- "The user wants it fast..."
- "I'll fix it later..."
- "This is a special case..."
- "I'm confident about..."

**When you see these phrases**: STOP. You are rationalizing. Return to gate checklist.

## Why Rationalizations Fail

### Statistical Reality

- Technical debt fix rate: ~10%
- "Later" completion rate: ~5%
- "Simple" tasks that were actually complex: ~40%
- False positives from skipped research: ~30%
- CPE errors from skipped version research: ~50%

### Workflow Design

Gates exist BECAUSE these specific shortcuts failed repeatedly:

- Phase 3 gate: Prevents poor detection logic (observed failure mode)
- Phase 4 gate: Prevents imprecise CPEs (observed failure mode)
- Phase 6 gate: Prevents untested code (observed failure mode)

**The gates encode lessons from failed plugins.** Skipping them repeats known failures.

## Enforcing Gates

### Agent Responsibilities

1. **Read gate checklist before declaring gate passed**
2. **ALL items must be complete** (not 4/5, not "close enough")
3. **Document evidence** (file exists, contains required content)
4. **Block progression if gate fails** (mark todo as BLOCKED)
5. **Only proceed with explicit user override** (via AskUserQuestion)

### What "BLOCKING" Means

```
BLOCKING = CANNOT PROCEED

NOT:
- "I'll proceed and come back to it" ❌
- "This is probably fine" ❌
- "The user wants speed" ❌
- "I'll make a TODO" ❌

ONLY:
- Complete the gate requirements ✅
- OR get explicit user override ✅
```

### Handling User Pressure

If user says "Skip the research, I'm in a hurry":

```
Agent response:
"The fingerprintx orchestrator enforces research gates to prevent
common failure modes:

- Without protocol research: Poor detection accuracy (~30% false positive rate)
- Without version research: Imprecise CPEs (mysql:* instead of mysql:8.0.23)

Time required:
- Protocol research: 2-3 hours
- Version research: 3-4 hours
- Total: 5-7 hours

Skipping research causes 10x rework later (5-7 hours becomes 50-70 hours of
debugging and fixes, with ~10% completion rate for technical debt).

Would you like to:
1. Proceed with proper research (RECOMMENDED)
2. Delay the feature until time is available
3. Override gates with explicit acknowledgment (RARE, must be documented)"
```

**Do not proceed without user choice from these 3 options.**
