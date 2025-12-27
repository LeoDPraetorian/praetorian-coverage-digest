# Phase 5: File Organization (Progressive Disclosure)

## What It Checks

- No orphaned files at skill root (except SKILL.md, CHANGELOG.md)
- Content organized in appropriate subdirectories
- references/, examples/, templates/ structure followed
- Runtime artifacts in .local/

## Why It Matters

**Progressive disclosure**: Claude should load minimal content first, detailed content on-demand.

**Orphaned files at root**:

- Load immediately (not on-demand)
- Waste tokens
- Poor organization
- Harder to maintain

## Detection Patterns

### WARNING Issues

**1. Markdown Files at Root**

```
my-skill/
├── SKILL.md           # ✅ OK
├── api-reference.md   # ❌ Should be in references/
├── example.md         # ❌ Should be in examples/
└── template.md        # ❌ Should be in templates/
```

**2. Implementation Notes at Root**

```
my-skill/
├── IMPLEMENTATION.md  # ❌ Delete or move to .local/
├── STATUS.md          # ❌ Delete
└── NOTES.md           # ❌ Delete or move to .local/
```

## Auto-Fix Capability

✅ **AUTO-FIXABLE** - can move files to appropriate directories

**Fix logic:**

```typescript
if (filename.includes('reference') || filename.includes('api'))
  → move to references/

if (filename.includes('example') || filename.includes('case'))
  → move to examples/

if (filename.includes('template') || filename.includes('starter'))
  → move to templates/

if (filename.includes('implementation') || filename.includes('status'))
  → move to .local/ or delete
```

## Examples

### Example 1: API Documentation at Root

**Before:**

```
my-skill/
├── SKILL.md
└── api-schema.md
```

**After:**

```
my-skill/
├── SKILL.md
└── references/
    └── api-schema.md
```

**SKILL.md updated:**

```markdown
See [API Schema](references/api-schema.md) for complete reference.
```

### Example 2: Mixed Content

**Before:**

```
my-skill/
├── SKILL.md
├── advanced-patterns.md
├── example-workflow.md
├── starter-template.md
└── implementation-notes.md
```

**After:**

```
my-skill/
├── SKILL.md
├── references/
│   └── advanced-patterns.md
├── examples/
│   └── example-workflow.md
├── templates/
│   └── starter-template.md
└── .local/
    └── implementation-notes.md  # Or deleted
```

## Edge Cases

**1. CHANGELOG.md**

Allowed at both locations:

- Root: OK (legacy)
- .local/: Preferred (new pattern)

**2. README.md**

Not standard for skills (delete):

```
❌ README.md, README-DEV.md, README-MVP.md
✅ Only SKILL.md at root
```

**3. Script Files**

Should be in scripts/:

```
❌ helper.sh at root
✅ scripts/helper.sh
```

## Manual Remediation

**After auto-fix:**

1. Review moved files
2. Update links in SKILL.md
3. Test all links resolve
4. Verify progressive disclosure works

**For ambiguous files:**

```bash
# Grep SKILL.md to see if file is referenced
grep "filename.md" SKILL.md

# If referenced: Organize appropriately
# If not referenced: Consider deleting
```

## Related Phases

- [Phase 4: Broken Links](phase-04-broken-links.md) - File moves create broken links
- [Phase 7: Output Directories](phase-07-output-directories.md) - Runtime artifacts organization

## Quick Reference

| File Type            | Correct Location  |
| -------------------- | ----------------- |
| Core docs            | references/       |
| Examples             | examples/         |
| Templates            | templates/        |
| Scripts              | scripts/          |
| Runtime output       | .local/           |
| Implementation notes | .local/ or delete |
