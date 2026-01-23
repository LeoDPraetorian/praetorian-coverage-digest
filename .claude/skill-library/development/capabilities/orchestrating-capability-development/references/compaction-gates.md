# Compaction Gates (Capability Development)

**BLOCKING checkpoints that enforce context compaction at phase transitions to prevent context rot.**

**Purpose**: BLOCKING checkpoints that enforce context compaction at phase transitions.

## Token Thresholds

| Threshold  | Tokens  | Action Required                                        |
| ---------- | ------- | ------------------------------------------------------ |
| 75% (150k) | 150,000 | **SHOULD compact** - proactive compaction recommended  |
| 80% (160k) | 160,000 | **MUST compact** - compact NOW before proceeding       |
| 85% (170k) | 170,000 | **BLOCKED** - Hook prevents agent spawn until /compact |

## Gate Locations (Capability Development)

| Gate       | After Phase                  | Before Phase                     | Rationale                                                       |
| ---------- | ---------------------------- | -------------------------------- | --------------------------------------------------------------- |
| **Gate 1** | Phase 3 (Codebase Discovery) | Phase 4 (Skill Discovery)        | Discovery agents explore VQL/Nuclei/Go patterns - heavy context |
| **Gate 2** | Phase 8 (Implementation)     | Phase 9 (Design Verification)    | Capability artifacts + error logs accumulate                    |
| **Gate 3** | Phase 13 (Testing)           | Phase 14 (Coverage Verification) | Test execution logs, detection validation outputs               |

---

## Capability-Specific "What to Compact" Tables

### Gate 1: After Codebase Discovery (Phase 3 -> 4)

| What to Compact                               | What to Keep                                              |
| --------------------------------------------- | --------------------------------------------------------- |
| Full VQL/Nuclei/Go file contents from Explore | Capability type determination (VQL/Nuclei/Janus/etc.)              |
| File lists with 30+ items                     | Module location paths (e.g., {CAPABILITIES_ROOT}/modules/nebula/) |
| Pattern analysis across all capability files  | Technologies detected (Go, VQL, YAML templates)           |
| Detailed code snippets from exploration       | Existing similar capabilities found (names only)          |
| Agent conversation history                    | Discovery file path reference                             |

**Summary template (target <200 tokens):**

```
Phase 3 (Discovery): COMPLETE
- Capability Type: {type} (determined from codebase)
- Module Location: {CAPABILITIES_ROOT}/modules/{capability}/
- Similar Capabilities: s3-credential-scanner, ssh-key-exposure
- Technologies: VQL, Go collectors
- Full details: .capability-development/discovery.md
```

### Gate 2: After Implementation (Phase 8 -> 9)

| What to Compact                                    | What to Keep                        |
| -------------------------------------------------- | ----------------------------------- |
| Full implementation logs from capability-developer | Artifacts created list (paths only) |
| VQL query iterations and debugging                 | Key detection logic decisions       |
| Nuclei template drafts                             | Deviation notes from architecture   |
| Go code compilation attempts                       | Final status per task               |
| Verbose error messages                             | Total tasks completed count         |

**Summary template (target <200 tokens):**

```
Phase 8 (Implementation): COMPLETE
- Artifacts created: 3 files (1 VQL query, 1 collector, 1 artifact)
- Tasks completed: 4/4 (1 retry for syntax error)
- Key decisions: Used artifact_definitions for structured output
- Deviations: Added additional platform check per security-lead
- Full details: .capability-development/agents/capability-developer.md
```

### Gate 3: After Testing (Phase 13 -> 14)

| What to Compact               | What to Keep                    |
| ----------------------------- | ------------------------------- |
| Full test execution logs      | Pass/fail summary per test type |
| Detection test verbose output | Detection accuracy percentage   |
| False positive test results   | False positive rate             |
| Multi-platform test logs      | Platform coverage summary       |
| Debug traces from test runs   | Test file paths                 |

**Summary template (target <200 tokens):**

```
Phase 13 (Testing): COMPLETE
- Detection tests: 12/12 passed (95% accuracy on test samples)
- False positive tests: 0/20 false positives (0% FP rate)
- Platform tests: Windows/Linux passing, macOS N/A
- Edge cases: 5/5 passed (empty files, permission denied, large files)
- Full details: .capability-development/agents/capability-tester.md
```

---

## Capability-Specific Heavy Phases

These phases spawn multiple agents and require pre-spawn token checks:

| Phase                           | Agents Spawned                                              | Risk                                  |
| ------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| **Phase 7** (Architecture Plan) | capability-lead + security-lead (or backend-lead)           | Design iterations for detection logic |
| **Phase 8** (Implementation)    | capability-developer (possibly multiple for complex chains) | Failed compilations + syntax errors   |
| **Phase 13** (Testing)          | capability-tester ×3 (detection, FP, edge cases)            | Test output verbosity                 |

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

## Capability-Specific Rationalizations

| Rationalization                                   | Reality                                                                | Response                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| "VQL queries are small, compaction not needed"    | VQL exploration generates 15K+ tokens from multiple artifact samples   | DENIED. Follow gate protocol.               |
| "I'm testing detection, need to keep all context" | Test results can be summarized. Detection rate is the key metric.      | DENIED. Keep metrics, compact logs.         |
| "Nuclei template is just YAML, minimal context"   | Template + test results + FP validation = heavy context                | DENIED. All capability types require gates. |
| "Still debugging detection logic, can't compact"  | Debugging context goes in files. Fresh context enables clear thinking. | DENIED. Persist to file, then compact.      |
| "MANIFEST is tracking everything"                 | MANIFEST persistence != context compaction. Both required.             | DENIED. Compact from context to file.       |

---

## Compaction Verification Template

At each gate, output verification in this format:

```
Compaction Verification (Phase {N} -> Phase {N+1}):

PASS Progress file updated: .capability-development/MANIFEST.yaml
   - Phase {N} section: {line_count} lines
   - Last write: {timestamp}

PASS Context compacted:
   - Before: {before_tokens} tokens (full {phase_name} output)
   - After: {after_tokens} tokens (summary + file references)
   - Reduction: {percentage}%

PASS File references valid:
   - {artifact}.md exists ({line_count} lines)
   - MANIFEST.yaml phases.{phase} section confirmed

Gate status: PASSED. Proceeding to Phase {N+1}.
```

---

## Integration

**Required Skill**: `persisting-progress-across-sessions` - MUST invoke at every compaction gate

**Token Monitoring**: See [context-monitoring.md](context-monitoring.md) for measurement scripts

**Skip Protocol**: ONLY via explicit user approval with risk disclosure. Document in MANIFEST.yaml.
