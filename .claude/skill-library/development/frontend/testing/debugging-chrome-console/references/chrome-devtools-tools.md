# Chrome DevTools MCP Tools

Reference guide for Chrome DevTools MCP tools used in autonomous browser debugging.

## Table of Contents

- [Overview](#overview)
- [Available Tools](#available-tools)
- [Tool Usage Patterns](#tool-usage-patterns)
- [Common Workflows](#common-workflows)
- [Error Handling](#error-handling)

---

## Overview

The Chrome DevTools MCP provides programmatic access to browser automation and inspection. These tools are wrappers around the Chrome DevTools Protocol (CDP).

**MCP Server**: `chrome-devtools`
**Tool Prefix**: `mcp__chrome-devtools__*`
**Wrapper Location**: `.claude/tools/chrome-devtools/`

---

## Available Tools

### Core Tools for Debugging

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `new_page` | Launch Chrome and navigate to URL | `{ url: string }` | Page ID and status |
| `list_console_messages` | Read all console logs/errors | `{}` | Array of console messages |
| `list_pages` | List all open Chrome pages/tabs | `{}` | Array of page metadata |
| `take_snapshot` | Capture screenshot of current page | `{}` | Base64 encoded image |

### Advanced Tools

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `click` | Click element by selector | `{ selector: string }` | Click result |
| `wait_for` | Wait for element to appear | `{ selector: string, timeout: number }` | Wait result |
| `list_network_requests` | Get network activity | `{}` | Array of HTTP requests |
| `get_network_request` | Get specific request details | `{ requestId: string }` | Request/response data |

---

## Tool Usage Patterns

### 1. new_page

**Purpose**: Launch Chrome browser and navigate to a URL.

**Wrapper path**: `.claude/tools/chrome-devtools/new-page.ts`

**Usage**:

```bash
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  const result = await newPage.execute({
    url: 'http://localhost:3000/dashboard'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Input schema**:
```typescript
{
  url: string  // Full URL including protocol (http:// or https://)
}
```

**Output**:
```json
{
  "status": "success",
  "page": {
    "id": "E7B2A4C6D8F1...",
    "url": "http://localhost:3000/dashboard",
    "title": "Dashboard - My App"
  }
}
```

**Common errors**:
- `Connection refused`: Dev server not running
- `Timeout`: Page takes too long to load
- `Invalid URL`: Missing protocol or malformed URL

---

### 2. list_console_messages

**Purpose**: Read all console messages (logs, warnings, errors).

**Wrapper path**: `.claude/tools/chrome-devtools/list-console-messages.ts`

**Usage**:

```bash
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const result = await listConsoleMessages.execute({});
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Input schema**:
```typescript
{}  // No parameters required
```

**Output**:
```json
{
  "messages": [
    {
      "type": "error",
      "text": "TypeError: Cannot read properties of undefined",
      "source": "http://localhost:3000/static/js/bundle.js:1234:56",
      "timestamp": 1702845234567,
      "stackTrace": [
        {
          "functionName": "UserProfile",
          "url": "http://localhost:3000/static/js/bundle.js",
          "lineNumber": 1234,
          "columnNumber": 56
        }
      ]
    },
    {
      "type": "warning",
      "text": "React DevTools: version mismatch",
      "source": "console-api",
      "timestamp": 1702845234568
    },
    {
      "type": "log",
      "text": "API request completed",
      "source": "console-api",
      "timestamp": 1702845234569
    }
  ]
}
```

**Message types**:
- `error`: JavaScript errors, React errors, network failures
- `warning`: React warnings, deprecation notices
- `log`: `console.log()` output
- `info`: `console.info()` output
- `debug`: `console.debug()` output

**Filtering example**:

```typescript
// Filter only errors
const errors = messages.messages.filter(m => m.type === 'error');

// Filter out expected warnings
const realIssues = messages.messages.filter(m =>
  m.type === 'error' ||
  (m.type === 'warning' && !m.text.includes('React DevTools'))
);
```

---

### 3. take_snapshot

**Purpose**: Capture a screenshot of the current page state.

**Wrapper path**: `.claude/tools/chrome-devtools/take-snapshot.ts`

**Usage**:

```bash
npx tsx -e "(async () => {
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  const result = await takeSnapshot.execute({});
  console.log('Snapshot captured:', result.format);
})();" 2>/dev/null
```

**Input schema**:
```typescript
{}  // No parameters required
```

**Output**:
```json
{
  "format": "png",
  "data": "iVBORw0KGgoAAAANSUhEUgAA...",  // Base64 encoded
  "timestamp": 1702845234567
}
```

**Use cases**:
- Visual verification of UI state
- Debugging layout issues
- Capturing error state before crash
- Documentation of bug reproduction

---

### 4. list_pages

**Purpose**: List all open Chrome tabs/pages.

**Wrapper path**: `.claude/tools/chrome-devtools/list-pages.ts`

**Usage**:

```bash
npx tsx -e "(async () => {
  const { listPages } = await import('./.claude/tools/chrome-devtools/list-pages.ts');
  const result = await listPages.execute({});
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Output**:
```json
{
  "pages": [
    {
      "id": "E7B2A4C6D8F1...",
      "url": "http://localhost:3000/dashboard",
      "title": "Dashboard - My App"
    }
  ]
}
```

---

### 5. wait_for

**Purpose**: Wait for an element to appear on the page.

**Wrapper path**: `.claude/tools/chrome-devtools/wait-for.ts`

**Usage**:

```bash
npx tsx -e "(async () => {
  const { waitFor } = await import('./.claude/tools/chrome-devtools/wait-for.ts');
  const result = await waitFor.execute({
    selector: '[data-testid=\"user-profile\"]',
    timeout: 5000
  });
  console.log('Element appeared:', result.found);
})();" 2>/dev/null
```

**Input schema**:
```typescript
{
  selector: string  // CSS selector
  timeout?: number  // Milliseconds (default: 30000)
}
```

**Use cases**:
- Wait for async-rendered components
- Wait for API data to load
- Wait for modals/dialogs to appear

---

### 6. list_network_requests

**Purpose**: Get all network requests (API calls, resource loads).

**Wrapper path**: `.claude/tools/chrome-devtools/list-network-requests.ts`

**Usage**:

```bash
npx tsx -e "(async () => {
  const { listNetworkRequests } = await import('./.claude/tools/chrome-devtools/list-network-requests.ts');
  const result = await listNetworkRequests.execute({});
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Output**:
```json
{
  "requests": [
    {
      "requestId": "1234.5",
      "url": "http://localhost:3000/api/users",
      "method": "GET",
      "status": 200,
      "type": "xhr",
      "timestamp": 1702845234567
    },
    {
      "requestId": "1234.6",
      "url": "http://localhost:3000/api/settings",
      "method": "GET",
      "status": 404,
      "type": "xhr",
      "timestamp": 1702845234568
    }
  ]
}
```

**Use cases**:
- Debugging API failures (404, 500)
- Identifying slow requests
- Checking request order

---

## Common Workflows

### Workflow 1: Basic Error Check

```bash
# 1. Launch Chrome
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  await newPage.execute({ url: 'http://localhost:3000' });
})();" 2>/dev/null

# 2. Wait for load
sleep 3

# 3. Read console
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const result = await listConsoleMessages.execute({});
  const errors = result.messages.filter(m => m.type === 'error');
  console.log('Errors found:', errors.length);
  console.log(JSON.stringify(errors, null, 2));
})();" 2>/dev/null
```

### Workflow 2: API Error Debugging

```bash
# 1. Launch Chrome
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  await newPage.execute({ url: 'http://localhost:3000/dashboard' });
})();" 2>/dev/null

# 2. Wait for network activity
sleep 5

# 3. Check network requests
npx tsx -e "(async () => {
  const { listNetworkRequests } = await import('./.claude/tools/chrome-devtools/list-network-requests.ts');
  const result = await listNetworkRequests.execute({});
  const failed = result.requests.filter(r => r.status >= 400);
  console.log('Failed requests:', JSON.stringify(failed, null, 2));
})();" 2>/dev/null

# 4. Check console for API errors
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const result = await listConsoleMessages.execute({});
  const apiErrors = result.messages.filter(m =>
    m.type === 'error' && m.text.includes('fetch')
  );
  console.log('API errors:', JSON.stringify(apiErrors, null, 2));
})();" 2>/dev/null
```

### Workflow 3: Visual Verification

```bash
# 1. Launch Chrome
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  await newPage.execute({ url: 'http://localhost:3000/login' });
})();" 2>/dev/null

# 2. Wait for render
sleep 3

# 3. Take snapshot
npx tsx -e "(async () => {
  const { takeSnapshot } = await import('./.claude/tools/chrome-devtools/take-snapshot.ts');
  const result = await takeSnapshot.execute({});
  console.log('Snapshot captured');
})();" 2>/dev/null

# 4. Check console for rendering errors
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const result = await listConsoleMessages.execute({});
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

---

## Error Handling

### Connection Errors

**Error**: `Failed to connect to Chrome`

**Causes**:
- Chrome DevTools MCP not configured
- Chrome not installed
- Permissions issue

**Solution**:
```bash
# Check MCP configuration
cat .mcp.json | grep chrome-devtools

# Verify Chrome is installed
which google-chrome || which chromium
```

### Timeout Errors

**Error**: `Navigation timeout exceeded`

**Causes**:
- Page takes too long to load
- Dev server crashed
- Infinite redirect loop

**Solution**:
```bash
# Check if dev server responds
curl -I http://localhost:3000

# Increase wait time
sleep 10  # Instead of sleep 3
```

### Empty Results

**Error**: `listConsoleMessages` returns empty array

**Causes**:
- Page hasn't loaded yet
- No errors on page
- Console cleared before reading

**Solution**:
```bash
# Wait longer for async rendering
sleep 5

# Check if page loaded
npx tsx -e "(async () => {
  const { listPages } = await import('./.claude/tools/chrome-devtools/list-pages.ts');
  const result = await listPages.execute({});
  console.log('Pages:', JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

---

## Related References

- [Autonomous Debugging Workflow](workflow.md) - Complete debugging process
- [Common Error Patterns](error-patterns.md) - Error-specific guidance
- [Console Filtering](console-filtering.md) - Advanced filtering techniques
