# Phase 5: Review

Validate implementation against architecture plan and capability-specific quality standards.

## Purpose

Ensure capability implementation:

- Matches architecture plan (Phase 3)
- Follows capability-type best practices
- Handles all edge cases from design
- Meets quality standards for detection accuracy

## Quick Reference

| Aspect         | Details                                            |
| -------------- | -------------------------------------------------- |
| **Agent**      | capability-reviewer                                |
| **Input**      | architecture.md, implementation-log.md, code files |
| **Output**     | review.md                                          |
| **Checkpoint** | 🔄 MAX 1 RETRY - then escalate to user             |

## Agent Spawning

```typescript
Task("capability-reviewer", {
  description: "Review capability implementation",
  prompt: `Review ${capabilityType} capability implementation against architecture plan.

    INPUT_FILES:
    - ${OUTPUT_DIR}/architecture.md (implementation plan)
    - ${OUTPUT_DIR}/implementation-log.md (what was implemented)
    - ${files_created} (actual code to review)

    OUTPUT_DIRECTORY: ${OUTPUT_DIR}

    MANDATORY SKILLS (invoke ALL before completing):
    - persisting-agent-outputs: For writing output files
    - gateway-capabilities: For capability-specific quality standards

    Validate:
    1. Architecture Compliance - Does implementation match plan?
    2. Quality Standards - Meets capability-type best practices?
    3. Error Handling - All edge cases from architecture addressed?
    4. Code Quality - Follows conventions and patterns?

    Output review.md with APPROVED or CHANGES_REQUESTED status.

    COMPLIANCE: Document invoked skills in output metadata.`,
  subagent_type: "capability-reviewer",
});
```

## Review Checklist by Type

### VQL Capabilities

- [ ] Query syntax valid and efficient
- [ ] Artifact collection targets correct files/registry keys
- [ ] Detection logic matches architecture specification
- [ ] Output format produces expected JSON structure
- [ ] Performance considerations addressed (LIMIT, filtering)
- [ ] Edge cases handled (empty files, permission denied)

### Nuclei Templates

- [ ] Template ID and metadata complete
- [ ] HTTP requests match architecture plan
- [ ] Matchers correctly validate vulnerability presence
- [ ] Extractors capture required data (if specified)
- [ ] Severity and CVE/CWE correctly assigned
- [ ] False positive mitigation implemented

### Janus Tool Chains

- [ ] Tool sequence matches architecture plan
- [ ] Data passing between tools implemented correctly
- [ ] Error handling and recovery for tool failures
- [ ] Result aggregation logic correct
- [ ] Unit tests cover core logic
- [ ] Interface contracts followed

### Fingerprintx Modules

- [ ] 5-method interface implemented correctly
- [ ] Type constant added to types.go
- [ ] Plugin registered in plugin_list.go
- [ ] Network protocol implementation correct
- [ ] Version extraction logic matches architecture
- [ ] CPE generation follows format
- [ ] Edge cases handled (timeouts, malformed responses)

### Scanner Integrations

- [ ] HTTP client authentication implemented
- [ ] API endpoints called correctly
- [ ] Result normalization to Chariot model correct
- [ ] Rate limiting and pagination handled
- [ ] Error handling (timeouts, auth failures, rate limits)
- [ ] Data mapping complete (all scanner fields)

## Review Report Format

The `capability-reviewer` agent must produce `review.md`:

```markdown
# Review Report - ${Capability Name}

## Date: ${ISO timestamp}

## Reviewer: capability-reviewer

## Status: APPROVED | CHANGES_REQUESTED

---

## ARCHITECTURE COMPLIANCE

### Detection Logic

[✅ Compliant | ❌ Issues found]

[Details]

### Data Flow

[✅ Compliant | ❌ Issues found]

[Details]

### Error Handling

[✅ Compliant | ❌ Issues found]

[Details]

---

## QUALITY STANDARDS (Capability-Specific)

### [Standard 1 for capability type]

[✅ Met | ❌ Not met]

[Details]

### [Standard 2 for capability type]

[✅ Met | ❌ Not met]

[Details]

---

## CODE QUALITY

### Conventions

[✅ Followed | ❌ Violations]

[Details]

### Patterns

[✅ Consistent | ❌ Inconsistent]

[Details]

---

## ISSUES IDENTIFIED

[If CHANGES_REQUESTED]

1. **Issue 1**: [Description]
   - **Location**: path/to/file:line
   - **Severity**: Critical | Major | Minor
   - **Fix**: [Required action]

2. **Issue 2**: [Description]
   - **Location**: path/to/file:line
   - **Severity**: Critical | Major | Minor
   - **Fix**: [Required action]

---

## RECOMMENDATIONS

[Optional improvements, not blocking]

---

## VERDICT

[If APPROVED]
Implementation approved. Ready for Phase 6 (Testing).

[If CHANGES_REQUESTED]
Implementation requires changes. Return to capability-developer with issue list.
```

