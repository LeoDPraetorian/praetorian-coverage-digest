---
name: vitest-prepush-testing
description: Use when configuring pre-push hooks with Vitest to test commits being pushed. Fixes the common pitfall where 'vitest --changed' without a git reference finds zero files after commit, making hooks ineffective. Documents stdin parsing, base ref detection, and proper --changed flag usage.
license: MIT
allowed-tools: [Read, Edit, Write, Bash, Grep]
metadata:
  version: 1.0.0
  platform: chariot
  domains: [testing, vitest, git-hooks, ci-cd, frontend]
  last-updated: 2025-12-24
  author: Chariot Platform Team
  related-skills: [verifying-vitest-test-integrity, frontend-testing-patterns]
---

# Vitest Pre-Push Testing

**Integrate Vitest with git pre-push hooks to run tests affected by commits being pushed.**

**You MUST use TodoWrite** when implementing pre-push hooks to track all configuration steps.

---

## The Problem

Pre-push hooks that use `vitest --changed --run` are **ineffective** because:

1. `--changed` without arguments compares **working tree to HEAD**
2. After `git commit`, the working tree is **clean** (no uncommitted changes)
3. Vitest finds **zero changed files** and exits with "No test files found"
4. The hook passes, allowing regressions to slip through

```bash
# BROKEN: This is a no-op after commit
npm run test:changed  # vitest --changed --run

# Output after commit:
# No test files found, exiting with code 0
```

## The Solution

Pass a **git reference** to `--changed` that represents the base commit:

```bash
# WORKING: Compare HEAD against remote SHA
npx vitest --changed origin/main --run
npx vitest --changed $REMOTE_SHA --run
```

---

## Quick Reference

| Scenario                | Base Reference        | Command                              |
| ----------------------- | --------------------- | ------------------------------------ |
| Push to existing branch | Remote SHA from stdin | `vitest --changed $remote_sha --run` |
| Push new branch         | `origin/main`         | `vitest --changed origin/main --run` |
| Delete branch           | Skip                  | No tests needed                      |
| Manual testing          | Target branch         | `vitest --changed origin/main --run` |

---

## Vitest --changed Flag Behavior

### Without Arguments (BROKEN for pre-push)

```bash
vitest --changed --run
```

- Compares: **Working tree** vs **HEAD**
- Detects: Uncommitted changes only (staged + unstaged)
- After commit: Finds **zero files** (working tree is clean)

### With Git Reference (CORRECT)

```bash
vitest --changed origin/main --run
vitest --changed HEAD~3 --run
vitest --changed abc123def --run
```

- Compares: **HEAD** vs **specified reference**
- Detects: All files changed between the two commits
- After commit: Finds **all files in pushed commits**

---

## Git Pre-Push Hook stdin Format

Git passes information about what's being pushed via stdin:

```
<local-ref> SP <local-sha> SP <remote-ref> SP <remote-sha> LF
```

### Example stdin Lines

```bash
# Pushing existing branch (has remote tracking)
refs/heads/feature/my-feature abc123 refs/heads/feature/my-feature def456

# Pushing new branch (no remote yet)
refs/heads/feature/new-branch abc123 refs/heads/feature/new-branch 0000000000000000000000000000000000000000

# Deleting branch
(delete) 0000000000000000000000000000000000000000 refs/heads/old-branch def456
```

### Special SHA Values

| SHA                    | Meaning                                                 |
| ---------------------- | ------------------------------------------------------- |
| 40 zeros (`000...000`) | Branch doesn't exist on remote (new branch or deletion) |
| Normal SHA             | Commit exists on remote                                 |

---

## Working Pre-Push Hook

**File:** `.husky/pre-push` (or `.githooks/pre-push`)

