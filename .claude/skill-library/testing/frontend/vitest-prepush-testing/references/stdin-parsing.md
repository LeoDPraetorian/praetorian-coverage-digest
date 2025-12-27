# Git Pre-Push stdin Parsing

Detailed examples and edge cases for parsing git pre-push hook stdin.

## stdin Format Specification

From [git-scm.com/docs/githooks](https://git-scm.com/docs/githooks#_pre_push):

```
<local-ref> SP <local-object-name> SP <remote-ref> SP <remote-object-name> LF
```

- `SP` = space character
- `LF` = line feed (newline)
- Each line represents one ref being pushed

## Complete Parsing Script

```bash
#!/usr/bin/env sh

z40=0000000000000000000000000000000000000000

while read local_ref local_sha remote_ref remote_sha; do
    echo "=== Processing ref ==="
    echo "  local_ref:  $local_ref"
    echo "  local_sha:  $local_sha"
    echo "  remote_ref: $remote_ref"
    echo "  remote_sha: $remote_sha"

    # Case 1: Deleting a branch
    if [ "$local_sha" = "$z40" ]; then
        echo "  Action: DELETE branch"
        continue
    fi

    # Case 2: Creating new branch
    if [ "$remote_sha" = "$z40" ]; then
        echo "  Action: CREATE new branch"
        echo "  Commits: All commits on $local_ref not in any remote branch"
        continue
    fi

    # Case 3: Updating existing branch
    echo "  Action: UPDATE existing branch"
    echo "  Commits: $remote_sha..$local_sha"
    echo "  Files changed:"
    git diff --name-only "$remote_sha..$local_sha"
done
```

## Example stdin Values

### Pushing to Existing Branch

```bash
# User runs: git push origin feature/my-feature
# stdin received:
refs/heads/feature/my-feature 7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b refs/heads/feature/my-feature 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
```

- `local_ref`: `refs/heads/feature/my-feature`
- `local_sha`: Current HEAD (what you're pushing)
- `remote_ref`: `refs/heads/feature/my-feature`
- `remote_sha`: What remote currently has

**Action:** Test changes from `remote_sha` to `local_sha`

### Pushing New Branch

```bash
# User runs: git push -u origin feature/new-feature
# stdin received:
refs/heads/feature/new-feature 7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b refs/heads/feature/new-feature 0000000000000000000000000000000000000000
```

- `remote_sha`: All zeros (branch doesn't exist on remote)

**Action:** Fall back to comparing against `origin/main`

### Deleting Branch

```bash
# User runs: git push origin --delete old-feature
# stdin received:
(delete) 0000000000000000000000000000000000000000 refs/heads/old-feature 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
```

- `local_ref`: `(delete)`
- `local_sha`: All zeros

**Action:** Skip testing (nothing to test)

### Force Push

```bash
# User runs: git push --force origin feature/rewritten
# stdin received:
refs/heads/feature/rewritten 7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b refs/heads/feature/rewritten 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
```

Same format as regular push. The `--force` flag doesn't change stdin format.

**Note:** Force pushes can have `remote_sha` that's not an ancestor of `local_sha`.

### Pushing Multiple Branches

```bash
# User runs: git push origin feature1 feature2
# stdin received (multiple lines):
refs/heads/feature1 abc123... refs/heads/feature1 def456...
refs/heads/feature2 111222... refs/heads/feature2 333444...
```

**Action:** Process each line in the `while read` loop.

### Pushing Tags

```bash
# User runs: git push origin v1.0.0
# stdin received:
refs/tags/v1.0.0 7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b refs/tags/v1.0.0 0000000000000000000000000000000000000000
```

**Action:** May want to skip testing for tags, or test against the tagged commit.

## Robust Base Ref Detection

```bash
#!/usr/bin/env sh

z40=0000000000000000000000000000000000000000

get_base_ref() {
    local remote_sha="$1"

    if [ "$remote_sha" = "$z40" ]; then
        # New branch - find best base
        if git rev-parse --verify origin/main >/dev/null 2>&1; then
            echo "origin/main"
        elif git rev-parse --verify origin/master >/dev/null 2>&1; then
            echo "origin/master"
        elif git rev-parse --verify main >/dev/null 2>&1; then
            echo "main"
        else
            # Last resort: use parent of first commit
            echo "HEAD~10"  # Arbitrary fallback
        fi
    else
        echo "$remote_sha"
    fi
}

while read local_ref local_sha remote_ref remote_sha; do
    [ "$local_sha" = "$z40" ] && continue  # Skip deletions

    base_ref=$(get_base_ref "$remote_sha")
    echo "Testing changes since: $base_ref"

    npx vitest --changed "$base_ref" --run || exit 1
done
```

## Testing the Parser

```bash
# Create test script
cat > /tmp/test-stdin.sh << 'EOF'
#!/bin/sh
while read local_ref local_sha remote_ref remote_sha; do
    echo "local_ref=$local_ref"
    echo "local_sha=$local_sha"
    echo "remote_ref=$remote_ref"
    echo "remote_sha=$remote_sha"
done
EOF
chmod +x /tmp/test-stdin.sh

# Test cases
echo "refs/heads/main abc123 refs/heads/main def456" | /tmp/test-stdin.sh
echo "refs/heads/new abc123 refs/heads/new 0000000000000000000000000000000000000000" | /tmp/test-stdin.sh
echo "(delete) 0000000000000000000000000000000000000000 refs/heads/old def456" | /tmp/test-stdin.sh
```
