# Phase 3: Codebase Discovery

**Explore codebase to identify existing integration patterns and affected areas.**

**This file provides:** Complete codebase discovery protocol for integration development.

---

## Overview

Codebase Discovery systematically explores the codebase to find:

1. Existing integration patterns (VMFilter, CheckAffiliation, pagination)
2. Files/components that will be affected
3. Technologies and libraries in use
4. P0-compliant code examples

**Entry Criteria:** Phase 2 (Triage) complete, work_type determined.

**Exit Criteria:** Discovery report complete, patterns documented.

**⛔ COMPACTION GATE 1 FOLLOWS:** Before proceeding to Phase 4, complete [compaction-gates.md](compaction-gates.md) protocol.

---

## Step 1: Invoke Discovery Skill

**REQUIRED SUB-SKILL:** `Skill("discovering-codebases-for-planning")`

Follow the skill's process completely.

---

## Step 2: Spawn Explore Agent(s)

| Work Type | Explore Agents | Thoroughness  |
| --------- | -------------- | ------------- |
| SMALL     | 1 agent        | very thorough |
| MEDIUM    | 2 agents       | very thorough |
| LARGE     | 3-4 agents     | very thorough |

**Integration-specific prompt template:**

```markdown
Task: Explore codebase for {vendor} integration patterns

Find:

1. VMFilter initialization patterns in existing integrations
2. CheckAffiliation implementations (real queries, not stubs)
3. Pagination loop patterns (token, page, cursor)
4. errgroup concurrency patterns with SetLimit
5. Error handling patterns
6. File organization (single vs split files)

Search locations:

- modules/chariot/backend/pkg/tasks/integrations/
- modules/chariot/backend/pkg/filter/

Thoroughness: very thorough

Return structured findings as JSON.
```

---

## Step 3: Integration-Specific Discovery Targets

| Pattern          | Search Location                                   | What to Find                      |
| ---------------- | ------------------------------------------------- | --------------------------------- |
| VMFilter         | `modules/chariot/backend/pkg/tasks/integrations/` | Filter initialization patterns    |
| CheckAffiliation | Same                                              | Non-stub implementations          |
| Pagination       | Same                                              | Loop structures, break conditions |
| errgroup         | Same                                              | SetLimit values, loop capture     |
| File structure   | Same                                              | Split vs monolithic files         |

---

## Step 4: Collect Discovery Findings

Agent(s) return structured findings:

```json
{
  "existing_patterns": [
    {
      "pattern": "VMFilter initialization",
      "location": "crowdstrike/crowdstrike.go:45-52",
      "reuse_recommendation": "Copy filter setup"
    },
    {
      "pattern": "CheckAffiliation with GraphQL",
      "location": "wiz/wiz.go:717-783",
      "reuse_recommendation": "Gold standard pattern"
    }
  ],
  "technologies_detected": {
    "backend": ["Go", "errgroup", "AWS Lambda"],
    "testing": ["Go testing", "httptest", "mock servers"]
  },
  "p0_examples": {
    "vmfilter": ["crowdstrike.go:45", "wiz.go:89"],
    "checkaffiliation_real": ["wiz.go:717"],
    "pagination_maxpages": ["tenable.go:156"],
    "errgroup_setlimit": ["crowdstrike.go:162"]
  },
  "file_placement": {
    "handler": "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go",
    "registration": "modules/chariot/backend/pkg/tasks/integrations/integrations.go"
  }
}
```

---

## Step 5: Validate Findings

Before proceeding, verify:

1. **Affected files exist:**

   ```bash
   for file in {affected_files}; do
     [ -f "$file" ] && echo "✓ $file" || echo "✗ $file NOT FOUND"
   done
   ```

2. **Patterns are current** (not deprecated):
   - Check file modification dates
   - Look for deprecation comments

3. **Dependencies are complete:**
   - Run import analysis if available
   - Check go.mod for external deps

---

## Step 6: Write Discovery Report

Create `{OUTPUT_DIR}/discovery.md`:

