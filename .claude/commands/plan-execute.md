---
description: Use when executing implementation plans - batch execution with review checkpoints
model: sonnet
allowed-tools: Skill, Read, Write, Bash, Task
---

Use the executing-plans skill exactly as written

---

## Example Usage

**Example 1: Execute small plan (5 tasks)**

```
> /plan-execute

→ Reads plan from docs/plans/latest-plan.md
→ Batch 1: Tasks 1-5 (all tasks fit in one batch)
→ Executes all tasks with appropriate agents
→ Validates all completed successfully
→ Reports: Plan complete, 5/5 tasks done
```

**Example 2: Large plan with checkpoints (20 tasks)**

```
> /plan-execute

→ Reads plan: 20 tasks total
→ Batch 1: Tasks 1-5
   - Executes 5 tasks
   - Checkpoint: User reviews progress
   - User: "Continue"
→ Batch 2: Tasks 6-10
   - Checkpoint: User reviews
   - User: "Skip task 9, continue"
→ Batch 3: Tasks 11-15
   - Checkpoint passed
→ Batch 4: Tasks 16-20
   - Final validation
→ Reports: 19/20 tasks complete (1 skipped)
```

**Example 3: Plan with failures requiring fixes**

```
> /plan-execute

→ Batch 1: Tasks 1-5
   - Task 3 fails (test errors)
   - Pauses at checkpoint
   - User: "Fix and retry task 3"
   - Agent fixes issue
   - Retries task 3: SUCCESS
   - Continues with remaining batches
→ Reports: All tasks completed after 1 retry
```
