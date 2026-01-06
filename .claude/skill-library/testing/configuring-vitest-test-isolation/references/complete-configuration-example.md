# Complete Vitest Test Isolation Configuration

**Full project setup showing all three defense layers working together.**

## Project Structure

```
project/
├── vitest.config.ts          # Projects configuration
├── vitest.setup.ts            # Global safety guard
├── src/
│   ├── process-manager.ts     # Production code with NODE_ENV guard
│   └── __tests__/
│       ├── process-manager.unit.test.ts        # Unit test with mocks
│       └── process-manager.integration.test.ts  # Integration test with real processes
└── package.json
```

## Layer 1: Global Safety Guard (vitest.setup.ts)

```typescript
import { vi } from "vitest";

// Block all child_process operations in unit tests
vi.mock("child_process", () => ({
  spawn: vi.fn(() => {
    throw new Error(
      "FATAL: Real child_process.spawn attempted in unit test!\n" +
        "This would cause a 30+ minute hang.\n\n" +
        "Fix options:\n" +
        "1. Mock child_process in your test file\n" +
        "2. Rename test to *.integration.test.ts\n\n" +
        "Test file: " +
        expect.getState().testPath
    );
  }),
  exec: vi.fn(() => {
    throw new Error("Real child_process.exec attempted in unit test!");
  }),
  execFile: vi.fn(() => {
    throw new Error("Real child_process.execFile attempted in unit test!");
  }),
}));

// Block MCP SDK from spawning real servers
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn(),
}));
```

## Layer 2: Vitest Projects Configuration (vitest.config.ts)

```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    projects: [
      // Unit test project - FAST, NO REAL PROCESSES
      {
        name: "unit",
        include: ["**/*.unit.test.ts"],
        testTimeout: 5000, // 5s max - fails fast
        hookTimeout: 3000, // 3s for setup/teardown
        setupFiles: [resolve(__dirname, "vitest.setup.ts")], // Global safety guard
        globals: true,
        environment: "node",
      },
      // Integration test project - SLOW, REAL PROCESSES ALLOWED
      {
        name: "integration",
        include: ["**/*.integration.test.ts"],
        testTimeout: 60000, // 60s for real processes
        hookTimeout: 30000, // 30s for async setup
        globals: true,
        environment: "node",
      },
    ],
    // Global settings
    bail: 1, // Stop on first failure
    pool: "forks", // Prevent Node.js fetch hangs
    reporters: ["default"],
  },
});
```

## Layer 3: Production Code with NODE_ENV Guard

```typescript
// src/process-manager.ts
import { spawn } from "child_process";

export class ProcessManager {
  private static _initialized = false;

  constructor() {
    // Layer 3: NODE_ENV check prevents initialization in test environment
    if (process.env.NODE_ENV !== "test" && !ProcessManager._initialized) {
      this.initializeCleanupHandlers();
      ProcessManager._initialized = true;
    }
  }

  private initializeCleanupHandlers() {
    // Only runs in production, not in tests
    process.on("SIGTERM", () => this.cleanup());
    process.on("SIGINT", () => this.cleanup());
  }

  public startProcess(command: string): Promise<string> {
    // Even if called during tests, global mock will catch this
    return new Promise((resolve, reject) => {
      const child = spawn(command, [], { shell: true });

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) resolve(output);
        else reject(new Error(`Process exited with code ${code}`));
      });
    });
  }

  private cleanup() {
    // Cleanup logic
  }
}
```

## Unit Test Example (\*.unit.test.ts)

```typescript
// src/__tests__/process-manager.unit.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ProcessManager } from "../process-manager";
import { spawn } from "child_process";

// Layer 2: Explicit per-test mock (redundant with global, but explicit)
vi.mock("child_process");

describe("ProcessManager (Unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start process without spawning real child", async () => {
    // Setup mock behavior
    const mockChild = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === "data") callback(Buffer.from("test output"));
        }),
      },
      stderr: { on: vi.fn() },
      on: vi.fn((event, callback) => {
        if (event === "close") callback(0);
      }),
    };

    vi.mocked(spawn).mockReturnValue(mockChild as any);

    // Test the logic
    const manager = new ProcessManager();
    const result = await manager.startProcess("echo hello");

    // Verify mock was called, not real process
    expect(spawn).toHaveBeenCalledWith("echo hello", [], { shell: true });
    expect(result).toBe("test output");
  });

  it("should handle process failure", async () => {
    // Mock failure scenario
    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, callback) => {
        if (event === "close") callback(1); // Exit code 1 = failure
      }),
    };

    vi.mocked(spawn).mockReturnValue(mockChild as any);

    const manager = new ProcessManager();

    await expect(manager.startProcess("invalid-command")).rejects.toThrow(
      "Process exited with code 1"
    );
  });
});
```

