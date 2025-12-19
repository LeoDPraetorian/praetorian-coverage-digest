# Router Pattern Command Template

Use this template when your command delegates to a backing skill.

```markdown
---
description: Use when [trigger] - [keywords]  # < 120 chars
argument-hint: <subcommand> [arg1] [arg2]
allowed-tools: Skill, AskUserQuestion
skills: backing-skill-name
---

# Command Name

**Subcommand:** $1
**Target:** $2
**Options:** $3

## Dispatch Based on $1

### subcommand-1 - Brief Description

**ACTION:** Invoke the `backing-skill-name` skill.

**Arguments:**
- `operation`: "subcommand-1"
- `target`: $2 (Required)
- `options`: $3 (Optional)

**Output:** Display the tool output verbatim.

### subcommand-2 - Brief Description

**ACTION:** Invoke the `backing-skill-name` skill.

**Arguments:**
- `operation`: "subcommand-2"
- `target`: $2 (Required)

**Output:** Display the tool output verbatim.

## Error Handling

If $1 invalid or missing:
  Explain valid subcommands: subcommand-1, subcommand-2
  Show usage: /command-name <subcommand> [args]

If skill returns error:
  Display the error message verbatim.
  Do not attempt workarounds.
```

## Template Notes

### Required Elements

1. **Frontmatter with `skills:`** - Must specify backing skill
2. **`allowed-tools: Skill, AskUserQuestion`** - Only these two
3. **Argument mapping** - Explicit $1, $2 → skill arg mapping
4. **Verbatim output** - "Display the tool output verbatim"
5. **Error handling** - How to handle invalid input

### Customization Points

- `[trigger]` - When user should invoke this command
- `[keywords]` - Search terms for discovery
- `<subcommand>` - Replace with actual subcommand names
- `[arg1] [arg2]` - Replace with actual argument names
- `backing-skill-name` - Replace with actual skill name

### Validation Checklist

- [ ] Description < 120 characters
- [ ] Only Skill and AskUserQuestion in allowed-tools
- [ ] skills: field specifies backing skill
- [ ] Imperative instructions ("Invoke...", not "Help...")
- [ ] Verbatim output directive present
- [ ] Argument mapping explicit
- [ ] Error handling included
- [ ] Command < 50 lines
