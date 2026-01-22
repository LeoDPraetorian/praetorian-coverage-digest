# Troubleshooting

**Common issues and solutions for feature development orchestration.**

## Agent Issues

### Agent Returns Incomplete Output

**Symptom:** Developer agent returns without completing all tasks.

**Causes:**

- Prompt too vague
- Missing context from prior phases
- Scope too large for single agent

**Solutions:**

1. Check prompt includes specific file paths
2. Verify architecture-plan.md was read
3. Break into smaller tasks (max 3-4 per agent)
4. Include skill manifest in prompt

### Agent Modifies Wrong Files

**Symptom:** Agent edits files outside its scope.

**Causes:**

- File scope boundaries not specified
- Ambiguous task description

**Solutions:**

1. Review [file-scope-boundaries.md](file-scope-boundaries.md)
2. Add explicit scope in prompt:
   ```
   Scope: ONLY modify files in src/sections/assets/
   Do NOT modify: src/hooks/, src/components/
   ```
3. Use file locking protocol for parallel agents

### Parallel Agents Conflict

**Symptom:** Two agents modify same file, causing merge conflicts.

**Causes:**

- Overlapping scope not detected
- Missing file lock check

**Solutions:**

1. Run conflict detection before spawning
2. Assign non-overlapping file scopes
3. If conflict unavoidable, run sequentially

## Phase Issues

### Phase 3 Discovery Takes Too Long

**Symptom:** Explore agents spawn but don't complete.

**Causes:**

- Too many explore agents for codebase size
- Overly broad search patterns

**Solutions:**

1. Reduce explore agent count (use 3-5 for medium codebases)
2. Scope patterns to feature area:
   ```
   Pattern: "src/sections/assets/**/*.tsx"
   NOT: "**/*.tsx"
   ```

### Phase 7 Plan Rejected Repeatedly

**Symptom:** User rejects architecture plan multiple times.

**Causes:**

- Missing requirements understanding
- Over-engineering simple feature
- Wrong technology choices

**Solutions:**

1. Re-read original user request
2. Invoke `brainstorming` skill for design refinement
3. Present simpler alternatives
4. Ask clarifying questions

### Phase 11 Review Loop Won't Exit

**Symptom:** Developer→Reviewer cycle exceeds max iterations.

**Causes:**

- Unfixable architectural issue
- Reviewer requirements unclear
- Same issue recurring each iteration

**Solutions:**

1. Check feedback-scratchpad.md for patterns
2. Escalate to user with specific blocker
3. Consider redesigning vs fixing

### Phase 13 Tests Fail Consistently

**Symptom:** Tests fail after multiple iterations.

**Causes:**

- Test environment issues
- Missing test dependencies
- Implementation bug not caught in review

**Solutions:**

1. Run tests locally first (not just via agent)
2. Check test isolation (no shared state)
3. Review test assertions vs actual behavior
4. Invoke `debugging-systematically` skill

## Context Issues

### Context Window Exhausted

**Symptom:** >85% token usage, hooks blocking agents.

**Causes:**

- Skipped compaction gates
- Too much context in prompts
- Long discovery output

**Solutions:**

1. Immediately run compaction protocol
2. Reduce prompt context (reference files, don't inline)
3. Review compaction-gates.md for checkpoints

### Progress Lost After Compaction

**Symptom:** Resume doesn't have necessary context.

**Causes:**

- Progress file not updated before compaction
- MANIFEST.yaml out of sync

**Solutions:**

1. Always update progress.md at compaction gates
2. Verify MANIFEST.yaml current_phase is correct
3. Include "Resume Context" section in progress.md

### Wrong Phase Detected on Resume

**Symptom:** Orchestrator starts at wrong phase.

**Causes:**

- MANIFEST.yaml manually edited
- Multiple incomplete runs

**Solutions:**

1. Read MANIFEST.yaml and progress.md
2. Reconcile differences
3. Ask user to confirm current state

## Configuration Issues

### Retry Limits Hit Too Fast

**Symptom:** Escalation happens before meaningful attempts.

**Causes:**

- Config limits too low
- Each iteration not making progress

**Solutions:**

1. Check `.claude/config/orchestration-limits.yaml`
2. Increase limits if justified
3. Ensure each iteration addresses prior feedback

### Skills Not Loading

**Symptom:** Agent doesn't follow expected patterns.

**Causes:**

- skill-manifest.yaml not created in Phase 4
- Wrong skill paths in manifest

**Solutions:**

1. Verify Phase 4 completed
2. Check skill-manifest.yaml exists and has entries
3. Verify skill paths are correct (CORE vs LIBRARY)

## Emergency Recovery

If orchestration is stuck:

1. **Check current state**

   ```
   Read(".feature-development/MANIFEST.yaml")
   Read(".feature-development/progress.md")
   ```

2. **Identify blocker**
   - Phase status in MANIFEST
   - Documented blockers in progress.md
   - feedback-scratchpad.md for iteration history

3. **Recovery options**
   - Resume from last good checkpoint
   - Roll back to prior phase
   - Emergency abort (see [emergency-abort.md](emergency-abort.md))

## Related References

- [Emergency Abort](emergency-abort.md) - Safe workflow termination
- [Compaction Gates](compaction-gates.md) - Context management
- [Tight Feedback Loop](tight-feedback-loop.md) - Iteration patterns
- [File Scope Boundaries](file-scope-boundaries.md) - Agent coordination
