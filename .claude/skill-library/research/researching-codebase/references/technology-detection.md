# Technology Detection Examples

Complete technology detection patterns for common stacks.

## Language Detection Output Examples

### Monorepo with Multiple Languages

```bash
$ find ./modules/chariot -type f \( -name '*.go' -o -name '*.ts' -o -name '*.tsx' \) | sed 's/.*\.//' | sort | uniq -c | sort -rn
   1523 go
    842 ts
    156 tsx
     42 json
```

**Interpretation:** Go-dominant backend with TypeScript/React frontend.

### Pure Go Project

```bash
$ find ./modules/nebula -type f -name '*.go' | sed 's/.*\.//' | sort | uniq -c
   2156 go
```

**Interpretation:** Single-language Go project.

### Python Data Science Project

```bash
$ find ./ml-pipeline -type f \( -name '*.py' -o -name '*.ipynb' \) | sed 's/.*\.//' | sort | uniq -c | sort -rn
    423 py
     87 ipynb
```

**Interpretation:** Python with Jupyter notebooks.

## Framework Detection Examples

### Node.js + React Project

```bash
$ ls package.json go.mod requirements.txt 2>/dev/null
package.json
```

**Interpretation:** JavaScript/TypeScript project with npm/pnpm/yarn.

### Go Module Project

```bash
$ ls package.json go.mod requirements.txt 2>/dev/null
go.mod
```

**Interpretation:** Go project with modules.

### Polyglot Project

```bash
$ ls package.json go.mod requirements.txt 2>/dev/null
go.mod
package.json
requirements.txt
```

**Interpretation:** Multi-language project (Go + Node + Python).

## Monorepo Detection Examples

### PNPM Workspace (JavaScript/TypeScript)

```bash
$ ls pnpm-workspace.yaml go.work lerna.json 2>/dev/null
pnpm-workspace.yaml
```

**Interpretation:** PNPM monorepo with multiple packages.

### Go Workspace

```bash
$ ls pnpm-workspace.yaml go.work lerna.json 2>/dev/null
go.work
```

**Interpretation:** Go monorepo with multiple modules.

### Hybrid Super-Repository

```bash
$ ls pnpm-workspace.yaml go.work lerna.json 2>/dev/null
go.work
pnpm-workspace.yaml
```

**Interpretation:** Super-repo with both Go and Node.js submodules.

## Combining Detection Results

### Example Research Session

**Target:** `./modules/chariot`

**Step 1: Detect languages**

```bash
$ find ./modules/chariot -type f \( -name '*.go' -o -name '*.ts' -o -name '*.tsx' \) | sed 's/.*\.//' | sort | uniq -c | sort -rn
   1523 go
    842 ts
    156 tsx
```

**Step 2: Detect frameworks**

```bash
$ ls ./modules/chariot/package.json ./modules/chariot/go.mod 2>/dev/null
./modules/chariot/go.mod
./modules/chariot/package.json
```

**Step 3: Check structure**

```bash
$ ls -d ./modules/chariot/backend ./modules/chariot/ui 2>/dev/null
./modules/chariot/backend/
./modules/chariot/ui/
```

**Synthesis:**

- **Stack:** Go backend (1523 files) + React/TypeScript frontend (998 files)
- **Frameworks:** Go modules + npm/pnpm
- **Structure:** Organized into `backend/` and `ui/` directories
- **Search strategy:** Use Go templates for backend, TypeScript/React templates for UI

## Stack-Specific Indicators

### Go Project Indicators

- `go.mod` present
- `*.go` files in `pkg/`, `internal/`, `cmd/` directories
- Test files: `*_test.go`

### TypeScript/React Project Indicators

- `package.json` with `react`, `typescript` dependencies
- `*.tsx` files (React components)
- `tsconfig.json` present
- Test files: `*.test.ts`, `*.test.tsx`

### Python Project Indicators

- `requirements.txt` or `Pipfile` or `pyproject.toml`
- `*.py` files
- Test files: `test_*.py` or `*_test.py`

### Rust Project Indicators

- `Cargo.toml` present
- `*.rs` files in `src/` directory
- Test modules in `src/` or `tests/` directory

## Decision Tree

```
1. Run language detection
   → Identify primary language(s) by file count

2. Run framework detection
   → Identify manifest files present

3. Check for monorepo
   → Determine if workspace/multi-module structure

4. Select search templates
   → Use stack-specific patterns from Phase 3
```

This detection phase ensures you use the RIGHT search patterns for the codebase being researched.
