# Command Lifecycle

## Overview

```
┌──────────┐     ┌───────┐     ┌─────┐     ┌──────┐     ┌────────┐
│  Create  │────▶│ Audit │────▶│ Fix │────▶│ Test │────▶│ Deploy │
└──────────┘     └───────┘     └─────┘     └──────┘     └────────┘
                     │             │
                     │             ▼
                     │        Re-Audit
                     │             │
                     ▼             ▼
                  PASS? ─────────────────▶ Continue
```

## Phase 1: Create

### When to Create a Command

- Frequently used workflow (>3 times/week)
- Complex multi-step operation
- Team-shared functionality
- Consistent behavior required

### Creation Workflow

1. **Check for backing skill:**
   ```bash
   ls .claude/skills/ | grep -i <name>
   ls .claude/skill-library/**/<name>/
   ```

2. **Create command:**
   ```bash
   cd .claude/skill-library/claude/commands/command-manager/scripts
   npm run create -- <name> "Description"
   ```

3. **Review generated file:**
   - Router Pattern used if skill exists
   - System template used otherwise
   - Frontmatter complete

### Template Selection

| Condition | Template | Tools |
|-----------|----------|-------|
| Backing skill exists | Router | Skill, AskUserQuestion |
| No skill, git operation | System | Bash(git:*) |
| No skill, file operation | System | Glob, Read |
| No skill, complex logic | **Create skill first** | - |

## Phase 2: Audit

### 8-Check Protocol

| Check | Name | Severity |
|-------|------|----------|
| 1 | Frontmatter Presence | CRITICAL |
| 2 | Required Fields | CRITICAL |
| 3 | Optional Recommended Fields | WARNING |
| 4 | Argument Handling | WARNING |
| 5 | Tool Permissions | WARNING |
| 6 | Documentation Quality | WARNING |
| 7 | Structure Best Practices | WARNING |
| 8 | Router Pattern Compliance | CRITICAL |

### Running Audit

```bash
# Single command
npm run audit -- my-command

# All commands
npm run audit
```

### Interpreting Results

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ PASS | All checks pass | Deploy |
| ⚠️ WARN | Warnings only | Should fix |
| ❌ FAIL | Critical issues | Must fix |

## Phase 3: Fix

### Auto-Fixable Issues

| Issue | Auto-Fix |
|-------|----------|
| Extra tools with skills | Remove tools |
| Missing verbatim directive | Add directive |
| Description > 120 chars | Trim description |
| Missing argument-hint | Add from $1, $2 usage |

### Running Fix

```bash
# Preview changes
npm run fix -- my-command --dry-run

# Apply changes
npm run fix -- my-command
```

### Manual Fixes Required

| Issue | Manual Action |
|-------|---------------|
| Vague instructions | Rewrite with imperative language |
| Logic leakage (>50 lines) | Move logic to skill |
| Broad Bash permissions | Specify exact commands |
| Mixed argument patterns | Choose one pattern |

## Phase 4: Test

### Testing Checklist

- [ ] Command appears in `/help`
- [ ] Description is clear and accurate
- [ ] Arguments work as documented
- [ ] Skill delegation works (if applicable)
- [ ] Output is verbatim (not reformatted)
- [ ] Error handling works
- [ ] Edge cases handled

### Testing Commands

```bash
# Verify discovery
/help

# Test invocation
/<command-name> <args>

# Verify audit passes
npm run audit -- <command-name>
```

## Phase 5: Deploy

### Deployment Checklist

- [ ] Audit passes (0 CRITICAL)
- [ ] Manual testing complete
- [ ] Documentation accurate
- [ ] Team notified (if shared)
- [ ] Committed to version control

### Commit Pattern

```bash
git add .claude/commands/<command-name>.md
git commit -m "feat(commands): add <command-name> command"
```

## Maintenance

### Periodic Review

| Frequency | Action |
|-----------|--------|
| Weekly | Audit frequently-used commands |
| Monthly | Audit all commands |
| After standard changes | Re-audit all |

### Triggered Review

| Event | Action |
|-------|--------|
| Command fails | Audit + fix |
| Unexpected behavior | Audit + review |
| Security concern | Audit + review tools |
| Skill updated | Re-test delegation |

## Integration Points

### With Skill Lifecycle

```
Skill Created ───────▶ Command Created (Router Pattern)
Skill Updated ───────▶ Command Re-tested
Skill Deprecated ────▶ Command Updated/Deprecated
```

### With CI/CD

```yaml
# Example pre-commit hook
- npm run audit -- --all
- exit 1 if CRITICAL issues
```

## Best Practices

### Do

- Create skill before command if logic needed
- Use Router Pattern by default
- Run audit before committing
- Test edge cases
- Document usage examples

### Don't

- Skip audit step
- Commit with CRITICAL issues
- Add tools "just in case"
- Write logic in commands
- Use vague instructions
