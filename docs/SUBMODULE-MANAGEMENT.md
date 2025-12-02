# Submodule Management & Commit Prevention

## Overview

This document outlines the strategy for preventing submodule commits in the chariot-development-platform super-repository and provides guidance on proper submodule workflows.

## Why Prevent Submodule Commits?

**Problems with submodule commits in super-repo:**

1. **Merge Conflicts**: Different developers updating submodules independently creates constant conflicts
2. **PR Noise**: Submodule changes clutter PR diffs and hide meaningful changes
3. **Review Difficulty**: Reviewers can't see what actually changed in the submodule from the super-repo PR
4. **Version Confusion**: Multiple conflicting submodule versions across branches
5. **Independent Workflows**: Each submodule has its own CI/CD, testing, and release process

**Correct Workflow:**
- Develop and commit in the submodule's own repository
- Create PRs in the submodule repository
- Super-repo only tracks stable submodule releases

## Prevention Layers

### Layer 1: Pre-commit Hook (Local Prevention)

**Status:** ✅ Implemented

**Location:** `.githooks/pre-commit`

**How it works:**
- Runs before every git commit
- Checks if any staged changes are in `modules/*`
- Blocks the commit with a helpful error message

**Installation:**
```bash
make setup              # Automatic during setup
make install-git-hooks  # Manual installation
```

**Effectiveness:** 95% (can be bypassed with `--no-verify`)

### Layer 2: CI/CD Check (Remote Prevention)

**Status:** 🔄 Recommended for implementation

**Proposed Implementation:**

`.github/workflows/prevent-submodule-commits.yml`:

```yaml
name: Prevent Submodule Commits

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  check-submodule-changes:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch all history for comparison

      - name: Check for submodule changes
        run: |
          # Get list of changed files in PR
          CHANGED_FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD)

          # Check if any changes are in modules/
          if echo "$CHANGED_FILES" | grep -q "^modules/"; then
            echo "❌ ERROR: Submodule changes detected in PR!"
            echo ""
            echo "The following submodule files were modified:"
            echo "$CHANGED_FILES" | grep "^modules/"
            echo ""
            echo "Submodule changes must be made in the submodule's own repository."
            echo "Please:"
            echo "  1. cd modules/<submodule-name>"
            echo "  2. Create a branch and commit there"
            echo "  3. Create a PR in that submodule's repository"
            echo "  4. Remove submodule changes from this PR"
            echo ""
            echo "To remove submodule changes from this PR:"
            echo "  git restore --staged modules/*"
            echo "  git commit --amend"
            echo "  git push --force-with-lease"
            exit 1
          fi

          echo "✅ No submodule changes detected"

      - name: Report success
        if: success()
        run: |
          echo "✅ PR is clean - no submodule changes found"
```

**Effectiveness:** 100% (cannot be bypassed without admin override)

### Layer 3: Protected Branch Rules (GitHub)

**Status:** 🔄 Recommended for configuration

**GitHub Settings:**

1. Go to repository Settings → Branches
2. Add branch protection rule for `main`:
   - ✅ Require status checks to pass before merging
   - ✅ Require "Prevent Submodule Commits" check to pass
   - ✅ Require linear history (prevents force pushes to main)
   - ✅ Require pull request reviews (1-2 reviewers)

**Effectiveness:** 100% (admin enforcement)

### Layer 4: Code Review Guidelines

**Status:** ✅ Documented

**Reviewer Checklist:**

When reviewing PRs, verify:
- [ ] No changes to `modules/*` directories visible in Files Changed tab
- [ ] PR description doesn't mention submodule updates
- [ ] If submodule updates are mentioned, request removal

**CODEOWNERS File:**

```
# Super-repo configuration
/.github/          @praetorian-inc/platform-leads
/Makefile          @praetorian-inc/platform-leads
/CLAUDE.md         @praetorian-inc/platform-leads

# Submodules should not be modified
/modules/          @praetorian-inc/no-one
```

## Proper Submodule Workflow

### Developing in a Submodule

