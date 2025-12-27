# Discovery Testing Protocol

After editing any agent, you must verify that the agent is discoverable by Claude Code's Task tool. This is a critical verification step in the REFACTOR phase.

## The Test

**After editing ANY agent, test in a NEW session:**

```
User: What is the description for the [agent-name] agent? Quote it exactly.

✅ Working: Claude quotes the full description text with examples
❌ Broken: Claude says "|" or ">" or has to read the file
```

## Why This Matters

Agent descriptions are cached when Claude Code starts a session. If the description contains a YAML block scalar (`|` or `>`), Claude's parser returns the literal character instead of the actual description content.

**Result:** The agent becomes invisible - Claude cannot see its capabilities or know when to use it.

## Common Failure Modes

### Block Scalar Pipe

```yaml
# ❌ BROKEN - Claude sees description as literally "|"
description: |
  Use when developing React applications.
```

**Test result:** Claude responds with `"|"` or says it cannot find the agent.

### Block Scalar Folded

```yaml
# ❌ BROKEN - Claude sees description as literally ">"
description: >
  Use when developing React applications.
```

**Test result:** Claude responds with `">"` or says it cannot find the agent.

### Working Format

```yaml
# ✅ WORKING - Claude sees the full description
description: Use when developing React applications - components, UI bugs, performance.\n\n<example>...</example>
```

**Test result:** Claude quotes the entire description including examples.

## Testing Workflow

1. **Edit agent** - Make changes to agent file
2. **Save changes** - Ensure file is saved
3. **Start new session** - Old session has cached metadata
4. **Run discovery test** - Quote test as shown above
5. **Verify response** - Claude should quote full description

**Note:** You MUST start a new session. Testing in the current session will use cached metadata and give false positives.

## What to Do if Test Fails

1. **Check frontmatter** - Look for `|` or `>` after `description:`
2. **Convert to single-line** - Use `\n` for line breaks
3. **Re-save** - Ensure changes are persisted
4. **Re-test in new session** - Verify fix worked

## Integration with TDD

Discovery testing is **Step 7 in the REFACTOR phase**:

```
🔵 REFACTOR Phase
7. Test agent discovery (quote description in new session) ← This protocol
8. Verify line count <300 (or <400 for complex)
9. Verify skill delegation (not embedded patterns)
```

Without passing the discovery test, the agent is not usable even if it's technically correct.
