# Compaction Gates (Fingerprintx Development)

**BLOCKING checkpoints that enforce context compaction at phase transitions to prevent context rot.**

## Token Thresholds

| Threshold  | Tokens  | Action Required                                        |
| ---------- | ------- | ------------------------------------------------------ |
| 75% (150k) | 150,000 | **SHOULD compact** - proactive compaction recommended  |
| 80% (160k) | 160,000 | **MUST compact** - compact NOW before proceeding       |
| 85% (170k) | 170,000 | **BLOCKED** - Hook prevents agent spawn until /compact |

## Gate Locations (Fingerprintx Development)

| Gate       | After Phase                  | Before Phase                     | Rationale                                                  |
| ---------- | ---------------------------- | -------------------------------- | ---------------------------------------------------------- |
| **Gate 1** | Phase 3 (Codebase Discovery) | Phase 4 (Skill Discovery)        | Protocol research + version markers generate 15-25K tokens |
| **Gate 2** | Phase 8 (Implementation)     | Phase 9 (Design Verification)    | Plugin code, detection logic, error handling accumulate    |
| **Gate 3** | Phase 13 (Testing)           | Phase 14 (Coverage Verification) | Unit tests, Docker tests, Shodan validation outputs        |

---

## Fingerprintx-Specific "What to Compact" Tables

### Gate 1: After Codebase Discovery (Phase 3 -> 4)

| What to Compact                     | What to Keep                                 |
| ----------------------------------- | -------------------------------------------- |
| Full protocol research findings     | Protocol detection strategy (3-5 bullets)    |
| Version fingerprint matrix details  | Version ranges summary (major versions only) |
| File lists with 50+ items           | Affected directories (pkg/plugins/, etc.)    |
| Pattern analysis across all plugins | Technologies detected (Go, testing patterns) |
| Agent conversation history          | Discovery file path reference                |
| Shodan query exploration logs       | Key banner patterns (2-3 examples)           |

**Summary template (target <200 tokens):**

```
Phase 3 (Discovery): COMPLETE
- Protocol: MySQL (port 3306)
- Detection: Version string from handshake, capability flags
- Banner patterns: Server greeting format, error packet structure
- Version ranges: 5.x, 8.x distinguishable via capability bits
- Full details: .fingerprintx-development/protocol-research.md, version-matrix.md
```

### Gate 2: After Implementation (Phase 8 -> 9)

| What to Compact                          | What to Keep                     |
| ---------------------------------------- | -------------------------------- |
| Full implementation logs from developers | Files modified list (paths only) |
| Intermediate code states                 | Key implementation decisions     |
| Agent retry outputs                      | Deviation notes from plan        |
| Verbose error messages                   | Final status per task            |
| Build/lint output logs                   | Total tasks completed count      |
| Banner parsing iterations                | Detection approach summary       |

**Summary template (target <200 tokens):**

```
Phase 8 (Implementation): COMPLETE
- Files created: 3 files (plugin.go, types.go, util.go)
- Files modified: 2 files (plugins.go, types/types.go)
- Tasks completed: 5/5 (1 retry total)
- Key decisions: Used struct approach for banner parsing
- Deviations: Added extra error case per reviewer suggestion
- Full details: .fingerprintx-development/agents/capability-developer.md
```

### Gate 3: After Testing (Phase 13 -> 14)

| What to Compact               | What to Keep                      |
| ----------------------------- | --------------------------------- |
| Full test execution logs      | Pass/fail summary per test type   |
| Verbose test output           | Coverage percentage               |
| Multiple tester agent outputs | Failure list (if any)             |
| Intermediate test runs        | Test count by type                |
| Debug traces from test runs   | Test file paths                   |
| Docker container logs         | Version detection results summary |
| Shodan API response bodies    | Detection rate percentage         |

**Summary template (target <200 tokens):**

```
Phase 13 (Testing): COMPLETE
- Unit tests: 15/15 passed (pkg/plugins/mysql/*_test.go)
- Docker tests: 4/4 passed (MySQL 5.7, 8.0, MariaDB 10.x, Percona)
- Shodan validation: 85% detection rate (17/20 hosts)
- Coverage: 91% (target: 80%)
- Full details: .fingerprintx-development/agents/capability-tester.md
```

---

## Fingerprintx-Specific Heavy Phases

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

## Fingerprintx-Specific Rationalizations

| Rationalization                                        | Reality                                                                    | Response                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------- |
| "Protocol is simple, compaction overhead not worth it" | Simple protocols have generated 20K+ tokens from Shodan research alone     | DENIED. Follow gate protocol.                 |
| "I'm in flow, don't want to break momentum"            | Momentum bias causes skipped steps. Gates save time via prevention.        | DENIED. Compaction takes 2 minutes.           |
| "Version markers are optional anyway"                  | Version detection differentiates plugins. Research is valuable context.    | DENIED. Compact but preserve version summary. |
| "Tests passed quickly, less output to compact"         | Quick tests still accumulate. Gates are mandatory, not conditional.        | DENIED. Follow gate protocol.                 |
| "MANIFEST is tracking everything"                      | MANIFEST persistence != context compaction. Both required.                 | DENIED. Compact from context to file.         |
| "Protocol research was short"                          | Even short research generates banner examples, Shodan queries, edge cases. | DENIED. Follow gate protocol.                 |

---

## Compaction Verification Template

At each gate, output verification in this format:

```
Compaction Verification (Phase {N} -> Phase {N+1}):

- Progress file updated: .fingerprintx-development/MANIFEST.yaml
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
