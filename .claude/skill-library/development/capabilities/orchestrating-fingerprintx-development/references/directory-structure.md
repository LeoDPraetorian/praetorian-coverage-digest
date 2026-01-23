# Directory Structure

**Plugin workspace organization for fingerprintx development.**

---

## Output Directory Location

The output directory is created in Phase 1 within the git worktree:

```bash
PROTOCOL_NAME=$(echo "{protocol name}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
OUTPUT_DIR=".fingerprintx-development"
mkdir -p $OUTPUT_DIR/agents
```

**Example:** `.fingerprintx-development/` (within worktree)

---

## Directory Structure

```
{worktree-dir}/{protocol}-fingerprintx/          # Git worktree root
├── .fingerprintx-development/                   # Output artifacts
│   ├── MANIFEST.yaml                            # Phase 1: Workflow metadata
│   ├── triage.md                                # Phase 2: Work type classification
│   ├── discovery.md                             # Phase 3: Codebase discovery report
│   ├── protocol-research.md                     # Phase 3: Protocol detection research
│   ├── version-matrix.md                        # Phase 3: Version markers (if open-source)
│   ├── skill-manifest.yaml                      # Phase 4: Skill discovery manifest
│   ├── complexity.md                            # Phase 5: Complexity assessment
│   ├── brainstorming.md                         # Phase 6: Design alternatives (LARGE only)
│   ├── architecture.md                          # Phase 7: Plugin architecture design
│   ├── plan.md                                  # Phase 7: Implementation task breakdown
│   ├── design-verification.md                   # Phase 9: Architecture compliance check
│   ├── domain-compliance.md                     # Phase 10: Fingerprintx P0 compliance
│   ├── test-plan.md                             # Phase 12: Test strategy
│   ├── coverage-verification.md                 # Phase 14: Coverage threshold verification
│   ├── test-quality.md                          # Phase 15: Test quality assessment
│   ├── completion.md                            # Phase 16: Final verification
│   ├── pr-description.md                        # Phase 16: PR description
│   └── agents/                                  # Agent output logs
│       ├── capability-developer.md              # Phase 8: Implementation log
│       ├── capability-reviewer.md               # Phase 11: Review findings
│       └── capability-tester.md                 # Phase 13: Test results
│
├── {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/             # Plugin code location
│   ├── plugin.go                                # Phase 8: Main detection logic
│   └── {protocol}_test.go                       # Phase 13: Unit tests
│
├── {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go                         # Phase 8: Type constant (modify)
└── {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go                       # Phase 8: Plugin import (modify)
```

---

## Artifact-Phase Mapping

| Artifact                         | Phase | Purpose                                   |
| -------------------------------- | ----- | ----------------------------------------- |
| `MANIFEST.yaml`                  | 1     | Workflow metadata, cross-session state    |
| `triage.md`                      | 2     | Work type classification, phase decisions |
| `discovery.md`                   | 3     | Codebase patterns, similar plugins        |
| `protocol-research.md`           | 3     | Detection strategy, banner patterns       |
| `version-matrix.md`              | 3     | Version markers (if open-source)          |
| `skill-manifest.yaml`            | 4     | Skills identified for agents              |
| `complexity.md`                  | 5     | Complexity score, execution strategy      |
| `brainstorming.md`               | 6     | Design alternatives (LARGE only)          |
| `architecture.md`                | 7     | Plugin design decisions                   |
| `plan.md`                        | 7     | Task breakdown for implementation         |
| `agents/capability-developer.md` | 8     | Implementation log                        |
| `design-verification.md`         | 9     | Plan-to-implementation check              |
| `domain-compliance.md`           | 10    | P0 pattern compliance                     |
| `agents/capability-reviewer.md`  | 11    | Code review findings                      |
| `test-plan.md`                   | 12    | Test strategy document                    |
| `agents/capability-tester.md`    | 13    | Test execution results                    |
| `coverage-verification.md`       | 14    | Coverage threshold check                  |
| `test-quality.md`                | 15    | Test assertion quality                    |
| `completion.md`                  | 16    | Final verification summary                |
| `pr-description.md`              | 16    | PR description for merge                  |

---

## Plugin Code Locations

### New Files Created

| File                  | Location                                             | Phase |
| --------------------- | ---------------------------------------------------- | ----- |
| Plugin implementation | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go`          | 8     |
| Unit tests            | `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}_test.go` | 13    |

### Files Modified

| File                     | Change            | Phase |
| ------------------------ | ----------------- | ----- |
| `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go`   | Add type constant | 8     |
| `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go` | Add plugin import | 8     |

---

## Worktree vs Main Repository

All work happens in an isolated git worktree:

```
/main-repo/                              # Original repository
├── .worktrees/                          # Worktree storage
│   └── {protocol}-fingerprintx/         # Isolated worktree
│       ├── .fingerprintx-development/   # Output artifacts
│       └── {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/...     # Plugin code
```

**Benefits:**

- Parallel development possible
- Clean rollback via worktree removal
- No conflict with main branch work

---

## Cross-Session Resume

The `MANIFEST.yaml` contains all state needed to resume:

```yaml
current_phase: 8
current_phase_name: "implementation"
worktree:
  path: "{worktree-dir}/{protocol}-fingerprintx"
  pre_plugin_commit: "{commit-sha}"
```

On resume:

1. Read MANIFEST.yaml
2. Change to worktree directory
3. Continue from `current_phase`

---

## Cleanup on Completion

After successful PR merge (Phase 16):

```bash
# Option 1: Remove worktree but keep output
git worktree remove {worktree-dir}/{protocol}-fingerprintx

# Option 2: Archive output directory
mv .fingerprintx-development/ /archive/{protocol}-{date}/
```

---

## Related References

- [Phase 1: Setup](phase-1-setup.md) - Directory creation
- [Progress Persistence](progress-persistence.md) - MANIFEST.yaml format
- [Phase 16: Completion](phase-16-completion.md) - Cleanup procedures
