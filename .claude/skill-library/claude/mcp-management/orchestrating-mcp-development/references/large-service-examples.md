**Parent document**: [large-service-handling.md](large-service-handling.md)

# Large Service Examples

Complete workflow examples for 18, 28, and 40 tool services showing batch processing, checkpoints, and progress persistence.

## Example 1: 18-Tool Service (Large)

```
Phase 1: Setup
- Initialize workspace
- Check if persistence needed: YES (18 tools)
- Invoke persisting-progress-across-sessions
- Save MANIFEST.yaml (Session 1)

Phase 1: MCP Setup
- Verify MCP configured
- Save MANIFEST.yaml

Phase 3: Tool Discovery
- Discover 18 tools
- Schema discovery per tool (2-3 min each = 36-54 min)
- Save MANIFEST.yaml

Phase 5: Shared Architecture
- Spawn tool-lead + security-lead (parallel)
- Human checkpoint ✅
- Save MANIFEST.yaml

Phase 6: Per-Tool Work (Batch size: 4)
- Batch 1: Tools 1-4 (architecture + tests)
- Batch 2: Tools 5-8
- → Progress checkpoint (8/18 = 44%) ✅
- Save MANIFEST.yaml
- Batch 3: Tools 9-12
- Batch 4: Tools 13-16
- → Progress checkpoint (16/18 = 89%) ✅
- Save MANIFEST.yaml
- Batch 5: Tools 17-18
- Save MANIFEST.yaml

Phase 7: Test Planning
- Run tests (should all fail)
- Save MANIFEST.yaml

Phase 8: Implementation (Batch size: 4)
- Batch 1-5 (same groupings as Phase 4)
- Progress checkpoints at Batch 2, 4
- Save after each batch

Phase 9: Code Review (Batch size: 4)
- Batch 1-5 (same groupings)
- Save after each batch

Phase 10: Testing
- Run tests with coverage
- Save MANIFEST.yaml

Phase 11: Audit
- Run audit on all tools
- Save MANIFEST.yaml

Phase 12: Completion
- Generate service skill
- Final verification
- Mark progress as "complete"

**Total estimated time:** 4.5-7.5 hours
**Checkpoints:** 4 (1 architecture + 2 progress + 1 completion)
**Progress saves:** 15+
```

## Example 2: 28-Tool Service (Extra Large)

```
Phase 1: Setup
- Initialize workspace
- Persistence: REQUIRED (28 tools)
- Batch size: 3 (recommended for 28 tools)
- Estimated duration: 7-11.5 hours
- Save MANIFEST.yaml (Session 1)

Phase 3: Tool Discovery
- 28 tools discovered
- Complexity assessment: Medium
- Confirm batch size: 3 ✅
- Save MANIFEST.yaml

Phase 5: Shared Architecture
- Human checkpoint ✅
- Save MANIFEST.yaml

Phase 4-7: Batched Work (10 batches × 3 tools, except last batch = 1 tool)

Batch 1: Tools 1-3
Batch 2: Tools 4-6
Batch 3: Tools 7-9
→ Progress checkpoint (9/28 = 32%) ✅
→ Save MANIFEST.yaml

Batch 4: Tools 11-13
Batch 5: Tools 13-15
Batch 6: Tools 16-18
→ Progress checkpoint (18/28 = 64%) ✅
→ Save MANIFEST.yaml

Batch 7: Tools 19-21
Batch 8: Tools 22-24
Batch 9: Tools 25-27
→ Progress checkpoint (27/28 = 96%) ✅
→ Save MANIFEST.yaml

Batch 10: Tool 28
→ Completion checkpoint ✅

**Total estimated time:** 7-11.5 hours (likely 2-3 sessions)
**Checkpoints:** 5 (1 architecture + 3 progress + 1 completion)
**Progress saves:** 25+
**Recommended:** Schedule across 2-3 work sessions with resume protocol
```

## Example 3: 40-Tool Service (Extra Large with Complexity)

```
Phase 1: Setup
- Persistence: REQUIRED
- Batch size: 3
- Complexity: Complex (10+ input fields, 5000+ token responses)
- Adjust batch size: 2-3 (stay at 3 with caution)
- Estimated duration: 10-16.5 hours
- Recommend: Multi-session workflow over 2-3 days

Phase 3: Tool Discovery
- 40 tools discovered
- High complexity detected
- User decision: Defer 5 low-priority tools → 35 tools to wrap

Phase 4-7: Batched Work (12 batches × 3 tools, except last batch = 2 tools)

Batch 1-3: Tools 1-9
→ Checkpoint (9/35 = 26%) ✅ - END SESSION 1

--- Resume Session 2 ---

Batch 4-6: Tools 10-18
→ Checkpoint (18/35 = 51%) ✅

Batch 7-9: Tools 19-27
→ Checkpoint (27/35 = 77%) ✅ - END SESSION 2

--- Resume Session 3 ---

Batch 11-13: Tools 28-35
→ Completion checkpoint ✅

**Total estimated time:** 8.75-14.5 hours (3 sessions)
**Checkpoints:** 5 (1 architecture + 3 progress + 1 completion)
**Progress saves:** 35+
**Strategy:** 3-4 hour sessions with resume protocol
```

## Progress File Structure Example (28-Tool Service)

After completing Batch 4 of Phase 8:

