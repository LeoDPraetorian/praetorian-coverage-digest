---
description: Fix a bug with systematic debugging and TDD (lightweight, ~20-40 min)
allowed-tools: Skill, AskUserQuestion
argument-hint: <bug-description-and-symptoms>
---

# Bug Fix Command

**Invoke the `orchestrating-bugfix` skill and follow it exactly.**

**Bug Report:** $ARGUMENTS

**Output:** Display the skill output verbatim.

---

## Usage Examples

```bash
# With description
/bugfix User profile shows stale data after navigating away and back

# With error message
/bugfix TypeError: Cannot read property 'id' of undefined in AssetList component

# With stack trace reference
/bugfix Login fails silently - see error in console at auth.ts:45
```

## What Happens

1. Command invokes orchestrating-bugfix skill
2. Skill runs 5-phase workflow:
   - Phase 0: Setup output directory
   - Phase 1-2: Scope bug, discover candidate locations
   - Phase 3: debugger agent finds root cause
   - Phase 4: Developer agent implements TDD fix
   - Phase 5: Verification (tests, build, lint)
3. Result: Fixed bug with test coverage, ready for commit

## When NOT to Use

- Bug requires architectural changes → use /feature instead
- Bug is actually a feature request → use /feature instead
- Multiple services affected → use /feature instead
- Need research first → use /research then /bugfix

## Related Commands

| Command   | When to Use                                |
| --------- | ------------------------------------------ |
| /feature  | Full feature development with architecture |
| /research | Investigate before fixing                  |
| /commit   | After bugfix completes successfully        |
