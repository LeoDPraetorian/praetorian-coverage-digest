# Artifact Templates

Templates for all output artifacts in the fingerprintx development workflow.

## Requirements Document Template

**File**: `{protocol}-requirements.md`

**Location**: `.claude/features/{date}-{protocol}-fingerprintx/`

```markdown
# {Protocol} Fingerprintx Module Requirements

## Service/Protocol Information

- **Name**: {Protocol full name}
- **Common Abbreviation**: {e.g., MySQL, Redis, SSH}
- **Default Port(s)**: {comma-separated list}
- **Protocol Type**: {TCP/UDP/Both}

## Source Code Availability

- **Status**: {Open-source / Closed-source}
- **Repository URL**: {GitHub/GitLab URL or "N/A"}
- **License**: {MIT, Apache 2.0, Proprietary, etc.}
- **Version Range**: {e.g., 5.x - 8.x or "Not applicable"}

## Similar Protocols (False Positive Risks)

| Protocol | Similarity | Distinguishing Feature |
|----------|------------|------------------------|
| {Protocol A} | {High/Medium/Low} | {How to distinguish} |
| {Protocol B} | {High/Medium/Low} | {How to distinguish} |

## Existing Reference Plugins

- **Plugin 1**: {name} - {why it's relevant}
- **Plugin 2**: {name} - {why it's relevant}

## Detection Goals

- [ ] Detect protocol with ≥95% accuracy
- [ ] Distinguish from similar protocols
- [ ] Extract version information (if open-source)
- [ ] Generate precise CPE

## Research Phase Determination

- **Version Research**: {REQUIRED / SKIP}
- **Reason**: {Source available / Closed-source}
```

---

## Protocol Research Document Template

**File**: `{protocol}-protocol-research.md`

**Location**: `.claude/features/{date}-{protocol}-fingerprintx/`

**Created by**: `researching-protocols` skill (Phase 3)

```markdown
# {Protocol} Protocol Research

## Detection Strategy Summary

{2-3 sentence overview of detection approach}

## Lab Environment

- **Docker Image**: {image:tag}
- **Container Command**: `docker run -p {port}:{port} {image:tag}`
- **Test Port**: {port}
- **Test Date**: {YYYY-MM-DD}

## Detection Probes

### Primary Probe

**Description**: {What this probe does}

**Sequence**:
```
{Hex dump or ASCII representation of probe data}
```

**Expected Response**:
```
{Hex dump or ASCII representation of response}
```

**Validation Pattern**: {Byte sequences or regex to confirm protocol}

### Secondary Probe (Fallback)

**Description**: {When primary fails, use this}

**Sequence**:
```
{Hex dump or ASCII representation}
```

**Expected Response**:
```
{Hex dump or ASCII representation}
```

## Response Validation Patterns

| Pattern Type | Bytes/Regex | Purpose |
|--------------|-------------|---------|
| Header Magic | {hex or string} | Confirms protocol family |
| Version Field | {offset, length} | Extracts version info |
| Capability Flags | {bit positions} | Feature detection |

## False Positive Mitigation

### Similar Protocol: {Name}

- **Risk Level**: {High/Medium/Low}
- **Distinguishing Feature**: {What makes them different}
- **Validation Check**: {How to avoid false positive}

## Edge Cases

- **Case 1**: {Description and handling}
- **Case 2**: {Description and handling}

## Implementation Notes

- **Two-Phase Detection**: {Describe detect vs enrich phases}
- **Timeout Handling**: {How to handle non-responsive services}
- **Error Cases**: {What to do on malformed responses}
```

---

## Version Fingerprint Matrix Template

**File**: `{protocol}-version-matrix.md`

**Location**: `.claude/features/{date}-{protocol}-fingerprintx/`

**Created by**: `researching-version-markers` skill (Phase 4)

```markdown
# {Protocol} Version Fingerprint Matrix

## Source Repository

- **URL**: {GitHub/GitLab URL}
- **Analyzed Versions**: {list of versions analyzed}
- **Analysis Date**: {YYYY-MM-DD}

## Version Ranges

### Version Range 1: {X.Y.Z - X.Y.Z}

**Distinguishing Markers**:

| Marker | Type | Confidence | Description |
|--------|------|------------|-------------|
| {name} | {Capability Flag / Default / Feature} | {HIGH/MEDIUM/LOW} | {What changed} |
| {name} | {Capability Flag / Default / Feature} | {HIGH/MEDIUM/LOW} | {What changed} |

**CPE Format**: `cpe:2.3:a:{vendor}:{product}:{version}:::::::*`

**Example CPE**: `cpe:2.3:a:oracle:mysql:8.0.23:::::::*`

### Version Range 2: {X.Y.Z - X.Y.Z}

{Same structure as Range 1}

### Version Range 3: {X.Y.Z - X.Y.Z}

{Same structure as Range 1}

## Decision Tree

```
1. Check for marker_A
   ├── Present → Version Range 1 (8.x)
   └── Absent → Check for marker_B
       ├── Present → Version Range 2 (5.7.x)
       └── Absent → Version Range 3 (5.6.x or earlier)
```

## Confidence Levels

- **HIGH**: Deterministic marker, always present in version range
- **MEDIUM**: Probabilistic marker, usually present
- **LOW**: Heuristic marker, best guess

## Fallback CPE

When version cannot be determined: `cpe:2.3:a:{vendor}:{product}:*:::::::*`
```

---

## Validation Report Template

**File**: `{protocol}-validation-report.md`

**Location**: `.claude/features/{date}-{protocol}-fingerprintx/`

