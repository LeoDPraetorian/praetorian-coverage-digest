# Stack-Specific Search Templates

Complete search patterns organized by technology stack.

## Go Codebases

### Handler Patterns

```bash
grep -rn 'func.*Handler' {TARGET_PATH} --include='*.go' -l | head -20
```

**Finds:** HTTP handlers, Lambda handlers, gRPC handlers

**Example matches:**

- `func AssetHandler(ctx context.Context, req events.APIGatewayProxyRequest)`
- `func (s *Service) Handler() http.HandlerFunc`

### Service Structs

```bash
grep -rn 'type.*Service struct' {TARGET_PATH} --include='*.go' -l | head -20
```

**Finds:** Service layer implementations

**Example matches:**

- `type AssetService struct { repo Repository }`
- `type ScanService struct { client *sdk.Client }`

### Repository Interfaces

```bash
grep -rn 'type.*Repository interface' {TARGET_PATH} --include='*.go' -l | head -20
```

**Finds:** Data access layer interfaces

**Example matches:**

- `type AssetRepository interface { Get(id string) (*Asset, error) }`
- `type UserRepository interface { ... }`

### Middleware Functions

```bash
grep -rn 'func.*Middleware' {TARGET_PATH} --include='*.go' -l | head -20
```

**Finds:** HTTP middleware, Lambda middleware

**Example matches:**

- `func AuthMiddleware(next http.Handler) http.Handler`
- `func LoggingMiddleware() lambda.Middleware`

### Test Files

```bash
find {TARGET_PATH} -name '*_test.go' | head -20
```

**Finds:** All Go test files

### Error Types

```bash
grep -rn 'type.*Error struct\|var Err[A-Z]' {TARGET_PATH} --include='*.go' -l | head -20
```

**Finds:** Custom error types and sentinel errors

## TypeScript/React Codebases

### Custom Hooks

```bash
grep -rn 'export.*use[A-Z]' {TARGET_PATH} --include='*.ts' --include='*.tsx' -l | head -20
```

**Finds:** React custom hooks

**Example matches:**

- `export function useAssets() { ... }`
- `export const useAuth = () => { ... }`

### Component Props

```bash
grep -rn 'export.*function.*Props' {TARGET_PATH} --include='*.tsx' -l | head -20
```

**Finds:** React component definitions with Props interfaces

**Example matches:**

- `export function AssetList({ assets, onSelect }: AssetListProps)`
- `export const UserProfile: React.FC<UserProfileProps> = ({ user }) => { ... }`

### TanStack Query Usage

```bash
grep -rn 'useQuery\|useMutation' {TARGET_PATH} --include='*.ts' --include='*.tsx' -l | head -20
```

**Finds:** Data fetching hooks

**Example matches:**

- `const { data, isLoading } = useQuery({ queryKey: ['assets'], queryFn: fetchAssets })`
- `const mutation = useMutation({ mutationFn: updateAsset })`

### Zustand Stores

```bash
grep -rn 'create.*<.*State>' {TARGET_PATH} --include='*.ts' -l | head -20
```

**Finds:** Zustand state stores

**Example matches:**

- `export const useAssetStore = create<AssetState>((set) => ({ ... }))`

### Test Files

```bash
find {TARGET_PATH} -name '*.test.ts' -o -name '*.test.tsx' | head -20
```

**Finds:** Vitest/Jest test files

### Component Patterns

```bash
grep -rn 'export default function\|export const.*: React.FC' {TARGET_PATH} --include='*.tsx' -l | head -20
```

**Finds:** React component exports

## Python Codebases

### Handler/Service Functions

```bash
grep -rn 'def.*handler\|def.*service' {TARGET_PATH} --include='*.py' -l | head -20
```

**Finds:** Entry points and service functions

**Example matches:**

- `def lambda_handler(event, context):`
- `def process_scan_service(scan_id: str):`

### Class-Based Services

```bash
grep -rn 'class.*Service\|class.*Repository' {TARGET_PATH} --include='*.py' -l | head -20
```

**Finds:** Service/repository classes

**Example matches:**

- `class AssetService:`
- `class DynamoDBRepository:`

### Flask/FastAPI Routes

```bash
grep -rn '@app.route\|@router' {TARGET_PATH} --include='*.py' -l | head -20
```

**Finds:** HTTP route decorators

**Example matches:**

- `@app.route('/assets/<asset_id>', methods=['GET'])`
- `@router.get('/assets/{asset_id}')`

### Click CLI Commands

```bash
grep -rn '@click.command\|@click.group' {TARGET_PATH} --include='*.py' -l | head -20
```