```bash
# 1. Navigate to the submodule
cd modules/chariot

# 2. Verify you're in the submodule repo
git remote -v
# Should show: praetorian-inc/chariot.git

# 3. Create a feature branch
git checkout -b feature/my-feature

# 4. Make your changes
# ... edit files ...

# 5. Commit in the submodule
git add .
git commit -m "feat: add new feature"

# 6. Push to submodule's remote
git push origin feature/my-feature

# 7. Create PR in the submodule's repository
# Go to https://github.com/praetorian-inc/chariot/pulls
# Create PR from feature/my-feature to main

# 8. Return to super-repo root
cd ../..

# The super-repo should show NO changes
git status
# Should not show modules/ as modified
```

### Updating Submodules to Latest (Rare)

**When:** Only when explicitly coordinating a submodule version bump across team

```bash
# This should be a separate, coordinated PR with team approval
git submodule update --remote modules/chariot
git add modules/chariot
git commit -m "chore: update chariot submodule to v2.5.0"
# Create PR with explicit justification and team lead approval
```

## Fixing Accidental Submodule Commits

### If Not Yet Pushed

```bash
# Unstage the changes
git restore --staged modules/*

# Amend the last commit
git commit --amend --no-edit
```

### If Already Pushed but No One Has Pulled

```bash
# Unstage and amend
git restore --staged modules/*
git commit --amend --no-edit

# Force push (safe if no one has pulled)
git push --force-with-lease
```

### If Multiple Commits with Submodule Changes

Use `git filter-branch` to remove all submodule changes from history:

```bash
# Create a backup branch first
git branch backup-$(date +%Y%m%d-%H%M%S)

# Remove submodule changes from all commits
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
  --index-filter 'git rm --cached --ignore-unmatch -r modules/*' \
  --prune-empty -- origin/main..HEAD

# Restore submodules to origin/main state
git checkout origin/main -- modules/*
git commit -m "chore: restore submodules to origin/main state"

# Force push
git push --force-with-lease
```

**⚠️ Warning:** This rewrites git history. Coordinate with team before doing this.

## Monitoring & Metrics

### Tracking Prevention Effectiveness

Monitor these metrics to measure success:

1. **Pre-commit Hook Blocks:** Track how often the hook prevents commits
2. **CI Check Failures:** Track how often PRs are blocked by CI
3. **Manual Fixes Required:** Track how often filter-branch is needed
4. **Team Feedback:** Survey team on workflow smoothness

### Regular Audits

**Monthly Audit Checklist:**

```bash
# Check recent commits for submodule changes
git log --all --oneline --name-only -- modules/ | head -20

# Should be empty or only intentional coordinated updates
```

## Configuration Options

### Allowing Specific Submodule Updates

If you need to allow controlled submodule updates:

1. Update `.githooks/pre-commit` to check for special commit message prefix:

```bash
# In pre-commit hook, add:
if git log -1 --pretty=%B | grep -q "^SUBMODULE-UPDATE:"; then
    echo "✅ Authorized submodule update detected"
    exit 0
fi
```

2. Use with explicit team approval:

```bash
git commit -m "SUBMODULE-UPDATE: Bump chariot to v2.5.0

Approved by: @tech-lead
Reason: Security patch required across all environments
Ticket: PROJ-1234"
```

### Disabling Protection (Emergency Only)

```bash
# Remove hook temporarily
rm .git/hooks/pre-commit

# Make emergency commit
git commit -m "emergency: critical fix"

# Restore hook
make install-git-hooks
```

## Future Enhancements

### Potential Improvements:

1. **Git Attributes:** Use `.gitattributes` to mark submodules as binary
2. **Git Configuration:** Set `diff.ignoreSubmodules = all` in `.gitconfig`
3. **Automated Alerts:** Slack notifications when submodule commits are detected
4. **Metrics Dashboard:** Real-time tracking of prevention effectiveness

## Support

### Getting Help

If you encounter issues:

1. Check this documentation first
2. Review `.githooks/README.md`
3. Contact `#platform-team` on Slack
4. Escalate to tech lead if needed

### Reporting Issues

When reporting hook or prevention issues:

- Include the error message
- Provide output of `git status`
- Share what you were trying to do
- Include output of `ls -la .git/hooks/pre-commit`

## Related Documentation

- `.githooks/README.md` - Git hooks installation and usage
- `CLAUDE.md` - Super-repo development guidelines
- `docs/DESIGN-PATTERNS.md` - Overall architecture patterns
