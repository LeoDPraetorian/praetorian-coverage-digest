# Emergency Abort Protocol

Detailed guidance for aborting feature development cleanly when things go wrong.

## Quick Reference

| Trigger | Action |
|---------|--------|
| User says 'abort' | Immediate abort flow |
| 3+ escalations same phase | Offer abort option |
| Critical security finding | Mandatory abort (with override) |
| Unrecoverable error | Offer abort option |
| Cost/time exceeded | Warn user, offer abort |

## Detailed Abort Flow

```text
Abort Triggered
     ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: STOP ALL WORK                                      │
│  - Do NOT spawn new agents                                  │
│  - Note any in-progress agents (they will complete/timeout) │
│  - Record current state in progress.json                    │
└─────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: CAPTURE STATE                                      │
│  Update progress.json:                                      │
│  {                                                          │
│    'status': 'aborted',                                     │
│    'abort_reason': '{trigger}',                             │
│    'abort_phase': '{current_phase}',                        │
│    'abort_timestamp': '{ISO timestamp}',                    │
│    'completed_phases': [...],                               │
│    'partial_work': '{description of in-progress work}'      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: PRESENT CLEANUP OPTIONS                            │
│  Use AskUserQuestion with cleanup choices                   │
└─────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: EXECUTE CLEANUP                                    │
│  Based on user choice, cleanup worktree/files               │
└─────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: REPORT FINAL STATE                                 │
│  Show what was completed, what was lost, how to resume      │
└─────────────────────────────────────────────────────────────┘
```

## Cleanup Options Explained

### Keep Everything

**Best when:** You might resume later, want to preserve all work.

**What happens:**
- Worktree stays at `.worktrees/{feature-name}`
- Feature directory stays at `.claude/.output/features/{id}`
- All code changes preserved
- Can resume with `/feature resume {id}`

**Commands:** No action needed.

### Keep Artifacts Only

**Best when:** Code was bad but design/planning was good.

**What happens:**
- Worktree deleted (code changes lost)
- Feature directory preserved (design.md, plan.md, architecture.md)
- Can reference artifacts for future attempt
- Partial resume possible (restart from Phase 5)

**Commands:**
```bash
cd {repo_root}
git worktree remove .worktrees/{feature-name} --force
```

### Rollback Changes

**Best when:** Want clean slate but might continue later.

**What happens:**
- Worktree reset to pre-feature commit
- All code changes reverted
- Feature directory preserved
- Can resume with clean codebase

**Commands:**
```bash
cd .worktrees/{feature-name}
git reset --hard {pre_feature_commit}
# pre_feature_commit stored in progress.json
```

### Full Cleanup

**Best when:** Abandoning completely, want no traces.

**What happens:**
- Worktree deleted
- Feature directory deleted
- Cannot resume
- As if feature was never started

**Commands:**
```bash
cd {repo_root}
git worktree remove .worktrees/{feature-name} --force
rm -rf .claude/.output/features/{feature-id}
```

## Abort Triggers

### 1. User Request

**Detection:** User says 'stop', 'cancel', 'abort', or 'abandon'

**Action:** Immediate abort flow. No questions asked - user knows best.

### 2. Repeated Escalations

**Detection:** 3+ escalations to user in same phase

**Action:** Offer abort option via AskUserQuestion

**Example:**
```typescript
AskUserQuestion({
  questions: [{
    question: 'This is the 3rd escalation in {phase}. The feature may be stuck. What would you like to do?',
    header: 'Repeated Issues',
    multiSelect: false,
    options: [
      { label: 'Continue trying', description: 'Give it one more attempt' },
      { label: 'Skip this phase', description: 'Move to next phase with known issues' },
      { label: 'Abort feature', description: 'Stop development, choose cleanup' }
    ]
  }]
})
```

### 3. Critical Security Finding

**Detection:** Security reviewer returns severity: 'critical'

**Action:** Mandatory abort unless user overrides