```markdown
# Discovery Report: {vendor} Integration

**Work Type:** {from triage}
**Discovered:** {timestamp}

## P0 Pattern Examples Found

### VMFilter (Requirement 1)

- CrowdStrike: crowdstrike.go:45-52
- Wiz: wiz.go:89-94

### CheckAffiliation (Requirement 2)

- Gold Standard: wiz.go:717-783 (real API query)
- Simple Pattern: github.go (CheckAffiliationSimple)

### Pagination (Requirement 5)

- Token-based: crowdstrike.go
- Page-based: github.go
- maxPages constant: tenable.go:156

### errgroup (Requirement 4)

- Standard pattern: crowdstrike.go:162-232
- SetLimit value: 10 (typical)

## File Size Reference

| Integration | Lines | Structure    |
| ----------- | ----- | ------------ |
| GitHub      | 380   | Single file  |
| Wiz         | 914   | Should split |
| Okta        | 285   | Single file  |

Recommendation: Target <400 lines per file

## File Placement Guide

- Handler: `modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go`
- Types: `{vendor}_types.go` (if >100 lines of structs)
- Client: `{vendor}_client.go` (if >100 lines of HTTP code)
- Registration: `modules/chariot/backend/pkg/tasks/integrations/integrations.go`

## Estimated Scope

- Files to create: {N}
- Files to modify: {N}
- Test files needed: {N}
```

---

## Step 7: Update MANIFEST.yaml

```yaml
phases:
  3_codebase_discovery:
    status: "complete"
    completed_at: "{timestamp}"

codebase_discovery:
  completed_at: "{timestamp}"

  p0_examples_found:
    vmfilter: ["crowdstrike.go:45", "wiz.go:89"]
    checkaffiliation: ["wiz.go:717"]
    pagination: ["tenable.go:156"]
    errgroup: ["crowdstrike.go:162"]

  file_placement:
    handler: "modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go"
    registration: "modules/chariot/backend/pkg/tasks/integrations/integrations.go"

  estimated_scope:
    files_create: 3
    files_modify: 1
    tests_needed: 2
```

---

## Step 8: Update TodoWrite

```
TodoWrite([
  { content: "Phase 3: Codebase Discovery", status: "completed", activeForm: "Discovering integration patterns" },
  { content: "Phase 4: Skill Discovery", status: "in_progress", activeForm: "Checking vendor skill" },
  // ... rest
])
```

---

## Step 9: Report Discovery Results

```markdown
## Codebase Discovery Complete

**P0 Examples Found:**

- VMFilter: 2 patterns (CrowdStrike, Wiz)
- CheckAffiliation: Gold standard from Wiz
- Pagination: 3 patterns (token, page, maxPages)
- errgroup: Standard pattern with SetLimit(10)

**File Placement:**

- Handler: modules/chariot/backend/pkg/tasks/integrations/{vendor}/{vendor}.go

**Recommended Patterns:**

- Use Wiz pattern for CheckAffiliation
- Use CrowdStrike pattern for VMFilter

⛔ **COMPACTION GATE 1:** Execute compaction before Phase 4.

→ After compaction, proceeding to Phase 4: Skill Discovery
```

---

## Gate Checklist

Phase 3 is complete when:

- [ ] `discovering-codebases-for-planning` skill invoked
- [ ] Explore agent(s) returned with P0 pattern examples
- [ ] `discovery.md` created with pattern analysis
- [ ] File placement documented
- [ ] MANIFEST.yaml updated with discovery findings
- [ ] Phase 3 status updated to 'complete'
- [ ] Ready for compaction gate

---

## Edge Cases

### No Existing Patterns Found

If codebase has no similar integration patterns:

- Document as greenfield area
- Use CrowdStrike and Wiz as gold standard references regardless
- Flag for extra attention in Architecture phase

### Too Many Affected Files

If affected_files > 20:

- May indicate scope creep
- Return to Phase 2 (Triage) to reassess work_type
- Consider breaking into multiple workflows

### Discovery Takes Too Long

If Explore agents exceed timeout:

- Capture partial findings
- Flag gaps for Phase 5 (Complexity) to address
- Consider splitting discovery into sub-phases

---

## Related References

- [compaction-gates.md](compaction-gates.md) - Gate 1 follows this phase
- [phase-4-skill-discovery.md](phase-4-skill-discovery.md) - Next phase
- [p0-compliance.md](p0-compliance.md) - P0 patterns to look for
