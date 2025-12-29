# CI/CD Integration Patterns

How to use Vitest's `--changed` flag in CI/CD pipelines.

## Key Difference: CI vs Local

| Environment   | Working Tree            | Best Approach                            |
| ------------- | ----------------------- | ---------------------------------------- |
| Local dev     | Has uncommitted changes | `vitest --changed` (no ref)              |
| Pre-push hook | Clean after commit      | `vitest --changed $REMOTE_SHA`           |
| CI pipeline   | Detached HEAD, clean    | `vitest --changed origin/$TARGET_BRANCH` |

## GitHub Actions

### PR Workflow

```yaml
name: Test Changed Files
on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for git diff

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run tests for changed files
        run: |
          # Get the base branch (usually main)
          BASE_REF="origin/${{ github.base_ref }}"

          echo "Testing changes since $BASE_REF"
          npx vitest --changed "$BASE_REF" --run
```

### Push Workflow

```yaml
name: Test on Push
on:
  push:
    branches: [main, "feature/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run tests for pushed changes
        run: |
          # Compare against previous commit
          npx vitest --changed HEAD~1 --run
```

## GitLab CI

```yaml
test:changed:
  stage: test
  script:
    - npm ci
    - |
      if [ "$CI_MERGE_REQUEST_TARGET_BRANCH_NAME" ]; then
        BASE="origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME"
      else
        BASE="HEAD~1"
      fi
      npx vitest --changed "$BASE" --run
  rules:
    - if: $CI_MERGE_REQUEST_IID
    - if: $CI_COMMIT_BRANCH
```

## CircleCI

```yaml
version: 2.1

jobs:
  test-changed:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Test changed files
          command: |
            if [ -n "$CIRCLE_PULL_REQUEST" ]; then
              BASE="origin/main"
            else
              BASE="HEAD~1"
            fi
            npx vitest --changed "$BASE" --run
```

## Important CI Considerations

### 1. Fetch Depth

Always use `fetch-depth: 0` (full history) or at least enough depth to reach the base branch:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0 # Full history
```

Without this, `git diff` and `--changed` won't have the commits to compare.

### 2. Detached HEAD State

CI systems checkout specific commits in detached HEAD state. The `--changed` flag still works because it compares commits, not branch names.

### 3. Merge Commits

For PRs with merge commits, the base ref comparison still works correctly:

```bash
# GitHub Actions
BASE_REF="origin/${{ github.base_ref }}"

# GitLab
BASE_REF="origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME"
```

### 4. Caching

Cache node_modules but NOT the git history:

```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: node-${{ hashFiles('package-lock.json') }}
```

### 5. Fallback for Full Test Suite

When `--changed` finds no tests, consider running full suite:

```bash
#!/bin/bash
set -e

CHANGED_OUTPUT=$(npx vitest --changed origin/main --run 2>&1) || true

if echo "$CHANGED_OUTPUT" | grep -q "No test files found"; then
  echo "No changed tests found, running full suite..."
  npx vitest run
else
  echo "$CHANGED_OUTPUT"
fi
```

## When NOT to Use --changed in CI

1. **Release branches** - Run full test suite
2. **Main branch pushes** - Run full suite for safety
3. **Scheduled/nightly builds** - Run full suite
4. **After dependency updates** - Changes may affect anything

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Determine test strategy
        id: strategy
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "mode=full" >> $GITHUB_OUTPUT
          elif [[ "${{ github.event_name }}" == "schedule" ]]; then
            echo "mode=full" >> $GITHUB_OUTPUT
          else
            echo "mode=changed" >> $GITHUB_OUTPUT
          fi

      - name: Run tests
        run: |
          if [[ "${{ steps.strategy.outputs.mode }}" == "full" ]]; then
            npx vitest run
          else
            npx vitest --changed origin/main --run
          fi
```
