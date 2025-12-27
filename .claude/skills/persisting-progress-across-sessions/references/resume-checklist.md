# Resume Checklist

Step-by-step protocol for resuming orchestration from a progress file.

## Pre-Resume Checklist

Before resuming any orchestration:

- [ ] Check for progress files: `ls .claude/progress/*.md`
- [ ] Read the relevant progress file completely
- [ ] Verify the file matches the current task
- [ ] Note the current status (in_progress, blocked, complete)

## Resume Steps

### Step 1: Read Progress File

```bash
# Check for existing progress files
ls .claude/progress/*.md

# Read the specific file
cat .claude/progress/<domain>-<feature>.md
```

**Extract:**

- Current status
- Last completed phase
- Current phase (if in progress)
- Pending phases

### Step 2: Check Status

| Status        | Action                                        |
| ------------- | --------------------------------------------- |
| `in_progress` | Continue from current phase                   |
| `blocked`     | Review blocker, resolve or escalate           |
| `complete`    | Should have been archived - verify completion |

### Step 3: Review Context for Resume

**Critical information to extract:**

1. **Architecture Decisions**
   - What patterns were chosen?
   - What trade-offs were made?
   - Any constraints discovered?

2. **Key File Paths**
   - Where is the code?
   - Which files were created/modified?
   - Where are the tests?

3. **Dependencies**
   - What does this depend on?
   - What is blocked by this?

4. **Blockers**
   - Any unresolved issues?
   - Any pending decisions?

### Step 4: Review Agent Outputs

For each completed agent:

- What did they produce?
- Any recommendations for follow-up?
- Any warnings or concerns?

For in-progress agent (if any):

- What was started?
- Where did it stop?
- Any partial output?

### Step 5: Check Error Log

- Any unresolved errors?
- Any patterns in failures?
- Any workarounds documented?

### Step 6: Create TodoWrite Items

From the progress file, create todos:

```markdown
Based on progress file, creating TodoWrite items:

- [ ] <Current Phase> - Resume from where stopped
- [ ] <Pending Phase 1>
- [ ] <Pending Phase 2>
- [ ] Update progress file after completion
- [ ] Archive/delete progress file when done
```

### Step 7: Resume Work

1. **Announce resumption** to user:

   ```
   Resuming orchestration: <Feature Name>
   Status: <current status>
   Last completed: <phase>
   Continuing with: <next phase>
   ```

2. **Provide context summary**:
   - Key decisions made
   - Files created so far
   - What's next

3. **Continue from current phase**
   - Don't repeat completed work
   - Use context from progress file
   - Update progress file after each phase

## Post-Phase Update Checklist

After completing each phase:

- [ ] Update progress file:
  - [ ] Move phase from Current to Completed
  - [ ] Add completion timestamp
  - [ ] Add agent output JSON
  - [ ] Update Current Phase to next pending
  - [ ] Update "Last Updated" timestamp
- [ ] Mark TodoWrite item complete
- [ ] Announce completion to user

## Completion Checklist

When all phases are complete:

- [ ] Update status to `complete`
- [ ] Add final summary to Overview
- [ ] Review all agent outputs for completeness
- [ ] Decision: Archive or Delete
  - [ ] If archiving: `mv .claude/progress/<file>.md .claude/progress/archived/`
  - [ ] If deleting: `rm .claude/progress/<file>.md`
- [ ] Mark all TodoWrite items complete
- [ ] Announce completion with summary

## Blocker Resolution Checklist

If status is `blocked`:

- [ ] Read blocker description
- [ ] Determine blocker type:
  - [ ] Missing requirement → AskUserQuestion
  - [ ] Technical issue → Debug or escalate
  - [ ] External dependency → Wait or find alternative
  - [ ] Scope question → Clarify with user
- [ ] Resolve or escalate
- [ ] Update progress file:
  - [ ] Add resolution to Error Log
  - [ ] Update status back to `in_progress`
  - [ ] Update "Last Updated"
- [ ] Continue with resume protocol

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    RESUME PROTOCOL                          │
├─────────────────────────────────────────────────────────────┤
│ 1. ls .claude/progress/*.md         # Find progress files   │
│ 2. cat .claude/progress/<file>.md   # Read full context     │
│ 3. Check status                     # in_progress/blocked   │
│ 4. Read "Context for Resume"        # Decisions, paths      │
│ 5. Review "Agent Outputs"           # What's done           │
│ 6. Check "Error Log"                # Any issues            │
│ 7. Create TodoWrite todos           # Track remaining       │
│ 8. Resume from current phase        # Don't repeat work     │
├─────────────────────────────────────────────────────────────┤
│ After each phase:                                           │
│   - Update progress file                                    │
│   - Mark TodoWrite complete                                 │
├─────────────────────────────────────────────────────────────┤
│ On completion:                                              │
│   - Status → complete                                       │
│   - Archive or delete file                                  │
│   - Announce with summary                                   │
└─────────────────────────────────────────────────────────────┘
```

## Common Mistakes

1. **Not reading the full file** → Missing critical context
2. **Repeating completed phases** → Wasting time and tokens
3. **Ignoring Error Log** → Repeating same mistakes
4. **Forgetting to update** → Losing progress on next resume
5. **Not creating TodoWrite** → Losing track mid-session
6. **Skipping archive/delete** → Progress files accumulate
