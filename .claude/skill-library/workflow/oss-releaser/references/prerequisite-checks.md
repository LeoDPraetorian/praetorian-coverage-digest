# Prerequisite Checks

**Complete validation checklist before starting OSS preparation.**

## Repository State

- [ ] Git working directory is clean (no uncommitted changes)
- [ ] On correct branch (typically main/master)
- [ ] Backup branch created
- [ ] Synced with remote (git fetch)

## Required Tools

- [ ] `git` available
- [ ] `gh` CLI installed and authenticated (`gh auth status`)
- [ ] `gitleaks` or equivalent secret scanner
- [ ] Language-specific tools (go, python3, node, rustc)

## Repository Structure

- [ ] Identified submodules (if any, require separate OSS prep)
- [ ] Detected primary language(s)
- [ ] Identified build system (Makefile, package.json, Cargo.toml, go.mod)
- [ ] Located test directory structure

## Legal/Compliance

- [ ] Confirmed Apache 2.0 is appropriate license
- [ ] Verified no proprietary dependencies that block OSS release
- [ ] Confirmed no customer data or sensitive examples in codebase
- [ ] Legal team approval obtained (if required by organization)

## Technical Readiness

- [ ] Build passes from clean checkout
- [ ] Tests pass
- [ ] Documentation is current
- [ ] No hardcoded production credentials
- [ ] No internal API endpoints or infrastructure references

## Backup Protocol

Before making ANY modifications:

```bash
# Create backup branch
git checkout -b backup/pre-oss-release-$(date +%Y%m%d)
git push origin backup/pre-oss-release-$(date +%Y%m%d)

# Return to working branch
git checkout -
```

This ensures you can easily revert if needed.
