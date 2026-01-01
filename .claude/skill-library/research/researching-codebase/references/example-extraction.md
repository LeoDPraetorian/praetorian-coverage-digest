# Example Extraction Best Practices

How to extract, document, and reference code examples for skill content.

## Reading Representative Files

### Selection Criteria

From your pattern discovery results (Phase 3), select files that:

1. **Demonstrate the pattern clearly** - Good exemplar, not edge case
2. **Follow current conventions** - Not deprecated or being migrated
3. **Are well-structured** - Clean code, good comments
4. **Include common use cases** - Typical scenarios, not rare situations
5. **Are recently updated** - Check git log for recent activity

### Discovery to Reading Flow

**Example: Go Handler Research**

```bash
# Step 1: Discover handler files
$ grep -rn 'func.*Handler' ./modules/chariot/backend --include='*.go' -l | head -20
./modules/chariot/backend/internal/handler/asset_handler.go
./modules/chariot/backend/internal/handler/risk_handler.go
./modules/chariot/backend/internal/handler/job_handler.go
...

# Step 2: Check file sizes (prefer smaller, focused files)
$ wc -l ./modules/chariot/backend/internal/handler/*.go | sort -n | head -5
     87 ./modules/chariot/backend/internal/handler/health_handler.go
    156 ./modules/chariot/backend/internal/handler/asset_handler.go
    234 ./modules/chariot/backend/internal/handler/risk_handler.go
...

# Step 3: Check recent activity (prefer actively maintained)
$ git log --oneline --since="6 months ago" -- ./modules/chariot/backend/internal/handler/asset_handler.go | head -5
a1b2c3d fix: asset handler validation
e4f5g6h refactor: extract asset validation
...
```

**Decision:** Read `asset_handler.go` (medium size, recently updated, clear pattern)

### How to Read Files

**Use the Read tool with the absolute path:**

```
Read("/Users/you/project/modules/chariot/backend/internal/handler/asset_handler.go")
```

**What to capture:**

1. **Package structure** - How is the file organized?
2. **Key functions** - What are the main entry points?
3. **Dependencies** - What does this file import and use?
4. **Error handling** - How are errors managed?
5. **Patterns** - Any repeated structures?

## Capturing Code Examples

### Durable Reference Pattern (MANDATORY)

❌ **NEVER use line numbers:**

```markdown
❌ BAD: See asset_handler.go:123-127
❌ BAD: The AssetHandler function (line 45) shows...
❌ BAD: In asset_handler.go, lines 78-92 demonstrate...
```

✅ **USE function signatures and structural markers:**

```markdown
✅ GOOD: See asset_handler.go - func AssetHandler(...)
✅ GOOD: The AssetHandler function in asset_handler.go shows...
✅ GOOD: In asset_handler.go (between AssetHandler() and validateAsset()) demonstrates...
✅ GOOD: See asset_handler.go for the complete implementation
```

**Why this matters:**

- Line numbers change with EVERY code modification
- Function signatures are stable across refactors
- Grep-friendly: `rg "func.*AssetHandler"` finds the function instantly
- Audit Phase 21 flags line number references as failures

**For complete patterns, see:**

- [Code Reference Patterns](../../../../skills/managing-skills/references/patterns/code-reference-patterns.md)

### Example Capture Table Format

Create a table documenting examples found:

| Pattern            | File                  | Function Signature                                    | Usage Context                  |
| ------------------ | --------------------- | ----------------------------------------------------- | ------------------------------ |
| HTTP Handler       | `handler/asset.go`    | `func AssetHandler(ctx context.Context, ...)`         | Lambda handler for /assets API |
| Repository Pattern | `repository/asset.go` | `func (r *AssetRepo) Get(id string) (*Asset, error)`  | Data access layer              |
| Middleware         | `middleware/auth.go`  | `func AuthMiddleware(next http.Handler) http.Handler` | JWT validation middleware      |
| Service Layer      | `service/scan.go`     | `func (s *ScanService) Execute(job Job) error`        | Business logic orchestration   |

**Usage in skill content:**

```markdown
## Handler Pattern

Chariot uses Lambda-style handlers for HTTP endpoints. See `handler/asset.go` - `func AssetHandler(...)` for the canonical implementation.

**Pattern:**

\`\`\`go
func EntityHandler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
// 1. Parse request
// 2. Validate input
// 3. Call service layer
// 4. Return response
}
\`\`\`

**Example:** The AssetHandler in `handler/asset.go` demonstrates all four steps.
```

