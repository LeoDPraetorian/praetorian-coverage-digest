# Phase 8: Plan Review - Extended Examples and Automation

Complete examples, automated verification scripts, incomplete plan handling, metadata updates, and workflow integration for plan completion review.

**Core protocol**: See [phase-6-plan-review.md](phase-6-plan-review.md)

## Plan Review Examples

### Example 1: 15-Tool Service - All Complete

```markdown
## Plan Completion Review: linear

**Tools in manifest:** 15
**Tools wrapped:** 15
**Coverage:** 100%

### Status Summary

✅ All tools complete and approved

| Tool          | Status   | Phases      |
| ------------- | -------- | ----------- |
| get-issue     | complete | ✓ ✓ ✓ ✓ ✓ ✓ |
| list-issues   | complete | ✓ ✓ ✓ ✓ ✓ ✓ |
| create-issue  | complete | ✓ ✓ ✓ ✓ ✓ ✓ |
| update-issue  | complete | ✓ ✓ ✓ ✓ ✓ ✓ |
| delete-issue  | complete | ✓ ✓ ✓ ✓ ✓ ✓ |
| ... (10 more) | complete | ✓ ✓ ✓ ✓ ✓ ✓ |

**Proceed to Phase 10: Testing** ✅
```

### Example 2: 20-Tool Service - 18 Complete, 2 Deferred

```markdown
## Plan Completion Review: github

**Tools in manifest:** 20
**Tools wrapped:** 18
**Tools deferred:** 2
**Coverage:** 90%

### Status Summary

⚠️ 2 tools deferred with user approval

| Tool                    | Status       | Phases      | Notes                           |
| ----------------------- | ------------ | ----------- | ------------------------------- |
| get-repo                | complete     | ✓ ✓ ✓ ✓ ✓ ✓ | -                               |
| list-repos              | complete     | ✓ ✓ ✓ ✓ ✓ ✓ | -                               |
| ... (16 more complete)  | complete     | ✓ ✓ ✓ ✓ ✓ ✓ | -                               |
| experimental-codespaces | **deferred** | -           | User approved: Alpha feature    |
| legacy-download         | **deferred** | -           | User approved: Deprecated in v2 |

### Deferred Tools

**experimental-codespaces**

- **Reason:** Tool marked as alpha with breaking changes expected
- **Justification:** GitHub MCP docs warn against production use. API unstable, expected v2 rewrite Q2 2025.
- **Approved by:** User (2025-01-11)

**legacy-download**

- **Reason:** Deprecated in MCP v2, replaced by get-artifact
- **Justification:** Tool will be removed in next major release. get-artifact provides same functionality with better performance.
- **Approved by:** User (2025-01-11)

**Proceed to Phase 10: Testing** ✅
```

### Example 3: Service with Missing Tools

```markdown
## Plan Completion Review: jira

**Tools in manifest:** 12
**Tools wrapped:** 9
**Tools incomplete:** 3
**Coverage:** 75%

### Status Summary

❌ Cannot proceed - 3 tools incomplete

| Tool                  | Status          | Phases      | Missing                                     |
| --------------------- | --------------- | ----------- | ------------------------------------------- |
| get-issue             | complete        | ✓ ✓ ✓ ✓ ✓ ✓ | -                                           |
| list-issues           | complete        | ✓ ✓ ✓ ✓ ✓ ✓ | -                                           |
| ... (7 more complete) | complete        | ✓ ✓ ✓ ✓ ✓ ✓ | -                                           |
| search-issues         | **in_progress** | ✓ ✓ ✓ ✓ ✗ ✗ | implementation, review                      |
| filter-advanced       | **in_progress** | ✓ ✓ ✓ ✗ ✗ ✗ | test_implementation, implementation, review |
| export-report         | **missing**     | ✗ ✗ ✗ ✗ ✗ ✗ | ALL PHASES                                  |

### Resolution Required

**search-issues:** Complete Phases 6-7 (implementation + review)
**filter-advanced:** Complete Phases 4-7 (test implementation through review)
**export-report:** Complete Phases 2-7 (schema discovery through review)

**Action:** Resume implementation for incomplete tools before GREEN gate.
```

## Automated Verification

Create a verification script that runs before Phase 10:

