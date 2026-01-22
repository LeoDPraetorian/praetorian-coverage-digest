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
1. client.ts - Service-specific HTTP client config
2. [endpoint].ts - Wrapper implementation
3. index.ts - Barrel exports

Requirements:
- Zod schemas for input/output validation
- Filter response for 80-95% token reduction
- Convert null → undefined for optional fields
- Include estimatedTokens in output
- Use truncate() and estimateTokens() from response-utils.ts

Auth configuration:
- baseUrl: [service-base-url]
- auth.type: 'query' | 'header' | 'bearer'
- auth.keyName: [param-name]
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
export const serviceConfig: HTTPServiceConfig = {
  baseUrl: "https://api.service.com",
  auth: {
    type: "query", // or 'header', 'bearer'
    keyName: "key", // param/header name
    credentialKey: "apiKey",
  },
  timeout: 30_000,
  retry: {
    limit: 3,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
};
```

### Wrapper Structure

```typescript
export const wrapperName = {
  name: "service.endpoint_name",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async execute(input, client?) {
    const validated = InputSchema.parse(input);
    const httpClient = client ?? createServiceClient();

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

## Related Skills

- `orchestrating-mcp-development` - For MCP wrapper development
- `managing-tool-wrappers` - Lifecycle management for wrappers
- `gateway-mcp-tools` - Routes to wrapper-related skills
