# Snapshot Analysis

Visual verification techniques using Chrome DevTools screenshots for debugging UI state and layout issues.

## When to Use Snapshots

Snapshots complement console analysis when:

- **Visual bugs**: Layout broken, elements missing/misplaced
- **Before/after verification**: Did the fix improve UI?
- **Crash debugging**: Capture state before page freezes
- **Documentation**: Show bug reproduction steps

**Rule**: Snapshots show WHAT is wrong. Console shows WHY.

---

## Taking Snapshots

### Basic Snapshot

```bash
npx tsx -e "(async () => {
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  const result = await takeSnapshot.execute({});
  console.log('Snapshot captured:', result.format);
})();" 2>/dev/null
```

**Output**:

```json
{
  "format": "png",
  "data": "iVBORw0KGgoAAAANSUhEUgAA...", // Base64 encoded
  "timestamp": 1702845234567
}
```

---

## Snapshot Workflows

### Workflow 1: Before/After Comparison

**Use case**: Visual verification that fix improved UI

```bash
# 1. Capture BEFORE state
npx tsx -e "(async () => {
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  const result = await takeSnapshot.execute({});
  const fs = require('fs');
  fs.writeFileSync('before.png', Buffer.from(result.data, 'base64'));
  console.log('BEFORE snapshot saved');
})();" 2>/dev/null

# 2. Apply fix
Edit src/components/Layout.tsx ...

# 3. Reload page
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  await newPage.execute({ url: 'http://localhost:3000' });
})();" 2>/dev/null

sleep 3

# 4. Capture AFTER state
npx tsx -e "(async () => {
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  const result = await takeSnapshot.execute({});
  const fs = require('fs');
  fs.writeFileSync('after.png', Buffer.from(result.data, 'base64'));
  console.log('AFTER snapshot saved');
})();" 2>/dev/null

# 5. Compare visually
open before.png after.png  # macOS
# xdg-open before.png after.png  # Linux
```

---

### Workflow 2: Crash State Capture

**Use case**: Page freezes or crashes, need to see state before failure

```bash
# Automated crash detection workflow
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');

  // Launch page
  await newPage.execute({ url: 'http://localhost:3000/problematic-route' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Take snapshot BEFORE checking console
  const snapshot = await takeSnapshot.execute({});
  console.log('State captured');

  // Check for crash indicators
  const messages = await listConsoleMessages.execute({});
  const crashes = messages.messages.filter(m =>
    m.text.includes('recursion') ||
    m.text.includes('Maximum call stack') ||
    m.text.includes('out of memory')
  );

  if (crashes.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('crash-state.png', Buffer.from(snapshot.data, 'base64'));
    console.log('❌ Crash detected, state saved to crash-state.png');
  }
})();" 2>/dev/null
```

---

### Workflow 3: Responsive Layout Testing

**Use case**: Verify layout works at different viewport sizes

```bash
# Test at multiple breakpoints
for width in 375 768 1024 1920; do
  echo "Testing at ${width}px width"

  npx tsx -e "(async () => {
    const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
    await newPage.execute({
      url: 'http://localhost:3000',
      viewport: { width: ${width}, height: 800 }
    });
  })();" 2>/dev/null

  sleep 3

  npx tsx -e "(async () => {
    const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
    const result = await takeSnapshot.execute({});
    const fs = require('fs');
    fs.writeFileSync('layout-${width}px.png', Buffer.from(result.data, 'base64'));
  })();" 2>/dev/null
done

echo "✅ Snapshots captured for all breakpoints"
```

---

## Snapshot Analysis Patterns

### Pattern 1: Empty Screen Detection

**Problem**: Page loads but shows blank/white screen

**Analysis**:

1. Take snapshot
2. Check if page is actually blank or console errors prevented render
3. Correlate with console errors

```typescript
// Detect blank screen
const snapshot = await takeSnapshot.execute({});
const messages = await listConsoleMessages.execute({});

// If snapshot shows white screen AND errors exist
// → Console errors caused render failure

// If snapshot shows white screen AND no errors
// → CSS issue or loading state stuck
```

