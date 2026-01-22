# Phase 16: Completion

**Finalize workflow: verification, PR creation, frontend (conditional), cleanup.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Completion finalizes the integration development workflow:

1. Verify all phases complete
2. Run final verification commands
3. Create PR (if requested)
4. Spawn frontend-developer (if UI needed)
5. Clean up worktree
6. Update final status

**Entry Criteria:** Phase 15 (Test Quality) complete.

**Exit Criteria:** Workflow marked complete, deliverables finalized, human approval obtained.

**🛑 HUMAN CHECKPOINT:** Final approval required before marking workflow complete.

---

## Step 1: Verify All Phases Complete

Check MANIFEST.yaml - all must be "complete" or "skipped" (with reason).

**If any phase NOT complete/skipped:** Do NOT proceed. Resolve outstanding phases first.

---

## Step 2: Run Final Verification

```bash
cd modules/chariot/backend

# Build, test, coverage, vet, lint
go build ./pkg/tasks/integrations/{vendor}/...
go test ./pkg/tasks/integrations/{vendor}/... -v
go test ./pkg/tasks/integrations/{vendor}/... -cover
go vet ./pkg/tasks/integrations/{vendor}/...
golangci-lint run ./pkg/tasks/integrations/{vendor}/...
```

---

## Step 3: Verify Exit Criteria

All must be true:

- [ ] All phases marked complete in MANIFEST.yaml
- [ ] All spawned agents returned status: complete
- [ ] P0 compliance: 7/7 requirements pass
- [ ] Build, test, vet, lint pass
- [ ] Vendor skill exists: `integrating-with-{vendor}`
- [ ] Test coverage ≥80%

---

## Step 4: Generate Final Summary

Create `{OUTPUT_DIR}/completion.md` with:

- Phases executed table (16 phases with status)
- Implementation summary (files created, line counts)
- P0 compliance status (7/7)
- Test coverage and quality score
- Skill artifacts created

---

## Step 5: PR Creation (If Requested)

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Integration workflow complete. Create a pull request?",
      header: "PR",
      multiSelect: false,
      options: [
        { label: "Create PR (Recommended)", description: "Create PR with generated summary" },
        { label: "Skip PR", description: "I'll create PR manually" },
        { label: "Show me the changes", description: "Review files before PR" },
      ],
    },
  ],
});
```

**If creating PR:** Use `finishing-a-development-branch` skill with P0 compliance checklist in PR body.

---

## Step 6: Frontend Integration (Conditional)

**Check if frontend work needed:**

```typescript
AskUserQuestion({
  questions: [
    {
      question: "{vendor} integration complete. Does this integration need UI configuration?",
      header: "Frontend",
      multiSelect: false,
      options: [
        { label: "Yes, add UI", description: "Spawn frontend-developer for settings page" },
        { label: "No, backend only", description: "Integration is API-only" },
      ],
    },
  ],
});
```

**If frontend needed:** Spawn `frontend-developer` to add integration to settings page with credential input and connection test button.

---

## Step 7: Clean Up Worktree (If Used)

```bash
cd {original_directory}
git worktree remove {worktree_path}
git branch -d feature/{vendor}-integration  # if merged
```

---

## Step 8: Final Human Checkpoint

**🛑 REQUIRED:** Obtain human approval before marking complete.

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Integration development complete. All verification passed. Approve completion?",
      header: "Final Approval",
      multiSelect: false,
      options: [
        { label: "Approve and complete", description: "Mark workflow complete" },
        { label: "Review deliverables", description: "Show me all outputs before approving" },
        { label: "Not ready", description: "There are issues to address" },
      ],
    },
  ],
});
```

---

## Step 9: Update Final MANIFEST

```yaml
phases:
  16_completion:
    status: "complete"
    completed_at: "{timestamp}"
    human_approved: true

workflow:
  status: "complete"
  started_at: "{start_timestamp}"
  completed_at: "{end_timestamp}"
  summary:
    work_type: "MEDIUM"
    files_created: 3
    tests_added: 14
    coverage_percent: 85.2
    quality_score: 85
    p0_compliance: "7/7"
  skill_artifacts: ["integrating-with-{vendor}"]
  pr: { created: true, url: "..." }
  frontend: { required: true, implemented: true }
  worktree: { used: true, cleaned: true }
```

---

## Step 10: Final Report

```markdown
## Integration Development Complete

**Integration:** {vendor}
**Work Type:** MEDIUM
**Duration:** {duration}

### Summary

- **Files Created:** 3
- **Tests Added:** 14
- **Coverage:** 85.2%
- **Quality Score:** 85/100
- **P0 Compliance:** 7/7 ✅

### Deliverables

All outputs saved to: {OUTPUT_DIR}/

### Skill Artifacts

`integrating-with-{vendor}` created for future reference.

### Pull Request

PR created: https://github.com/praetorian-inc/chariot/pull/123

**Workflow completed successfully.** ✅
```

---

## Completion Checklist

Before marking workflow complete:

- [ ] All phases complete or skipped with reason
- [ ] Build, test, vet, lint pass
- [ ] P0 compliance: 7/7
- [ ] Coverage ≥80%
- [ ] Vendor skill exists
- [ ] MANIFEST updated with final status
- [ ] Summary generated
- [ ] Human approval obtained
- [ ] (Optional) PR created
- [ ] (Optional) Frontend implemented
- [ ] (Optional) Worktree cleaned

---

## Related References

- [Phase 15: Test Quality](phase-15-test-quality.md) - Previous phase
- [finishing-a-development-branch](../../../skill-library/development/finishing-a-development-branch/SKILL.md) - PR creation
- [exit-criteria.md](exit-criteria.md) - Standard exit criteria
