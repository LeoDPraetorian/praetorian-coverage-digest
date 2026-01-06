# Workflow Diagram

Visual representation of the 7-phase fingerprintx development workflow with gates and decision points.

## Phase Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  START: User Request                          │
│         "Create a {protocol} fingerprintx module"            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Requirements Gathering                              │
│ ─────────────────────────────────────                        │
│ • Collect via AskUserQuestion:                               │
│   - Protocol name                                            │
│   - Default ports                                            │
│   - Source code availability                                 │
│   - Similar protocols                                        │
│   - Reference plugins                                        │
│                                                              │
│ OUTPUT: {protocol}-requirements.md                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Open-Source Decision Point                          │
│ ─────────────────────────────────────                        │
│ IF source repository URL provided:                           │
│    version_research = REQUIRED                               │
│ ELSE:                                                        │
│    version_research = SKIP                                   │
│                                                              │
│ OUTPUT: Workflow path determined                             │
└──────────────┬────────────────────────────────┬─────────────┘
               │                                │
               │ Source available               │ Closed-source
               ▼                                │
┌─────────────────────────────────────────┐    │
│ Phase 3: Protocol Research  ████ GATE ████   │
│ ─────────────────────────────────────── │    │
│ • Invoke researching-protocols skill     │    │
│ • 7-phase workflow                       │    │
│ • Lab environment testing                │    │
│ • Detection probe design                 │    │
│ • False positive mitigation              │    │
│                                          │    │
│ OUTPUT: {protocol}-protocol-research.md  │    │
└──────────────┬───────────────────────────┘    │
               │                                │
               ▼                                │
          ┌────────┐                            │
          │ GATE   │                            │
          │ CHECK  │                            │
          └────┬───┘                            │
               │                                │
      ┌────────┴────────┐                       │
      │                 │                       │
   PASS ✅          FAIL ❌                    │
      │                 │                       │
      │                 └─► BLOCKED             │
      │                     Return to Phase 3   │
      ▼                                         │
