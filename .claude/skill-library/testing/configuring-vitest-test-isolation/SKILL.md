---
name: configuring-vitest-test-isolation
description: Use when configuring Vitest test isolation to prevent real process spawning in unit tests - provides file naming conventions, projects config, global safety guards, and defense-in-depth mocking strategies
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Configuring Vitest Test Isolation

**Prevent unit tests from accidentally spawning real child processes (MCP servers, Go backends, etc.) that cause 30+ minute hangs.**

## When to Use

Use this skill when:

- Setting up Vitest configuration for a new project
- Writing unit tests that interact with external processes
- Tests are hanging or timing out unexpectedly
- Need to separate unit tests from integration tests
- Implementing MCP wrapper tests
- Any testing agent (tool-tester, backend-tester, frontend-tester) writing Vitest tests

**Target audience:** All testing agents writing Vitest tests.

## The Problem

Unit tests can accidentally spawn real child processes when:

1. **Incorrect naming**: Integration tests named `*.test.ts` instead of `*.integration.test.ts`
2. **Missing safety guard**: No global setupFiles to catch unmocked process spawns
3. **No test separation**: No Vitest projects config to isolate unit from integration tests

**Result:** Tests hang for 30+ minutes waiting for real servers to start, blocking CI/CD pipelines.

## Quick Reference

| Layer       | Protection Mechanism   | Purpose                                         |
| ----------- | ---------------------- | ----------------------------------------------- |
| **Layer 1** | Global setupFiles mock | Catches ALL unmocked spawns with explicit error |
| **Layer 2** | Per-test vi.mock()     | Explicit mocking for specific dependencies      |
| **Layer 3** | NODE_ENV checks        | Production code guards against test environment |

**Defense-in-Depth Strategy:** All three layers work together - if one fails, the others catch the issue.

## File Naming Convention (MANDATORY)

**You MUST use these exact patterns:**

```
✅ CORRECT:
  *.unit.test.ts         # Unit tests with ALL external dependencies mocked (fast, <5s)
  *.integration.test.ts  # Integration tests that MAY spawn real processes (slow, 60s+)
  *.e2e.test.ts          # End-to-end tests with real environment

❌ NEVER USE:
  *.test.ts              # Ambiguous - banned for tests that could spawn processes
```

**Why this matters:**

- Vitest projects config uses filename patterns to separate test types
- Clear naming prevents accidental integration test execution in unit test runs
- Enables different timeout configurations per test type

## Core Configuration

### 1. Vitest Projects Configuration (vitest.config.ts)

**Required for Vitest v3.2+:**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        name: "unit",
        include: ["**/*.unit.test.ts"],
        testTimeout: 5000, // Fast timeout for unit tests
        setupFiles: ["./vitest.setup.ts"], // Global safety guard
      },
      {
        name: "integration",
        include: ["**/*.integration.test.ts"],
        testTimeout: 60000, // Longer timeout for integration tests
        hookTimeout: 30000, // Hook timeout for async setup
      },
    ],
    bail: 1, // Fail fast - stop on first failure
  },
});
```

**Run specific project:**

```bash
vitest run --project=unit           # Unit tests only
vitest run --project=integration    # Integration tests only
vitest run                          # All projects
```

### 2. Global Safety Guard (vitest.setup.ts)

**Create this file to catch unmocked spawns:**

```typescript
import { vi } from "vitest";

// Block real child_process operations in unit tests
vi.mock("child_process", () => ({
  spawn: vi.fn(() => {
    throw new Error(
      "Real child_process.spawn attempted in unit test!\n" +
        "Either mock this dependency or rename to *.integration.test.ts"
    );
  }),
  exec: vi.fn(() => {
    throw new Error(
      "Real child_process.exec attempted in unit test!\n" +
        "Either mock this dependency or rename to *.integration.test.ts"
    );
  }),
  execFile: vi.fn(() => {
    throw new Error(
      "Real child_process.execFile attempted in unit test!\n" +
        "Either mock this dependency or rename to *.integration.test.ts"
    );
  }),
}));
```

**What this does:**

- Intercepts ALL child_process calls globally
- Throws explicit error message when unmocked spawn/exec/execFile attempted
- Forces developer to either mock properly or rename to integration test
- Prevents silent hangs - fails fast with clear error

## MCP-Specific Configuration

**For MCP wrapper tests, you MUST also mock the MCP SDK:**

```typescript
// vitest.setup.ts - Add to existing file
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn(),
}));
```

**Use @claude/testing library for consistency:**

```typescript
import { createMCPMock } from "@claude/testing";

