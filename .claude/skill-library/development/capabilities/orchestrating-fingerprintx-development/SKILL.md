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

This orchestrator invokes four specialized skills:

| Skill                            | Path                                                                                   | Purpose                                        | Gate        |
| -------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------- |
| **researching-protocols**        | `.claude/skill-library/development/capabilities/researching-protocols/SKILL.md`        | Protocol detection methodology (7 phases)      | BLOCKING    |
| **researching-version-markers**  | `.claude/skill-library/development/capabilities/researching-version-markers/SKILL.md`  | Version marker analysis (8 phases)             | CONDITIONAL |
| **writing-fingerprintx-modules** | `.claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md` | Plugin implementation (5-method interface)     | —           |
| **writing-fingerprintx-tests**   | `.claude/skill-library/development/capabilities/writing-fingerprintx-tests/SKILL.md`   | Unit test implementation (table-driven, mocks) | —           |

**Critical**: The orchestrator does NOT duplicate sub-skill content - it invokes them and enforces gates.

---

## Workflow (8 Phases)

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
Read('.claude/skill-library/development/capabilities/researching-protocols/SKILL.md')
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
Read('.claude/skill-library/development/capabilities/researching-version-markers/SKILL.md')
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

**Invoke**:

```
Read('.claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md')
```

Follow the implementation workflow from writing-fingerprintx-modules skill.

**Inputs Provided**:

- Protocol detection strategy (from Phase 3)
- Version Fingerprint Matrix (from Phase 4, if applicable)
- Requirements document (from Phase 1)

**Implementation Checklist**:

- [ ] Plugin directory created: `pkg/plugins/services/{protocol}/`
- [ ] Plugin struct with 5 methods implemented
- [ ] Type constants added to `pkg/plugins/types.go`
- [ ] Plugin registered in `pkg/scan/plugin_list.go`
- [ ] Two-phase detection (detect then enrich)
- [ ] Version extraction implemented (using matrix if available)
- [ ] CPE generation implemented

**Output Artifact**: Working plugin code

**TodoWrite**: Mark as in_progress during implementation, completed when all checklist items done.

---

### Phase 6: Testing

**Invoke**:

```
Read('.claude/skill-library/development/capabilities/writing-fingerprintx-tests/SKILL.md')
```

Follow the testing workflow from writing-fingerprintx-tests skill.

**Inputs Provided**:

- Plugin code (from Phase 5)
- Protocol structure and patterns
- Edge cases to test

**Testing Checklist**:

- [ ] Test file created in `pkg/plugins/services/{protocol}/{protocol}_test.go`
- [ ] Table-driven tests for parsing functions (if applicable)
- [ ] Response validation tests
- [ ] Message building tests (if applicable)
- [ ] Edge cases covered: empty, truncated, wrong type, missing field
- [ ] Tests pass: `go test ./pkg/plugins/services/{protocol}/... -v`

**Output Artifact**: `{protocol}_test.go` (in plugin directory)

**TodoWrite**: Mark as in_progress during test writing, completed when all tests pass.

---

### Phase 7: Validation (BLOCKING GATE)

**Verification Commands**:

```bash
# Build verification
cd modules/fingerprintx
go build ./...
go vet ./...

# Test execution
go test ./pkg/plugins/services/{protocol}/... -v

# Manual verification
./fingerprintx -t localhost:{port} --json

# Multi-version testing (if version research done)
# Test against Docker containers for each version range in matrix
```

**Gate Conditions**:

- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] Manual verification against live service succeeds
- [ ] Version detection matches matrix predictions (if applicable)
- [ ] CPE generated correctly

**If gate fails**: Fix issues and re-validate. Cannot proceed to Phase 8 until passing.

**Output Artifact**: `{protocol}-validation-report.md`

**TodoWrite**: Mark as BLOCKED until all verifications pass.

**See**: [references/artifact-templates.md](references/artifact-templates.md) for validation report template.

---

### Phase 8: Integration & PR Preparation

**Final Checklist**:

- [ ] All files in correct locations
- [ ] Type constants alphabetically ordered
- [ ] Plugin import alphabetically ordered
- [ ] Package comment documents detection strategy
- [ ] Version compatibility noted in comments
- [ ] No TODO comments for CPE or version (must be complete)

