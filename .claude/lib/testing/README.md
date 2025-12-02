# @claude/testing - Universal MCP Testing Library

**Shared testing infrastructure for all MCP wrappers using Vitest**

## Overview

This library provides a complete testing toolkit for MCP wrappers, enabling:
- ✅ **Unit tests** with mocked MCP client (fast, isolated)
- ✅ **Integration tests** with real MCP server
- ✅ **Security test scenarios** (OWASP Top 10, injection attacks)
- ✅ **Response builders** for realistic mock data
- ✅ **Vitest configuration** via workspace root

## Installation

**This library is part of the `.claude/` npm workspace.** No separate installation needed.

```bash
# From repository root
cd .claude
npm install

# Library is automatically linked via workspace
```

**Workspace configuration** (`.claude/package.json`):
```json
{
  "workspaces": ["lib", "lib/testing", "tools/*", "skills/*/scripts", "skill-library/lib"]
}
```

## Usage in MCP Wrapper Tests

### Basic Unit Test with Mocking

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMCPMock, Context7Responses } from '@claude/testing';
import { resolveLibraryId } from './resolve-library-id';
import * as mcpClient from '../config/lib/mcp-client';

// Factory mock pattern (REQUIRED to prevent module loading errors)
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

describe('resolveLibraryId - Unit Tests', () => {
  let mcpMock: ReturnType<typeof createMCPMock>;

  beforeEach(() => {
    mcpMock = createMCPMock();
    vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
  });

  it('should filter libraries correctly', async () => {
    // Arrange: Mock MCP response
    mcpMock.mockResolvedValue(
      Context7Responses.resolveLibraryId([
        { id: '1', name: 'react', description: 'A'.repeat(500) },
        { id: '2', name: 'vue', description: 'Short desc' }
      ])
    );

    // Act: Execute wrapper
    const result = await resolveLibraryId.execute({ libraryName: 'react' });

    // Assert: Verify filtering logic
    expect(result.libraries[0].description).toHaveLength(200); // Truncated
    expect(result.totalResults).toBe(2);
    expect(mcpMock).toHaveBeenCalledTimes(1);
  });

  it('should handle empty results', async () => {
    mcpMock.mockResolvedValue(Context7Responses.emptySearch());

    const result = await resolveLibraryId.execute({ libraryName: 'nonexistent' });

    expect(result.libraries).toEqual([]);
    expect(result.totalResults).toBe(0);
  });
});
```

### Error Handling Tests

```typescript
import { MCPErrors } from '@claude/testing';

describe('Error handling', () => {
  it('should handle rate limit errors', async () => {
    mcpMock.mockRejectedValue(MCPErrors.rateLimit());

    await expect(
      resolveLibraryId.execute({ libraryName: 'react' })
    ).rejects.toThrow(/rate limit/i);
  });

  it('should handle server errors', async () => {
    mcpMock.mockRejectedValue(MCPErrors.serverError());

    await expect(
      resolveLibraryId.execute({ libraryName: 'react' })
    ).rejects.toThrow(/server.*error/i);
  });

  it('should handle network timeout', async () => {
    mcpMock.mockRejectedValue(MCPErrors.timeout());

    await expect(
      resolveLibraryId.execute({ libraryName: 'react' })
    ).rejects.toThrow(/ETIMEDOUT/);
  });
});
```

### Security Testing

```typescript
import { testSecurityScenarios, getAllSecurityScenarios } from '@claude/testing';

