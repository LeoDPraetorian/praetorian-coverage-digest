# Phase 3: Codebase Discovery

**Explore codebase to identify existing plugin patterns AND research protocol detection strategy.**

---

## Overview

Codebase Discovery for fingerprintx has two components:

**Part A: Codebase Patterns**

1. Existing plugin patterns to reuse (don't reinvent)
2. Files that will be affected (types.go, plugins.go)
3. Testing patterns used

**Part B: Protocol Research (BLOCKING)**

1. Protocol banner patterns and detection strategy
2. Version markers (if open-source)
3. Shodan query exploration
4. Default ports and error handling

**Entry Criteria:** Phase 2 (Triage) complete, work_type determined.

**Exit Criteria:** Discovery report complete, protocol detection strategy documented.

**:no_entry: COMPACTION GATE 1 FOLLOWS:** Before proceeding to Phase 4, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Part A: Codebase Discovery

### Step 1: Invoke Discovery Skill

**REQUIRED SUB-SKILL:** `Skill("discovering-codebases-for-planning")`

Focus discovery on:

- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/` - Existing plugin implementations
- `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/*/` - Individual plugin patterns
- `pkg/scan/` - Scanner integration patterns

---

### Step 2: Spawn Explore Agent(s)

Based on work_type from Triage:

| Work Type | Explore Agents | Thoroughness  |
| --------- | -------------- | ------------- |
| BUGFIX    | 1 agent        | very thorough |
| SMALL     | 1 agent        | very thorough |
| MEDIUM    | 1 agent        | very thorough |
| LARGE     | 2 agents       | very thorough |

**Fingerprintx-specific exploration areas:**

| Area     | Explore Focus                                      |
| -------- | -------------------------------------------------- |
| Plugins  | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/\*/ - similar protocol implementations |
| Types    | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go - type constants              |
| Registry | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go - plugin imports            |
| Testing  | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/\*/\*\_test.go - test patterns         |

**Agent prompt template:**

```markdown
Task: Explore fingerprintx codebase for {protocol} plugin

Find:

1. Similar protocol implementations (e.g., if MySQL, look at PostgreSQL)
2. Banner parsing patterns used
3. Version extraction patterns
4. Test file structure and patterns
5. Type constant naming conventions
6. Plugin registration pattern

Thoroughness: very thorough

Return structured findings as JSON.
```

---

### Step 3: Collect Codebase Findings

Agent returns structured findings:

```json
{
  "similar_plugins": [
    {
      "plugin": "postgres",
      "location": "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/postgres/",
      "similarity": "Same connection-based protocol",
      "patterns_to_reuse": ["Banner parsing", "Version extraction"]
    }
  ],
  "affected_files": [
    {
      "path": "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go",
      "change_type": "modify",
      "reason": "Add type constant"
    },
    {
      "path": "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go",
      "change_type": "modify",
      "reason": "Add plugin import"
    }
  ],
  "test_patterns": {
    "unit_tests": "Table-driven tests with mock responses",
    "mock_pattern": "bytes.Buffer for response simulation"
  },
  "type_conventions": {
    "constant_format": "Service{Name} = \"service-name\"",
    "ordering": "Alphabetical in types.go"
  }
}
```

---

## Part B: Protocol Research (BLOCKING)

### Step 4: Determine Open-Source vs Closed-Source

Ask or determine:

```
AskUserQuestion({
  questions: [{
    question: "Is the {protocol} source code publicly available?",
    header: "Source Type",
    options: [
      { label: "Open-source", description: "Source code available (GitHub, etc.)" },
      { label: "Closed-source", description: "Proprietary protocol, no source access" }
    ],
    multiSelect: false
  }]
})
```

**Record in MANIFEST:** `plugin_type: "open-source"` or `"closed-source"`

---

### Step 5: Protocol Research (BLOCKING GATE)

**REQUIRED SUB-SKILL:** `Read(".claude/skill-library/research/researching-protocols/SKILL.md")`

This research MUST complete before proceeding. Research includes:

| Research Item      | Description                       | Blocking |
| ------------------ | --------------------------------- | -------- |
| Banner format      | How the service identifies itself | YES      |
| Default ports      | Standard port(s) for the protocol | YES      |
| Handshake sequence | Initial connection behavior       | YES      |
| Error responses    | How protocol reports errors       | NO       |
| Shodan queries     | How to find live examples         | YES      |

**Research deliverable:** `protocol-research.md`

```markdown
# Protocol Research: {Protocol Name}

## Service Identification

**Default Ports:** {port_list}
**Protocol Type:** TCP/UDP
**Banner Available:** Yes/No

## Detection Strategy

### Banner Pattern

{Description of how service announces itself}

**Example banner:**
```

{raw banner example from Shodan/testing}

```

### Detection Markers

| Marker | Location | Confidence |
|--------|----------|------------|
| {marker_1} | Byte offset 0-4 | High |
| {marker_2} | String match | High |

### Error Handling

| Error Condition | Expected Response |
|-----------------|-------------------|
| Connection refused | Graceful fail |
| Malformed banner | Skip detection |

## Shodan Queries

| Query | Purpose | Example Host Count |
|-------|---------|-------------------|
| `product:{protocol}` | Basic search | {count} |
| `port:{port} {marker}` | Specific banner | {count} |

## Test Vectors

At least 3 real-world examples:

| Host | Port | Version (if known) | Banner Snippet |
|------|------|-------------------|----------------|
| {host_1} | {port} | {version} | {snippet} |
| {host_2} | {port} | {version} | {snippet} |
| {host_3} | {port} | {version} | {snippet} |
```

---

### Step 6: Version Marker Research (CONDITIONAL)

**CONDITION:** Only for open-source protocols.

If closed-source:

- Skip to Step 7
- Document: `version_markers: "N/A - closed source"`

If open-source:

**REQUIRED SUB-SKILL:** `Read(".claude/skill-library/research/researching-version-markers/SKILL.md")`

**Research deliverable:** `version-matrix.md`

```markdown
# Version Fingerprint Matrix: {Protocol}

## Source Repository

**URL:** {repo_url}
**License:** {license}

## Version Detection Method

{Description of how version is embedded in banner/response}

## Version Matrix

| Version Range | Detection Marker               | Banner Pattern | Confidence |
| ------------- | ------------------------------ | -------------- | ---------- |
| 5.x           | capability_flag & 0x01         | `5.\d+.\d+`    | High       |
| 8.0+          | capability_flag & 0x04         | `8.\d+.\d+`    | High       |
| MariaDB       | Server name contains "MariaDB" | `MariaDB`      | High       |

## Distinguishable Versions

Minimum 3 version ranges that can be reliably distinguished:

1. **{version_1}**: {how_detected}
2. **{version_2}**: {how_detected}
3. **{version_3}**: {how_detected}
```

---

### Step 7: Validate Research

Before proceeding, verify:

**Protocol Research Gate:**

- [ ] Banner pattern documented with example
- [ ] Default port(s) identified
- [ ] At least 3 Shodan test vectors
- [ ] Detection strategy clear

**Version Research Gate (if open-source):**

- [ ] At least 3 distinguishable version ranges
- [ ] Each range has detection marker
- [ ] Source repository documented

**GATE PASS CRITERIA:** All applicable checkboxes must be checked.

---

## Step 8: Write Discovery Report

Create `.fingerprintx-development/discovery.md`:

```markdown
# Discovery Report

**Protocol:** {protocol name}
**Work Type:** {from triage}
**Plugin Type:** {open-source/closed-source}
**Discovered:** {timestamp}

## Codebase Findings

### Similar Plugins

| Plugin   | Location                       | Patterns to Reuse  |
| -------- | ------------------------------ | ------------------ |
| postgres | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/postgres/ | Banner parsing     |
| mysql    | {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/mysql/    | Version extraction |

### Files to Modify

| File                   | Reason            |
| ---------------------- | ----------------- |
| {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go   | Add type constant |
| {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go | Add plugin import |

### Files to Create

| File                                                | Purpose              |
| --------------------------------------------------- | -------------------- |
| {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go           | Main detection logic |
| {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}\_test.go | Unit tests           |

### Test Patterns

- Table-driven tests with mock banner responses
- Integration tests with Docker containers

## Protocol Research Summary

- **Detection Strategy:** {brief description}
- **Banner Markers:** {key markers}
- **Default Ports:** {port_list}
- **Version Detection:** {method or "N/A - closed source"}

## Artifacts Created

- discovery.md (this file)
- protocol-research.md
- version-matrix.md (if open-source)
```

---

## Step 9: Update MANIFEST.yaml

Record discovery findings:

```yaml
phases:
  3_codebase_discovery:
    status: "complete"
    completed_at: "{timestamp}"

plugin_type: "open-source"
default_ports: [3306, 3307]

codebase_discovery:
  completed_at: "{timestamp}"

  similar_plugins: ["postgres", "mysql"]
  affected_files:
    modify: ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go", "{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go"]
    create: ["{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go"]

  test_patterns: "Table-driven with mock responses"

protocol_research:
  detection_strategy: "{brief description}"
  banner_patterns: ["{pattern_1}", "{pattern_2}"]
  version_markers: ["{marker_1}", "{marker_2}"]
  shodan_queries: ["{query_1}", "{query_2}"]
  test_vectors_count: 5
```

---

## Step 10: Update TodoWrite

```
TodoWrite([
  { content: "Phase 3: Codebase Discovery", status: "completed", activeForm: "Discovering codebase patterns" },
  { content: "Phase 4: Skill Discovery", status: "in_progress", activeForm: "Mapping skills to technologies" },
  // ... rest
])
```

---

## Step 11: Report Discovery Results

Output to user:

```markdown
## Codebase Discovery Complete

**Plugin Type:** {open-source/closed-source}

**Codebase Findings:**

- Similar plugins: postgres, mysql (patterns reusable)
- Files to modify: 2
- Files to create: 2

**Protocol Research:**

- Detection strategy: {brief description}
- Banner markers: {count} identified
- Default ports: {port_list}
- Test vectors: {count} from Shodan

**Version Research:** {status}

- Distinguishable versions: {count}

-> Proceeding to Compaction Gate 1, then Phase 4: Skill Discovery
```

---

## Edge Cases

### No Similar Plugins Found

If protocol is unique:

- Document as novel implementation
- Reference general plugin pattern from `{CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/`
- Flag for extra attention in Architecture phase

### Shodan Has Limited Data

If fewer than 3 test vectors available:

- Document limitation
- Plan for Docker-based testing in Phase 13
- Consider Censys or other sources

### Version Markers Unclear

If version extraction is unreliable:

- Document as "best-effort version detection"
- May still detect service without version
- Note limitation in plugin documentation

---

## Related References

- [Phase 2: Triage](phase-2-triage.md) - Provides work_type
- [Phase 4: Skill Discovery](phase-4-skill-discovery.md) - Uses findings
- [Compaction Gates](compaction-gates.md) - Required before Phase 4
- [researching-protocols](.claude/skill-library/research/researching-protocols/SKILL.md) - Protocol research skill
- [researching-version-markers](.claude/skill-library/research/researching-version-markers/SKILL.md) - Version research skill
