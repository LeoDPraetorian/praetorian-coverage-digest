# Phase 3: Codebase Discovery

**Explore codebase to identify existing capabilities, patterns, and confirm capability type.**

---

## Overview

Codebase Discovery systematically explores the codebase to find:

1. Existing similar capabilities to reuse (don't reinvent)
2. **Confirm capability type** (e.g., nebula, fingerprintx, nuclei-templates, trajan, etc.)
3. Module locations and file conventions
4. Reusable patterns (matchers, collectors, probes)
5. Dependencies and integration points

**Entry Criteria:** Phase 2 (Triage) complete, work_type determined, preliminary capability identified.

**Exit Criteria:** Discovery report complete, capability confirmed, technologies documented for skill selection.

**G COMPACTION GATE 1 FOLLOWS:** Before proceeding to Phase 4, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Dual Repository Structure

Capabilities exist in **two locations** during the migration period:

### External Capabilities Repository (Migrated)

```
{CAPABILITIES_ROOT}/modules/{capability}/
```

Resolve `{CAPABILITIES_ROOT}` via:
1. `CAPABILITIES_ROOT` environment variable
2. `.claude/config.local.json` (`external_repos.capabilities`)
3. Common locations (`../capabilities`, `~/dev/capabilities`)

**Migrated:** nebula, fingerprintx, nuclei-templates, trajan, augustus, diocletian, noseyparker, etc.

### Internal Chariot Modules (Not Yet Migrated)

```
modules/{module}/
```

**Not yet migrated:** chariot-aegis-capabilities, msp-definitions, and other `modules/` directories

See [file-scope-boundaries.md](file-scope-boundaries.md) for full discovery protocol.

---

## Step 1: Invoke Discovery Skill

**REQUIRED SUB-SKILL:** `Skill("discovering-codebases-for-planning")`

This skill provides:

- Scoping stage (determine discovery breadth)
- Parallel deep discovery (spawn Explore agents)
- Synthesis (consolidate findings)

Follow the skill's process completely.

---

## Step 2: Spawn Explore Agent(s)

Based on work_type from Triage:

| Work Type | Explore Agents | Thoroughness  |
| --------- | -------------- | ------------- |
| BUGFIX    | 1 agent        | very thorough |
| SMALL     | 1 agent        | very thorough |
| MEDIUM    | 1-2 agents     | very thorough |
| LARGE     | 2-4 agents     | very thorough |

**Exploration scope:**

```
{CAPABILITIES_ROOT}/modules/{capability}/
```

**Agent prompt template:**

```markdown
Task: Explore codebase for {capability description}

Capability: {capability_name}
Location: {CAPABILITIES_ROOT}/modules/{capability_name}/

Find:

1. Existing similar capabilities (same detection type, similar CVE, related scanner)
2. Module location conventions (directory structure, file naming)
3. **Reusable patterns** (matchers, collectors, probes, API clients)
4. Interface contracts (Go interfaces, schema, template structure)
5. Test patterns for this capability type
6. Configuration or constants that apply

Thoroughness: {very thorough}

Return structured findings as JSON.
```

---

## Step 3: Collect Discovery Findings

Agent(s) return structured findings:

```json
{
  "existing_similar_capabilities": [
    {
      "name": "s3-credential-scanner",
      "location": "{CAPABILITIES_ROOT}/modules/nebula/scanners/s3_cred_scanner.go",
      "similarity": "Similar credential detection pattern",
      "reuse_recommendation": "Reuse scanner pattern and output format"
    }
  ],
  "capability_confirmed": "nebula",
  "module_location": {
    "path": "{CAPABILITIES_ROOT}/modules/nebula/",
    "naming_convention": "snake_case.go",
    "test_location": "{CAPABILITIES_ROOT}/modules/nebula/scanners/*_test.go"
  },
  "reusable_patterns": [
    {
      "pattern": "File content scanning",
      "location": "{CAPABILITIES_ROOT}/modules/nebula/pkg/scanner/base.go",
      "reuse_recommendation": "Import and extend"
    }
  ],
  "technologies_detected": {
    "capability": ["Go", "Scanner interface"],
    "testing": ["Go test", "Mock fixtures"]
  },
  "interface_contracts": {
    "output_schema": "Standard Chariot format",
    "scanner_interface": "Scanner interface with Run() method"
  },
  "test_files": ["{CAPABILITIES_ROOT}/modules/nebula/scanners/s3_cred_test.go"],
  "constraints": ["Must support parallel execution", "Performance: <60s per target"]
}
```

**Critical:** The `capability_confirmed` field must be set based on discovery findings.

---

## Step 4: Confirm Capability and Location

Based on discovery findings, confirm the target capability module and its location:

### External Capabilities (Migrated)

| Capability       | Module Location                                | Indicators            |
| ---------------- | ---------------------------------------------- | --------------------- |
| **nebula**       | `{CAPABILITIES_ROOT}/modules/nebula/`          | Network scanning      |
| **fingerprintx** | `{CAPABILITIES_ROOT}/modules/fingerprintx/`    | Service fingerprints  |
| **nuclei**       | `{CAPABILITIES_ROOT}/modules/nuclei-templates/`| YAML templates        |
| **trajan**       | `{CAPABILITIES_ROOT}/modules/trajan/`          | CI/CD security        |
| **augustus**     | `{CAPABILITIES_ROOT}/modules/augustus/`        | AI red team           |
| **diocletian**   | `{CAPABILITIES_ROOT}/modules/diocletian/`      | AWS security          |
| **noseyparker**  | `{CAPABILITIES_ROOT}/modules/noseyparker/`     | Secret scanning       |

### Internal Capabilities (Not Yet Migrated)

| Capability                   | Module Location                      | Indicators           |
| ---------------------------- | ------------------------------------ | -------------------- |
| **chariot-aegis-capabilities** | `modules/chariot-aegis-capabilities/` | VQL artifacts        |
| **msp-definitions**          | `modules/msp-definitions/`           | MSP config/schemas   |

Update MANIFEST with capability and location:

```yaml
capability: "nebula"
capability_location:
  type: "external"  # or "internal"
  resolved_path: "{CAPABILITIES_ROOT}/modules/nebula/"
```

This determines which agents spawn, which quality metrics apply, and the file scope boundaries.

---

## Step 5: Validate Findings

Before proceeding, verify:

1. **Module location exists:**

   ```bash
   [ -d "{CAPABILITIES_ROOT}/modules/{capability}/" ] && echo "PASS Module exists" || echo "FAIL Module NOT FOUND"
   ```

2. **Similar capabilities are current** (not deprecated):
   - Check file modification dates
   - Look for deprecation comments

3. **Patterns are complete:**
   - Check pattern files exist
   - Verify interface contracts are documented

---

## Step 6: Write Discovery Report

Create `.capability-development/discovery.md`:

```markdown
# Discovery Report

**Capability:** {capability description}
**Work Type:** {from triage}
**Capability (confirmed):** {capability_name}
**Discovered:** {timestamp}

## Capability Confirmation

Capability: {capability_name}
Confidence: High (found similar capabilities in expected location)
Module Location: {CAPABILITIES_ROOT}/modules/{capability_name}/

## Technologies Detected

### Capability

- Go (primary language)
- Scanner interface pattern
- Configuration via YAML

### Testing

- Go test framework
- Mock fixtures

## Similar Capabilities Found

| Capability            | Location                    | Similarity           | Reuse             |
| --------------------- | --------------------------- | -------------------- | ----------------- |
| s3-credential-scanner | .../scanners/s3_cred.go     | Credential detection | Schema, interface |
| ssh-key-exposure      | .../scanners/ssh_key.go     | File scanning        | File patterns     |

## Reusable Patterns

| Pattern               | Location                    | How to Reuse        |
| --------------------- | --------------------------- | ------------------- |
| File content scanning | .../pkg/scanner/base.go     | Import and extend   |
| Output format         | .../pkg/output/schema.go    | Use standard format |

## Module Conventions

| Aspect        | Convention                                   |
| ------------- | -------------------------------------------- |
| Directory     | {CAPABILITIES_ROOT}/modules/{capability}/    |
| File naming   | snake_case.go                                |
| Test location | {CAPABILITIES_ROOT}/modules/{capability}/*_test.go |
| Output format | Standard Chariot format                      |

## Interface Contracts

- **Output Schema:** Standard Chariot format
- **Scanner Interface:** Run() method with context
- **Platform Support:** Linux (primary)

## Test Coverage

| Pattern               | Test File              | Status         |
| --------------------- | ---------------------- | -------------- |
| s3-credential-scanner | s3_cred_test.go        | Exists (model) |
| New capability        | (none)                 | Needs creation |

## Constraints & Risks

- Must support parallel execution
- Performance requirement: <60s per target
- Must integrate with existing output pipeline

## Estimated Scope

- Go files to create: {N}
- Test files to create: {N}
- Patterns to reuse: {N}
```

---

## Step 7: Update MANIFEST.yaml

Record discovery findings:

```yaml
phases:
  3_codebase_discovery:
    status: "complete"
    completed_at: "{timestamp}"

capability: "{capability_name}"

codebase_discovery:
  completed_at: "{timestamp}"

  capability_confirmed: "{capability_name}"
  capability_confidence: "high"

  technologies_detected:
    capability: ["Go", "Scanner interface"]
    testing: ["Go test", "Mock fixtures"]

  module_location:
    path: "{CAPABILITIES_ROOT}/modules/{capability}/"
    naming_convention: "snake_case.go"
    test_location: "{CAPABILITIES_ROOT}/modules/{capability}/*_test.go"

  similar_capabilities:
    - name: "s3-credential-scanner"
      location: "{CAPABILITIES_ROOT}/modules/nebula/scanners/s3_cred.go"
      similarity: "credential detection"

  patterns_identified: 2
  constraints_identified: 3

  estimated_scope:
    go_files_create: 1
    test_files_create: 1
    patterns_to_reuse: 2
```

---

## Step 8: Update TodoWrite

```
TodoWrite([
  { content: "Phase 3: Codebase Discovery", status: "completed", activeForm: "Discovering codebase patterns" },
  { content: "Phase 4: Skill Discovery", status: "in_progress", activeForm: "Mapping skills to technologies" },
  // ... rest
])
```

---

## Step 9: Report Discovery Results

Output to user:

```markdown
## Codebase Discovery Complete

**Capability (confirmed):** {capability_name}
**Module Location:** {CAPABILITIES_ROOT}/modules/{capability}/

**Scope Identified:**

- 1 Go file to create
- 1 test file to create
- 2 patterns to reuse

**Similar Capabilities Found:**

- s3-credential-scanner (credential detection pattern)
- ssh-key-exposure (file scanning pattern)

**Technologies:**

- Go, Scanner interface
- Testing: Go test, Mock fixtures

**Constraints:**

- Parallel execution support required
- Performance: <60s per target

-> Proceeding to Compaction Gate 1, then Phase 4: Skill Discovery
```

---

## Edge Cases

### No Similar Capabilities Found

If codebase has no similar capabilities:

- Document as greenfield capability
- Flag for extra attention in Architecture phase
- Look for cross-capability patterns (e.g., Go patterns from other modules)

### Capability Mismatch

If discovery reveals different capability than preliminary:

- Update MANIFEST with confirmed capability
- Document reason for change
- Re-check triage decisions if major change

### Multiple Capabilities

If request spans multiple capability modules:

- Document as primary + secondary
- Flag for Phase 5 (Complexity) assessment
- May need to split into multiple capabilities

---

## Related References

- [Phase 2: Triage](phase-2-triage.md) - Provides work_type and preliminary capability
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Uses technology findings
- [Compaction Gates](compaction-gates.md) - Required before Phase 4
- [File Scope Boundaries](file-scope-boundaries.md) - Path resolution and discovery protocol
- [discovering-codebases-for-planning](../../discovering-codebases-for-planning/SKILL.md) - Required sub-skill