## Extracting Code Snippets

### When to Include Full Code

Include complete code snippets when:

1. **Demonstrating a complete pattern** - Full function shows entire workflow
2. **Code is short** (< 30 lines) - Fits in skill without overwhelming
3. **Self-contained** - Doesn't require external context
4. **Exemplary quality** - Well-written, worth copying

### When to Use Partial Snippets

Use partial/pseudocode when:

1. **Code is long** (> 30 lines) - Extract key parts only
2. **Multiple variations exist** - Show general structure, not specific implementation
3. **Implementation details not important** - Focus on pattern, not specifics
4. **Codebase-specific** - Pattern applies broadly, but example is too specific

**Example - Full snippet (appropriate):**

```markdown
### Error Wrapping Pattern

\`\`\`go
// From handler/asset.go - func AssetHandler
func AssetHandler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
asset, err := svc.GetAsset(req.PathParameters["id"])
if err != nil {
return events.APIGatewayProxyResponse{}, fmt.Errorf("failed to get asset: %w", err)
}
return responseOK(asset), nil
}
\`\`\`
```

**Example - Partial snippet (appropriate):**

```markdown
### Repository Pattern Structure

\`\`\`go
// Pattern from repository/asset.go
type AssetRepository interface {
Get(id string) (*Asset, error)
List(filters Filter) ([]*Asset, error)
Create(asset *Asset) error
Update(asset *Asset) error
Delete(id string) error
}

type DynamoDBAssetRepo struct {
client \*dynamodb.Client
table string
}

func (r *DynamoDBAssetRepo) Get(id string) (*Asset, error) {
// Implementation details...
}
\`\`\`

**See `repository/asset.go` for complete implementation.**
```

## Capturing Context

### File Context Template

For each representative file read:

**File:** `{relative-path-from-TARGET_PATH}`

**Purpose:** {one-sentence description}

**Key Functions:**

- `{function-signature}` - {what it does}
- `{function-signature}` - {what it does}

**Dependencies:**

- {package-1} - {why used}
- {package-2} - {why used}

**Pattern Demonstrated:** {pattern name}

**Usage Example:** {where/how this is called}

**Anti-patterns Avoided:** {what NOT to do, based on this file}

---

**Example:**

**File:** `backend/internal/handler/asset_handler.go`

**Purpose:** HTTP handler for asset-related API endpoints

**Key Functions:**

- `func AssetHandler(ctx context.Context, req events.APIGatewayProxyRequest)` - Main handler entry point
- `func validateAssetRequest(req AssetRequest) error` - Input validation
- `func buildAssetResponse(asset *Asset) AssetResponse` - Response marshaling

**Dependencies:**

- `github.com/aws/aws-lambda-go/events` - Lambda event types
- `github.com/praetorian-inc/chariot/pkg/asset` - Asset domain types
- `github.com/praetorian-inc/chariot/internal/service` - Business logic layer

**Pattern Demonstrated:** Lambda handler with layered architecture (handler → service → repository)

**Usage Example:** Deployed as Lambda function behind API Gateway at `/assets/{id}`

**Anti-patterns Avoided:**

- No business logic in handler (delegated to service layer)
- No direct database access (uses repository abstraction)
- Errors properly wrapped with context

## Identifying Anti-Patterns

### What to Look For

While reading code, note patterns that should **NOT** be documented in skills:

1. **Deprecated patterns** - Being migrated away from
2. **Technical debt** - Known issues marked with TODO/FIXME
3. **Edge cases** - Handling rare situations, not general pattern
4. **Workarounds** - Temporary fixes, not intended design
5. **Legacy code** - Old style, not current convention

### Discovery Methods

**Check git log for migration commits:**

```bash
git log --grep="migrate\|deprecate\|refactor" --oneline -- {file} | head -10
```

**Search for TODO/FIXME comments:**

```bash
grep -rn 'TODO\|FIXME\|HACK\|XXX' {TARGET_PATH}/{file}
```

**Check for deprecation notices:**

```bash
grep -rn '@deprecated\|Deprecated:' {TARGET_PATH} --include='*.go' --include='*.ts'
```

### Anti-Pattern Documentation Template

For each anti-pattern discovered:

**Anti-pattern:** {Name}

**Location:** {File(s) where observed}

