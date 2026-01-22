# Resume Checklist

Step-by-step protocol for resuming orchestration from MANIFEST.yaml.

## Pre-Resume Checklist

Before resuming any orchestration:

- [ ] Find MANIFEST.yaml files: `find .claude/.output -name 'MANIFEST.yaml' -mmin -1440`
- [ ] Read the relevant MANIFEST.yaml completely
- [ ] Verify it matches the current task (feature_name, description)
- [ ] Note the current status (in-progress, blocked, complete)

## Resume Steps

### Step 1: Find MANIFEST.yaml

```bash
# Find MANIFEST.yaml files modified in last 24 hours
find .claude/.output -name 'MANIFEST.yaml' -mmin -1440 2>/dev/null

# Read a specific MANIFEST.yaml
cat .claude/.output/features/{id}/MANIFEST.yaml
```

**Extract:**

- status (in-progress, blocked, complete)
- current_phase
- phases with status != "complete"
- agents_contributed array

### Step 2: Check Status

| Status        | Action                                        |
| ------------- | --------------------------------------------- |
| `in-progress` | Continue from current_phase                   |
| `blocked`     | Review blocker, resolve or escalate           |
| `complete`    | Should have been cleaned up - verify complete |

### Step 3: Review Phase Status

**Extract from phases object:**

1. **Completed phases** - status: "complete"
   - What was decided?
   - Which agents contributed?

2. **Current phase** - status: "in_progress"
   - What's in progress?
   - Which agent is working?

3. **Pending phases** - status: "pending"
   - What's next?
   - Any dependencies?

### Step 4: Review Agent Outputs

From agents_contributed array:

- What artifacts did each agent produce?
- Read artifact files for context
- Any handoff.next_agent recommendations?

For in-progress agent (if any):

- What artifact exists?
- Read for partial work

### Step 5: Check Verification Results

From verification object:

- build: PASS/FAIL/NOT_RUN
- tests: Results summary
- review: APPROVED/REJECTED/PENDING

### Step 6: Create TodoWrite Items

From MANIFEST.yaml, create todos:

```markdown
Based on MANIFEST.yaml phases, creating TodoWrite items:

- [ ] Phase: implementation (phases.implementation.status = in_progress)
- [ ] Phase: review (phases.review.status = pending)
- [ ] Phase: testing (phases.testing.status = pending)
- [ ] Update MANIFEST.yaml after completion
- [ ] Cleanup output directory when done
```

### Step 7: Resume Work

1. **Announce resumption** to user:

   ```
   Resuming orchestration: <feature_name>
   Status: <status>
   Current phase: <current_phase>
   Pending phases: <list from phases where status != complete>
   ```

2. **Provide context summary**:
   - Key decisions from completed phases
   - Artifacts created so far
   - What's next

3. **Continue from current_phase**
   - Don't repeat completed phases
   - Use context from artifacts
   - Update MANIFEST.yaml after each phase

## Post-Phase Update Checklist

After completing each phase:

- [ ] Update MANIFEST.yaml:
  - [ ] Set phases.{phase}.status = "complete"
  - [ ] Add timestamp to phase
  - [ ] Add to agents_contributed array
  - [ ] Update current_phase to next pending
  - [ ] Update verification if applicable
- [ ] Mark TodoWrite item complete
- [ ] Announce completion to user

## Completion Checklist

When all phases are complete:

- [ ] Update status to "complete"
- [ ] Update all verification fields
- [ ] Review all artifacts for completeness
- [ ] Decision: Keep or Delete
  - [ ] If keeping: Leave directory for reference
  - [ ] If deleting: `rm -rf .claude/.output/{type}/{id}/`
- [ ] Mark all TodoWrite items complete
- [ ] Announce completion with summary

## Blocker Resolution Checklist

If status is "blocked":

- [ ] Find blocked agent in agents_contributed (status = "blocked")
- [ ] Read agent artifact for blocked_reason
- [ ] Determine blocker type:
  - [ ] Missing requirement → AskUserQuestion
  - [ ] Technical issue → Debug or escalate
  - [ ] External dependency → Wait or find alternative
  - [ ] Scope question → Clarify with user
- [ ] Resolve or escalate
- [ ] Update MANIFEST.yaml:
  - [ ] Set status back to "in-progress"
  - [ ] Update phases.{blocked_phase} status
- [ ] Continue with resume protocol

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                      RESUME PROTOCOL                             │
├─────────────────────────────────────────────────────────────────┤
│ 1. find .claude/.output -name 'MANIFEST.yaml' -mmin -1440       │
│ 2. cat .claude/.output/{type}/{id}/MANIFEST.yaml                │
│ 3. Check status (in-progress/blocked/complete)                  │
│ 4. Read phases object for current_phase                         │
│ 5. Review agents_contributed array                              │
│ 6. Check verification results                                   │
│ 7. Create TodoWrite todos from pending phases                   │
│ 8. Resume from current_phase                                    │
├─────────────────────────────────────────────────────────────────┤
│ After each phase:                                               │
│   - Update MANIFEST.yaml phases.{phase}.status                  │
│   - Add to agents_contributed                                   │
│   - Mark TodoWrite complete                                     │
├─────────────────────────────────────────────────────────────────┤
│ On completion:                                                  │
│   - status → "complete"                                         │
│   - Delete directory or keep for reference                      │
│   - Announce with summary                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Common Mistakes

1. **Not reading MANIFEST.yaml fully** → Missing phase context
2. **Repeating completed phases** → Wasting time and tokens
3. **Ignoring verification results** → Missing failed builds/tests
4. **Forgetting to update** → Losing progress on next resume
5. **Not creating TodoWrite** → Losing track mid-session
6. **Skipping cleanup** → Output directories accumulate

## Related

- [File Templates](file-templates.md) - MANIFEST.yaml templates
- [Compaction Protocol](compaction-protocol.md) - Context management
- [Lifecycle Flowchart](lifecycle-flowchart.md) - Visual lifecycle