describe("MCP Wrapper Tests", () => {
  it("should call MCP tool without spawning real process", async () => {
    const mockClient = createMCPMock({
      toolName: "get-issue",
      response: { success: true, data: { id: "123" } },
    });

    // Test wrapper logic with mock
    const result = await getIssueWrapper({ issueId: "123" });

    expect(result).toEqual({ success: true, data: { id: "123" } });
  });
});
```

## Per-Test Mocking Pattern

**Layer 2: Explicit per-test mocks for specific dependencies:**

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "child_process";

// Mock at module level
vi.mock("child_process");

describe("Process Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers(); // Clean up timers BEFORE async cleanup
  });

  it("should handle process without spawning", () => {
    const mockSpawn = vi.mocked(spawn);
    mockSpawn.mockReturnValue({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    } as any);

    // Test logic that uses spawn
    const result = startProcess({ command: "test" });

    expect(mockSpawn).toHaveBeenCalledWith("test", expect.any(Array));
  });
});
```

**Key points:**

- Mock at module level (before imports)
- Clear mocks in beforeEach to prevent cross-test pollution
- Call vi.useRealTimers() BEFORE afterEach async cleanup
- Use vi.mocked() for type-safe mock access

## Anti-Patterns (DO NOT DO THIS)

| Anti-Pattern                                     | Why It Fails                                     | Fix                                           |
| ------------------------------------------------ | ------------------------------------------------ | --------------------------------------------- |
| Using `*.test.ts` for tests that spawn processes | Ambiguous naming prevents proper test separation | Rename to `*.integration.test.ts`             |
| No timeout configuration                         | Allows infinite hangs                            | Set testTimeout in projects config            |
| Mocking wrapper functions instead of SDK         | Misses SDK-level spawn calls                     | Mock `@modelcontextprotocol/sdk` not wrapper  |
| Missing afterEach cleanup                        | Cross-test pollution, timer leaks                | Add `vi.useRealTimers()` before async cleanup |
| No global setupFiles                             | Silent process spawns, hard-to-debug hangs       | Add vitest.setup.ts with child_process mock   |

## Complete Example

**For a complete working example showing all layers together, see:**

- [references/complete-configuration-example.md](references/complete-configuration-example.md) - Full project setup
- [examples/mcp-wrapper-test.ts](examples/mcp-wrapper-test.ts) - MCP-specific test pattern
- [examples/unit-test-with-mocks.ts](examples/unit-test-with-mocks.ts) - Standard unit test pattern

## Validation Checklist

Before completing test setup, verify:

- ✅ File named `*.unit.test.ts` (for unit tests) or `*.integration.test.ts` (for integration tests)
- ✅ vitest.config.ts has projects configuration with correct includes
- ✅ vitest.setup.ts exists with child_process mocks
- ✅ MCP tests mock `@modelcontextprotocol/sdk` (if applicable)
- ✅ Tests have testTimeout configured (5000ms for unit, 60000ms for integration)
- ✅ afterEach includes `vi.useRealTimers()` cleanup
- ✅ Tests run without hanging: `vitest run --project=unit`

## Troubleshooting

**Problem:** Test still hangs despite configuration

**Diagnosis steps:**

1. Verify test filename matches project include pattern
2. Check vitest.setup.ts is referenced in projects config
3. Add console.log in vitest.setup.ts to confirm it loads
4. Run with `--reporter=verbose` to see which test hangs
5. Check for unmocked imports (fs, http, database clients)

**Problem:** Mock not working, real process still spawns

**Common causes:**

- Mocking wrapper functions instead of underlying SDK
- Mock defined after import (must be before)
- Missing vi.mock() call at module level
- Using dynamic imports that bypass mocks

**Solution:** Always mock at module level before imports, target SDK not wrappers.

## Related Skills

- `testing-mcp-wrappers` - MCP-specific testing patterns and best practices
- `testing-with-vitest-mocks` - Advanced Vitest mocking patterns
- `avoiding-low-value-tests` - What to test and what to skip
- `testing-typescript-types` - Type-level testing strategies

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
