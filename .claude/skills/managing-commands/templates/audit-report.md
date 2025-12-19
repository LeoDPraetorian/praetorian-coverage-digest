# Audit Report Template

Use this format for command compliance reports.

```markdown
# Command Compliance Audit: [command-name]

## Summary

- **Overall Status**: [✅ PASS | ⚠️ NEEDS IMPROVEMENT | ❌ FAIL]
- **Critical Issues**: [N]
- **Warnings**: [N]
- **Info**: [N]

## Check Results

### Check 1: Frontmatter Presence
**Status**: [✅ PASS | ❌ CRITICAL]
**Findings**: [what you found]
**Remediation**: [specific steps if issues]

### Check 2: Required Fields
**Status**: [✅ PASS | ❌ CRITICAL]
**Findings**: [what you found]
**Remediation**: [specific steps if issues]

### Check 3: Optional Recommended Fields
**Status**: [✅ PASS | ⚠️ WARNING]
**Findings**: [what you found]
**Remediation**: [specific steps if issues]

### Check 4: Argument Handling
**Status**: [✅ PASS | ⚠️ WARNING]
**Findings**: [what you found]
**Remediation**: [specific steps if issues]

### Check 5: Tool Permissions
**Status**: [✅ PASS | ⚠️ WARNING]
**Findings**: [what you found]
**Remediation**: [specific steps if issues]

### Check 6: Documentation Quality
**Status**: [✅ PASS | ⚠️ WARNING]
**Findings**: [what you found]
**Remediation**: [specific steps if issues]

### Check 7: Structure Best Practices
**Status**: [✅ PASS | ⚠️ WARNING]
**Findings**: [what you found]
**Remediation**: [specific steps if issues]

### Check 8: Router Pattern Compliance
**Status**: [✅ PASS | ❌ CRITICAL | ⚠️ WARNING]
**Findings**: [what you found]
**Remediation**: [specific steps if issues]

## Remediation Priority

### Critical (Must Fix Before Use)
1. [Issue with specific fix]

### Warning (Should Fix)
1. [Issue with suggested improvement]

### Info (Nice to Have)
1. [Enhancement opportunity]
```

## Status Indicators

| Symbol | Meaning |
|--------|---------|
| ✅ | Check passed |
| ⚠️ | Warning (should fix) |
| ❌ | Critical (must fix) |
| ℹ️ | Info (optional improvement) |

## Severity Levels

### CRITICAL

Must fix before using command:
- Missing frontmatter
- Missing description field
- Tool Leakage (skills + extra tools)
- Vague instructions (not imperative)
- Using Bash without permission

### WARNING

Should fix soon:
- Missing argument-hint
- Overly broad permissions
- Missing verbatim directive
- Command > 50 lines
- Poor documentation

### INFO

Nice to have:
- Could use explicit model
- Could improve examples
- Could enhance error handling

## Auto-Fix Commands

For issues with auto-fix support:

```bash
# Preview fixes
npm run fix -- [command-name] --dry-run

# Apply fixes
npm run fix -- [command-name]

# Re-audit
npm run audit -- [command-name]
```
