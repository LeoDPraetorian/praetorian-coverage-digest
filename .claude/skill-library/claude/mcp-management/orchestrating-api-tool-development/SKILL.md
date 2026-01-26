---
name: orchestrating-api-tool-development
description: Use when creating REST API wrappers with TDD - orchestrates test writing, implementation, and review for token-optimized HTTP client wrappers
allowed-tools: Read, Bash, Grep, Glob, TodoWrite, Task, Skill
---

# Orchestrating REST API Tool Development

**TDD-based workflow for creating token-optimized REST API wrappers using the http-client infrastructure.**

## When to Use

Use this skill when:

- Target API has no MCP server available
- Need token-optimized responses for LLM consumption
- Building wrappers for security APIs (Shodan, VirusTotal, Censys, etc.)
- Want consistent error handling, retry logic, and testing patterns

**Not for:** MCP wrapper development (use `orchestrating-mcp-development` instead)

## Prerequisites

Verify infrastructure exists before starting:

- HTTP client factory: `.claude/tools/config/lib/http-client.ts`
- MSW test utilities: `.claude/lib/testing/src/mocks/http-handlers.ts`
- Response utilities: `.claude/tools/config/lib/response-utils.ts`
- Error types: `.claude/tools/config/lib/http-errors.ts`

## Quick Reference

| Phase  | Agent          | Purpose             | Duration  |
| ------ | -------------- | ------------------- | --------- |
| RED    | tool-tester    | Write failing tests | 10-15 min |
| GREEN  | tool-developer | Implement wrapper   | 15-20 min |
| REVIEW | tool-reviewer  | Code review         | 5-10 min  |

## TDD Workflow

### Phase 1: RED - Write Failing Tests First

**Spawn tool-tester agent:**

```
Create tests for [service-name] [endpoint-name] wrapper

Context:
- Service: [service-name]
- Endpoint: [endpoint-path]
- Purpose: [what it does]
- Reference: .claude/tools/shodan/ (working example)

Create in .claude/tools/[service-name]/__tests__/:
1. msw-handlers.ts - HTTP mocks for all endpoints
2. [endpoint].unit.test.ts - Test file

Test coverage required:
- Input validation (schema tests)
- Successful responses (data structure, token optimization)
- Error handling (401, 404, 429, 500, timeout)
- Token optimization (field filtering, array limits, truncation)

Use createShodanClient pattern from .claude/tools/shodan/client.ts
```

