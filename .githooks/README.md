# Git Hooks for Chariot Development Platform

## Overview

This directory contains git hooks that enforce development best practices for the super-repository.

## Available Hooks

### pre-commit

**Purpose:** Prevents accidental commits of submodule pointer changes in the super-repo.

**What it blocks:**
- Any staged changes to `modules/*` directories
- Submodule pointer updates

**Why:**
- Submodules should be developed independently in their own repositories
- Submodule pointer changes create merge conflicts and clutter PR history
- Each submodule has its own PR workflow

## Installation

### Automatic Installation (Recommended)

The hooks are automatically installed when you run:

```bash
make setup
```

### Manual Installation

If you need to install or reinstall the hooks manually:

```bash
make install-git-hooks
```

This creates a symbolic link from `.git/hooks/pre-commit` to `.githooks/pre-commit`.

### Verification

To verify the hooks are installed correctly:

```bash
.githooks/verify-hooks.sh
```

If the hook is missing, you'll see a warning with installation instructions.

#### Optional: Automatic Verification on Shell Startup

Add this to your `~/.zshrc` or `~/.bashrc` to automatically check for hooks when you enter the repo:

```bash
# Auto-verify git hooks for chariot-development-platform
if [ -f ".githooks/verify-hooks.sh" ]; then
    .githooks/verify-hooks.sh
fi
```

## Usage

Once installed, the hooks run automatically when you attempt to commit changes.

### If the hook blocks your commit:

```bash
# To unstage submodule changes
git restore --staged modules/*

# To work on submodule code
cd modules/<submodule-name>
git checkout -b feature/my-feature
# Make changes, commit, push
git commit -m "feat: add feature"
git push origin feature/my-feature
# Create PR in the submodule repository
```

## Bypassing Hooks (Not Recommended)

If you absolutely must bypass the hook (requires approval from tech lead):

```bash
git commit --no-verify -m "message"
```

**⚠️ Warning:** Bypassing hooks can lead to merge conflicts and PR issues. Only do this if you have explicit approval.

## Testing the Hook

To verify the hook is working:

```bash
# Try to stage a submodule change
cd modules/chariot
git checkout -b test-branch
touch test-file
git add test-file
cd ../..
git add modules/chariot

# Try to commit (should be blocked)
git commit -m "test commit"

# Clean up
git restore --staged modules/chariot
cd modules/chariot
git checkout -
git branch -D test-branch
```

## Troubleshooting

### Hook not running

1. Check if the hook is installed:
   ```bash
   ls -la .git/hooks/pre-commit
   ```

2. Verify the hook is executable:
   ```bash
   chmod +x .git/hooks/pre-commit
   ```

3. Reinstall the hook:
   ```bash
   make install-git-hooks
   ```

### Hook reports false positives

If the hook is blocking legitimate changes (not submodule changes), please report this issue to the team lead.

## For Team Leads

### Adding New Hooks

1. Create the hook script in `.githooks/`
2. Make it executable: `chmod +x .githooks/hook-name`
3. Update the `install-git-hooks` target in `Makefile`
4. Update this README
5. Test thoroughly before merging

### Removing the Hook

```bash
rm .git/hooks/pre-commit
```

Note: This only removes it locally. New clones will still get the hook via `make setup`.
