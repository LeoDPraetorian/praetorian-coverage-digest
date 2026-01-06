# Sync Workflow Guide - Keeping Feature Branches Current

## Overview

This guide explains how to keep your feature branch synchronized with the latest changes from both the super-repository and individual submodules, preventing divergence from the main branch.

## Workflow Steps

### 1. Save Your Current Work

First, ensure all your changes are committed:

```bash
# In the super-repo root
git add .
git commit -m "WIP: Save current work before sync"

# If you have uncommitted changes in submodules
git submodule foreach 'git add . && git commit -m "WIP: Save work before sync" || true'
```

### 2. Sync with Main Branch (Two Options)

#### Recommended: Stay on Your Feature Branch

This approach avoids losing your work when switching branches:

```bash
# Stay on your feature branch - no checkout needed!
git fetch origin main

# Then merge or rebase origin/main directly
git merge origin/main  # Option A: Preserve history
# OR
git rebase origin/main  # Option B: Cleaner history

# Update submodules to match main's references
git submodule update --init --recursive
```

#### Alternative: Switch to Main First

Only use this if you need to update your local main for other reasons:

```bash
# Switch to main branch (WARNING: This will replace your working directory)
git checkout main

# Pull latest super-repo changes
git pull origin main

# Update submodules to match main's references
git submodule update --init --recursive

# Go back to your feature branch
git checkout your-feature-branch
```

### 3. Handle Any Conflicts (If Using Recommended Approach Above)

If you stayed on your feature branch and conflicts arose:

```bash
# If you chose merge:
# Fix conflicts, then:
git add .
git commit -m "merge: sync with latest main"

# If you chose rebase:
# Fix conflicts for each commit, then:
git rebase --continue
```

### 4. Additional Merge/Rebase Options (If You Switched Branches)

#### Option A: Merge (Preserves History)

```bash
# Merge latest main into your feature branch
git merge main

# Resolve any conflicts if they arise
# Then commit the merge
git commit -m "merge: sync with latest main"
```

#### Option B: Rebase (Cleaner History)

```bash
# Rebase your commits on top of latest main
git rebase main

# Resolve conflicts for each commit if needed
# Use: git rebase --continue after fixing each conflict
```

### 5. Update Specific Submodule with Latest Changes

If you need the latest code from a specific submodule (e.g., modules/chariot):

```bash
# Navigate to the submodule
cd modules/chariot

# Fetch latest changes
git fetch origin

# Check current branch
git branch

# If you're on a feature branch in the submodule
git merge origin/main  # or rebase if you prefer

# If you're in detached HEAD state (common after submodule update)
git checkout main
git pull origin main
# Then checkout your feature branch
git checkout your-feature-branch
git merge main  # or rebase
```

### 6. Update Super-Repo with Submodule Changes

After updating a submodule, the super-repo will show it as modified:

```bash
# Go back to super-repo root
cd ../..

# Add the submodule change
git add modules/chariot

# Commit the updated submodule reference
git commit -m "chore: update chariot submodule to latest"
```

## Complete Example Workflow

Here's a real-world example when working on a feature in modules/chariot:

```bash
# 1. Start from super-repo root
pwd  # Should show: /Users/you/chariot-development-platform

# 2. Save any uncommitted work
git add .
git commit -m "WIP: checkpoint before sync"

# 3. Stay on your feature branch and sync with main
# (No need to checkout main!)
git fetch origin main
git merge origin/main  # or git rebase origin/main
# Resolve conflicts if any
git submodule update --init --recursive

# 4. Update the specific submodule you're working on
cd modules/chariot
git fetch origin
git checkout main
git pull origin main

# 5. Merge main into your submodule feature branch
git checkout feature/my-chariot-feature
git merge main
# Resolve conflicts if any

# 6. Go back to super-repo and commit the update
cd ../..
git add modules/chariot
git commit -m "chore: sync chariot submodule with latest main"

# 7. Push your updated branches
git push origin feature/my-awesome-feature
cd modules/chariot
git push origin feature/my-chariot-feature
```

## Best Practices

### Sync Frequency

- **Daily**: If you're actively developing
- **Before starting new work**: Always sync before beginning a new task
- **Before creating a PR**: Ensure you're up to date before requesting review
- **After major merges to main**: When you see significant changes landed

### Avoiding Conflicts

1. **Sync frequently** - Don't let your branch diverge too far
2. **Communicate with team** - Know what others are working on
3. **Keep commits small** - Easier to rebase/merge
4. **Work in focused areas** - Reduce overlap with others

### When Working Across Multiple Submodules

If your feature spans multiple submodules:

```bash
# Update all submodules to latest main
git submodule foreach 'git checkout main && git pull origin main'

# Then in each submodule where you have changes
git submodule foreach 'git checkout feature/my-feature 2>/dev/null && git merge main || true'

# Add all updated submodules
git add modules/
git commit -m "chore: sync all submodules with latest main"
```

## Troubleshooting

### Submodule in Detached HEAD State

```bash
cd modules/chariot
git checkout main  # or your feature branch
git pull origin main
```

### Merge Conflicts in Submodule References

When the super-repo has conflicts in submodule references:

```bash
# Check what commits are in conflict
git status

# Usually, you want to keep the latest
git add modules/chariot
git commit -m "resolve: keep latest chariot reference"
```

### Accidentally Committed Wrong Submodule Reference

```bash
# Reset the submodule to main's reference
git submodule update --init modules/chariot

# Or to completely reset all submodules
git submodule update --init --recursive
```

## Quick Reference Commands

```bash
# Check submodule status
git submodule status

# See what branch each submodule is on
git submodule foreach 'git branch --show-current'

# Fetch updates for all submodules without changing branches
git submodule foreach 'git fetch'

# Show commits in submodule not in main
cd modules/chariot
git log origin/main..HEAD --oneline
```

## Summary

The key principle: **Sync early, sync often**. It's much easier to resolve small conflicts frequently than large conflicts after weeks of divergence.

Remember:

1. Always commit your work first
2. Update your main branch
3. Merge/rebase main into your feature branch
4. Update specific submodules as needed
5. Commit submodule reference changes
6. Push everything

This workflow ensures you stay current with the team's work while maintaining your own development progress.
