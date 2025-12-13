# Console Filtering

Advanced techniques for filtering console messages to focus on real errors and ignore expected noise.

## The Noise Problem

Modern frontend apps produce **hundreds of console messages**:
- React DevTools warnings (expected)
- Third-party library warnings (usually safe to ignore)
- Development-mode only messages (won't appear in production)
- Verbose logging (intentional debug output)

**Goal**: Filter out noise, focus on **actionable errors**.

---

## Filtering by Message Type

### Basic Type Filtering

```typescript
const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
const result = await listConsoleMessages.execute({});

// Filter only errors
const errors = result.messages.filter(m => m.type === 'error');

// Filter errors and warnings
const issues = result.messages.filter(m =>
  m.type === 'error' || m.type === 'warning'
);

// Filter only warnings
const warnings = result.messages.filter(m => m.type === 'warning');
```

---

## Filtering by Message Content

### Ignore Expected Warnings

```typescript
const expectedWarnings = [
  'React DevTools',
  'Download the React DevTools',
  'version mismatch',
  'experimental feature',
];

const realIssues = result.messages.filter(m => {
  // Keep all errors
  if (m.type === 'error') return true;

  // Filter warnings
  if (m.type === 'warning') {
    // Ignore if matches expected pattern
    const isExpected = expectedWarnings.some(pattern =>
      m.text.includes(pattern)
    );
    return !isExpected;  // Keep warnings that don't match
  }

  return false;  // Ignore logs, info, debug
});
```

### Common Ignore Patterns

| Pattern | Why Ignore | Example |
|---------|----------|---------|
| `React DevTools` | Extension warning, not your code | "Download the React DevTools for a better development experience" |
| `Webpack` | Build warnings, not runtime | "Webpack compiled with warnings" |
| `HMR` | Hot module reload, dev only | "HMR: module replaced" |
| `vendor bundle` | Third-party library | "vendor.js: line 12345" |
| `extension` | Browser extension noise | "Chrome extension: ..." |

---

## Filtering by Source

### Ignore Third-Party Scripts

```typescript
const ownCodeErrors = result.messages.filter(m => {
  if (m.type !== 'error') return false;

  // Check if error is from our code (not node_modules, not extensions)
  const isOwnCode =
    m.source.includes('localhost') &&
    !m.source.includes('node_modules') &&
    !m.source.includes('extension');

  return isOwnCode;
});
```

---

## Priority-Based Filtering

### Prioritize by Severity

```typescript
// Define priority levels
const priorities = {
  error: 1,     // Highest priority
  warning: 2,
  log: 3,
  info: 4,
  debug: 5      // Lowest priority
};

// Sort by priority
const sorted = result.messages
  .filter(m => priorities[m.type] <= 2)  // Only errors and warnings
  .sort((a, b) => priorities[a.type] - priorities[b.type]);

console.log('Prioritized issues:', sorted);
```

---

## Filtering by Frequency

### Ignore Repeated Messages

```typescript
// Count occurrences
const counts = new Map<string, number>();
result.messages.forEach(m => {
  counts.set(m.text, (counts.get(m.text) || 0) + 1);
});

// Filter out messages that appear >10 times (likely noise)
const uniqueIssues = result.messages.filter(m => {
  const count = counts.get(m.text) || 0;
  return count <= 10;  // Keep if not repeated excessively
});
```

---

## Regex-Based Filtering

### Advanced Pattern Matching

```typescript
// Ignore patterns with regex
const ignorePatterns = [
  /React DevTools/i,
  /Download the React/i,
  /Webpack compiled/i,
  /HMR/i,
  /chunk.*loaded/i,
  /extension.*background/i,
];

const filtered = result.messages.filter(m => {
  // Check if matches any ignore pattern
  const shouldIgnore = ignorePatterns.some(pattern =>
    pattern.test(m.text)
  );
  return !shouldIgnore;
});
```

---

## Practical Filtering Strategy

### Recommended Approach

```typescript
async function getActionableErrors() {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const result = await listConsoleMessages.execute({});

  // Step 1: Filter by type (errors and warnings only)
  const issues = result.messages.filter(m =>
    m.type === 'error' || m.type === 'warning'
  );

  // Step 2: Ignore expected warnings
  const expectedWarnings = [
    'React DevTools',
    'Download the React DevTools',
    'version mismatch',
  ];

  const filtered = issues.filter(m => {
    if (m.type === 'warning') {
      return !expectedWarnings.some(p => m.text.includes(p));
    }
    return true;  // Keep all errors
  });

  // Step 3: Filter by source (own code only)
  const ownCode = filtered.filter(m =>
    m.source.includes('localhost') &&
    !m.source.includes('node_modules')
  );

  // Step 4: Sort by priority
  const priorities = { error: 1, warning: 2 };
  const sorted = ownCode.sort((a, b) =>
    priorities[a.type] - priorities[b.type]
  );

  return sorted;
}
```

---

## When to Ignore Warnings

### Safe to Ignore

✅ **React DevTools messages**
- "Download the React DevTools"
- "React DevTools version mismatch"

✅ **Build tool warnings**
- "Webpack compiled with warnings"
- "Module size exceeded"

✅ **Development-only warnings**
- "This component uses an experimental feature"
- "Hot module replacement enabled"

✅ **Third-party library warnings**
- Warnings from `node_modules/` sources

### Do NOT Ignore

❌ **React hook warnings**
- "React Hook called conditionally"
- "Missing dependencies in useEffect"

❌ **Deprecation warnings in your code**
- "componentWillMount is deprecated"
- "findDOMNode is deprecated"

❌ **Security warnings**
- "Mixed content blocked"
- "Insecure content loaded"

❌ **API warnings**
- "CORS policy blocked"
- "Failed to fetch"

---

## Related References

- [Autonomous Debugging Workflow](workflow.md) - Where filtering fits in the process
- [Common Error Patterns](error-patterns.md) - What errors look like after filtering
- [Iterative Fix Loop](iterative-loop.md) - How to iterate through filtered errors
