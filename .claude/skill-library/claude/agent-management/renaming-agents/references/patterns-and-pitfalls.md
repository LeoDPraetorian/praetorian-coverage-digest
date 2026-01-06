# Reference Patterns and Common Pitfalls

Reference file for renaming-agents - search patterns and common mistakes to avoid.

---

## Where Agents Are Referenced

| Location            | Pattern Example                    | Context                        |
| ------------------- | ---------------------------------- | ------------------------------ |
| **Agent tables**    | `\| frontend-developer \| desc \|` | Orchestrator delegation tables |
| **Task calls**      | `Task("frontend-developer", ...)`  | Agent spawning code            |
| **Recommendations** | `Recommend: frontend-developer`    | Escalation protocols           |
| **Examples**        | See `frontend-developer` for...    | Documentation                  |
| **Lists**           | `- frontend-developer handles X`   | Capability lists               |
| **Prose**           | The frontend-developer agent...    | Explanatory text               |

---

## Search Strategy

**Use word boundaries to avoid false matches:**

```bash
# CORRECT: Word boundaries
Grep pattern: "\\bfrontend-developer\\b"

# Matches:
- "frontend-developer" ✅
- "Use frontend-developer for..." ✅
- "| frontend-developer |" ✅

# Doesn't match:
- "frontend-developer-v2" ✗ (different agent)
- "non-frontend-developer" ✗ (compound word)
```

**Why this matters:**

- Prevents false positives
- Ensures exact agent name matches
- Avoids breaking unrelated content

---

## Common Pitfalls

### Pitfall 1: Substring Matches

**Problem:**

```bash
# Searching for "test" finds:
- test-engineer ✅ (want to rename this)
- verifying-agent-skill-invocation ✗ (don't want to change)
- backend-tester ✗ (don't want to change)
```

**Solution:** Use word boundaries in Grep:

```bash
Grep pattern: "\\btest\\b"  # ← Word boundaries

# Now matches only:
- "test" as standalone word
- "test-engineer" contains "test" as word ✅
```

### Pitfall 2: Case Sensitivity

**Problem:**

```
References might vary:
- Frontend-Developer (capitalized)
- frontend-developer (standard)
- FRONTEND_DEVELOPER (constant)
```

**Solution:**

- Search case-insensitive first: `grep -riw "agent-name"`
- Review each match for context
- Preserve original case when updating

**Note:** Agent names should be lowercase kebab-case by convention, but check.

### Pitfall 3: Partial References

**Problem:**

```
Found: "For frontend work, use frontend-developer or backend-developer"

If renaming frontend-developer → react-developer, need to update:
  "For frontend work, use react-developer or backend-developer"
```

**Solution:** `replace_all` handles this correctly when used per-file.

### Pitfall 4: Comments vs Active Code

**Problem:**

```
# Archived agent references (in .archived/ or comments)
# Old: use frontend-developer
# New: use react-developer
```

**Solution:**

- Search excludes `.archived/` directories
- Comments in active files DO get updated (keeps docs accurate)
- If intentionally preserving old name in comment, manual review

---

## Best Practices

1. **Always use word boundaries** - Prevents false matches
2. **Preview before applying** - Show user what will change
3. **Use replace_all per file** - Atomic updates within each file
4. **Verify after each step** - Don't assume success
5. **Keep integrity check thorough** - No shortcuts on final verification
