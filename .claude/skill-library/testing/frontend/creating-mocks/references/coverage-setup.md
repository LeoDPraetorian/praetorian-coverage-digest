# Coverage Setup

Configuring Vitest coverage with v8 or Istanbul providers.

## Provider Comparison

| Feature           | v8 (Recommended)                  | Istanbul                 |
| ----------------- | --------------------------------- | ------------------------ |
| **Speed**         | ⚡ Fastest                        | Slower                   |
| **Accuracy**      | ✅ Istanbul-level (since v3.2.0+) | ✅ Line-level            |
| **Setup**         | Minimal                           | Requires instrumentation |
| **Compatibility** | Node.js only                      | Any runtime              |

**Recommendation:** Use v8 for Vitest 3.2.0+

## Installation

```bash
# For v8 (recommended)
npm install -D @vitest/coverage-v8

# For Istanbul
npm install -D @vitest/coverage-istanbul
```

## Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8", // or 'istanbul'
      reporter: ["text", "html", "json"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/test/**",
        "src/**/__mocks__/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

## Running Coverage

```bash
# Run tests with coverage
vitest run --coverage

# Watch mode with coverage
vitest --coverage

# Coverage with UI
vitest --ui --coverage
```

## Coverage Reports

### Text Reporter (Terminal)

```
 % Coverage report from v8
------------------------------|---------|----------|---------|---------|
File                          | % Stmts | % Branch | % Funcs | % Lines |
------------------------------|---------|----------|---------|---------|
All files                     |   85.71 |    75.00 |   90.00 |   85.71 |
 src                          |   85.71 |    75.00 |   90.00 |   85.71 |
  utils.ts                    |   85.71 |    75.00 |   90.00 |   85.71 |
------------------------------|---------|----------|---------|---------|
```

### HTML Reporter (Browser)

Open `coverage/index.html` to see interactive report.

## Best Practices

1. **Define `coverage.include`** - Reduces files analyzed
2. **Exclude test files** - Don't count tests in coverage
3. **Set realistic thresholds** - 80% is typical
4. **Use v8 for performance** - Fastest with good accuracy
5. **Review HTML report** - Find uncovered lines

## Related Resources

- [Vitest Coverage Guide](https://vitest.dev/guide/coverage)
- [v8 vs Istanbul Discussion](https://github.com/vitest-dev/vitest/discussions/7587)
