# System Command Template

Use this template when your command directly executes system utilities without a backing skill.

```markdown
---
description: Brief description of what command does  # < 120 chars
argument-hint: [arg1] [arg2]
allowed-tools: Bash(specific-command:*)
---

# Command Name

Execute the requested operation.

## Usage

`/command-name [arg1] [arg2]`

## Implementation

Execute: !`specific-command $1 $2`

Display the output to show the result.

## Error Handling

If command fails:
  Display the error message.
  Suggest common fixes.

If arguments invalid:
  Explain expected format.
  Show usage example.
```

## Template Notes

### When to Use

- No backing skill exists
- Simple system utility
- Output is direct command result
- Logic is minimal (< 20 lines)

### Required Elements

1. **Specific tool permissions** - `Bash(git status:*)` not `Bash(*)`
2. **Clear usage** - Document expected arguments
3. **Error handling** - How to handle failures
4. **Argument-hint** - If using $1, $2, etc.

### Tool Permission Patterns

| Operation | Permission |
|-----------|------------|
| Git commands | `Bash(git:*)` |
| NPM commands | `Bash(npm:*)` |
| File listing | `Glob` or `Bash(ls:*)` |
| Specific command | `Bash(command:*)` |

### When NOT to Use

- Logic exceeds ~20 lines → Create a skill
- Multiple operations needed → Create a skill
- Complex error handling → Create a skill
- Reusable functionality → Create a skill

### Validation Checklist

- [ ] No backing skill exists (checked)
- [ ] Logic is minimal (< 20 lines)
- [ ] Tool permissions specific (not broad)
- [ ] Usage documented
- [ ] Error handling included
- [ ] Argument-hint matches usage
