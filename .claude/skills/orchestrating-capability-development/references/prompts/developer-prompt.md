# Developer Subagent Prompt Template

Use this template when dispatching capability-developer subagent in Phase 4.

## Usage

```typescript
Task({
  subagent_type: "capability-developer",
  description: "Implement [capability]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are implementing capability: [CAPABILITY_NAME]

## Capability Context

**Type**: [VQL | Nuclei | Janus | Fingerprintx | Scanner]

**Description**: [PASTE design.md summary from Phase 1]

## Architecture

[PASTE architecture.md implementation details - detection logic, data flow, code structure]

## Output Directory

OUTPUT_DIRECTORY: [CAPABILITY_DIR]

Write capability artifacts and implementation-log.md to this directory.

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **persisting-agent-outputs** - Use for output file format and metadata
2. **developing-with-tdd** - Write tests FIRST, then implementation
3. **adhering-to-dry** - Reuse patterns from architecture
4. **adhering-to-yagni** - Implement only what's specified, no extras
5. **verifying-before-completion** - Verify artifacts work before claiming done

## STEP 0: Clarification (MANDATORY)

**Before ANY implementation work**, review the architecture specification and identify:

1. **Ambiguous requirements** - Anything that could be interpreted multiple ways
2. **Missing information** - Dependencies, APIs, protocols, data formats not specified
3. **Assumptions you're making** - State them explicitly
4. **Scope questions** - What's in/out of scope

### If You Have Questions

Return immediately with structured JSON:

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement|dependency|scope|assumption",
      "question": "Specific question text",
      "options": ["Option A", "Option B"],
      "impact": "What happens if this is wrong"
    }
  ]
}
```

**Example:**

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement",
      "question": "Should the VQL query check all S3 buckets or only public ones?",
      "options": ["All buckets", "Only public buckets"],
      "impact": "Affects query performance and detection scope"
    },
    {
      "category": "dependency",
      "question": "Does Velociraptor have AWS API access configured?",
      "options": ["Yes", "No", "Unknown - need to check"],
      "impact": "May require additional AWS credential handling"
    }
  ]
}
```

### If No Questions

State explicitly:

"I have reviewed the architecture specification. All requirements are clear. No clarification needed. Proceeding with implementation."

### DO NOT

- Assume answers to ambiguous questions
- Skip clarification because "it seems simple"
- Proceed with implementation when requirements are unclear
- Guess at APIs, protocols, or data formats

---

## Your Job (After Clarification)

1. Create capability artifacts (VQL queries, Nuclei templates, Go code, etc.)
2. Follow TDD: Write tests first, verify they fail, then implement
3. Implement detection logic per architecture.md
4. Handle all edge cases from architecture
5. Add inline documentation
6. Create implementation log documenting decisions

## TDD Pattern for Capabilities (Follow These Examples)

### Example 1: VQL Capability Test

**Task**: Add VQL capability to detect open S3 buckets

**Step 1 - Write failing test first**:
```yaml
# tests/s3_bucket_exposure_test.yaml
name: S3 Bucket Exposure Detection Test
test_cases:
  - name: detects_public_bucket
    input:
      bucket_name: "test-bucket"
      acl: "public-read"
    expected:
      detected: true
      severity: "high"

  - name: ignores_private_bucket
    input:
      bucket_name: "private-bucket"
      acl: "private"
    expected:
      detected: false
```

**Step 2 - Run test, verify failure**:
```
FAIL: Capability s3_bucket_exposure not found
```
✓ Correct - capability doesn't exist yet

**Step 3 - Implement minimal capability**:
```yaml
# capabilities/s3_bucket_exposure.yaml
name: S3 Bucket Exposure
description: Detects publicly accessible S3 buckets
queries:
  - SELECT * FROM s3_buckets()
    WHERE acl = 'public-read' OR acl = 'public-read-write'
