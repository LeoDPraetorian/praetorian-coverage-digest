---
name: github-workflow-automation
description: Use when automating GitHub Actions workflows, implementing CI/CD pipelines, coordinating multi-job workflows, or managing repository operations with gh CLI
allowed-tools: Read, Grep, Bash, TodoWrite, Write
---

# GitHub Workflow Automation

Comprehensive GitHub Actions automation with workflow orchestration, CI/CD pipelines, and repository management using gh CLI.

---

## Quick Start

### Initialize Workflow

```bash
# Create workflow directory
mkdir -p .github/workflows

# Generate basic CI workflow
cat > .github/workflows/ci.yml << 'EOF'
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
EOF
```

### Common gh CLI Commands

```bash
# Create PR
gh pr create --title "Feature" --body "Description"

# View workflow runs
gh run list --workflow ci.yml

# View run details
gh run view <run-id>

# Rerun failed jobs
gh run rerun <run-id> --failed

# Create issue
gh issue create --title "Bug" --body "Description" --label "bug"
```

---

## Core Workflow Patterns

### Pattern 1: Multi-Job Workflow with Dependencies

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup
        run: npm install

  test:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
        run: npm test

  deploy:
    needs: [setup, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: npm run deploy
```

**Key**: Use `needs` for job dependencies, `if` for conditional execution

### Pattern 2: Matrix Strategy for Parallel Testing

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, macos-latest]
      max-parallel: 3
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node ${{ matrix.node }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
```

**Benefits**: Test multiple configurations in parallel

### Pattern 3: Reusable Workflows

```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow
on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm test

# .github/workflows/main.yml
jobs:
  test-node-18:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '18'
```

**Benefits**: DRY principle, shared workflows across repos

### Pattern 4: Caching for Performance

```yaml
steps:
  - uses: actions/checkout@v3

  - name: Cache dependencies
    uses: actions/cache@v3
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      restore-keys: |
        ${{ runner.os }}-node-

  - run: npm install
  - run: npm test
```

**Benefits**: Faster builds, reduced bandwidth

---

## Workflow Triggers

### Common Triggers

```yaml
# Push to specific branches
on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'package.json'

# Pull requests
on:
  pull_request:
    types: [opened, synchronize, reopened]

# Schedule (cron)
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

# Manual trigger
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'staging'
```

### Trigger Best Practices

- Use `paths` to run only when relevant files change
- Use `types` to control PR events
- Use `workflow_dispatch` for manual runs
- Use `schedule` for periodic tasks

---

## Security Best Practices

### Store Secrets Securely

```yaml
- name: Deploy
  env:
    API_KEY: ${{ secrets.API_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: npm run deploy
```

### Use OIDC Authentication

```yaml
permissions:
  id-token: write
  contents: read

- name: Configure AWS
  uses: aws-actions/configure-aws-credentials@v2
  with:
    role-to-assume: arn:aws:iam::123456789012:role/GitHubAction
    aws-region: us-east-1
```

### Implement Least-Privilege

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

**Never**: Grant write permissions to untrusted code

---

## Performance Optimization

### Cache Dependencies

```yaml
- uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

### Use Appropriate Runners

```yaml
jobs:
  heavy-task:
    runs-on: ubuntu-latest-4-cores # More resources
```

### Early Termination

```yaml
- name: Quick Check
  run: |
    if ! npm run lint; then
      echo "Lint failed, terminating"
      exit 1
    fi
```

### Parallel Execution

```yaml
strategy:
  matrix:
    task: [test, lint, security]
  max-parallel: 3
```

---

## Debugging Workflows

### Enable Debug Logging

```yaml
- name: Debug
  run: echo "Debugging step"
  env:
    ACTIONS_STEP_DEBUG: true
```

### View Run Logs

```bash
# View specific run
gh run view <run-id> --log

# Download logs
gh run download <run-id>

# View failed steps
gh run view <run-id> --log-failed
```

### Analyze Failures

```bash
# View run with details
gh run view <run-id> --json jobs,conclusion

# Rerun failed jobs
gh run rerun <run-id> --failed

# Watch run in progress
gh run watch <run-id>
```

---

## gh CLI Reference

### Repository Operations

```bash
# Clone
gh repo clone owner/repo

# Create
gh repo create my-repo --public

# View
gh repo view owner/repo

# Set default
gh repo set-default
```

### PR Operations

```bash
# Create
gh pr create --title "Fix" --body "Description"

# List
gh pr list --state open

# View
gh pr view 123

# Merge
gh pr merge 123 --squash

# Comment
gh pr comment 123 --body "Looks good"

# Review
gh pr review 123 --approve
gh pr review 123 --comment --body "Needs changes"
```

### Issue Operations

```bash
# Create
gh issue create --title "Bug" --body "Description" --label "bug"

# List
gh issue list --label "bug"

# Close
gh issue close 456

# Comment
gh issue comment 456 --body "Fixed in PR #123"
```

### Workflow Operations

```bash
# List workflows
gh workflow list

# View runs
gh run list --workflow ci.yml

# View run
gh run view <run-id>

# Rerun
gh run rerun <run-id>

# Watch
gh run watch
```

---

## Common Workflow Examples

### Example 1: Full CI/CD Pipeline

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm install
      - run: npm test

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
```

### Example 2: Security Scanning

```yaml
name: Security Scan
on:
  push:
  schedule:
    - cron: "0 0 * * *"

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run security scan
        run: npm audit

      - name: SAST scan
        uses: github/codeql-action/analyze@v2

      - name: Create issues for vulnerabilities
        if: failure()
        run: |
          gh issue create \
            --title "Security vulnerabilities found" \
            --label "security"
```

### Example 3: Monorepo Testing

```yaml
name: Monorepo CI
on: push

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.detect.outputs.packages }}
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - id: detect
        run: |
          # Detect changed packages
          PACKAGES=$(git diff --name-only HEAD~1 HEAD | \
            grep '^packages/' | cut -d/ -f2 | sort -u | jq -R -s -c 'split("\n")[:-1]')
          echo "packages=${PACKAGES}" >> $GITHUB_OUTPUT

  test-packages:
    needs: detect-changes
    if: needs.detect-changes.outputs.packages != '[]'
    strategy:
      matrix:
        package: ${{ fromJson(needs.detect-changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test --workspace=packages/${{ matrix.package }}
```

---

## Troubleshooting

### Workflow Not Triggering

**Check**:

- Workflow file in `.github/workflows/`
- Valid YAML syntax
- Trigger conditions match event
- Actions enabled on repository

### Jobs Failing

```bash
# View failure details
gh run view <run-id> --log-failed

# Check job status
gh run view <run-id> --json jobs

# Rerun failed
gh run rerun <run-id> --failed
```

### Permission Errors

```yaml
# Add required permissions
permissions:
  contents: write
  pull-requests: write
```

---

## Best Practices Summary

### ✅ Do This

1. **Use caching** for dependencies
2. **Implement parallelization** with matrix strategy
3. **Set timeouts** on jobs and steps
4. **Store secrets** in repository/organization secrets
5. **Use OIDC** for cloud authentication
6. **Implement least-privilege** permissions
7. **Cache dependencies** for faster builds
8. **Use `needs`** for job dependencies

### ❌ Don't Do This

1. **Don't hardcode secrets** in workflows
2. **Don't use `*` branches** without paths filtering
3. **Don't skip security** scanning
4. **Don't run tests** sequentially if they can be parallel
5. **Don't forget timeouts** (default is 6 hours)
6. **Don't grant excessive** permissions

---

## Related Resources

### Official Documentation

- **GitHub CLI**: https://cli.github.com/manual/
- **GitHub Actions**: https://docs.github.com/en/actions
- **Workflow Syntax**: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

### Related Skills

- **ci-cd-optimization** - Pipeline optimization
- **release-coordination** - Release automation
- **github-pr-enhancement** - Advanced PR management
