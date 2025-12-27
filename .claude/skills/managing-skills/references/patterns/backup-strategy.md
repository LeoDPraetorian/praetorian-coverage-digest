# Backup Strategy

**Single source of truth for skill file backup procedures.**

This pattern is referenced by:

- `updating-skills` - Creates backup before edits (Phase 3)
- `fixing-skills` - Creates backup before auto-fixes (Step 3)

---

## Purpose

**Backup is MANDATORY before any skill modification.** Why:

1. **Reversibility** - Can rollback if edits break functionality
2. **Audit trail** - Timestamp shows when changes were made
3. **Multi-file safety** - Auto-fixes can modify multiple files
4. **Testing fallback** - Revert if changes fail validation

---

## Standard Procedure

### 1. Create Backup Directory

```bash
mkdir -p {skill-path}/.local
```

**Note:** `.local/` is gitignored - backups stay local only.

### 2. Backup with Timestamp

```bash
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
cp {skill-path}/SKILL.md {skill-path}/.local/${TIMESTAMP}-{suffix}.bak
```

### 3. Verify Backup

```bash
ls -la {skill-path}/.local/
```

**Checkpoint:** Cannot proceed to edits without backup ✅

---

## Operation-Specific Suffixes

| Operation | Suffix Pattern  | Example                                |
| --------- | --------------- | -------------------------------------- |
| Update    | `-{skill-name}` | `2024-01-15-10-30-00-my-skill.bak`     |
| Fix       | `-pre-fix`      | `2024-01-15-10-30-00-pre-fix.bak`      |
| Refactor  | `-pre-refactor` | `2024-01-15-10-30-00-pre-refactor.bak` |

**Why different suffixes:** Makes it clear what operation triggered the backup when reviewing `.local/` directory.

---

## Complete Backup Script

```bash
#!/bin/bash
# backup-skill.sh - Standardized skill backup

SKILL_PATH="${1:-.}"
OPERATION="${2:-update}"
SKILL_NAME=$(basename "$SKILL_PATH")

# Validate skill exists
if [ ! -f "$SKILL_PATH/SKILL.md" ]; then
  echo "❌ ERROR: SKILL.md not found in $SKILL_PATH"
  exit 1
fi

# Create .local directory
mkdir -p "$SKILL_PATH/.local"

# Generate timestamp
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)

# Determine suffix based on operation
case "$OPERATION" in
  update) SUFFIX="$SKILL_NAME" ;;
  fix) SUFFIX="pre-fix" ;;
  refactor) SUFFIX="pre-refactor" ;;
  *) SUFFIX="$OPERATION" ;;
esac

# Create backup
BACKUP_FILE="$SKILL_PATH/.local/${TIMESTAMP}-${SUFFIX}.bak"
cp "$SKILL_PATH/SKILL.md" "$BACKUP_FILE"

# Verify
if [ -f "$BACKUP_FILE" ]; then
  echo "✅ Backup created: $BACKUP_FILE"
  ls -la "$SKILL_PATH/.local/" | tail -5
else
  echo "❌ ERROR: Backup failed"
  exit 1
fi
```

---

## Rollback Procedure

### View Available Backups

```bash
ls -la {skill-path}/.local/
```

### Restore Specific Backup

```bash
cp {skill-path}/.local/{backup-file} {skill-path}/SKILL.md
```

### Restore Most Recent

```bash
LATEST=$(ls -t {skill-path}/.local/*.bak | head -1)
cp "$LATEST" {skill-path}/SKILL.md
```

---

## Backup Reference Files

When modifying reference files, backup them too:

```bash
# Single reference file
cp {skill-path}/references/{file}.md {skill-path}/.local/${TIMESTAMP}-{file}.bak

# All reference files
for f in {skill-path}/references/*.md; do
  cp "$f" "{skill-path}/.local/${TIMESTAMP}-$(basename $f).bak"
done
```

---

## Cleanup Old Backups

**Keep last 10 backups per skill:**

```bash
cd {skill-path}/.local
ls -t *.bak | tail -n +11 | xargs rm -f
```

**Why cleanup:** Prevents disk bloat from accumulated backups.

---

## Checkpoint Enforcement

**All skill modification workflows must enforce:**

1. ✅ Backup exists before editing
2. ✅ Backup verified (ls shows file)
3. ✅ Cannot proceed without backup

**Pattern for enforcement in workflows:**

````markdown
### Step X: Create Backup

**🚨 MANDATORY** - See [Backup Strategy](link-to-this-file)

Quick command:

```bash
mkdir -p {skill-path}/.local
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
cp {skill-path}/SKILL.md {skill-path}/.local/${TIMESTAMP}-{operation}.bak
```
````

**Cannot proceed without backup** ✅

```

---

## Related

- [Changelog Format](changelog-format.md) - Document what changed after backup
- [Line Count Limits](line-count-limits.md) - Why extraction may be needed
```
