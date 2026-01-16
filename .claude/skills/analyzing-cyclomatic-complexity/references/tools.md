# Cyclomatic Complexity - Measurement Tools

## Multi-Language Tools

### Lizard (Recommended for Polyglot Codebases)

**Supports**: Python, JavaScript, TypeScript, Go, C/C++, Java, Swift, Rust, and 20+ more

**Installation:**

```bash
# NPM (project-local)
npm install --save-dev lizard

# Global
npm install -g lizard

# Python (alternative)
pip install lizard
```

**Basic usage:**

```bash
# Single file
npx lizard path/to/file.ts --CCN 10

# Directory
npx lizard src/ --CCN 10

# With detailed output
npx lizard src/ --CCN 10 --verbose

# Export to CSV
npx lizard src/ --csv > complexity-report.csv
```

**CI/CD integration:**

```yaml
# .github/workflows/quality.yml
- name: Check Cyclomatic Complexity
  run: |
    npx lizard src/ --CCN 15 --warning_msvs_style
    if [ $? -ne 0 ]; then
      echo "Complexity threshold exceeded"
      exit 1
    fi
```

**Configuration** (`.lizard.yml`):

```yaml
thresholds:
  CCN: 10
  length: 100
  parameter_count: 5

exclude:
  - "*.test.ts"
  - "test/"
  - "node_modules/"

languages:
  - javascript
  - typescript
  - go
```

## JavaScript/TypeScript Tools

### ESLint

**Installation:**

```bash
npm install --save-dev eslint
```

**Configuration** (`.eslintrc.js`):

```javascript
module.exports = {
  rules: {
    complexity: ["error", { max: 10 }],
  },
};
```

**Usage:**

```bash
# Lint with complexity check
npx eslint src/

# Auto-fix other issues, report complexity
npx eslint --fix src/
```

### cyclomatic-complexity (npm)

**Installation:**

```bash
npm install --save-dev cyclomatic-complexity
```

**Usage:**

```bash
npx cyclomatic-complexity 'src/**/*.ts'
```

### TypeScript Compiler Integration

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strictNullChecks": true
  },
  "plugins": [
    {
      "name": "typescript-eslint-language-service",
      "complexity": { "max": 10 }
    }
  ]
}
```

## Go Tools

### gocyclo

**Installation:**

```bash
go install github.com/fzipp/gocyclo/cmd/gocyclo@latest
```

**Usage:**

```bash
# Check entire project
gocyclo -over 10 .

# Check specific package
gocyclo -over 10 ./pkg/handler/

# Top 10 most complex functions
gocyclo -top 10 .

# Output as JSON
gocyclo -over 10 -json . > complexity.json
```

### golangci-lint (with cyclop)

**Installation:**

```bash
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin
```

**Configuration** (`.golangci.yml`):

```yaml
linters:
  enable:
    - cyclop
    - gocyclo

linters-settings:
  cyclop:
    max-complexity: 10
    skip-tests: true

  gocyclo:
    min-complexity: 10
```

**Usage:**

```bash
golangci-lint run
```

## Python Tools

### radon

**Installation:**

```bash
pip install radon
```

**Usage:**

```bash
# Cyclomatic complexity
radon cc path/to/code.py -s

# Show only complex functions
radon cc path/to/code.py -n C

# JSON output
radon cc path/to/code.py -j

# Maintainability Index
radon mi path/to/code.py
```

**Complexity grades:**

- **A**: 1-5 (simple)
- **B**: 6-10 (well-structured)
- **C**: 11-20 (moderate)
- **D**: 21-50 (high)
- **F**: 51+ (unmaintainable)

### flake8-complexity

**Installation:**

```bash
pip install flake8 mccabe
```

**Configuration** (`setup.cfg` or `.flake8`):

```ini
[flake8]
max-complexity = 10
exclude = tests/,venv/
```

**Usage:**

```bash
flake8 src/
```

## CI/CD Integration Examples

### GitHub Actions

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  complexity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install Lizard
        run: npm install -g lizard

      - name: Check Complexity
        run: |
          lizard src/ --CCN 15 --warning_msvs_style | tee complexity-report.txt
          if grep -q "warning:" complexity-report.txt; then
            echo "::warning::Complexity warnings found"
          fi
          if lizard src/ --CCN 25 | grep -q "error:"; then
            echo "::error::Complexity threshold exceeded (>25)"
            exit 1
          fi

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: complexity-report
          path: complexity-report.txt
```

### GitLab CI

```yaml
complexity-check:
  stage: test
  image: node:18
  script:
    - npm install -g lizard
    - lizard src/ --CCN 15 --csv > complexity-report.csv
  artifacts:
    reports:
      metrics: complexity-report.csv
    when: always
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

### Pre-commit Hook

**`.husky/pre-commit`:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Checking cyclomatic complexity..."

# Get list of changed files
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')

if [ -n "$CHANGED_FILES" ]; then
  echo "$CHANGED_FILES" | xargs npx lizard --CCN 15
  if [ $? -ne 0 ]; then
    echo "❌ Complexity check failed. Please refactor before committing."
    exit 1
  fi
  echo "✅ Complexity check passed"
fi
```