```json
{
  "workflow": "mcp-development",
  "service": "github",
  "created_at": "2025-01-11T10:00:00Z",
  "last_updated": "2025-01-11T12:30:00Z",
  "session_count": 2,
  "status": "in_progress",
  "current_phase": 6,
  "current_batch": 4,
  "total_tools": 28,
  "completed_tools": 12,
  "phases": {
    "0_setup": { "status": "complete", "completed_at": "2025-01-11T10:05:00Z" },
    "1_mcp_setup": { "status": "complete", "completed_at": "2025-01-11T10:10:00Z" },
    "2_tool_discovery": { "status": "complete", "completed_at": "2025-01-11T10:30:00Z" },
    "3_shared_architecture": { "status": "complete", "completed_at": "2025-01-11T11:00:00Z" },
    "4_per_tool": {
      "status": "complete",
      "batches_complete": 10,
      "batches_total": 10
    },
    "5_red_gate": { "status": "complete", "completed_at": "2025-01-11T11:45:00Z" },
    "6_implementation": {
      "status": "in_progress",
      "batches_complete": 4,
      "batches_total": 10
    }
  },
  "batches": {
    "batch_1": { "tools": ["get-repo", "list-repos", "create-repo"], "status": "complete" },
    "batch_2": { "tools": ["update-repo", "delete-repo", "fork-repo"], "status": "complete" },
    "batch_3": { "tools": ["star-repo", "watch-repo", "get-commits"], "status": "complete" },
    "batch_4": {
      "tools": ["list-commits", "get-pr", "list-prs"],
      "status": "in_progress"
    }
  },
  "next_action": "Complete Phase 8 Batch 4 implementation",
  "resume_instructions": "Resume with Phase 8 Batch 4: tools [list-commits, get-pr, list-prs]"
}
```

## Session Handoff Example

### End of Session 1 (9/35 tools complete)

**Orchestrator saves:**

```yaml
service: "complex-service"
session_count: 1
status: "paused"
current_phase: 4
current_batch: 3
completed_tools: 9
remaining_tools: 26

pause_reason: "End of 4-hour session"
pause_timestamp: "2025-01-11T14:00:00Z"
resume_target: "Phase 6 Batch 4 (tools 11-13)"

artifacts_saved:
  - architecture-shared.md
  - security-assessment.md
  - tools/tool-1/architecture.md
  - ... (9 tool directories)
  - MANIFEST.yaml
```

**Resume message (Session 2 start):**

```
Resuming MCP Development: complex-service

**Session 1 progress:**
- Completed: 9/35 tools (26%)
- Last batch: Batch 3 (tools 7-9)
- Paused at: 2025-01-11 14:00

**Session 2 plan:**
- Resume: Phase 6 Batch 4 (tools 11-13)
- Target: Complete Batches 4-6 (tools 10-18)
- Checkpoint: After Batch 6 (18/35 = 51%)
- Estimated time: 3-4 hours

Continue?
```

## Batch Retry Example (Quality Issues)

```
Phase 9: Code Review - Batch 2

Tool: update-repo
- Stage 1: SPEC_COMPLIANT ✅
- Stage 2 Quality: CHANGES_REQUESTED ⚠️
  - Issues: Missing TSDoc, hardcoded page size
- Stage 2 Security: APPROVED ✅
- Overall: CHANGES_REQUESTED

→ Retry 1: tool-developer fixes issues
→ Re-review Stage 2
→ Quality: APPROVED ✅
→ Overall: APPROVED ✅

Tool: delete-repo
- Stage 1: SPEC_COMPLIANT ✅
- Stage 2 Quality: APPROVED ✅
- Stage 2 Security: BLOCKED 🚨
  - Critical: No authorization check
- Overall: BLOCKED

→ Escalate to user (cannot proceed)
→ User: "Manual fix" - I'll add authorization
→ Manual fix applied
→ Re-review from Stage 1
→ All stages: APPROVED ✅

Batch 2 complete with 2 retries.
Continue to Batch 3.
```

## Multi-Session Timing Breakdown (40 Tools)

### Session 1 (4 hours)

```
Time: 10:00 - 14:00 (4 hours)

Phase 1: Setup (10 min)
Phase 1: MCP Setup (10 min)
Phase 3: Tool Discovery (80 min, 40 tools × 2 min)
Phase 5: Architecture + checkpoint (30 min)
Phase 6: Batches 1-3, 9 tools (90 min)

Checkpoint: 9/40 tools (22.5%) ✅
Session end: Save progress, pause
```

### Session 2 (4 hours)

```
Time: 10:00 - 14:00 next day

Resume: Phase 6 Batch 4
Phase 6: Batches 4-6, 9 tools (90 min)
Phase 7: Test Planning (5 min)
Phase 8: Batches 1-3, 9 tools (90 min)

Checkpoint: 18/40 tools (45%) ✅
Session end: Save progress, pause
```

### Session 3 (3.5 hours)

```
Time: 10:00 - 13:30 next day

Resume: Phase 8 Batch 4
Phase 8: Batches 4-7, 12 tools (120 min)
Checkpoint: 30/40 tools (75%) ✅

Phase 9: Batches 1-4, 12 tools (48 min)
Phase 10: Testing (10 min)
Phase 11: Audit (8 min)
Phase 12: Completion (10 min)

Final checkpoint: 40/40 tools (100%) ✅
```

**Total: 11.5 hours across 3 sessions (3-4 hours each)**

## Related References

- [Large Service Handling](large-service-handling.md) - Batch sizing strategies
- [Large Service Timing](large-service-timing.md) - Detailed timing estimates
