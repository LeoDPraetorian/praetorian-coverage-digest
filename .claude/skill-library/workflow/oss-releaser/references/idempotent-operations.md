# Idempotent Operations

**All OSS release preparation operations are designed to be safely run multiple times.**

## Core Principle

Idempotency means running the skill multiple times produces the same result as running it once, with no unintended side effects.

## Idempotent Checks

### Copyright Headers

✓ **Idempotent:** Checks if header exists before adding
```bash
if head -3 "$file" | grep -q "Copyright.*Praetorian"; then
  echo "Already has header (skipping)"
else
  add_header "$file"
fi
```

### File Creation

✓ **Idempotent:** Checks if file exists before creating
```bash
if [ ! -f LICENSE ]; then
  create_license_file
fi
```

### GitHub Metadata

✓ **Idempotent:** Updates override previous values
```bash
gh repo edit --description "New description"  # Replaces old description
gh repo edit --add-topic security              # Adds topic if not present
```

### Validation Runs

✓ **Idempotent:** Read-only operations
```bash
gitleaks detect --source . --report-path report.json  # No modifications
grep -r "internal" .                                  # No modifications
```

## Non-Idempotent Anti-Patterns

❌ **Appending without checking:**
```bash
echo "Copyright 2026" >> file.go  # Creates duplicates on re-run
```

✓ **Correct approach:**
```bash
if ! grep -q "Copyright" file.go; then
  sed -i '1i\Copyright 2026' file.go
fi
```

## Safe Re-Runs

Users should be able to:
1. Run skill to prepare for OSS
2. Review results
3. Make manual fixes
4. **Re-run skill to validate/complete**

The second run should detect what's already done and only process remaining items.
