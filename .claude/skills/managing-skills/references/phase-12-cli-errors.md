# Phase 12: CLI Error Handling (Exit Code Discrimination)

## What It Checks

- TypeScript CLI tools use proper exit codes
- Catch blocks use exit(2) for tool errors
- Validation results use exit(1) for violations
- Clear error messages distinguish tool errors from violations

## Why It Matters

**User confusion**: "Did the audit fail to run, or did it find issues?"

**Exit code standard**:

- 0: Completed successfully (may or may not have found issues)
- 1: Violations found (tool ran, found problems)
- 2: Tool error (tool couldn't run)

**Without discrimination**: Everything uses exit(1), impossible to tell failures apart.

## Detection Patterns

### CRITICAL Issues

**1. Catch Block Uses exit(1)**

```typescript
try {
  runAudit();
} catch (error) {
  console.error("Audit failed");
  process.exit(1); // ❌ Should be exit(2) - this is tool error!
}
```

**2. Invalid Argument Uses exit(1)**

```typescript
if (invalidPhase) {
  console.error("Invalid phase");
  process.exit(1); // ❌ Should be exit(2) - tool error!
}
```

## Auto-Fix Capability

✅ **AUTO-FIXABLE** - can update exit codes and messages

**Fix actions:**

1. Change catch blocks: `exit(1)` → `exit(2)`
2. Update error messages: Add "Tool Error" prefix
3. Keep violation results: `exit(1)` for found issues

**Implementation:**

```typescript
// Pattern detection and replacement
/catch.*{[\s\S]*?process\.exit\(1\)/
→ Replace exit(1) with exit(2) in catch blocks
```

## The Standard Pattern

**For tool errors (can't run):**

```typescript
} catch (error) {
  console.error(chalk.red.bold('\n⚠️ Tool Error - Audit could not run\n'));
  console.error(chalk.gray('This is a tool failure, not a skill violation.\n'));
  console.error(error);
  process.exit(2);  // ✓ Tool error
}
```

**For validation results (found violations):**

```typescript
if (results.criticalCount > 0) {
  console.log(chalk.red.bold("❌ Found Issues\n"));
  console.log(`CRITICAL: ${results.criticalCount}`);
  process.exit(1); // ✓ Violations found
}
```

**For successful completion:**

```typescript
console.log(chalk.green.bold("✅ Validation Passed\n"));
process.exit(0); // ✓ Completed, no issues
```

## Examples

### Example 1: Fix Catch Block

**Before:**

```typescript
try {
  const results = await auditor.run();
  if (results.violations > 0) process.exit(1);
} catch (error) {
  console.error("❌ Audit Failed");
  process.exit(1); // ❌ Wrong - same as violations!
}
```

**After:**

```typescript
try {
  const results = await auditor.run();
  if (results.violations > 0) process.exit(1); // ✓ Violations
} catch (error) {
  console.error("⚠️ Tool Error - Audit could not run");
  console.error("This is a tool failure, not a skill violation.");
  process.exit(2); // ✓ Tool error
}
```

### Example 2: Invalid Arguments

**Before:**

```typescript
if (!validPhase(phase)) {
  console.error(`Invalid phase: ${phase}`);
  process.exit(1); // ❌ Wrong - tool error, not violation
}
```

**After:**

```typescript
if (!validPhase(phase)) {
  console.error("⚠️ Tool Error - Invalid argument");
  console.error(`Invalid phase: ${phase}. Use 1-12 or all`);
  process.exit(2); // ✓ Tool error
}
```

## Exit Code Decision Tree

```
Is this a catch block or error handler?
├─ YES → Is it catching tool/runtime errors?
│        ├─ YES → exit(2) + "Tool Error" message
│        └─ NO → Check what it's handling
└─ NO → Is this reporting violations?
         ├─ YES → exit(1) + "Found Issues" message
         └─ NO → exit(0) (success)
```

## Edge Cases

**1. Validation Completed, No Issues**

```typescript
// BOTH completed successfully - use exit(0)
console.log("✅ Validation Passed - No issues found");
process.exit(0);
```

**2. Validation Completed, Found Issues**

```typescript
// Validation RAN successfully, but found problems - use exit(1)
console.log("❌ Validation Found Issues");
console.log(`Found ${violations.length} violations`);
process.exit(1);
```

**3. Warning-Level Issues Only**

```typescript
// Depends on policy:
if (criticalOnly && results.criticalCount === 0) {
  process.exit(0); // Treat warnings as success
} else if (results.warningCount > 0) {
  process.exit(1); // Treat warnings as violations
}
```

## Manual Remediation

**Audit existing CLI tool:**

1. Find all `process.exit(1)` calls:

   ```bash
   grep -n "process.exit(1)" src/**/*.ts
   ```

2. For each occurrence, ask:
   - Is this in a catch block? → Should be exit(2)
   - Is this for invalid args? → Should be exit(2)
   - Is this for violations found? → Keep exit(1)

3. Update exit codes and messages

**Testing exit codes:**

```bash
# Should exit 2 for invalid option
npm run dev -- audit --invalid-option
echo "Exit: $?"  # Should be 2

# Should exit 0 for successful audit (no issues)
npm run dev -- audit --skill compliant-skill
echo "Exit: $?"  # Should be 0

# Should exit 1 for violations found
npm run dev -- audit --skill skill-with-issues
echo "Exit: $?"  # Should be 1
```

## Related Phases

- [Phase 8: TypeScript Structure](phase-08-typescript-structure.md) - CLIs need this pattern
- validation-cli-patterns (claude-skill-write) - Complete guide

## Quick Reference

| Scenario               | Exit Code | Message Pattern                 |
| ---------------------- | --------- | ------------------------------- |
| Tool error (can't run) | 2         | ⚠️ Tool Error - X could not run |
| Violations found       | 1         | ❌ Found Issues                 |
| Completed, no issues   | 0         | ✅ Validation Passed            |