## Integration Test Example (\*.integration.test.ts)

```typescript
// src/__tests__/process-manager.integration.test.ts
import { describe, it, expect } from "vitest";
import { ProcessManager } from "../process-manager";

describe("ProcessManager (Integration)", () => {
  it("should execute real echo command", async () => {
    const manager = new ProcessManager();
    const result = await manager.startProcess('echo "integration test"');

    expect(result).toContain("integration test");
  }, 60000); // 60s timeout for real process

  it("should handle real command failure", async () => {
    const manager = new ProcessManager();

    await expect(manager.startProcess("command-that-does-not-exist")).rejects.toThrow();
  }, 60000);
});
```

## Running Tests

```bash
# Run only unit tests (fast, <5s total)
npm run test -- --project=unit

# Run only integration tests (slow, may take minutes)
npm run test -- --project=integration

# Run all tests
npm run test

# Run specific file
npm run test -- process-manager.unit.test.ts
```

## What Happens If Defense Layers Fail?

### Scenario 1: Developer Forgets to Mock (Layer 1 Catches)

```typescript
// BAD: Forgot to mock spawn
import { ProcessManager } from "../process-manager";

it("should start process", async () => {
  const manager = new ProcessManager();
  const result = await manager.startProcess("echo hello");
  // FAILS IMMEDIATELY with:
  // "FATAL: Real child_process.spawn attempted in unit test!"
});
```

✅ **Layer 1 (vitest.setup.ts) prevents the hang**

### Scenario 2: Global Mock Bypassed (Layer 3 Catches)

```typescript
// Someone removes global mock from vitest.setup.ts
// But production code has NODE_ENV guard

const manager = new ProcessManager();
// Layer 3: Constructor checks NODE_ENV !== 'test'
// Cleanup handlers NOT registered in test environment
```

✅ **Layer 3 (NODE_ENV guard) prevents side effects**

### Scenario 3: Integration Test Named Incorrectly (Projects Config Catches)

```typescript
// BAD: Integration test named .test.ts instead of .integration.test.ts
// FILE: process-manager.test.ts (WRONG)
it("should execute real command", async () => {
  const manager = new ProcessManager();
  await manager.startProcess("sleep 30"); // Real 30s sleep
});
```

**Without projects config:** Test hangs for 30+ seconds

**With projects config:** Test included in unit project, hits 5s timeout, fails fast

✅ **Projects config enforces timeout boundaries**

## Validation Checklist

After setup, verify all layers:

```bash
# 1. Verify setupFiles loads
npm run test -- --project=unit --reporter=verbose
# Should see vitest.setup.ts in loaded files

# 2. Test Layer 1 (try to spawn without mock)
# Write a test that calls spawn() without mocking
# Should fail with "Real child_process.spawn attempted"

# 3. Test Layer 2 (explicit mocks)
npm run test -- --project=unit
# All tests should pass in <5s

# 4. Test Layer 3 (NODE_ENV guard)
NODE_ENV=test npm run test -- --project=integration
# Integration tests should work even with NODE_ENV=test

# 5. Verify timeout enforcement
# Create a test that takes 10s
# Should fail at 5s in unit project
```

## Troubleshooting

**Problem:** Unit test still hangs despite global mock

**Diagnosis:**

1. Check vitest.config.ts has `setupFiles: ['./vitest.setup.ts']` in unit project
2. Verify vitest.setup.ts is in project root (not src/)
3. Add `console.log('Setup loaded')` to vitest.setup.ts to confirm execution
4. Check if test imports spawn before vi.mock() (imports must come after mocks)

**Problem:** "Cannot find module 'vitest.setup.ts'"

**Solution:**

- Use absolute path in config: `setupFiles: [resolve(__dirname, 'vitest.setup.ts')]`
- Verify file exists at project root
- Check tsconfig.json includes vitest.setup.ts

**Problem:** Mock doesn't throw error when spawn called

**Solution:**

- Ensure vi.mock() is at module level (before describe/it blocks)
- Check if spawn is imported as `import { spawn }` not `import * as cp`
- Verify global mock in vitest.setup.ts uses correct module name

## Related Patterns

- [MCP Wrapper Mocking](../examples/mcp-wrapper-test.ts) - MCP-specific test patterns
- [Error Handling in Tests](error-handling-tests.md) - Testing failure scenarios
- [Timeout Configuration](timeout-configuration.md) - When to use different timeouts