┌─────────────────────────────────────────┐    │
│ Phase 4: Version Marker Research         │    │
│              ████ CONDITIONAL GATE ████  │◄───┘
│ ──────────────────────────────────────── │    (SKIP if
│ • Skip if version_research = SKIP        │    closed-source)
│ • Invoke researching-version-markers     │
│ • 8-phase workflow                       │
│ • Source code analysis                   │
│ • Version fingerprint matrix             │
│                                          │
│ OUTPUT: {protocol}-version-matrix.md     │
└──────────────┬───────────────────────────┘
               │
               ▼
          ┌────────┐
          │ GATE   │
          │ CHECK  │
          └────┬───┘
               │
      ┌────────┴────────┐
      │                 │
   PASS ✅          FAIL ❌
      │                 │
      │                 └─► BLOCKED
      │                     Return to Phase 4
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: Implementation                                      │
│ ─────────────────────────────────────                        │
│ • Invoke writing-fingerprintx-modules skill                  │
│ • Use inputs from Phase 3 (protocol research)                │
│ • Use inputs from Phase 4 (version matrix, if available)     │
│ • Implement 5-method interface                               │
│ • Register plugin in types.go and plugin_list.go             │
│ • Two-phase detection (detect + enrich)                      │
│                                                              │
│ OUTPUT: Plugin code in pkg/plugins/services/{protocol}/      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 6: Validation          ████ GATE ████                 │
│ ─────────────────────────────────────                        │
│ • go build ./...                                             │
│ • go vet ./...                                               │
│ • go test .../...                                            │
│ • Manual verification (fingerprintx -t localhost:{port})     │
│ • Multi-version testing (Docker containers)                  │
│ • CPE validation                                             │
│                                                              │
│ OUTPUT: {protocol}-validation-report.md                      │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
          ┌────────┐
          │ GATE   │
          │ CHECK  │
          └────┬───┘
               │
      ┌────────┴────────┐
      │                 │
   PASS ✅          FAIL ❌
      │                 │
      │                 └─► BLOCKED
      │                     Fix issues, re-validate
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 7: Integration & PR Preparation                        │
│ ─────────────────────────────────────                        │
│ • Verify file locations                                      │
│ • Alphabetize imports and constants                          │
│ • Add package comments                                       │
│ • Remove TODO comments                                       │
│ • Generate PR description                                    │
│                                                              │
│ OUTPUT: {protocol}-pr-description.md                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    COMPLETE: Ready for PR                    │
│                                                              │
│ All artifacts in .claude/.output/capabilities/{YYYY-MM-DD-HHMMSS}-{protocol}-fingerprintx/:     │
│ • requirements.md                                            │
│ • protocol-research.md                                       │
│ • version-matrix.md (if applicable)                          │
│ • validation-report.md                                       │
│ • pr-description.md                                          │
│ • MANIFEST.yaml                                              │
└─────────────────────────────────────────────────────────────┘
```

## Gate Legend

| Symbol                     | Meaning                                                 |
| -------------------------- | ------------------------------------------------------- |
| ████ GATE ████             | Blocking gate - cannot proceed without passing          |
| ████ CONDITIONAL GATE ████ | Blocking if applicable (skip if closed-source)          |
| PASS ✅                    | Gate conditions met, proceed to next phase              |
| FAIL ❌                    | Gate conditions not met, BLOCKED                        |
| BLOCKED                    | Must return to previous phase and complete requirements |

## Decision Points

### Decision Point 1: Version Research Required?

**Location**: Phase 2

**Condition**:

- IF source repository URL provided → Version research REQUIRED (go to Phase 4)
- ELSE → Version research SKIP (skip Phase 4, go directly to Phase 5)

**Impact**: Determines whether Phase 4 is executed or skipped

### Decision Point 2: Gate Override?

**Location**: Any blocking gate (Phase 3, Phase 4, Phase 6)

**Condition**: If gate fails, agent may request gate override via AskUserQuestion

**Options**:

- User says "No, complete the research" → Return to blocked phase
- User says "Yes, I accept the risks" → Proceed with documented override (RARE)

**Impact**: Override bypasses gate but must be documented in PR and changelog

## Artifact Dependencies

```
requirements.md
      │
      ├─► protocol-research.md (uses requirements)
      │         │
      │         └─► version-matrix.md (uses protocol research + source analysis)
      │                    │
      ├────────────────────┴─► Plugin code (uses protocol + version research)
                               │
                               └─► validation-report.md (tests plugin)
                                         │
                                         └─► pr-description.md (documents all)
```

## TodoWrite Tracking

Todos should be created at workflow start and updated in real-time:

1. ⏳ → ✅ Gather requirements for {protocol}
2. ⏳ → ✅ Determine version research path
3. 🚫 → ⏳ → ✅ Complete protocol research (BLOCKED until gate passes)
4. 🚫 → ⏳ → ✅ / SKIPPED Complete version marker research (CONDITIONAL)
5. ⏳ → ✅ Implement {protocol} fingerprintx plugin
6. 🚫 → ⏳ → ✅ Validate plugin (BLOCKED until gate passes)
7. ⏳ → ✅ Prepare PR

**Legend**: ⏳ pending, 🚫 blocked, ✅ completed

## Critical Paths

### Minimum Path (Closed-Source)

```
Phase 1 → Phase 2 → Phase 3 (GATE) → Phase 5 → Phase 6 (GATE) → Phase 7
```

**Duration**: ~4-6 hours (with lab testing)

### Complete Path (Open-Source)

```
Phase 1 → Phase 2 → Phase 3 (GATE) → Phase 4 (GATE) → Phase 5 → Phase 6 (GATE) → Phase 7
```

**Duration**: ~6-10 hours (with source analysis)

## Parallel Opportunities

**NONE** - All phases are sequential due to dependencies:

- Phase 3 blocks Phase 4 (protocol research needed for version analysis)
- Phase 4 blocks Phase 5 (version matrix needed for implementation)
- Phase 5 blocks Phase 6 (plugin code needed for validation)

**Cannot parallelize fingerprintx development** - each phase depends on outputs from previous phase.
