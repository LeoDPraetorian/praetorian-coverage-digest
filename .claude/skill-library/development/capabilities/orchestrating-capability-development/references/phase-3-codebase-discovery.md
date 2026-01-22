# Phase 3: Codebase Discovery

**Explore codebase to identify existing capabilities, patterns, and confirm capability type.**

---

## Overview

Codebase Discovery systematically explores the codebase to find:

1. Existing similar capabilities to reuse (don't reinvent)
2. **Confirm capability type** (VQL, Nuclei, Janus, Fingerprintx, Scanner)
3. Module locations and file conventions
4. Reusable patterns (matchers, collectors, probes)
5. Dependencies and integration points

**Entry Criteria:** Phase 2 (Triage) complete, work_type determined, preliminary_capability_type set.

**Exit Criteria:** Discovery report complete, capability_type confirmed, technologies documented for skill selection.

**G COMPACTION GATE 1 FOLLOWS:** Before proceeding to Phase 4, complete [compaction-gates.md](compaction-gates.md) protocol.

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

**Capability-specific exploration areas by type:**

| Capability Type | Explore Focus                                                             |
| --------------- | ------------------------------------------------------------------------- |
| VQL             | chariot-aegis-capabilities/vql/, artifact definitions, collector patterns |
| Nuclei          | nuclei-templates/, matcher patterns, CVE templates                        |
| Janus           | janus-framework/, janus/, pipeline definitions                            |
| Fingerprintx    | fingerprintx/pkg/plugins/, probe patterns                                 |
| Scanner         | chariot/backend/pkg/scanner/, API clients                                 |

**Agent prompt template:**

```markdown
Task: Explore codebase for {capability description}

Capability Type (preliminary): {VQL/Nuclei/Janus/Fingerprintx/Scanner}

Find:

1. Existing similar capabilities (same detection type, similar CVE, related scanner)
2. Module location conventions (directory structure, file naming)
3. **Reusable patterns** (matchers, collectors, probes, API clients)
4. Interface contracts (Go interfaces, VQL schema, template structure)
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
      "location": "chariot-aegis-capabilities/vql/s3_cred_scanner.vql",
      "similarity": "Similar credential detection pattern",
      "reuse_recommendation": "Reuse artifact schema and collector pattern"
    }
  ],
  "capability_type_confirmed": "VQL",
  "module_location": {
    "path": "chariot-aegis-capabilities/vql/",
    "naming_convention": "snake_case.vql",
    "test_location": "chariot-aegis-capabilities/vql/tests/"
  },
  "reusable_patterns": [
    {
      "pattern": "File content scanning",
      "location": "chariot-aegis-capabilities/vql/common/file_scanner.vql",
      "reuse_recommendation": "Import and extend"
    }
  ],
  "technologies_detected": {
    "capability": ["VQL", "Velociraptor artifacts"],
    "testing": ["VQL test harness", "Go test fixtures"]
  },
  "interface_contracts": {
    "output_schema": "Standard Chariot artifact format",
    "collector_interface": "Velociraptor collector API"
  },
  "test_files": ["chariot-aegis-capabilities/vql/tests/s3_cred_test.go"],
  "constraints": ["Must support Windows/Linux/macOS", "Performance: <60s on typical system"]
}
```

**Critical:** The `capability_type_confirmed` field must be set based on discovery findings.

---

## Step 4: Confirm Capability Type

Based on discovery findings, confirm the capability type:

| Capability Type  | Module Location                 | Indicators                       |
| ---------------- | ------------------------------- | -------------------------------- |
| **VQL**          | chariot-aegis-capabilities/vql/ | .vql files, artifact definitions |
| **Nuclei**       | nuclei-templates/               | .yaml templates, matchers        |
| **Janus**        | janus-framework/, janus/        | Go pipeline code                 |
| **Fingerprintx** | fingerprintx/pkg/plugins/       | Go probe modules                 |
| **Scanner**      | chariot/backend/pkg/scanner/    | Go/Python API clients            |

Update MANIFEST with `capability_type`:

```yaml
capability_type: "VQL" # or Nuclei, Janus, Fingerprintx, Scanner
```

This determines which agents spawn and which quality metrics apply in later phases.

---

## Step 5: Validate Findings

Before proceeding, verify:

1. **Module location exists:**

   ```bash
   [ -d "{module_location}" ] && echo "PASS Module exists" || echo "FAIL Module NOT FOUND"
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
**Capability Type (confirmed):** {VQL/Nuclei/Janus/Fingerprintx/Scanner}
**Discovered:** {timestamp}

## Capability Type Confirmation

Type: VQL
Confidence: High (found similar capabilities in expected location)
Module Location: chariot-aegis-capabilities/vql/

## Technologies Detected

### Capability

- VQL (Velociraptor Query Language)
- Artifact schema format
- Collector API

### Testing

- VQL test harness
- Go test fixtures

## Similar Capabilities Found

| Capability            | Location                 | Similarity           | Reuse             |
| --------------------- | ------------------------ | -------------------- | ----------------- |
| s3-credential-scanner | .../s3_cred_scanner.vql  | Credential detection | Schema, collector |
| ssh-key-exposure      | .../ssh_key_exposure.vql | File scanning        | File patterns     |

## Reusable Patterns

| Pattern               | Location                       | How to Reuse        |
| --------------------- | ------------------------------ | ------------------- |
| File content scanning | .../common/file_scanner.vql    | Import and extend   |
| Artifact output       | .../common/artifact_schema.vql | Use standard format |

## Module Conventions

| Aspect        | Convention                            |
| ------------- | ------------------------------------- |
| Directory     | chariot-aegis-capabilities/vql/       |
| File naming   | snake_case.vql                        |
| Test location | chariot-aegis-capabilities/vql/tests/ |
| Output format | Standard Chariot artifact             |

## Interface Contracts

- **Output Schema:** Standard Chariot artifact format
- **Collector Interface:** Velociraptor collector API
- **Platform Support:** Windows/Linux/macOS

## Test Coverage

| Pattern               | Test File       | Status         |
| --------------------- | --------------- | -------------- |
| s3-credential-scanner | s3_cred_test.go | Exists (model) |
| New capability        | (none)          | Needs creation |

## Constraints & Risks

- Must support Windows/Linux/macOS
- Performance requirement: <60s on typical system
- Must integrate with existing artifact collection pipeline

## Estimated Scope

- VQL files to create: {N}
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

capability_type: "VQL"

codebase_discovery:
  completed_at: "{timestamp}"

  capability_type_confirmed: "VQL"
  capability_type_confidence: "high"

  technologies_detected:
    capability: ["VQL", "Velociraptor artifacts"]
    testing: ["VQL test harness", "Go test fixtures"]

  module_location:
    path: "chariot-aegis-capabilities/vql/"
    naming_convention: "snake_case.vql"
    test_location: "chariot-aegis-capabilities/vql/tests/"

  similar_capabilities:
    - name: "s3-credential-scanner"
      location: "chariot-aegis-capabilities/vql/s3_cred_scanner.vql"
      similarity: "credential detection"

  patterns_identified: 2
  constraints_identified: 3

  estimated_scope:
    vql_files_create: 1
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

**Capability Type (confirmed):** VQL
**Module Location:** chariot-aegis-capabilities/vql/

**Scope Identified:**

- 1 VQL file to create
- 1 test file to create
- 2 patterns to reuse

**Similar Capabilities Found:**

- s3-credential-scanner (credential detection pattern)
- ssh-key-exposure (file scanning pattern)

**Technologies:**

- VQL, Velociraptor artifacts
- Testing: VQL test harness, Go fixtures

**Constraints:**

- Multi-platform support required (Win/Linux/Mac)
- Performance: <60s on typical system

-> Proceeding to Compaction Gate 1, then Phase 4: Skill Discovery
```

---

## Edge Cases

### No Similar Capabilities Found

If codebase has no similar capabilities:

- Document as greenfield capability
- Flag for extra attention in Architecture phase
- Look for cross-capability patterns (e.g., Go patterns in fingerprintx for new Go-based capability)

### Capability Type Mismatch

If discovery reveals different capability type than preliminary:

- Update MANIFEST with confirmed type
- Document reason for change
- Re-check triage decisions if major change

### Multiple Capability Types

If request spans multiple types (e.g., Janus chain calling fingerprintx):

- Document as primary + secondary types
- Flag for Phase 5 (Complexity) assessment
- May need to split into multiple capabilities

---

## Related References

- [Phase 2: Triage](phase-2-triage.md) - Provides work_type and preliminary_capability_type
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Uses technology findings
- [Compaction Gates](compaction-gates.md) - Required before Phase 4
- [Capability Types](capability-types.md) - Detailed capability type information
- [discovering-codebases-for-planning](../../discovering-codebases-for-planning/SKILL.md) - Required sub-skill
