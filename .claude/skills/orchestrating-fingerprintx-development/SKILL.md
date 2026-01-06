---
name: orchestrating-fingerprintx-development
description: Use when creating new fingerprintx modules - orchestrates complete workflow with blocking gates, coordinates protocol research, version marker research, and implementation phases
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, TodoWrite, AskUserQuestion, Task
---

# Orchestrating Fingerprintx Development

**Complete workflow orchestrator for fingerprintx module creation with enforced gates.**

## When to Use

Use this skill when:

- Creating a new fingerprintx plugin for service fingerprinting
- User says "Create a {protocol} fingerprintx module"
- Starting fingerprintx capability development

**DO NOT use individual skills directly** - this orchestrator enforces the proper workflow with blocking gates.

**You MUST use TodoWrite before starting** to track all 8 phases. Mental tracking = steps get skipped.

## Foundational Patterns

**Required skills** (invoke before starting):

- `orchestrating-multi-agent-workflows` - Effort scaling, routing table, token cost
- `persisting-agent-outputs` - Output format, metadata, blocked status

**See Integration section** for complete dependency documentation.

## Quick Reference

| Phase                      | Gate Type    | Output Artifact             | Can Skip?             |
| -------------------------- | ------------ | --------------------------- | --------------------- |
| 1. Requirements Gathering  | —            | requirements.md             | NO                    |
| 2. Open-Source Decision    | —            | Workflow path determination | NO                    |
| 3. Protocol Research       | **BLOCKING** | protocol-research.md        | NO                    |
| 4. Version Marker Research | CONDITIONAL  | version-matrix.md           | Only if closed-source |
| 5. Implementation          | —            | Plugin code                 | NO                    |
| 6. Testing                 | —            | Unit tests                  | NO                    |
| 7. Validation              | BLOCKING     | validation-report.md        | NO                    |
| 8. Integration & PR Prep   | —            | pr-description.md           | NO                    |

**For complete gate checklists**, see [references/gate-checklist.md](references/gate-checklist.md)

---

## The Problem This Skill Solves

**Current state**: Fingerprintx development uses three advisory skills (researching-protocols, researching-version-markers, writing-fingerprintx-modules). Each says "do X first" but nothing ENFORCES the workflow.

**Result**: Developers skip directly to implementation:

- Poor detection logic (didn't research protocol properly)
- Missing version detection (skipped version marker research)
- Imprecise CPEs (mysql:\* instead of mysql:8.0.23)
- Failed plugins that don't handle edge cases

**This orchestrator makes research BLOCKING** - you cannot proceed to implementation until research outputs exist and pass gate conditions.

---

## Context: Fingerprintx Architecture

Fingerprintx is a service fingerprinting tool in `modules/fingerprintx/`. Creating a plugin requires protocol research, version marker research (for open-source), and implementation following the 5-method interface pattern.

**See**: [Writing Fingerprintx Modules](../writing-fingerprintx-modules/SKILL.md) for implementation details.

---

## Coordinated Skills

This orchestrator invokes five specialized skills:

| Skill                            | Path                                                                                   | Purpose                                        | Gate        |
| -------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------- |
| **researching-protocols**        | `.claude/skill-library/research/researching-protocols/SKILL.md`                        | Protocol detection methodology (7 phases)      | BLOCKING    |
| **researching-version-markers**  | `.claude/skill-library/research/researching-version-markers/SKILL.md`                  | Version marker analysis (8 phases)             | CONDITIONAL |
| **writing-fingerprintx-modules** | `.claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md` | Plugin implementation (5-method interface)     | —           |
| **writing-fingerprintx-tests**   | `.claude/skill-library/development/capabilities/writing-fingerprintx-tests/SKILL.md`   | Unit test implementation (table-driven, mocks) | —           |
| **validating-fingerprintx-live** | `.claude/skill-library/development/capabilities/validating-fingerprintx-live/SKILL.md` | Live Shodan validation (Phase 7.5)             | BLOCKING    |

**Critical**: The orchestrator does NOT duplicate sub-skill content - it invokes them and enforces gates.

---

## Workflow (8 Phases)

**REQUIRED SUB-SKILLS for this workflow:**

| Phase | Required Sub-Skills                                     | Conditional Sub-Skills                         |
| ----- | ------------------------------------------------------- | ---------------------------------------------- |
| All   | `persisting-agent-outputs` (output format)              | -                                              |
| All   | `orchestrating-multi-agent-workflows` (blocked routing) | -                                              |
| 3     | `researching-protocols`                                 | -                                              |
| 4     | -                                                       | `researching-version-markers` (if open-source) |
| 5     | `writing-fingerprintx-modules`                          | -                                              |
| 6     | `writing-fingerprintx-tests`                            | -                                              |
| 7.4   | `validating-fingerprintx-live`                          | -                                              |

### Phase 1: Requirements Gathering

Collect information via AskUserQuestion:

| Question                                    | Purpose                     | Example                       |
| ------------------------------------------- | --------------------------- | ----------------------------- |
| Service/protocol name?                      | Define target               | 'MySQL', 'Redis', 'Memcached' |
| Default port(s)?                            | Starting point for probing  | 3306, 6379, 11211             |
| Is source code available?                   | Determines version research | GitHub URL or 'closed-source' |
| Similar protocols to distinguish?           | Avoid false positives       | 'MariaDB vs MySQL'            |
| Existing fingerprintx plugins to reference? | Learn from prior art        | 'mongodb', 'postgresql'       |

**Output**: `{protocol}-requirements.md` with all answers captured.

**TodoWrite**: Mark as in_progress at start, completed when document exists.

---

### Phase 2: Open-Source Decision Point

Based on Phase 1 answers:

```
IF source repository URL provided:
    version_research = REQUIRED
    repository_url = {provided URL}
ELSE IF 'closed-source' or no URL:
    version_research = SKIP
    Note: Version detection will rely on banner parsing (lower confidence)
```

**Output**: Decision recorded, workflow path determined.

**TodoWrite**: Mark as in_progress at start, completed when decision is recorded.

---

### Phase 3: Protocol Research (BLOCKING GATE)

**Invoke**:

```
Read('.claude/skill-library/research/researching-protocols/SKILL.md')
```

Follow the complete 7-phase workflow from researching-protocols skill.

**Gate Conditions** (ALL must be true to proceed):

- [ ] Protocol detection strategy document exists
- [ ] Detection probes identified (primary, secondary, fallback)
- [ ] Response validation patterns documented
- [ ] Lab environment tested (Docker containers)
- [ ] False positive mitigation addressed

**If gate fails**: STOP. Return to researching-protocols. Do NOT proceed to Phase 4.

**Output Artifact**: `{protocol}-protocol-research.md`

**TodoWrite**: Mark as BLOCKED until gate passes.

**See**: [references/gate-checklist.md](references/gate-checklist.md) for complete checklist.

---

### Phase 4: Version Marker Research (CONDITIONAL GATE)

**Skip Condition**: If `version_research = SKIP` (closed-source), proceed directly to Phase 5.

**Invoke**:

```
Read('.claude/skill-library/research/researching-version-markers/SKILL.md')
```

Follow the complete 8-phase workflow from researching-version-markers skill.

**Gate Conditions** (ALL must be true to proceed):

- [ ] Version Fingerprint Matrix exists
- [ ] At least 3 version ranges distinguishable
- [ ] Marker categories documented (capability flags, defaults, features, etc.)
- [ ] Confidence levels assigned to each marker
- [ ] CPE format defined

**If gate fails**: STOP. Return to researching-version-markers. Do NOT proceed to Phase 5.

**Output Artifact**: `{protocol}-version-matrix.md`

**TodoWrite**: Mark as BLOCKED until gate passes (or SKIPPED if closed-source).

**See**: [references/gate-checklist.md](references/gate-checklist.md) for complete checklist.

---

### Phase 5: Implementation

**Spawn Agent**: `capability-developer`

**PROMPT TEMPLATE**: [references/prompts/developer-prompt.md](references/prompts/developer-prompt.md)

**Context to Provide**:

- Protocol detection strategy (from Phase 3)
- Version Fingerprint Matrix (from Phase 4, if applicable)
- Requirements document (from Phase 1)
- OUTPUT_DIRECTORY from Phase 0

**MANDATORY SKILLS in prompt**: `developing-with-tdd`, `verifying-before-completion`, `writing-fingerprintx-modules`

**Output Artifact**: Plugin code + implementation-log.md

**TodoWrite**: Mark as in_progress, completed when agent returns status: complete.

---

### Phase 6: Testing

**Spawn Agent**: `capability-tester`

**PROMPT TEMPLATE**: [references/prompts/tester-prompt.md](references/prompts/tester-prompt.md)

**Context to Provide**:

- Plugin code location (from Phase 5)
- Protocol structure and patterns
- Edge cases to test
- OUTPUT_DIRECTORY from Phase 0

**MANDATORY SKILLS in prompt**: `developing-with-tdd`, `writing-fingerprintx-tests`

**Output Artifact**: `{protocol}_test.go` + test-summary.md

**TodoWrite**: Mark as in_progress, completed when agent returns status: complete.

---

### Phase 7: Validation (BLOCKING GATE)

Phase 7 has **5 sub-phases** that must pass sequentially:

| Sub-Phase                    | Purpose                  | Key Metric                    |
| ---------------------------- | ------------------------ | ----------------------------- |
| 7.1 Build Verification       | Compile check            | `go build`, `go vet` pass     |
| 7.2 Unit Test Execution      | Test coverage            | All tests pass, ≥80% coverage |
| 7.3 Docker Container Testing | Multi-version validation | Detection per version range   |
| 7.4 Live Shodan Validation   | Real-world accuracy      | ≥80% detection rate           |
| 7.5 Validation Report        | Documentation            | Combined report generated     |

**For Phase 7.4**, invoke:

```
Read('.claude/skill-library/development/capabilities/validating-fingerprintx-live/SKILL.md')
```

**Gate Conditions**: ALL sub-phases must pass to proceed to Phase 8.

**If gate fails**: Fix issues and re-validate. Cannot proceed until passing.

**TodoWrite**: Mark as BLOCKED until all verifications pass.

**See**: [Gate Checklist](references/gate-checklist.md) for complete pass/fail criteria.
**See**: [Artifact Templates](references/artifact-templates.md) for validation report template.

---

### Phase 8: Integration & PR Preparation

**Final Checklist**:

- [ ] All files in correct locations
- [ ] Type constants alphabetically ordered
- [ ] Plugin import alphabetically ordered
- [ ] Package comment documents detection strategy
- [ ] No TODO comments for CPE or version (must be complete)

**Output Artifact**: `{protocol}-pr-description.md`

**TodoWrite**: Mark completed when PR is ready.

**See**: [Artifact Templates](references/artifact-templates.md) for complete PR description template.

---

## Progress Tracking (MANDATORY)

Use TodoWrite to track progress. Create these todos at workflow start:

1. 'Gather requirements for {protocol} fingerprintx module' (Phase 1)
2. 'Determine version research path for {protocol}' (Phase 2)
3. 'Complete protocol research for {protocol}' (Phase 3) - BLOCKING
4. 'Complete version marker research for {protocol}' (Phase 4) - CONDITIONAL
5. 'Implement {protocol} fingerprintx plugin' (Phase 5)
6. 'Write unit tests for {protocol} plugin' (Phase 6)
7. 'Validate {protocol} plugin against live services' (Phase 7) - BLOCKING
8. 'Prepare PR for {protocol} plugin' (Phase 8)

Update todo status as each phase completes. Mark BLOCKED phases clearly.

**Cannot proceed without TodoWrite tracking** - mental tracking = steps get skipped.

---

## Gate Enforcement (CRITICAL)

### How Gates Work

Gates are NOT suggestions. They are **hard stops**.

```
Phase 3 Gate Check:
├── Protocol research document exists?
│   ├── YES → Check completeness
│   │   ├── Complete → GATE PASSES → Proceed to Phase 4
│   │   └── Incomplete → GATE FAILS → Return to Phase 3
│   └── NO → GATE FAILS → Cannot proceed
```

**BLOCKING means BLOCKING** - you cannot proceed to the next phase until gate conditions are met.

### Rationalization Prevention

Agents WILL try to skip gates. **See**: [references/rationalization-table.md](references/rationalization-table.md) for complete list of gate bypass attempts and mandatory responses.

**Key principle**: Working code != Complete. Gates validate completeness, not just functionality.

### Gate Override (EXTREMELY RARE)

The ONLY valid gate override is explicit user acknowledgment via AskUserQuestion.

**See**: [references/gate-override-protocol.md](references/gate-override-protocol.md) for override prompt template and documentation requirements.

---

## Output Artifacts Location

### Creating the Feature Directory

**Generate timestamp using bash:**

```bash
PROTOCOL="mysql"  # Replace with actual protocol
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
FEATURE_DIR=".claude/.output/capabilities/${TIMESTAMP}-${PROTOCOL}-fingerprintx"
mkdir -p "${FEATURE_DIR}"
```

**Example:** `.claude/.output/capabilities/2026-01-04-103000-mysql-fingerprintx/`

### Directory Structure

All artifacts should be saved to a consistent location:

```
.claude/.output/capabilities/{YYYY-MM-DD-HHMMSS}-{protocol}-fingerprintx/
├── MANIFEST.yaml
├── {protocol}-requirements.md          (Phase 1)
├── {protocol}-protocol-research.md     (Phase 3)
├── {protocol}-version-matrix.md        (Phase 4, if applicable)
├── {protocol}-validation-report.md     (Phase 7.5)
├── {protocol}-live-validation.md       (Phase 7.4 - Shodan live testing)
├── {protocol}-shodan-targets.json      (Phase 7.4 - Raw Shodan results)
├── {protocol}-fingerprintx-results.json (Phase 7.4 - Raw scan results)
└── {protocol}-pr-description.md        (Phase 8)

Plugin directory:
modules/fingerprintx/pkg/plugins/services/{protocol}/
├── {protocol}.go                       (Phase 5)
└── {protocol}_test.go                  (Phase 6)
```

Follow `persisting-agent-outputs` skill for MANIFEST format.

**See**: [references/artifact-templates.md](references/artifact-templates.md) for all templates.

---

## Example Workflow

**See**: [examples/mysql-walkthrough.md](examples/mysql-walkthrough.md) for complete MySQL fingerprintx module walkthrough showing all 8 phases in action.

---

## Common Rationalizations for Skipping Orchestrator

Agents WILL try to bypass the orchestrator. **See**: [Orchestrator-Level Rationalizations](references/rationalization-table.md#orchestrator-level-rationalizations) for complete list of bypass attempts and responses.

**The orchestrator exists because skipping steps fails** - even for experienced developers.

---

## Key Principles

1. **Single Entry Point** - All fingerprintx development starts here
2. **Gates are Blocking** - Cannot proceed without passing gate conditions
3. **Research Before Implementation** - Always, no exceptions
4. **Version Detection for Open-Source** - Enables precise CPEs
5. **Artifacts Persist** - All outputs saved for PR and future reference
6. **TodoWrite Tracking** - Progress visible throughout workflow
7. **No Shortcuts** - The full workflow exists because shortcuts failed

---

## Integration

### Called By

- `/fingerprintx` command - Primary entry point
- `gateway-capabilities` - Routes fingerprintx module requests

### Requires (invoke before starting)

| Skill                                 | When    | Purpose                                         |
| ------------------------------------- | ------- | ----------------------------------------------- |
| `persisting-agent-outputs`            | Phase 0 | Discover output directory, artifact naming      |
| `orchestrating-multi-agent-workflows` | Start   | Effort scaling, agent routing table, token cost |

### Calls (skill-invocation via Read tool)

| Skill                   | Phase   | Purpose                                        |
| ----------------------- | ------- | ---------------------------------------------- |
| `researching-protocols` | Phase 3 | Protocol detection methodology (BLOCKING gate) |

### Spawns (agent-dispatch via Task tool)

| Agent                  | Phase   | Mandatory Skills in Prompt                                                     |
| ---------------------- | ------- | ------------------------------------------------------------------------------ |
| `capability-developer` | Phase 5 | writing-fingerprintx-modules, developing-with-tdd, verifying-before-completion |
| `capability-tester`    | Phase 6 | writing-fingerprintx-tests, developing-with-tdd                                |

### Conditional (based on source availability)

| Skill                          | Trigger             | Purpose                                    |
| ------------------------------ | ------------------- | ------------------------------------------ |
| `researching-version-markers`  | Open-source service | Version marker analysis (CONDITIONAL gate) |
| `validating-fingerprintx-live` | Phase 7.4           | Live Shodan validation (BLOCKING gate)     |

### Agent Skills (embedded in prompts)

| Skill                         | Phases                    | Purpose                                     |
| ----------------------------- | ------------------------- | ------------------------------------------- |
| `developing-with-tdd`         | Phases 5-6                | Write test first, verify failure, implement |
| `verifying-before-completion` | All implementation phases | Verify before claiming done                 |

### Prompt Templates

Located in `references/prompts/`:

| Template              | Used In   | Agents                               |
| --------------------- | --------- | ------------------------------------ |
| `developer-prompt.md` | Phase 5   | capability-developer                 |
| `tester-prompt.md`    | Phase 6   | capability-tester                    |
| `README.md`           | Reference | Skill-invocation for research phases |

**Note**: This orchestrator uses a **hybrid pattern**:

- **Phases 3-4** (Research): Skill-invocation via Read tool
- **Phases 5-6** (Implementation/Testing): Agent-dispatch via Task tool with prompt templates

### Alternative Workflows

| Skill                                  | When to Use Instead                                      |
| -------------------------------------- | -------------------------------------------------------- |
| `orchestrating-capability-development` | General VQL/Nuclei/Janus capabilities (not fingerprintx) |

---

## Troubleshooting

**See**: [references/troubleshooting.md](references/troubleshooting.md) for:

- Common issues at each phase
- How to unblock stuck gates
- When to restart vs continue
- Version marker research edge cases

---

## References

- [Gate Checklist](references/gate-checklist.md) - Complete pass/fail criteria for all gates
- [Artifact Templates](references/artifact-templates.md) - Templates for all output documents
- [Workflow Diagram](references/workflow-diagram.md) - Visual flowchart of 8 phases
- [Troubleshooting](references/troubleshooting.md) - Common issues and solutions
- [Rationalization Table](references/rationalization-table.md) - Complete list of bypass attempts
- [Gate Override Protocol](references/gate-override-protocol.md) - When and how to override gates

---

## Changelog

See `.history/CHANGELOG` for version history.