## IDE Integration

### VS Code

**Extensions:**

1. **CodeMetrics** - Real-time complexity display

   ```json
   // settings.json
   {
     "codemetrics.basics.ComplexityLevelExtreme": 15,
     "codemetrics.basics.ComplexityLevelHigh": 10,
     "codemetrics.basics.ComplexityLevelNormal": 5
   }
   ```

2. **ESLint** - Inline warnings
   ```json
   {
     "eslint.rules.customizations": [{ "rule": "complexity", "severity": "warn" }]
   }
   ```

### JetBrains IDEs (IntelliJ, GoLand, WebStorm)

**Built-in complexity analysis:**

1. Right-click file/directory
2. Analyze → Inspect Code
3. Under "Metrics" → "Overly complex method"

**Configuration:**

- Settings → Editor → Inspections → Metrics
- Set "Cyclomatic complexity" threshold

### Vim/Neovim

**ALE (Asynchronous Lint Engine):**

```vim
let g:ale_linters = {
\   'javascript': ['eslint'],
\   'typescript': ['eslint'],
\   'go': ['gocyclo'],
\   'python': ['flake8'],
\}

let g:ale_go_gocyclo_min_complexity = 10
```

## Chariot-Specific Setup

### Backend (Go)

**`.golangci.yml` in `modules/chariot/backend/`:**

```yaml
linters:
  enable:
    - cyclop
    - gocyclo
    - gocognit

linters-settings:
  cyclop:
    max-complexity: 10
    skip-tests: true

  gocognit:
    min-complexity: 15
```

### Frontend (React/TypeScript)

**`.eslintrc.js` in `modules/chariot/ui/`:**

```javascript
module.exports = {
  extends: ["@chariot/eslint-config"],
  rules: {
    complexity: ["warn", { max: 10 }],
  },
  overrides: [
    {
      files: ["*.test.ts", "*.test.tsx"],
      rules: {
        complexity: "off", // Allow complex tests
      },
    },
  ],
};
```

### Makefile Targets

**Root `Makefile`:**

```makefile
.PHONY: complexity-check
complexity-check:
	@echo "Checking backend complexity..."
	cd modules/chariot/backend && golangci-lint run
	@echo "Checking frontend complexity..."
	cd modules/chariot/ui && npx eslint src/

.PHONY: complexity-report
complexity-report:
	@echo "Generating complexity report..."
	npx lizard modules/chariot/backend --CCN 10 --csv > complexity-backend.csv
	npx lizard modules/chariot/ui/src --CCN 10 --csv > complexity-frontend.csv
	@echo "Reports generated: complexity-*.csv"
```

## Tool Comparison Matrix

| Tool              | Languages | CCN Threshold | CI/CD         | IDE Integration | License         |
| ----------------- | --------- | ------------- | ------------- | --------------- | --------------- |
| **Lizard**        | 20+       | Configurable  | ✅ Easy       | ❌ Limited      | MIT             |
| **ESLint**        | JS/TS     | Configurable  | ✅ Easy       | ✅ Excellent    | MIT             |
| **gocyclo**       | Go        | Default 10    | ✅ Easy       | ⚠️ Moderate     | BSD             |
| **golangci-lint** | Go        | Configurable  | ✅ Easy       | ✅ Good         | GPL-3           |
| **radon**         | Python    | No default    | ✅ Easy       | ❌ Limited      | MIT             |
| **SonarQube**     | 25+       | Configurable  | ✅ Enterprise | ✅ Excellent    | LGPL/Commercial |
| **CodeClimate**   | 20+       | Configurable  | ✅ SaaS       | ✅ Good         | Commercial      |

## Troubleshooting

### "Tool reports different values than expected"

**Common causes:**

1. Different boolean operator counting
2. Include/exclude patterns
3. Language version differences

**Solution**: Run with `--verbose` or `--debug` flag to see calculation details

### "CI check passes locally but fails in pipeline"

**Causes:**

- Different tool versions
- Different file sets (gitignored files)
- Different configuration files

**Solution**:

```bash
# Lock tool versions
npm install --save-dev lizard@exact-version

# Verify same files checked
git ls-files '*.ts' | xargs lizard --CCN 10
```

### "Performance issues with large codebases"

**Solutions:**

1. **Cache results**: Only check changed files
2. **Parallel execution**: Use tools with parallel support
3. **Incremental checks**: Check per-module instead of monorepo root

## References

- [Lizard GitHub](https://github.com/terryyin/lizard)
- [ESLint Complexity Rule](https://eslint.org/docs/latest/rules/complexity)
- [gocyclo GitHub](https://github.com/fzipp/gocyclo)
- [radon Documentation](https://radon.readthedocs.io/)
