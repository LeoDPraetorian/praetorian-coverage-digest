# Search Command Examples

Complete reference for exhaustive codebase search commands used in reuse discovery.

## Module Structure Context

Chariot development platform modules:

- `modules/chariot/backend/` - Go Lambda handlers, services, repositories
- `modules/chariot/ui/` - React TypeScript frontend
- `modules/janus/` - Security tool orchestration framework
- `modules/nebula/` - Multi-cloud security scanner
- `modules/aegiscli/` - Velociraptor-based security orchestration
- `modules/tabularium/` - Universal data schema
- `modules/praetorian-cli/` - Python CLI and SDK

## Go Backend Searches

### Handler Patterns

```bash
# Find all handlers
grep -r "type.*Handler.*struct" modules/*/backend/pkg/handler/ -l

# Find handler methods
grep -r "func.*Handle\(" modules/*/backend/pkg/handler/ -l

# Find specific entity handlers
grep -r "AssetHandler" modules/*/backend/pkg/ -l
grep -r "RiskHandler" modules/*/backend/pkg/ -l
```

### Service Patterns

```bash
# Find service interfaces
grep -r "type.*Service interface" modules/*/backend/pkg/service/ -l

# Find service implementations
grep -r "type.*Service struct" modules/*/backend/pkg/service/ -l

# Find specific service methods
grep -r "func.*Create\(" modules/*/backend/pkg/service/ -l
grep -r "func.*Update\(" modules/*/backend/pkg/service/ -l
```

### Repository Patterns

```bash
# Find repository interfaces
grep -r "type.*Repository interface" modules/*/backend/pkg/repository/ -l

# Find DynamoDB repositories
grep -r "dynamodb" modules/*/backend/pkg/repository/ -l

# Find specific CRUD operations
grep -r "func.*GetBy" modules/*/backend/pkg/repository/ -l
grep -r "func.*List" modules/*/backend/pkg/repository/ -l
```

## React Frontend Searches

### Custom Hooks

```bash
# Find all custom hooks
grep -r "export.*function use" modules/*/ui/src/hooks/ -l

# Find TanStack Query hooks
grep -r "useQuery" modules/*/ui/src/hooks/ -l
grep -r "useMutation" modules/*/ui/src/hooks/ -l

# Find specific entity hooks
grep -r "useAssets" modules/*/ui/src/ -l
grep -r "useRisks" modules/*/ui/src/ -l
```

### Components

```bash
# Find specific component types
grep -r "export.*Component" modules/*/ui/src/components/ -l

# Find components by pattern
grep -r "interface.*Props" modules/*/ui/src/components/ -l

# Find form components
grep -r "useForm" modules/*/ui/src/ -l
grep -r "zodResolver" modules/*/ui/src/ -l
```

### State Management

```bash
# Find Zustand stores
grep -r "create<" modules/*/ui/src/stores/ -l

# Find Context providers
grep -r "createContext" modules/*/ui/src/ -l
```

## Python CLI Searches

```bash
# Find Click commands
grep -r "@click.command" modules/praetorian-cli/ -l

# Find API clients
grep -r "class.*Client" modules/praetorian-cli/ -l

# Find Lambda handlers
grep -r "def lambda_handler" modules/*/backend/lambdas/ -l
```

## Cross-Cutting Searches

### By File Name

```bash
# Find by entity name
find modules/ -name "*asset*" -type f
find modules/ -name "*risk*" -type f
find modules/ -name "*job*" -type f

# Find by feature
find modules/ -name "*filter*" -type f
find modules/ -name "*search*" -type f
find modules/ -name "*export*" -type f
```

### Documentation

```bash
# Find architecture docs
find modules/ -path "*/docs/*" -name "*.md" -type f

# Find CLAUDE.md files
find modules/ -name "CLAUDE.md" -type f

# Search docs for concepts
grep -r "Handler.*pattern" modules/*/docs/ -l
grep -r "Repository.*pattern" modules/*/docs/ -l
```

### Test Files

```bash
# Find Go tests
find modules/ -name "*_test.go" -type f

# Find TypeScript tests
find modules/ -name "*.test.ts" -o -name "*.test.tsx" -type f

# Find Python tests
find modules/ -name "test_*.py" -type f
```

## Advanced Search Techniques

### Combining Searches

```bash
# Find handlers AND their tests
for file in $(grep -r "type.*Handler.*struct" modules/*/backend/pkg/handler/ -l); do
    testfile="${file%%.go}_test.go"
    if [ -f "$testfile" ]; then
        echo "Handler: $file"
        echo "Test: $testfile"
    fi
done
```

### Search with Context

```bash
# Show surrounding lines for context
grep -r -A 5 -B 5 "pattern" modules/*/backend/pkg/

# Count occurrences
grep -r "pattern" modules/ | wc -l
```

### Exclude Patterns

```bash
# Exclude vendor and node_modules
grep -r "pattern" modules/ --exclude-dir=vendor --exclude-dir=node_modules -l

# Exclude test files
grep -r "pattern" modules/ --exclude="*_test.go" -l
```

## Documentation Requirements

When documenting search results, include:

```bash
# Example output format
grep -r "AssetHandler" modules/chariot/backend/pkg/ -l
# Found: 12 files
# modules/chariot/backend/pkg/handler/asset/handler.go
# modules/chariot/backend/pkg/handler/asset/create.go
# modules/chariot/backend/pkg/handler/asset/update.go
# ...
```

## Troubleshooting

### No Results Found

If searches return nothing:

1. Verify you're in the repo root
2. Check module structure hasn't changed
3. Try broader search terms
4. Search file names instead of content
5. Check if code is in different module

### Too Many Results

If searches return hundreds of files:

1. Add file type filters (`--include="*.go"`)
2. Narrow to specific directories
3. Add more specific patterns
4. Use AND logic with multiple greps

### Performance Issues

If searches are slow:

1. Limit depth with `-maxdepth` in find
2. Exclude large directories (vendor, node_modules)
3. Search specific modules instead of all
4. Use ripgrep (`rg`) instead of grep for speed