**Example:**
```typescript
AskUserQuestion({
  questions: [{
    question: 'Security review found CRITICAL issue: {issue}. Recommend aborting.',
    header: 'Security',
    multiSelect: false,
    options: [
      { label: 'Abort (recommended)', description: 'Stop development, address security first' },
      { label: 'Continue anyway', description: 'Accept risk, document in tech debt' }
    ]
  }]
})
```

### 4. Unrecoverable Error

**Detection:** Agent returns blocked with 'unrecoverable' in reason

**Action:** Offer abort option

### 5. Cost/Time Exceeded

**Detection:** Estimated cost > $10 or runtime > 2 hours

**Action:** Warn user, offer abort

## Presenting Cleanup Options

Always use AskUserQuestion to present cleanup choices:

```typescript
AskUserQuestion({
  questions: [{
    question: 'Feature aborted at {phase}. How should I clean up?',
    header: 'Abort Cleanup',
    multiSelect: false,
    options: [
      {
        label: 'Keep everything (can resume later)',
        description: 'Worktree and feature directory preserved. Resume with /feature resume {id}'
      },
      {
        label: 'Keep artifacts only',
        description: 'Delete worktree, keep feature directory (design.md, plan.md, etc.)'
      },
      {
        label: 'Rollback changes',
        description: 'Git reset worktree to pre-feature state, keep feature directory'
      },
      {
        label: 'Full cleanup',
        description: 'Delete worktree AND feature directory. Cannot resume.'
      }
    ]
  }]
})
```

## Cleanup Execution Matrix

| Choice | Worktree | Feature Dir | Git State | Can Resume? |
|--------|----------|-------------|-----------|-------------|
| Keep everything | ✅ Preserved | ✅ Preserved | Unchanged | ✅ Yes |
| Keep artifacts | ❌ Deleted | ✅ Preserved | N/A | ⚠️ Partial (no code) |
| Rollback | ✅ Reset | ✅ Preserved | git reset --hard | ✅ Yes (from clean state) |
| Full cleanup | ❌ Deleted | ❌ Deleted | N/A | ❌ No |

## State Capture

Before cleanup, update progress.json with abort information:

```json
{
  "status": "aborted",
  "abort_info": {
    "aborted": true,
    "abort_reason": "user_request | repeated_escalations | critical_security | unrecoverable_error | cost_exceeded",
    "abort_phase": "implementation",
    "abort_timestamp": "2026-01-16T15:30:00Z",
    "cleanup_choice": "keep_everything | keep_artifacts | rollback | full_cleanup",
    "cleanup_performed": true,
    "can_resume": true,
    "pre_abort_commit": "abc123"
  }
}
```

## Resume After Abort

If user chose 'Keep everything' or 'Rollback':

```
/feature resume {feature-id}

→ Reads progress.json (status: 'aborted')
→ Shows: 'Feature was aborted at Phase {N}. Phases 1-{N-1} complete.'
→ Asks: 'Resume from Phase {N}?'
→ If yes: Changes status to 'in_progress', continues
```

## Final Report Template

After cleanup, report to user:

```markdown
## Feature Aborted

**Feature:** {feature-name}
**Aborted at:** Phase {N} ({phase-name})
**Reason:** {abort_reason}

### Completed Work
- ✅ Phase 1: Setup
- ✅ Phase 2: Brainstorming → design.md
- ✅ Phase 3: Discovery → discovery.md
- ❌ Phase 4: Planning (in progress when aborted)

### Cleanup Performed
{description based on user choice}

### Resume Instructions
{if applicable: '/feature resume {id}'}
{if full cleanup: 'Cannot resume - all data deleted'}
```

## Related

- [Progress Persistence](progress-persistence.md) - Resume after abort
- [Troubleshooting](troubleshooting.md) - Common abort scenarios
- [Tight Feedback Loop](tight-feedback-loop.md) - Escalation thresholds