**Verify RED:** Tests must fail initially (wrapper doesn't exist yet)

### Phase 2: GREEN - Implement Wrapper

**Spawn tool-developer agent:**

```
Implement [service-name] [endpoint-name] wrapper following TDD

Context:
- Tests exist at: .claude/tools/[service-name]/__tests__/
- HTTP client: .claude/tools/config/lib/http-client.ts
- Reference: .claude/tools/shodan/ (working patterns)

Create:
1. client.ts - Service-specific HTTP client config with async factory
2. [endpoint].ts - Wrapper implementation using async client
3. index.ts - Barrel exports

Requirements:
- Zod schemas for input/output validation
- Use createServiceClientAsync() (RECOMMENDED) for 1Password support
- Filter response for 80-95% token reduction
- Convert null → undefined for optional fields
- Include estimatedTokens in output
- Use truncate() and estimateTokens() from response-utils.ts

Auth configuration:
- baseUrl: [service-base-url]
- auth.type: 'query' | 'header' | 'bearer'
- auth.keyName: [param-name]
- Register in .claude/tools/1password/lib/config.ts
```

**Verify GREEN:** Run tests - all must pass

### Phase 3: REVIEW - Code Quality

**Spawn tool-reviewer agent:**

```
Review [service-name] wrapper implementation

Files:
- .claude/tools/[service-name]/client.ts
- .claude/tools/[service-name]/[endpoint].ts
- .claude/tools/[service-name]/__tests__/

Check:
- Follows http-client architecture patterns
- Token optimization targets met (80-95% reduction)
- Error handling complete
- Tests comprehensive (≥80% coverage)
- Null handling correct
```

## File Structure Template

```
.claude/tools/[service-name]/
├── client.ts           # HTTPServiceConfig for this service
├── [endpoint].ts       # Individual endpoint wrapper
├── index.ts            # Barrel exports
└── __tests__/
    ├── msw-handlers.ts # Shared MSW HTTP handlers
    └── [endpoint].unit.test.ts
```

## Key Patterns

### HTTP Client Configuration

```typescript
// Service configuration
const serviceConfig: HTTPServiceConfig = {
  baseUrl: "https://api.service.com",
  auth: {
    type: "query", // or 'header', 'bearer'
    keyName: "key", // query param name or header name
    credentialKey: "apiKey", // Key name in resolved credentials
  },
  timeout: 30_000,
  retry: {
    limit: 3,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
  rateLimit: { requestsPerSecond: 5 },
};

// RECOMMENDED: Async client factory (uses 1Password)
export async function createServiceClientAsync(): Promise<HTTPPort> {
  return createHTTPClientAsync("service-name", serviceConfig);
}

// DEPRECATED: Sync client factory (uses credentials.json)
export function createServiceClient(): HTTPPort {
  console.warn("DEPRECATED: Use createServiceClientAsync() for 1Password support");
  return createHTTPClient("service-name", serviceConfig);
}
```

### 1Password Credential Setup

For services requiring API keys, configure 1Password:

**Step 1: Register Service**

Add to `.claude/tools/1password/lib/config.ts`:

```typescript
serviceItems: {
  'service-name': 'Service Display Name',
}
```

**Step 2: Create 1Password Item**

In vault 'Claude Code Tools', create item:
- **Name:** Service Display Name
- **password field:** Your API key

**Step 3: Use Async Pattern**

All wrappers should use the async client:

```typescript
// In wrapper execute function
const client = await createServiceClientAsync();
const response = await client.get("/endpoint");
```

### Wrapper Structure

```typescript
import { createServiceClientAsync, type HTTPPort } from "./client.js";
import { z } from "zod";

export const wrapperName = {
  name: "service.endpoint_name",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(
    input: z.infer<typeof this.inputSchema>,
    client?: HTTPPort // Optional for testing
  ) {
    const validated = InputSchema.parse(input);
    const httpClient = client ?? (await createServiceClientAsync()); // ASYNC

    const result = await httpClient.request("get", "path/to/endpoint", {
      searchParams: { ...validated },
      maxResponseBytes: 10_000_000, // Adjust based on API
    });

    if (!result.ok) throw new Error(`API error: ${result.error.message}`);

    return OutputSchema.parse(filterResponse(result.data));
  },
};
```

### Response Filtering

```typescript
function filterResponse(raw: RawType): OutputType {
  return {
    // Keep essential fields
    id: raw.id,
    name: raw.name,

    // Truncate large text
    description: truncate(raw.description, 200),

    // Limit arrays
    items: raw.items?.slice(0, 20),

    // Convert null to undefined
    optional: raw.optional ?? undefined,

    // Add token estimate
    estimatedTokens: estimateTokens(filtered),
  };
}
```

## Common Issues

| Issue                             | Solution                                                    |
| --------------------------------- | ----------------------------------------------------------- |
| `input must not begin with slash` | Remove leading `/` from path - Ky uses `prefixUrl`          |
| Zod validation fails on null      | Use `.nullable().optional()` or convert `?? undefined`      |
| Response too large                | Increase `maxResponseBytes` in request options              |
| Tests fail on credentials         | Pass mock client: `createServiceClient({ apiKey: 'test' })` |

## Reference Implementation

See `.claude/tools/shodan/` for complete working example:

- `client.ts` - Shodan HTTP client config
- `host-search.ts` - Search endpoint wrapper
- `host-info.ts` - Detail endpoint wrapper
- `dns-domain.ts` - DNS endpoint wrapper
- `__tests__/` - MSW handlers and unit tests (51 tests)

Architecture documentation: `.claude/.output/api-wrappers/http-client-architecture.md`

## Integration

### Called By

- `gateway-mcp-tools` (CORE) router - Routes REST API wrapper tasks
- User direct invocation when creating REST API wrappers

### Requires (invoke before starting)

None - standalone workflow orchestrator

### Calls (during execution)

- **tool-tester** (AGENT) - Phase 1 (RED): Write failing tests first
- **tool-developer** (AGENT) - Phase 2 (GREEN): Implement wrapper to pass tests
- **tool-reviewer** (AGENT) - Phase 3 (REVIEW): Code quality validation

### Pairs With (conditional)

- **`orchestrating-mcp-development`** (LIBRARY) - When MCP server available
  - Purpose: Alternative for services with MCP servers
  - `Read(".claude/skill-library/claude/mcp-management/orchestrating-mcp-development/SKILL.md")`
- **`managing-tool-wrappers`** (LIBRARY) - After wrapper creation
  - Purpose: Lifecycle management (update, audit, fix, test)
  - `Read(".claude/skill-library/claude/mcp-management/managing-tool-wrappers/SKILL.md")`