**Finds:** CLI command definitions

**Example matches:**

- `@click.command()`
- `@click.group()`

### Test Files

```bash
find {TARGET_PATH} -name 'test_*.py' -o -name '*_test.py' | head -20
```

**Finds:** pytest test files

### Type Hints

```bash
grep -rn 'def.*->.*:\|.*: .*=' {TARGET_PATH} --include='*.py' -l | head -20
```

**Finds:** Functions with type hints

## Rust Codebases

### Public Functions

```bash
grep -rn 'pub fn\|pub async fn' {TARGET_PATH} --include='*.rs' -l | head -20
```

**Finds:** Public function definitions

**Example matches:**

- `pub fn scan_secrets(path: &Path) -> Result<Vec<Secret>, Error>`
- `pub async fn process_job(job: Job) -> Result<(), Error>`

### Trait Implementations

```bash
grep -rn 'impl.*for' {TARGET_PATH} --include='*.rs' -l | head -20
```

**Finds:** Trait implementations

**Example matches:**

- `impl Repository for DynamoDBRepo { ... }`
- `impl<T> Service for ScanService<T> { ... }`

### Struct Definitions

```bash
grep -rn 'struct.*{' {TARGET_PATH} --include='*.rs' -l | head -20
```

**Finds:** Struct definitions

**Example matches:**

- `pub struct Asset { pub id: String, ... }`
- `struct ScanConfig { ... }`

### Error Types

```bash
grep -rn 'enum.*Error\|type.*Result' {TARGET_PATH} --include='*.rs' -l | head -20
```

**Finds:** Error enums and Result type aliases

### Test Modules

```bash
grep -rn '#\[cfg\(test\)\]' {TARGET_PATH} --include='*.rs' -l | head -20
```

**Finds:** Test modules

## Generic Patterns (Any Language)

### Configuration Files

```bash
find {TARGET_PATH} -name 'config.*' -o -name '*.config.*' | head -20
```

**Finds:** Configuration files

### Environment Variables

```bash
grep -rn 'os.Getenv\|process.env\|os.environ' {TARGET_PATH} -l | head -20
```

**Finds:** Environment variable usage

### Database Queries

```bash
grep -rn 'SELECT\|INSERT\|UPDATE\|DELETE' {TARGET_PATH} --include='*.go' --include='*.py' --include='*.ts' -l | head -20
```

**Finds:** SQL queries

### API Endpoints

```bash
grep -rn '/api/\|/v1/\|/v2/' {TARGET_PATH} --include='*.go' --include='*.py' --include='*.ts' -l | head -20
```

**Finds:** API route definitions

## Combining Templates

### Example: Researching Go Handler Patterns

```bash
# Step 1: Find all handlers
grep -rn 'func.*Handler' ./modules/chariot/backend --include='*.go' -l | head -20

# Step 2: Find middleware used with handlers
grep -rn 'func.*Middleware' ./modules/chariot/backend --include='*.go' -l | head -20

# Step 3: Find error handling in handlers
grep -rn 'return.*error' ./modules/chariot/backend --include='*.go' -l | head -10

# Step 4: Find handler tests
find ./modules/chariot/backend -name '*_handler_test.go' | head -10
```

### Example: Researching React Component Patterns

```bash
# Step 1: Find component exports
grep -rn 'export function.*Props' ./modules/chariot/ui --include='*.tsx' -l | head -20

# Step 2: Find data fetching hooks
grep -rn 'useQuery\|useMutation' ./modules/chariot/ui --include='*.ts' -l | head -20

# Step 3: Find state management
grep -rn 'create<.*State>' ./modules/chariot/ui --include='*.ts' -l | head -10

# Step 4: Find component tests
find ./modules/chariot/ui -name '*.test.tsx' | head -10
```

## Tips for Effective Searching

1. **Start broad, then narrow** - Begin with generic patterns, refine with specific terms
2. **Use file inclusion** - `--include='*.go'` faster than searching all files
3. **Limit results** - `| head -20` prevents overwhelming output
4. **Combine with grep context** - Add `-A 3 -B 3` to see surrounding lines
5. **Use word boundaries** - `-w` flag for exact matches only

## Custom Pattern Development

When researching a new pattern not covered here:

1. **Identify the pattern** - What are you looking for?
2. **Find one example** - Manually locate a single instance
3. **Extract the signature** - What's unique about it?
4. **Test the regex** - Run grep with pattern, verify matches
5. **Refine and limit** - Adjust pattern, add file filters, limit count
6. **Document for reuse** - Add to this file for future research

This ensures your searches are targeted, fast, and relevant to the detected stack.