```bash
#!/usr/bin/env sh

# Pre-push hook: Run tests for commits being pushed
cd "$(dirname "$0")/.." || exit 1

echo "Running TypeScript type check..."
npm run ts || exit 1

# Read stdin to determine what commits are being pushed
# Format: <local-ref> <local-sha> <remote-ref> <remote-sha>
z40=0000000000000000000000000000000000000000
base_ref=""

while read local_ref local_sha remote_ref remote_sha; do
    if [ "$local_sha" = "$z40" ]; then
        # Deleting a branch, nothing to test
        continue
    fi

    if [ "$remote_sha" = "$z40" ]; then
        # New branch - compare against origin/main (or origin/master as fallback)
        if git rev-parse --verify origin/main >/dev/null 2>&1; then
            base_ref="origin/main"
        elif git rev-parse --verify origin/master >/dev/null 2>&1; then
            base_ref="origin/master"
        else
            echo "Could not determine base branch, running all tests..."
            npm run test:run || exit 1
            exit 0
        fi
    else
        # Existing branch - compare against the remote SHA
        base_ref="$remote_sha"
    fi
    break  # Only process the first ref (most common case)
done

if [ -z "$base_ref" ]; then
    echo "No commits to push, skipping tests."
    exit 0
fi

echo "Running tests for changes since $base_ref..."
npx vitest --changed "$base_ref" --run --exclude='e2e/**' || exit 1

echo "Pre-push checks passed!"
```

---

## Verification Commands

### Test the Hook Logic

```bash
# Simulate existing branch push
echo "refs/heads/feature abc123 refs/heads/feature def456" | .husky/pre-push

# Simulate new branch push
echo "refs/heads/new abc123 refs/heads/new 0000000000000000000000000000000000000000" | .husky/pre-push
```

### Verify Vitest Finds Tests

```bash
# Should find tests (replace with your base ref)
npx vitest --changed origin/main --run --exclude='e2e/**'

# Should find ZERO tests (broken approach)
npx vitest --changed --run --exclude='e2e/**'
```

### Check Files Changed

```bash
# See what files would be tested
git diff --name-only origin/main..HEAD
```

---

## Troubleshooting

### "No test files found, exiting with code 0"

**Cause:** Using `--changed` without a git reference after committing.

**Fix:** Pass a base reference:

```bash
# Instead of:
vitest --changed --run

# Use:
vitest --changed origin/main --run
```

### Hook Doesn't Receive stdin

**Cause:** Running hook manually without piping stdin.

**Fix:** Simulate stdin when testing:

```bash
echo "refs/heads/main abc123 refs/heads/main def456" | .husky/pre-push
```

### "fatal: bad revision 'origin/main'"

**Cause:** Remote branch doesn't exist locally.

**Fix:** Fetch first or use fallback:

```bash
git fetch origin
# Or in hook, add fallback to origin/master or HEAD~1
```

### Tests Run But Miss Some Changes

**Cause:** Vitest's change detection uses module graph analysis, not just git diff.

**Behavior:** Only tests that import changed modules (directly or transitively) will run.

**Verify:** Check what files changed vs what tests ran:

```bash
git diff --name-only origin/main..HEAD
npx vitest --changed origin/main --run --reporter=verbose
```

---

## Common Gotchas

### 1. npm script indirection hides the problem

```json
{
  "scripts": {
    "test:changed": "vitest --changed --run" // BROKEN
  }
}
```

The script looks correct but fails silently after commit.

### 2. Hook must read stdin even if only using first ref

Git may send multiple lines (e.g., pushing multiple branches). The `while read` loop handles this.

### 3. Don't use --changed in CI pipelines

CI typically checks out a specific commit without local changes. Use explicit refs:

```bash
# CI: Compare against target branch
vitest --changed origin/$TARGET_BRANCH --run
```

### 4. Husky v9+ requires different setup

```bash
# Husky v9+ initialization
npx husky init
echo 'npx vitest --changed origin/main --run' > .husky/pre-push
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest --exclude='e2e/**'",
    "test:run": "vitest run --exclude='e2e/**'",
    "test:changed:branch": "vitest --changed origin/main --run --exclude='e2e/**'",
    "prepare": "cd .. && git config core.hooksPath ui/.husky || true"
  }
}
```

**Note:** `test:changed` without a ref is only useful during development with uncommitted changes.

---

## References

- [Vitest CLI Documentation](https://vitest.dev/guide/cli.html) - Official --changed flag docs
- [Git Hooks Documentation](https://git-scm.com/docs/githooks#_pre_push) - Pre-push stdin format
- [references/stdin-parsing.md](references/stdin-parsing.md) - Detailed stdin parsing examples
- [references/ci-integration.md](references/ci-integration.md) - CI/CD pipeline patterns

---

## Related Skills

- **verifying-vitest-test-integrity** - Ensuring tests validate production code
- **frontend-testing-patterns** - Vitest configuration and setup
- **gateway-testing** - Testing skill discovery gateway