describe('Security', () => {
  it('should block all security attack vectors', async () => {
    const results = await testSecurityScenarios(
      getAllSecurityScenarios(),
      (input) => resolveLibraryId.execute({ libraryName: input })
    );

    expect(results.failed).toBe(0);
    expect(results.passed).toBe(results.total);
  });
});
```

## Library Structure

```
.claude/
├── package.json              # Workspace root with vitest
├── vitest.config.ts          # Shared test configuration
└── lib/testing/              # @claude/testing package (core infrastructure)
    ├── package.json          # Library package (workspace member)
    ├── tsconfig.json         # TypeScript config
    └── src/
        ├── mocks/
        │   ├── mcp-client-mock.ts       # ✅ MCP client mocking utilities
        │   └── response-builders.ts     # ✅ Mock response factories
        ├── fixtures/
        │   ├── security-scenarios.ts    # ✅ Security test cases
        │   └── error-scenarios.ts       # ✅ Error test cases
        ├── assertions/
        │   └── schema-assertions.ts     # ✅ Zod schema helpers
        └── index.ts                     # ✅ Main exports
```

## Available Utilities

### Mocking

- `createMCPMock()` - Create Vitest mock for MCP client
- `MCPErrors.rateLimit()` - Rate limit error
- `MCPErrors.serverError()` - 500 server error
- `MCPErrors.timeout()` - Network timeout
- `MCPErrors.notFound()` - 404 not found

### Response Builders

- `Context7Responses` - Context7-specific mock responses
- `LinearResponses` - Linear-specific mock responses
- `CurrentsResponses` - Currents-specific mock responses

### Security Testing

- `getAllSecurityScenarios()` - All 12 security test scenarios
- `testSecurityScenarios()` - Run automated security tests

### Schema Testing

- `assertSchemaAccepts()` - Test valid inputs
- `assertSchemaRejects()` - Test invalid inputs

### Edge Case Data

- `EdgeCaseData.boundary` - Boundary value tests
- `EdgeCaseData.special` - Unicode, control characters
- `EdgeCaseData.large` - Large data structures

## Running Tests

**All tests run from workspace root:**

```bash
cd .claude

# Run all tests once
npm run test:run

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode (development)
npm test

# Open Vitest UI
npm run test:ui

# Coverage report
npm run test:coverage
```

## Current Status

### ✅ Completed

- [x] npm workspace setup at `.claude/` level
- [x] Shared vitest.config.ts at workspace root
- [x] MCP client mocking utilities
- [x] Response builders (Context7, Linear)
- [x] Security test scenarios (12 scenarios)
- [x] Error scenario fixtures
- [x] Schema assertion helpers
- [x] Main exports (index.ts)
- [x] context7 tests migrated (17 tests)
- [x] linear/get-issue tests created (18 tests)
- [x] Skills updated (mcp-code-test)

### 📋 Future Work

- [ ] More Linear wrapper tests (list-issues, create-issue, etc.) - 19 missing
- [x] Praetorian-CLI wrapper tests (51 tests)
- [x] Currents wrapper tests (57 tests)
- [ ] Chrome DevTools wrapper tests - 26 missing
- [ ] Chariot wrapper tests - 2 missing

## Philosophy

**Unit tests should be:**
- ✅ **Fast** (<1ms per test, no network calls)
- ✅ **Isolated** (test wrapper logic only, mock MCP)
- ✅ **Comprehensive** (test all code paths, errors, edge cases)
- ✅ **Maintainable** (shared utilities, consistent patterns)

**Integration tests should be:**
- ✅ **Realistic** (call real MCP servers)
- ✅ **Focused** (test end-to-end flows)
- ✅ **Fewer** (expensive, slow, fewer scenarios)

## Contributing

When adding support for a new MCP server:

1. Add response builders to `src/mocks/response-builders.ts`:
   ```typescript
   export const YourMCPResponses = {
     yourTool: (config) => ({ /* mock response */ })
   };
   ```

2. Create unit tests in the tool directory (e.g., `.claude/tools/your-mcp/`)

3. Run tests from workspace root: `cd .claude && npm run test:run`

## Related Documentation

- **Test Methodology**: `.claude/skills/mcp-code-test/SKILL.md`
- **Workspace Config**: `.claude/package.json`
- **Vitest Config**: `.claude/vitest.config.ts`