**Description:** {What the anti-pattern is}

**Why to avoid:** {Problems it causes}

**Correct pattern:** {What to do instead}

**Reference:** {File that shows correct pattern}

---

**Example:**

**Anti-pattern:** Direct DynamoDB calls in handlers

**Location:** `backend/internal/handler/legacy_handler.go`

**Description:** Handler directly calls DynamoDB client methods instead of using repository abstraction

**Why to avoid:**

- Tight coupling to DynamoDB (hard to switch databases)
- No abstraction for testing (must mock DynamoDB)
- Business logic mixed with data access

**Correct pattern:** Use repository interface

**Reference:** `backend/internal/handler/asset_handler.go` demonstrates proper repository usage

## Organizing Extracted Examples

### Directory Structure for Research Outputs

When researching for a skill, save extracted examples:

```
{skill-path}/
├── references/
│   ├── codebase-research-{topic}.md       # Synthesis document
│   ├── examples/
│   │   ├── {pattern-1}-example.md         # Full example with context
│   │   ├── {pattern-2}-example.md
│   │   └── anti-patterns.md               # What NOT to do
│   └── ...
```

### Example File Template

**File:** `references/examples/{pattern}-example.md`

```markdown
# {Pattern Name} Example

**Source:** `{file-path}` - `{function-signature}`

**Context:** {When/why this pattern is used}

## Code Example

\`\`\`{language}
{code-snippet}
\`\`\`

## Explanation

{Line-by-line or section-by-section explanation}

## Key Points

- {Important aspect 1}
- {Important aspect 2}
- {Important aspect 3}

## Related Patterns

- **{Related Pattern 1}:** {How it relates}
- **{Related Pattern 2}:** {How it relates}

## Common Mistakes

- {Mistake 1 to avoid}
- {Mistake 2 to avoid}

## Usage in Skill

**Recommended reference format:**

> The {pattern} follows a standard structure. See `{file}` - `{function}` for a complete implementation.
```

## Synthesis: From Examples to Skill Content

### Building Skill Sections from Examples

**Input:** 3-5 representative files read, examples extracted

**Output:** Skill content sections

**Workflow:**

1. **Group related examples** - Patterns that serve similar purposes
2. **Identify common structure** - What's consistent across examples?
3. **Extract general pattern** - Remove codebase-specific details
4. **Write pattern documentation** - Describe the general approach
5. **Add specific examples** - Include 1-2 real code references with durable patterns
6. **Document variations** - Note when pattern differs based on context

**Example transformation:**

**Input (extracted examples):**

- `asset_handler.go` - `func AssetHandler(...)` - Lambda handler
- `risk_handler.go` - `func RiskHandler(...)` - Lambda handler
- `job_handler.go` - `func JobHandler(...)` - Lambda handler

**Analysis:** All three follow the same structure:

1. Parse request
2. Validate input
3. Call service
4. Return response

**Skill content output:**

```markdown
## Lambda Handler Pattern

### Structure

Lambda handlers follow a consistent four-step structure:

1. **Parse request** - Extract path/query parameters from API Gateway event
2. **Validate input** - Check required fields and constraints
3. **Call service** - Delegate business logic to service layer
4. **Return response** - Marshal result to API Gateway response format

### Implementation

\`\`\`go
func EntityHandler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
// 1. Parse request
id := req.PathParameters["id"]

    // 2. Validate input
    if id == "" {
        return responseBadRequest("id required"), nil
    }

    // 3. Call service
    entity, err := svc.GetEntity(ctx, id)
    if err != nil {
        return responseError(err), nil
    }

    // 4. Return response
    return responseOK(entity), nil

}
\`\`\`

### Examples

- **Asset API:** `handler/asset.go` - `func AssetHandler(...)` demonstrates pattern for asset endpoints
- **Risk API:** `handler/risk.go` - `func RiskHandler(...)` shows variation with additional validation
- **Job API:** `handler/job.go` - `func JobHandler(...)` includes async job initiation

### Key Principles

- **No business logic in handlers** - Handlers parse/validate, services implement logic
- **Error wrapping** - Use `fmt.Errorf("context: %w", err)` for error context
- **Repository abstraction** - Never call DynamoDB directly from handlers
```

This ensures skill content is **evidence-based** (grounded in real code), **accurate** (reflects current conventions), and **durable** (uses function signatures, not line numbers).
