# Checkpoint Configuration - Escalation Procedures

Extended escalation procedures, emergency abort protocol, rationalization counters, and escalation approval tracking.

**Core checkpoints**: See [checkpoint-configuration.md](checkpoint-configuration.md)

        },
        {
          label: "Adjust architecture",
          description: "Architecture needs revision for this tool",
        },
        {
          label: "Skip tool",
          description: "Defer this tool, continue with others",
        },
        {
          label: "Show diagnostics",
          description: "View complete review reports and implementation",
        },
      ],
    },

],
});

````

### Escalation Format: Cumulative Issues

When cumulative issues exceed threshold across batches:

```typescript
AskUserQuestion({
  questions: [
    {
      header: "🚨 Issue Threshold Exceeded",
      question:
        "Cumulative issues across {N} batches: {count}/5 threshold.\n\n**Issue breakdown:**\n- Spec compliance violations: {count}\n- Quality issues: {count}\n- Security issues: {count}\n- Gate failures: {count}\n\nThis pattern suggests architectural or process issues.",
      multiSelect: false,
      options: [
        {
          label: "Review architecture",
          description: "Shared patterns may need adjustment",
        },
        {
          label: "Continue with caution",
          description: "Issues are isolated, proceed carefully",
        },
        {
          label: "Pause for analysis",
          description: "Investigate root causes before continuing",
        },
        {
          label: "Show issue details",
          description: "View all issue reports across batches",
        },
      ],
    },
  ],
});
````

### Escalation Format: Blocked Review

When any tool receives BLOCKED verdict:

```typescript
AskUserQuestion({
  questions: [
    {
      header: "🚨 Critical Review Block",
      question:
        "Tool {tool} has BLOCKING issues that prevent approval.\n\n**Critical issues:**\n{critical_issue_list}\n\n**Impact:** These issues pose security risks or require architectural changes.\n\n**Review verdict:**\n- Stage 1 (Spec): {verdict}\n- Stage 2 (Quality): {verdict}\n- Stage 2 (Security): {verdict}",
      multiSelect: false,
      options: [
        {
          label: "Revise architecture",
          description: "Update shared/tool-specific architecture to address issues",
        },
        {
          label: "Escalate to team",
          description: "Requires team security/architecture decision",
        },
        {
          label: "Skip tool",
          description: "Cannot safely wrap this tool",
        },
        {
          label: "Show diagnostics",
          description: "View complete security and quality assessments",
        },
      ],
    },
  ],
});
```

## Progress Persistence Integration

For services with **15+ tools** or **estimated duration >2 hours**, integrate with persisting-progress-across-sessions skill.

### When to Invoke

```typescript
// At Phase 1: Setup
if (tools_selected >= 15 || estimated_duration_hours >= 2) {
  // Invoke persisting-progress-across-sessions skill
  Skill(skill: 'persisting-progress-across-sessions', args: 'initialize')

  // Skill will guide:
  // 1. Creating MANIFEST.yaml structure
  // 2. Defining checkpoint save triggers
  // 3. Establishing resume protocol
}
```

### Progress Save Triggers

Save MANIFEST.yaml after:

- Each batch completion (Phases 4, 6, 7)
- Each gate pass (Phases 5, 8, 9)
- Any human checkpoint
- Any escalation event

### Progress File Location

```
.claude/.output/mcp-wrappers/{YYYY-MM-DD-HHMMSS}-{service}/MANIFEST.yaml
```

### Resume Protocol

If session interrupted:

1. User restarts with `/tool-manager resume {service}`
2. Orchestrator reads MANIFEST.yaml
3. Identifies last completed phase
4. Displays resume summary
5. Asks user: "Resume from {phase} (Batch {X})?"
6. Continues workflow from checkpoint

## Example Checkpoint Scenarios

### Scenario 1: 5-Tool Service (No Batch Checkpoints)

```
Phase 5: Architecture → Human checkpoint ✅
Phases 4-7: All 5 tools in single batch
Phase 10: GREEN gate → Complete
Phase 11: Audit → Complete
Phase 12: Completion report
```

**Checkpoints:** 1 (Phase 5 only)

### Scenario 2: 18-Tool Service (With Progress Checkpoints)

```
Phase 5: Architecture → Human checkpoint ✅

Batch 1: Tools 1-4
Batch 2: Tools 5-8
→ Progress checkpoint (8/18 = 44%) ✅

Batch 3: Tools 9-12
Batch 4: Tools 13-16
→ Progress checkpoint (16/18 = 89%) ✅

Batch 5: Tools 17-18
Phase 10: GREEN gate → Complete
Phase 11: Audit → Complete
Phase 12: Completion report
```

**Checkpoints:** 3 (Phase 5 + 2 progress)

### Scenario 3: 28-Tool Service (With Progress + Persistence)

```
Phase 1: Setup → Invoke persisting-progress-across-sessions ✅
Phase 5: Architecture → Human checkpoint ✅

Batch 1-3: Tools 1-9 (3 batches × 3 tools)
→ Progress checkpoint (9/28 = 32%) ✅
→ Progress saved to MANIFEST.yaml

Batch 4-6: Tools 10-18 (3 batches × 3 tools)
→ Progress checkpoint (18/28 = 64%) ✅
→ Progress saved to MANIFEST.yaml

Batch 7-9: Tools 19-27 (3 batches × 3 tools)
→ Progress checkpoint (27/28 = 96%) ✅
→ Progress saved to MANIFEST.yaml

Batch 10: Tool 28
Phase 10: GREEN gate → Complete
Phase 11: Audit → Complete
Phase 12: Completion report
```

**Checkpoints:** 4 (Phase 5 + 3 progress)
**Progress saves:** 9+ (after each batch)

### Scenario 4: Issue Escalation

```
Phase 5: Architecture → Human checkpoint ✅

Batch 1: Tools 1-3
  Tool 2: Review retry (1) → Success

Batch 2: Tools 4-6
  Tool 5: Review retry (1) → Fail
  Tool 5: Review retry (2) → Fail
  → MANDATORY escalation (>2 retries) 🚨

User chooses: "Manual fix"
→ User fixes tool 5 manually
→ Workflow resumes at Batch 3
```

## Related References

- [Rationalization Table](rationalization-table.md) - Checkpoint-related rationalizations
- [Progress Persistence](progress-persistence.md) - Session management for large services
- [Phase 9: Code Review](phase-7-code-review.md) - Review retry logic
- [Critical Rules](critical-rules.md) - Checkpoint requirements
- [Checkpoint Configuration (Core)](../../../../skills/orchestrating-multi-agent-workflows/references/checkpoint-configuration.md) - Base checkpoint patterns
- [Orchestration Guards (Core)](../../../../skills/orchestrating-multi-agent-workflows/references/orchestration-guards.md) - Retry limits and escalation protocols