---

### Pattern 2: Layout Shift Detection

**Problem**: Elements move unexpectedly during page load

**Analysis**:

1. Take snapshot at 1s, 2s, 3s intervals
2. Compare to see which elements shifted
3. Identify async data loading or CSS issues

```bash
for i in 1 2 3; do
  sleep 1
  npx tsx -e "(async () => {
    const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
    const result = await takeSnapshot.execute({});
    const fs = require('fs');
    fs.writeFileSync('shift-${i}s.png', Buffer.from(result.data, 'base64'));
  })();" 2>/dev/null
done
```

---

### Pattern 3: Missing Element Verification

**Problem**: User reports element is missing

**Analysis**:

1. Take snapshot of current state
2. Verify element is truly missing (not just hidden)
3. Check console for rendering errors

```typescript
// Take snapshot
const snapshot = await takeSnapshot.execute({});

// Check console for relevant errors
const messages = await listConsoleMessages.execute({});
const renderErrors = messages.messages.filter(
  (m) =>
    m.text.includes("undefined") || m.text.includes("null") || m.text.includes("not a function")
);

// Correlate: Does snapshot show missing element?
// Do console errors explain why?
```

---

## Best Practices

### ✅ Do:

- **Take snapshot BEFORE reading console** (page state may change)
- **Save snapshots to files** for later comparison
- **Name files descriptively** (e.g., `before-fix.png`, `after-fix.png`)
- **Use snapshots to document bugs** for PRs or issues

### ❌ Don't:

- **Rely on snapshots alone** (console shows root cause)
- **Take snapshots during page load** (wait for stability)
- **Compare snapshots across different data** (use same test data)

---

## Snapshot Storage

### Recommended Storage Pattern

```
.output/debugging-chrome-console/
├── snapshots/
│   ├── before-fix-2024-01-15-14-30-00.png
│   ├── after-fix-2024-01-15-14-35-00.png
│   ├── crash-state-2024-01-15-15-00-00.png
│   └── ...
└── logs/
    ├── console-messages-2024-01-15-14-30-00.json
    └── ...
```

**Implementation**:

```bash
mkdir -p .output/debugging-chrome-console/snapshots
mkdir -p .output/debugging-chrome-console/logs

npx tsx -e "(async () => {
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  const result = await takeSnapshot.execute({});
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    \`.output/debugging-chrome-console/snapshots/snapshot-\${timestamp}.png\`,
    Buffer.from(result.data, 'base64')
  );
  console.log('Snapshot saved');
})();" 2>/dev/null
```

---

## Combining Snapshots with Console Analysis

### Complete Debugging Workflow

```bash
# 1. Launch and wait
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  await newPage.execute({ url: 'http://localhost:3000' });
})();" 2>/dev/null
sleep 3

# 2. Capture snapshot (WHAT is wrong)
npx tsx -e "(async () => {
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  const result = await takeSnapshot.execute({});
  const fs = require('fs');
  fs.writeFileSync('current-state.png', Buffer.from(result.data, 'base64'));
})();" 2>/dev/null

# 3. Read console (WHY it's wrong)
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const result = await listConsoleMessages.execute({});
  const fs = require('fs');
  fs.writeFileSync('console-messages.json', JSON.stringify(result, null, 2));
})();" 2>/dev/null

# 4. Analyze together
echo "Visual state: current-state.png"
echo "Console output: console-messages.json"
open current-state.png
cat console-messages.json
```

**Analysis checklist**:

- ✅ Does snapshot show the reported problem?
- ✅ Do console errors explain the visual issue?
- ✅ Can I reproduce the problem in snapshot?
- ✅ Does fixing console errors fix visual issue?

---

## Related References

- [Autonomous Debugging Workflow](workflow.md) - Where snapshots fit in the process
- [Chrome DevTools MCP Tools](chrome-devtools-tools.md) - Snapshot tool details
- [Iterative Fix Loop](iterative-loop.md) - Using snapshots for verification