**PR Description Template**:

```markdown
## New Fingerprintx Plugin: {Protocol}

### Detection Strategy

- Primary probe: {describe}
- Fallback: {describe}

### Version Detection

- Versions distinguishable: {list}
- Method: {capability flags / defaults / banner}

### Testing

- [ ] Tested against {versions}
- [ ] CPE generation verified

### Research Documents

- Protocol research: {link or inline}
- Version matrix: {link or inline, if applicable}
```

**Output Artifact**: `{protocol}-pr-description.md`

**TodoWrite**: Mark completed when PR is ready.

**See**: [references/artifact-templates.md](references/artifact-templates.md) for complete template.

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

All artifacts should be saved to a consistent location:

```
.claude/features/{date}-{protocol}-fingerprintx/
├── MANIFEST.yaml
├── {protocol}-requirements.md          (Phase 1)
├── {protocol}-protocol-research.md     (Phase 3)
├── {protocol}-version-matrix.md        (Phase 4, if applicable)
└── {protocol}-validation-report.md     (Phase 7)
└── {protocol}-pr-description.md        (Phase 8)

Plugin directory:
modules/fingerprintx/pkg/plugins/services/{protocol}/
├── {protocol}.go                       (Phase 5)
└── {protocol}_test.go                  (Phase 6)
```

Follow `persisting-agent-outputs` skill for MANIFEST format.

**See**: [references/artifact-templates.md](references/artifact-templates.md) for all templates.

---

## Example: MySQL Fingerprintx Module

Brief walkthrough showing orchestrator in action:

**Phase 1**: User provides: MySQL, port 3306, https://github.com/mysql/mysql-server, distinguish from MariaDB

**Phase 2**: Open-source detected → `version_research = REQUIRED`

**Phase 3**: Invoke researching-protocols, produce `mysql-protocol-research.md`:

- Handshake packet structure
- Capability flags detection
- Default port priority
- MariaDB differentiation (different capability flags)

**Phase 3 Gate**: ✅ All conditions met, proceed

**Phase 4**: Invoke researching-version-markers, produce `mysql-version-matrix.md`:

- 8.0.23+ → caching_sha2_password default
- 8.0.4-8.0.22 → mysql_native_password + DEPRECATE_EOF
- 5.7.x → no DEPRECATE_EOF flag
- CPE format: `cpe:2.3:a:oracle:mysql:{version}:::::::*`

**Phase 4 Gate**: ✅ 4 version ranges, confidence levels assigned, proceed

**Phase 5**: Invoke writing-fingerprintx-modules, implement:

- `pkg/plugins/services/mysql/mysql.go`
- Two-phase detection (detect protocol, then enrich with version)
- Version extraction using matrix decision tree

**Phase 6**: Invoke writing-fingerprintx-tests, create `mysql_test.go`:

- Table-driven tests for handshake parsing
- Response validation tests
- Edge cases: truncated packets, wrong capability flags

**Phase 7**: Validate against mysql:8.0.40, mysql:5.7.44, mysql:5.6.51 Docker containers

**Phase 8**: Prepare PR with complete documentation

**See**: [examples/mysql-walkthrough.md](examples/mysql-walkthrough.md) for complete example.

---

## Common Rationalizations for Skipping Orchestrator

Agents WILL try to bypass the orchestrator. **See**: [references/orchestrator-rationalizations.md](references/orchestrator-rationalizations.md) for complete list of bypass attempts and responses.

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

## Related Skills

| Skill                                   | Purpose                                       |
| --------------------------------------- | --------------------------------------------- |
| **researching-protocols**               | Protocol detection research (invoked Phase 3) |
| **researching-version-markers**         | Version marker research (invoked Phase 4)     |
| **writing-fingerprintx-modules**        | Plugin implementation (invoked Phase 5)       |
| **writing-fingerprintx-tests**          | Unit test implementation (invoked Phase 6)    |
| **persisting-agent-outputs**            | Output artifact management                    |
| **gateway-capabilities**                | Router to this orchestrator                   |
| **orchestrating-multi-agent-workflows** | Multi-phase orchestration patterns            |

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