```markdown
# {Protocol} Validation Report

## Build Verification

```bash
$ cd modules/fingerprintx
$ go build ./...
{output or "No errors"}

$ go vet ./...
{output or "No issues found"}
```

**Status**: {✅ PASS / ❌ FAIL}

## Test Execution

```bash
$ go test ./pkg/plugins/services/{protocol}/... -v
{test output}
```

**Status**: {✅ PASS / ❌ FAIL}
**Tests Passed**: {N/N}

## Manual Verification

### Test 1: {Version X.Y.Z}

```bash
$ docker run -d -p {port}:{port} {image:tag}
$ ./fingerprintx -t localhost:{port} --json
```

**Output**:
```json
{
  "protocol": "{protocol}",
  "version": "{X.Y.Z}",
  "cpe": "cpe:2.3:a:{vendor}:{product}:{version}:::::::*"
}
```

**Expected**: Protocol={protocol}, Version={X.Y.Z}, CPE with version
**Actual**: {What was output}
**Status**: {✅ PASS / ❌ FAIL}

### Test 2: {Version X.Y.Z}

{Same structure as Test 1}

### Test 3: {Version X.Y.Z}

{Same structure as Test 1}

## Version Detection Accuracy

| Test | Expected Version | Detected Version | CPE Generated | Status |
|------|------------------|------------------|---------------|--------|
| 1 | {X.Y.Z} | {X.Y.Z} | {CPE string} | {✅/❌} |
| 2 | {X.Y.Z} | {X.Y.Z} | {CPE string} | {✅/❌} |
| 3 | {X.Y.Z} | {X.Y.Z} | {CPE string} | {✅/❌} |

**Accuracy**: {N/N = XX%}

## CPE Validation

- [ ] CPE format matches `cpe:2.3:a:{vendor}:{product}:{version}:::::::*`
- [ ] Version substitution works correctly
- [ ] Fallback CPE used when version unknown

## Issues Found

{List any issues discovered during validation, or "None"}

## Overall Status

{✅ READY FOR PR / ❌ NEEDS FIXES}

**Date**: {YYYY-MM-DD}
**Tester**: {Agent/Human name}
```

---

## PR Description Template

**File**: `{protocol}-pr-description.md`

**Location**: `.claude/features/{date}-{protocol}-fingerprintx/`

```markdown
## New Fingerprintx Plugin: {Protocol}

### Detection Strategy

- **Primary probe**: {Describe what the probe does and why it works}
- **Fallback**: {Describe fallback probe for edge cases}
- **Validation**: {How we confirm this is the right protocol}

### Version Detection

{IF version research was done:}

- **Versions distinguishable**: {list version ranges, e.g., "8.0.23+, 8.0.4-8.0.22, 5.7.x"}
- **Method**: {capability flags / defaults / banner parsing}
- **Accuracy**: {XX% across tested versions}

{IF version research was skipped (closed-source):}

- **Version detection**: Banner parsing only (closed-source protocol)
- **CPE**: Uses wildcard for version (`cpe:2.3:a:{vendor}:{product}:*:::::::*`)

### Testing

- [ ] Tested against {Protocol version X.Y.Z}
- [ ] Tested against {Protocol version X.Y.Z}
- [ ] Tested against {Protocol version X.Y.Z}
- [ ] CPE generation verified
- [ ] False positive mitigation tested (vs {similar protocol})

### Research Documents

**Protocol Research**: [Inline below / Linked in .claude/features/]

<details>
<summary>Protocol Research Document</summary>

{Paste content of protocol-research.md OR link to it}

</details>

**Version Matrix**: [Inline below / Linked in .claude/features/ / N/A]

<details>
<summary>Version Fingerprint Matrix</summary>

{Paste content of version-matrix.md OR link to it OR "N/A (closed-source)"}

</details>

### Implementation Notes

- **Plugin location**: `pkg/plugins/services/{protocol}/{protocol}.go`
- **Type constant**: `{PROTOCOL}` (added to `pkg/plugins/types.go`)
- **Registration**: Added to `pkg/scan/plugin_list.go`
- **Two-phase detection**: Implemented (detect then enrich)

### Edge Cases Handled

- {Edge case 1 and how it's handled}
- {Edge case 2 and how it's handled}

### Validation Report

{Paste content of validation-report.md OR link to it}
```

---

## MANIFEST.yaml Template

**File**: `MANIFEST.yaml`

**Location**: `.claude/features/{date}-{protocol}-fingerprintx/`

**See**: `persisting-agent-outputs` skill for complete format.

```yaml
feature: {protocol}-fingerprintx-plugin
date: {YYYY-MM-DD}
phase: {requirements / protocol-research / version-research / implementation / validation / pr-prep}
orchestrator: orchestrating-fingerprintx-development

artifacts:
  - name: requirements.md
    type: requirements
    status: {complete / in-progress}

  - name: protocol-research.md
    type: research
    status: {complete / in-progress}

  - name: version-matrix.md
    type: research
    status: {complete / in-progress / skipped}

  - name: validation-report.md
    type: validation
    status: {complete / in-progress}

  - name: pr-description.md
    type: documentation
    status: {complete / in-progress}

gates:
  protocol_research:
    status: {passed / blocked}
    blockers: [{list of blockers} / null]

  version_research:
    status: {passed / blocked / skipped}
    blockers: [{list of blockers} / null]

  validation:
    status: {passed / blocked}
    blockers: [{list of blockers} / null]

metadata:
  protocol: {protocol-name}
  ports: [{list of ports}]
  source_available: {true / false}
  version_research_required: {true / false}
```