severity: high
```

**Step 4 - Verify tests pass**:
```
PASS: detects_public_bucket
PASS: ignores_private_bucket
```

### Example 2: Nuclei Template Test

**Task**: Add Nuclei template for CVE-2024-1234

**Step 1 - Write failing test**:
```yaml
# tests/cve_2024_1234_test.yaml
test_cases:
  - name: detects_vulnerable_version
    target: "http://test-vulnerable:8080"
    expected_match: true
    expected_severity: "critical"

  - name: ignores_patched_version
    target: "http://test-patched:8080"
    expected_match: false
```

**Step 2 - Verify failure**: Template not found ✓

**Step 3 - Implement template**:
```yaml
id: CVE-2024-1234
info:
  name: Example Vulnerability
  severity: critical

requests:
  - method: GET
    path:
      - "{{BaseURL}}/vulnerable-endpoint"
    matchers:
      - type: word
        words:
          - "vulnerable-version-string"
```

**Step 4 - Verify pass**: All test cases green ✓

---

**Apply this pattern. Test MUST fail before implementation.**

## Capability Artifacts by Type

### VQL Capabilities

- Location: `modules/chariot-aegis-capabilities/`
- Files: `.vql` query files
- Structure: Follow existing VQL patterns

### Nuclei Templates

- Location: `modules/nuclei-templates/`
- Files: `.yaml` template files
- Structure: Follow Nuclei template format

### Janus Tool Chains

- Location: `modules/janus/`
- Files: Go files with tool integration
- Structure: Implement Janus framework interfaces

### Fingerprintx Modules

- Location: `modules/fingerprintx/`
- Files: Go plugin files
- Structure: Implement fingerprintx plugin interface

### Scanner Integrations

- Location: `modules/chariot/backend/pkg/integrations/`
- Files: Go client and mapper files
- Structure: Follow integration patterns

## Implementation Log Structure

Create implementation-log.md:

```markdown
# [Capability] Implementation Log

## Summary

[2-3 sentences: What was implemented, key decisions]

## Files Created

| File | Type | Lines | Purpose |
| ---- | ---- | ----- | ------- |
| ...  | ...  | ...   | ...     |

## TDD Workflow

### Test 1: [Test name]

- **RED**: [What failed initially]
- **GREEN**: [How implementation made it pass]

### Test 2: [Test name]

...

## Implementation Decisions

### Decision 1: [Topic]

**Options**: [Alternatives considered]
**Choice**: [What we did]
**Rationale**: [Why]

### Decision 2: [Topic]

...

## Edge Cases Handled

1. **[Edge case]**: [How implemented]
2. **[Edge case]**: [How implemented]

## Verification

- [ ] All tests pass
- [ ] Manual testing with known positives: [Results]
- [ ] Manual testing with known negatives: [Results]
- [ ] Detection accuracy meets target: [%]
- [ ] False positive rate acceptable: [%]

## Issues Encountered

[Any blockers, workarounds, or technical debt created]
```
````

## Output Format

Create structured JSON metadata at the end of implementation-log.md:

```json
{
  "agent": "capability-developer",
  "output_type": "implementation",
  "capability_type": "[type]",
  "skills_invoked": [
    "persisting-agent-outputs",
    "developing-with-tdd",
    "adhering-to-dry",
    "adhering-to-yagni",
    "verifying-before-completion"
  ],
  "status": "complete",
  "files_created": ["list of files"],
  "tests_passing": true,
  "handoff": {
    "next_agent": "capability-reviewer",
    "context": "Implementation complete with [N] tests passing"
  }
}
```

### If Blocked

If you cannot complete implementation:

```json
{
  "status": "blocked",
  "blocked_reason": "test_failures|technical_limitation|missing_dependency|unclear_architecture",
  "attempted": ["what you tried"],
  "handoff": {
    "next_agent": null,
    "context": "Detailed explanation of blocker"
  }
}
```

```

```
