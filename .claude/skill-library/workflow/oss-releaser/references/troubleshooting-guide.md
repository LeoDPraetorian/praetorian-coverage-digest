# Troubleshooting Guide

**Common issues and solutions during OSS release preparation.**

## GitHub CLI Issues

### `gh: command not found`

**Solution:**
```bash
# macOS
brew install gh

# Linux (Debian/Ubuntu)
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### `gh: not authenticated`

**Solution:**
```bash
gh auth login
# Follow prompts to authenticate
```

## Copyright Header Issues

### Duplicate headers after re-run

**Cause:** Non-idempotent script

**Solution:**
```bash
# Always check before adding
if head -3 "$file" | grep -q "Copyright.*Praetorian"; then
  echo "Already has header"
  return 0
fi
```

### Headers break syntax

**Cause:** Not handling shebang/encoding lines

**Solution:**
```bash
# Check for shebang
if head -1 "$file" | grep -q "^#!"; then
  # Insert after shebang
  ...
fi
```

## Secret Scanner Issues

### Too many false positives

**Solution:** Create `.noseyparker.ignore`:
```
# Test fixtures
tests/fixtures/
testdata/

# Documentation
docs/
*.md

# Templates
*.example
.env.example
```

### Scanner not installed

```bash
# Install noseyparker
brew install noseyparker

# Or using Cargo
cargo install noseyparker

# Verify installation
noseyparker --version
```

### Datastore already exists error

```bash
# Remove old datastore
rm -rf np-datastore

# Or use timestamped name
noseyparker scan --datastore np-datastore-$(date +%Y%m%d) .
```

## Git Issues

### Uncommitted changes block preparation

**Solution:**
```bash
# Stash changes
git stash

# Run OSS preparation

# Restore changes
git stash pop
```

### Submodules cause issues

**Cause:** Submodules need separate OSS preparation

**Solution:**
Each submodule is a separate repository and needs its own OSS release preparation.

## CONTRIBUTING.md Issues

### Template doesn't match project

**Cause:** Generic template without customization

**Solution:** Detect tech stack and customize:
```bash
if [ -f go.mod ]; then
  use_go_template
elif [ -f package.json ]; then
  use_node_template
fi
```

### Commands in CONTRIBUTING.md don't work

**Cause:** Template from different project

**Solution:** Test every command in a clean environment before finalizing
