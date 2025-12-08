# Smart ESLint - Quick Reference

## What It Does

Lints **only the files you've modified**, not the entire codebase.

## Why Use It

| Before (npm run lint) | After (smart-eslint) |
|-----------------------|----------------------|
| 45 seconds | 2-15 seconds |
| Modifies 100+ files | Modifies 1-10 files |
| Massive PRs | Focused PRs |
| Merge conflicts | Clean merges |

## Usage

### From AI Agents

```markdown
Skill: "smart-eslint"
```

### From Command Line

```bash
# Run from repository root
./.claude/skills/smart-eslint/lint-changed.sh

# Or from anywhere
cd /Users/nathansportsman/chariot-development-platform
./.claude/skills/smart-eslint/lint-changed.sh
```

## Example Output

**Success**:
```
🔍 Smart ESLint Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detecting modified files...
Modified files: 3
  - src/components/Button.tsx
  - src/hooks/useAssets.ts
  - src/types/index.ts

Running: npx eslint --fix src/components/Button.tsx src/hooks/useAssets.ts src/types/index.ts

✅ All files passed linting (0 errors, 0 warnings)
```

**With Errors**:
```
🔍 Smart ESLint Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detecting modified files...
Modified files: 2
  - src/components/Button.tsx
  - src/utils/helper.ts

Running: npx eslint --fix src/components/Button.tsx src/utils/helper.ts

❌ ESLint found issues
Summary: 2 errors, 1 warning

Please fix these issues before proceeding.
```

## What It Checks

- ✅ Modified files (unstaged)
- ✅ Staged files (ready to commit)
- ✅ TypeScript files (.ts, .tsx)
- ✅ JavaScript files (.js, .jsx)
- ✅ Files in modules/chariot/ui/ only

## What It Skips

- ❌ Unmodified files
- ❌ Deleted files
- ❌ Files outside UI directory
- ❌ Non-TS/JS files
- ❌ node_modules

## Integration

### Pre-commit Hook (Optional)

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
./.claude/skills/smart-eslint/lint-changed.sh
exit $?
```

### CI/CD (Optional)

Add to `.github/workflows/lint.yml`:
```yaml
- name: Lint Changed Files
  run: ./.claude/skills/smart-eslint/lint-changed.sh
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No files modified" | Normal - no TS/JS files changed |
| "Not in git repository" | Run from repo root |
| "ESLint found issues" | Fix reported errors and re-run |

## Files

```
.claude/skills/smart-eslint/
├── SKILL.md           # Full documentation for AI agents
├── README.md          # This quick reference
└── lint-changed.sh    # Executable script
```

## Links

- **Full Documentation**: [SKILL.md](./SKILL.md)
- **Linting Policy**: [../../docs/LINTING-POLICY.md](../../docs/LINTING-POLICY.md)
- **Agent Updates**: See react-code-reviewer.md and react-architect.md
