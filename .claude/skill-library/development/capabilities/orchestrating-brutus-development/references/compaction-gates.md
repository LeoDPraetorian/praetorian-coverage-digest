# Compaction Gates (Brutus Development)

**BLOCKING checkpoints that enforce context compaction at phase transitions to prevent context rot.**

## Token Thresholds

| Threshold  | Tokens  | Action Required                                        |
| ---------- | ------- | ------------------------------------------------------ |
| 75% (150k) | 150,000 | **SHOULD compact** - proactive compaction recommended  |
| 80% (160k) | 160,000 | **MUST compact** - compact NOW before proceeding       |
| 85% (170k) | 170,000 | **BLOCKED** - Hook prevents agent spawn until /compact |

## Gate Locations (Brutus Development)

| Gate       | After Phase                  | Before Phase                     | Rationale                                             |
| ---------- | ---------------------------- | -------------------------------- | ----------------------------------------------------- |
| **Gate 1** | Phase 3 (Codebase Discovery) | Phase 4 (Skill Discovery)        | Protocol research + auth patterns generate 15-25K tokens |
| **Gate 2** | Phase 8 (Implementation)     | Phase 9 (Design Verification)    | Plugin code, error classification, tests accumulate   |
| **Gate 3** | Phase 13 (Testing)           | Phase 14 (Coverage Verification) | Unit tests, error classification test outputs         |

---

## Brutus-Specific "What to Compact" Tables

### Gate 1: After Codebase Discovery (Phase 3 -> 4)

| What to Compact                       | What to Keep                                 |
| ------------------------------------- | -------------------------------------------- |
| Full protocol research findings       | Credential testing strategy (3-5 bullets)    |
| Auth method analysis details          | Auth methods summary (password/key-based)    |
| File lists with 50+ items             | Affected directories (internal/plugins/, etc.) |
| Pattern analysis across all plugins   | Technologies detected (Go, testing patterns) |
| Agent conversation history            | Discovery file path reference                |
| Library/dependency exploration logs   | Key dependencies (2-3 libraries)             |

**Summary template (target <200 tokens):**

```
Phase 3 (Discovery): COMPLETE
- Protocol: SSH (port 22)
- Auth: Password + key-based (KeyPlugin required)
- Error classification: Connection timeout vs auth failure via error types
- Dependencies: golang.org/x/crypto/ssh
- Full details: .brutus-development/protocol-research.md
```

### Gate 2: After Implementation (Phase 8 -> 9)

| What to Compact                          | What to Keep                     |
| ---------------------------------------- | -------------------------------- |
| Full implementation logs from developers | Files modified list (paths only) |
| Intermediate code states                 | Key implementation decisions     |
| Agent retry outputs                      | Deviation notes from plan        |
| Verbose error messages                   | Final status per task            |
| Build/lint output logs                   | Total tasks completed count      |
| Auth method testing iterations           | Error classification approach    |

**Summary template (target <200 tokens):**

```
Phase 8 (Implementation): COMPLETE
- Files created: 2 files ({protocol}.go, {protocol}_test.go)
- Files modified: 1 file (init.go)
- Tasks completed: 5/5 (1 retry total)
- Key decisions: Used error type assertion for classification
- Deviations: Added extra error case per reviewer suggestion
- Full details: .brutus-development/agents/capability-developer.md
```

### Gate 3: After Testing (Phase 13 -> 14)

| What to Compact               | What to Keep                      |
| ----------------------------- | --------------------------------- |
| Full test execution logs      | Pass/fail summary per test type   |
| Verbose test output           | Coverage percentage               |
| Multiple tester agent outputs | Failure list (if any)             |
| Intermediate test runs        | Test count by type                |
| Debug traces from test runs   | Test file paths                   |
| Error classification traces   | Classification accuracy summary   |

**Summary template (target <200 tokens):**

```
Phase 13 (Testing): COMPLETE
- Unit tests: 12/12 passed (internal/plugins/{protocol}/*_test.go)
- Error classification: All error types correctly classified
- Coverage: 85% (target: 80%)
- Full details: .brutus-development/agents/capability-tester.md
```

---

## Brutus-Specific Heavy Phases

These phases spawn multiple agents and require pre-spawn token checks:

| Phase                           | Agents Spawned                   | Risk                                           |
| ------------------------------- | -------------------------------- | ---------------------------------------------- |
| **Phase 7** (Architecture Plan) | capability-lead + security-lead  | Design iterations accumulate                   |
| **Phase 8** (Implementation)    | capability-developer (may retry) | Failed agents + retries = rapid context growth |
| **Phase 13** (Testing)          | 3x tester agents in parallel     | Test output verbosity                          |

### Pre-Spawn Protocol (Phases 7, 8, 13)

**Before EACH agent spawn:**

```
1. Check current token usage

2. Apply enforcement:
   if tokens > 85%:
     -> BLOCKED by hook - cannot spawn until /compact

   if tokens > 80%:
     -> MUST compact before spawning (full 5-step protocol)

   if tokens > 75%:
     -> SHOULD compact (abbreviated: summarize completed work)

   else:
     -> Proceed with spawn
```

### Retry Compaction

When an agent FAILS and you're about to retry:

1. Check tokens (may have grown from failed attempt)
2. Summarize failed attempt: "Agent failed with: {error}. Retrying."
3. Do NOT include full failed output in retry prompt
4. Spawn fresh agent with clean context

---

## Brutus-Specific Rationalizations

| Rationalization                                        | Reality                                                                    | Response                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------- |
| "Protocol is simple, compaction overhead not worth it" | Simple protocols have generated 20K+ tokens from auth research alone       | DENIED. Follow gate protocol.                 |
| "I'm in flow, don't want to break momentum"            | Momentum bias causes skipped steps. Gates save time via prevention.        | DENIED. Compaction takes 2 minutes.           |
| "Error classification is straightforward"              | Error handling has edge cases. Research is valuable context.               | DENIED. Compact but preserve error summary.   |
| "Tests passed quickly, less output to compact"         | Quick tests still accumulate. Gates are mandatory, not conditional.        | DENIED. Follow gate protocol.                 |
| "MANIFEST is tracking everything"                      | MANIFEST persistence != context compaction. Both required.                 | DENIED. Compact from context to file.         |
| "Protocol research was short"                          | Even short research generates auth examples, library docs, edge cases.     | DENIED. Follow gate protocol.                 |

---

## Compaction Verification Template

At each gate, output verification in this format:

```
Compaction Verification (Phase {N} -> Phase {N+1}):

- Progress file updated: .brutus-development/MANIFEST.yaml
   - Phase {N} section: {line_count} lines
   - Last write: {timestamp}

- Context compacted:
   - Before: {before_tokens} tokens (full {phase_name} output)
   - After: {after_tokens} tokens (summary + file references)
   - Reduction: {percentage}%

- File references valid:
   - {artifact}.md exists ({line_count} lines)
   - MANIFEST.yaml phases.{phase} section confirmed

Gate status: PASSED. Proceeding to Phase {N+1}.
```

---

## Integration

**Required Skill**: `persisting-progress-across-sessions` - MUST invoke at every compaction gate

**Token Monitoring**: See [context-monitoring.md](context-monitoring.md) for measurement scripts

**Skip Protocol**: ONLY via explicit user approval with risk disclosure. Document in MANIFEST.yaml.
