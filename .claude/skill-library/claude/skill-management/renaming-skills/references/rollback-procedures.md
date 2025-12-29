# Rollback Procedures

**How to safely revert a failed rename operation.**

## If Rename Fails Mid-Operation

### If failed at Step 4 (frontmatter update):

```bash
# Revert frontmatter
Edit {
  file_path: "{skill-path}/SKILL.md",
  old_string: "name: <new-skill-name>",
  new_string: "name: <old-skill-name>"
}
```

### If failed at Step 5 (directory move):

```bash
# Move back
mv {new-path} {old-path}
```

### If failed at Step 7 (reference updates):

```bash
# Revert each updated file
Edit {
  file_path: "{file}",
  old_string: "<new-skill-name>",
  new_string: "<old-skill-name>"
}

# Move directory back
mv {new-path} {old-path}
```

## Always Verify Rollback

```bash
# Check old name exists again
ls {old-path}

# Check no new name exists
ls {new-path}  # Should error
```
