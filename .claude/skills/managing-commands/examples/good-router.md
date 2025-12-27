# Good Router Pattern Example

This example shows a perfectly compliant Router Pattern command.

## The Command

```markdown
---
description: Skill management - create, audit, fix, search, list skills
argument-hint: <new|update|audit|fix|search|list> [skill-name] [options]
allowed-tools: Skill, AskUserQuestion
skills: command-manager
---

# Skill Management

**Subcommand:** $1
**Skill name:** $2
**Options:** $3

## Dispatch Based on $1

### new - Create New Skill

**ACTION:** Invoke the `skill-manager` skill.

**Arguments:**

- `operation`: "create"
- `skillName`: $2 (Required)
- `description`: $3 (Optional)

**Output:** Display the tool output verbatim.

### audit - Audit Skill(s)

**ACTION:** Invoke the `skill-manager` skill.

**Arguments:**

- `operation`: "audit"
- `skillName`: $2 (Optional - omit for bulk audit)

**Output:** Display the tool output verbatim.

### fix - Fix Skill Issues

**ACTION:** Invoke the `skill-manager` skill.

**Arguments:**

- `operation`: "fix"
- `skillName`: $2 (Required)
- `dryRun`: true if $3 contains "--dry-run"

**Output:** Display the tool output verbatim.

### search - Search Skills

**ACTION:** Invoke the `skill-manager` skill.

**Arguments:**

- `operation`: "search"
- `query`: $2 (Required)

**Output:** Display the tool output verbatim.

### list - List All Skills

**ACTION:** Invoke the `skill-manager` skill.

**Arguments:**

- `operation`: "list"

**Output:** Display the tool output verbatim.

## Error Handling

If $1 invalid or missing:
Explain valid subcommands: new, update, audit, fix, search, list
Show usage: /skill-manager <subcommand> [args]
```

## Why This Is Correct

### ✅ Frontmatter

| Element       | Status | Notes                       |
| ------------- | ------ | --------------------------- |
| description   | ✅     | Under 120 chars, clear      |
| argument-hint | ✅     | Documents all args          |
| allowed-tools | ✅     | Only Skill, AskUserQuestion |
| skills        | ✅     | Specifies backing skill     |

### ✅ Instructions

| Element             | Status | Notes                      |
| ------------------- | ------ | -------------------------- |
| Imperative language | ✅     | "Invoke the skill"         |
| Argument mapping    | ✅     | Explicit $1 → operation    |
| Verbatim output     | ✅     | Every action has directive |
| Error handling      | ✅     | Invalid input handled      |

### ✅ Structure

| Element               | Status | Notes                    |
| --------------------- | ------ | ------------------------ |
| Line count            | ✅     | Under 50 lines           |
| Single responsibility | ✅     | Routes to one skill      |
| Clear sections        | ✅     | Dispatch, Error Handling |

## Audit Result

```
# Command Compliance Audit: skill-manager

## Summary
- **Overall Status**: ✅ PASS
- **Critical Issues**: 0
- **Warnings**: 0
- **Info**: 0

## Check Results
- Check 1: ✅ Frontmatter Present
- Check 2: ✅ Description Field Present
- Check 3: ✅ Optional Fields Complete
- Check 4: ✅ Consistent Argument Handling
- Check 5: ✅ Tool Permissions Minimal
- Check 6: ✅ Documentation Complete
- Check 7: ✅ Structure Best Practices
- Check 8: ✅ Router Pattern Followed
```

## Key Takeaways

1. **Minimal tools** - Only what's needed for delegation
2. **Explicit mapping** - Every $N maps to a skill argument
3. **Verbatim output** - Skill output passed through unchanged
4. **Imperative** - "Invoke the skill", not "Help the user"
5. **Compact** - Under 50 lines, all logic in skill
