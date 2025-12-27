# Phase 4: Broken Links

## What It Checks

- Markdown links `[text](path)` point to existing files
- @file references resolve to existing files
- Relative paths are correct
- No orphaned references after reorganization

## Why It Matters

Broken links cause:

- Claude cannot load referenced content
- Progressive disclosure fails
- Users get 404 errors
- Documentation fragmentation

## Detection Patterns

### CRITICAL Issues

**1. Link to Non-Existent File**

```markdown
See [API Reference](references/api-docs.md)

# File references/api-docs.md doesn't exist
```

**2. Wrong Path**

```markdown
[Examples](example.md)

# Should be: [Examples](examples/example.md)
```

**3. @file Reference Broken**

```markdown
@references/missing-file.md

# File doesn't exist
```

## Auto-Fix Capability

✅ **AUTO-FIXABLE** - can fix paths or create stubs

**Fix strategies:**

**1. Path Correction** - File exists, wrong path:

```markdown
# Before

[Guide](api-guide.md)

# After (file found in references/)

[Guide](references/api-guide.md)
```

**2. Stub Creation** - File doesn't exist:

```markdown
# Create references/api-guide.md with TODO content
```

**3. Case Correction** - Wrong case:

```markdown
# Before

[Guide](References/API-Guide.md)

# After

[Guide](references/api-guide.md)
```

## Examples

### Example 1: Moved File

**Scenario**: File moved during Phase 5 reorganization

**Before:**

```markdown
See [Patterns](advanced-patterns.md)

# File was moved to references/
```

**After:**

```markdown
See [Patterns](references/advanced-patterns.md)
```

**Fix**: Auto-update path

### Example 2: Typo in Filename

**Before:**

```markdown
[Reference](references/api-refernce.md) # Typo: refernce
```

**After:**

```markdown
[Reference](references/api-reference.md)
```

**Fix**: Fuzzy match to correct filename

### Example 3: Missing Reference File

**Before:**

```markdown
[Advanced Guide](references/advanced.md)

# File doesn't exist, no similar files found
```

**After:**

1. Create stub: `references/advanced.md`
2. Add TODO content
3. Update .local/CHANGELOG.md noting stub creation

## Edge Cases

**1. External Links**

Not validated (only local file references checked):

```markdown
[GitHub](https://github.com/...) # Not checked
```

**2. Anchor Links**

Section anchors not validated:

```markdown
[See Below](#section-name) # Not checked
```

**3. Circular References**

Not detected (would require graph traversal):

```markdown
# file-a.md links to file-b.md

# file-b.md links to file-a.md
```

## Manual Remediation

**For broken links after auto-fix fails:**

1. **Search for file:**

   ```bash
   find . -name "filename.md"
   ```

2. **Update path or create file:**
   - If file exists: Update link path
   - If file missing and referenced: Create stub with TODO
   - If file not needed: Remove link

3. **Test link resolution:**
   ```bash
   test -f path/to/file.md && echo "✓" || echo "✗"
   ```

## Related Phases

- [Phase 5: File Organization](phase-05-file-organization.md) - File moves create broken links
- Progressive Disclosure - Links are core to on-demand loading

## Quick Reference

| Issue         | Auto-Fix | Strategy           |
| ------------- | -------- | ------------------ |
| Wrong path    | ✅       | Search and correct |
| Typo          | ✅       | Fuzzy match        |
| Missing file  | ✅       | Create stub        |
| Case mismatch | ✅       | Normalize          |