## Retry Logic (MAX 1 RETRY)

### First Review: CHANGES_REQUESTED

1. **Extract issues** from review.md
2. **Re-invoke capability-developer** with fix guidance:

```typescript
Task("capability-developer", {
  description: "Fix review issues",
  prompt: `Fix issues identified in review.md:

    ISSUES TO FIX:
    ${issues_from_review}

    INPUT_FILES:
    - ${OUTPUT_DIR}/review.md (review feedback)
    - ${OUTPUT_DIR}/architecture.md (original plan)
    - ${files_created} (code to fix)

    OUTPUT_DIRECTORY: ${OUTPUT_DIR}

    Fix all Critical and Major issues.
    Update implementation-log.md with changes made.`,
  subagent_type: "capability-developer",
});
```

3. **Re-invoke capability-reviewer** after fixes
4. **Update retry_count** in metadata.json

### Second Review: CHANGES_REQUESTED

If still CHANGES_REQUESTED after one retry:

1. **ESCALATE to user** via AskUserQuestion:

```
The capability-reviewer has requested changes twice:

Round 1 Issues:
${round1_issues}

Round 2 Issues (after fixes):
${round2_issues}

How would you like to proceed?

Options:
- Approve as-is - Accept implementation with known issues
- Manual intervention - I'll fix the issues myself
- Revise architecture - The plan needs adjustment
- Abandon - Stop capability development
```

2. **Do NOT retry a third time** - manual intervention required

## Handoff Format

After review completes (APPROVED):

```json
{
  "agent": "capability-reviewer",
  "phase": "review",
  "timestamp": "2026-01-04T15:10:00Z",
  "output_file": "review.md",
  "status": "complete",
  "handoff": {
    "next_phase": "testing",
    "next_agent": "test-lead",
    "context": "Implementation approved. ${capabilityType} capability validated against architecture. Key quality metrics: ${metrics}. Ready for test planning."
  }
}
```

## metadata.json Updates

After review completes (APPROVED):

```json
{
  "phases": {
    "review": {
      "status": "complete",
      "output_file": "review.md",
      "retry_count": 0,
      "final_verdict": "APPROVED",
      "completed_at": "2026-01-04T15:10:00Z",
      "agent_invoked": "capability-reviewer"
    },
    "testing": {
      "status": "in_progress",
      "retry_count": 0
    }
  },
  "current_phase": "testing"
}
```

After retry (CHANGES_REQUESTED → developer fixes → re-review):

```json
{
  "phases": {
    "review": {
      "status": "in_progress",
      "retry_count": 1,
      "round_1_issues": [...],
      "agent_invoked": "capability-reviewer"
    }
  }
}
```

## Exit Criteria

Review phase is complete when:

- [ ] capability-reviewer agent completed
- [ ] review.md written to capability directory
- [ ] Status is APPROVED (or user escalation resolved)
- [ ] retry_count ≤ 1 (max one retry before escalation)
- [ ] metadata.json updated with review status

## Common Issues

### "Reviewer flagged style issues"

**Solution**: Minor style issues should be recommendations, not blocking issues. Only Critical/Major issues block approval.

### "Implementation fundamentally wrong"

**Solution**: If architecture plan was flawed, escalate to user. May need to revise architecture (Phase 3) before proceeding.

### "Endless retry loop"

**Solution**: This is prevented by MAX 1 RETRY rule. After second CHANGES_REQUESTED, must escalate to user.

## Related

- [Phase 4: Implementation](phase-4-implementation.md) - Previous phase (produces code)
- [Phase 6: Testing](phase-6-testing.md) - Next phase (validates behavior)
- [Quality Standards](quality-standards.md) - Quality criteria by capability type
- [Agent Handoffs](agent-handoffs.md) - Handoff format and retry logic
- [Troubleshooting](troubleshooting.md) - Review failure patterns