```typescript
function verifyPlanCompletion(service: string): VerificationResult {
  const manifest = loadToolsManifest(service);
  const metadata = loadMetadata(service);

  const results = {
    total_tools: manifest.total_tools,
    complete: [],
    in_progress: [],
    blocked: [],
    deferred: [],
    missing: [],
  };

  for (const tool of manifest.tools) {
    const status = getToolStatus(tool.name, metadata);
    results[status].push(tool.name);
  }

  const ready_for_green_gate =
    results.in_progress.length === 0 &&
    results.blocked.length === 0 &&
    results.missing.length === 0;

  return {
    ready: ready_for_green_gate,
    coverage: results.complete.length / results.total_tools,
    incomplete_tools: [...results.in_progress, ...results.blocked, ...results.missing],
    deferred_tools: results.deferred,
    report: generateReport(results),
  };
}
```

## Handling Incomplete Plans

### If Tools Are Missing/In-Progress

```typescript
const verification = verifyPlanCompletion(service);

if (!verification.ready) {
  AskUserQuestion({
    questions: [
      {
        header: "⚠️ Incomplete Tool Coverage",
        question: `Plan completion check found incomplete tools:\n\n${verification.report}\n\n**Coverage:** ${verification.coverage * 100}%\n\nHow to proceed?`,
        multiSelect: false,
        options: [
          {
            label: "Complete missing tools",
            description: "Resume implementation for incomplete tools",
          },
          {
            label: "Defer specific tools",
            description: "Skip incomplete tools with justification",
          },
          {
            label: "Show tool details",
            description: "View status for each incomplete tool",
          },
        ],
      },
    ],
  });
}
```

### If Tools Are Blocked (Review Failed)

```typescript
if (verification.results.blocked.length > 0) {
  AskUserQuestion({
    questions: [
      {
        header: "🚨 Blocked Tools Detected",
        question: `${verification.results.blocked.length} tools failed review after max retries:\n\n${verification.results.blocked.join(", ")}\n\nThese tools require manual intervention.`,
        multiSelect: false,
        options: [
          {
            label: "Manual review and fix",
            description: "I'll fix blocked tools manually",
          },
          {
            label: "Defer blocked tools",
            description: "Skip these tools, document reasons",
          },
          {
            label: "Show blocking issues",
            description: "View review reports for blocked tools",
          },
        ],
      },
    ],
  });
}
```

## Metadata Updates

After plan review, update MANIFEST.yaml with summary:

```json
{
  "phases": {
    "plan_review": {
      "status": "complete",
      "reviewed_at": "2025-01-11T15:45:00Z",
      "verification_result": {
        "total_tools": 15,
        "complete": 15,
        "in_progress": 0,
        "blocked": 0,
        "deferred": 0,
        "missing": 0,
        "coverage": 1.0,
        "ready_for_green_gate": true
      }
    }
  }
}
```

## Integration with Workflow

Phase 8 plan review executes AFTER all implementation batches complete:

```
Phase 8: Implementation
  Batch 1: Tools 1-3 → Complete
  Batch 2: Tools 4-6 → Complete
  Batch 3: Tools 7-9 → Complete
  ... (all batches)
  Batch N: Final tools → Complete

→ Phase 8 Plan Review (NEW)
  Verify all tools from manifest are complete
  Check for deferred tools
  Validate review verdicts
  Generate completion report

→ Phase 9: Code Review (if plan review passes)
```

## Exit Criteria

Plan review passes when:

- ✅ All tools from manifest are in MANIFEST.yaml
- ✅ Every tool status is `complete` or `deferred`
- ✅ Every complete tool has review verdict: APPROVED
- ✅ Every deferred tool has user-approved justification
- ✅ Zero tools in `in_progress`, `blocked`, or `missing` status
- ✅ Coverage ≥ user-approved threshold (typically 90-100%)

## Related References

- [Phase 8: Plan Review](phase-6-plan-review.md) - Core protocol
- [Checkpoint Configuration](checkpoint-configuration.md) - Escalation for incomplete plans
- [Phase 9: Code Review](phase-7-code-review.md) - Review verdict requirements
- [Metadata Structure](manifest-structure.md) - Tool status tracking
- [Rationalization Table](rationalization-table.md) - Plan completion rationalizations
