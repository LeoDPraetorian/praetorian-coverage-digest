---
name: mcp-tools-chrome-devtools
description: Use when accessing chrome-devtools services - provides 26 tools for click, close-page, drag, and more. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# Chrome devtools MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent chrome-devtools access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides chrome-devtools-specific tool catalog.

## Purpose

Enable granular agent access control for chrome-devtools operations.

**Include this skill when:** Agent needs chrome-devtools access
**Exclude this skill when:** Agent should NOT access chrome-devtools

## 🚨 SETUP REQUIRED

**Chrome must be running with remote debugging BEFORE using these tools.**

The chrome-devtools MCP **connects to** an already-running Chrome instance at `localhost:9222`. It does NOT launch Chrome for you.

### Start Chrome with Remote Debugging:

**macOS:**

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug &
```

**Linux:**

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
```

**Windows:**

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir=%TEMP%\chrome-debug
```

### Verify Chrome is Running:

```bash
curl http://localhost:9222/json/version
# Should return Chrome version info JSON
```

### Common Error Without Setup:

```
Error: Failed to fetch browser webSocket URL from http://localhost:9222/json/version: fetch failed
```

**Solution**: Start Chrome with the command above, then retry the MCP tool.

## Available Tools (Auto-discovered: 26 wrappers)

### click

- **Purpose:** Wrapper for chrome-devtools click tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { click } from '$ROOT/.claude/tools/chrome-devtools/click.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface ClickInput {
  uid: string; // The uid of an element from the page snapshot
}
```

### close-page

- **Purpose:** Wrapper for chrome-devtools close_page tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { closePage } from '$ROOT/.claude/tools/chrome-devtools/close-page.ts'`
- **Token cost:** ~unknown tokens

### drag

- **Purpose:** Wrapper for chrome-devtools drag tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { drag } from '$ROOT/.claude/tools/chrome-devtools/drag.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface DragInput {
  from_uid: string; // The uid of the element to drag
}
```

### emulate

- **Purpose:** Wrapper for chrome-devtools emulate tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { emulate } from '$ROOT/.claude/tools/chrome-devtools/emulate.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface EmulateInput {
  cpuThrottlingRate?: number; // CPU slowdown factor (1 = disabled)
}
```

### evaluate-script

- **Purpose:** Wrapper for chrome-devtools evaluate_script tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { evaluateScript } from '$ROOT/.claude/tools/chrome-devtools/evaluate-script.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface EvaluateScriptInput {
  function: string; // JavaScript function to execute
}
```

**Returns:**

```typescript
interface EvaluateScriptOutput {
  success: boolean;
}
```

### fill-form

- **Purpose:** Wrapper for chrome-devtools fill_form tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { fillForm } from '$ROOT/.claude/tools/chrome-devtools/fill-form.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface FillFormInput {
  elements: array; // Human-readable field name
  ref: string; // Element reference from snapshot
  type: enum;
}
```

### fill

- **Purpose:** Wrapper for chrome-devtools fill tool
- **Import:** `import { fill } from '$ROOT/.claude/tools/chrome-devtools/fill.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface FillInput {
  value: string;
}
```

### get-console-message

- **Purpose:** Wrapper for chrome-devtools get_console_message tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { getConsoleMessage } from '$ROOT/.claude/tools/chrome-devtools/get-console-message.ts'`
- **Token cost:** ~unknown tokens

**Returns:**

```typescript
interface GetConsoleMessageOutput {
  success: boolean;
}
```

### get-network-request

- **Purpose:** Wrapper for chrome-devtools get_network_request tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { getNetworkRequest } from '$ROOT/.claude/tools/chrome-devtools/get-network-request.ts'`
- **Token cost:** ~unknown tokens

**Returns:**

```typescript
interface GetNetworkRequestOutput {
  success: boolean;
}
```

### handle-dialog

- **Purpose:** Wrapper for chrome-devtools handle_dialog tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { handleDialog } from '$ROOT/.claude/tools/chrome-devtools/handle-dialog.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface HandleDialogInput {
  action: enum; // Whether to dismiss or accept the dialog
}
```

### hover

- **Purpose:** Wrapper for chrome-devtools hover tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { hover } from '$ROOT/.claude/tools/chrome-devtools/hover.ts'`
- **Token cost:** ~unknown tokens

### list-console-messages

- **Purpose:** Wrapper for chrome-devtools list_console_messages tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { listConsoleMessages } from '$ROOT/.claude/tools/chrome-devtools/list-console-messages.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface ListConsoleMessagesInput {
  includePreservedMessages?: boolean;
  pageIdx?: number;
  pageSize?: number;
}
```

**Returns:**

```typescript
interface ListConsoleMessagesOutput {
  success: boolean;
}
```

### list-network-requests

- **Purpose:** Wrapper for chrome-devtools list_network_requests tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { listNetworkRequests } from '$ROOT/.claude/tools/chrome-devtools/list-network-requests.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface ListNetworkRequestsInput {
  includePreservedRequests?: boolean;
  pageIdx?: number;
  pageSize?: number;
}
```

**Returns:**

```typescript
interface ListNetworkRequestsOutput {
  success: boolean;
}
```

### list-pages

- **Purpose:** Wrapper for chrome-devtools list_pages tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { listPages } from '$ROOT/.claude/tools/chrome-devtools/list-pages.ts'`
- **Token cost:** ~unknown tokens

**Returns:**

```typescript
interface ListPagesOutput {
  success: boolean;
}
```

### navigate-page

- **Purpose:** Wrapper for chrome-devtools navigate_page tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { navigatePage } from '$ROOT/.claude/tools/chrome-devtools/navigate-page.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface NavigatePageInput {
  type?: enum;
  url?: string;
  timeout?: number;
}
```

### new-page

- **Purpose:** Wrapper for chrome-devtools new_page tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { newPage } from '$ROOT/.claude/tools/chrome-devtools/new-page.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface NewPageInput {
  url: string; // URL to load in new page
}
```

### performance-analyze-insight

- **Purpose:** Wrapper for chrome-devtools performance_analyze_insight tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { performanceAnalyzeInsight } from '$ROOT/.claude/tools/chrome-devtools/performance-analyze-insight.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface PerformanceAnalyzeInsightInput {
  insightSetId: string; // The id for the specific insight set
  insightName: string;
}
```

**Returns:**

```typescript
interface PerformanceAnalyzeInsightOutput {
  success: boolean;
}
```

### performance-start-trace

- **Purpose:** Wrapper for chrome-devtools performance_start_trace tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { performanceStartTrace } from '$ROOT/.claude/tools/chrome-devtools/performance-start-trace.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface PerformanceStartTraceInput {
  reload: boolean; // Whether to reload page after starting trace
}
```

### performance-stop-trace

- **Purpose:** Wrapper for chrome-devtools performance_stop_trace tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { performanceStopTrace } from '$ROOT/.claude/tools/chrome-devtools/performance-stop-trace.ts'`
- **Token cost:** ~unknown tokens

**Returns:**

```typescript
interface PerformanceStopTraceOutput {
  success: boolean;
}
```

### press-key

- **Purpose:** Wrapper for chrome-devtools press_key tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { pressKey } from '$ROOT/.claude/tools/chrome-devtools/press-key.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface PressKeyInput {
  key: string;
}
```

### resize-page

- **Purpose:** Wrapper for chrome-devtools resize_page tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { resizePage } from '$ROOT/.claude/tools/chrome-devtools/resize-page.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface ResizePageInput {
  width: number; // Page width
}
```

### select-page

- **Purpose:** Wrapper for chrome-devtools select_page tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { selectPage } from '$ROOT/.claude/tools/chrome-devtools/select-page.ts'`
- **Token cost:** ~unknown tokens

### take-screenshot

- **Purpose:** Wrapper for chrome-devtools take_screenshot tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { takeScreenshot } from '$ROOT/.claude/tools/chrome-devtools/take-screenshot.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface TakeScreenshotInput {
  filePath?: string; // Path to save screenshot
  format?: enum;
  fullPage?: boolean; // Take full page screenshot
  quality?: number; // Quality for JPEG/WebP
}
```

**Returns:**

```typescript
interface TakeScreenshotOutput {
  success: boolean;
}
```

### take-snapshot

- **Purpose:** Wrapper for chrome-devtools take_snapshot tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { takeSnapshot } from '$ROOT/.claude/tools/chrome-devtools/take-snapshot.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface TakeSnapshotInput {
  filePath?: string; // Path to save snapshot
}
```

**Returns:**

```typescript
interface TakeSnapshotOutput {
  success: boolean;
}
```

### upload-file

- **Purpose:** Wrapper for chrome-devtools upload_file tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { uploadFile } from '$ROOT/.claude/tools/chrome-devtools/upload-file.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface UploadFileInput {
  uid: string; // Element uid from snapshot
}
```

### wait-for

- **Purpose:** Wrapper for chrome-devtools wait_for tool Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
- **Import:** `import { waitFor } from '$ROOT/.claude/tools/chrome-devtools/wait-for.ts'`
- **Token cost:** ~unknown tokens

**Parameters:**

```typescript
interface WaitForInput {
  text: string; // Text to appear on page
}
```

## Common Operations with Parameters

### List Network Requests

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { listNetworkRequests } = await import('$ROOT/.claude/tools/chrome-devtools/list-network-requests.ts');
  const result = await listNetworkRequests.execute({
    resourceTypes: ['fetch', 'xhr'],  // Optional: filter by type
    pageSize: 30,                      // Optional: default 20
    includePreservedRequests: false    // Optional: include preserved
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Key parameters:**

- `resourceTypes` - Array: ['fetch', 'xhr', 'script', 'stylesheet', 'image', 'document']
- `pageSize` - Number: How many requests to return (default 20)
- `pageIdx` - Number: Page number for pagination
- `includePreservedRequests` - Boolean: Include preserved requests

### New Page

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { newPage } = await import('$ROOT/.claude/tools/chrome-devtools/new-page.ts');
  const result = await newPage.execute({
    url: 'https://example.com',  // URL to load in new page
    timeout: 30000               // Optional: wait timeout in ms
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Take Screenshot

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { takeScreenshot } = await import('$ROOT/.claude/tools/chrome-devtools/take-screenshot.ts');
  const result = await takeScreenshot.execute({
    filePath: '/tmp/screenshot.png',  // Optional: where to save
    format: 'png',                    // Optional: png, jpeg, webp
    fullPage: true,                   // Optional: capture full page
    quality: 80                       // Optional: 0-100 for jpeg/webp
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### List Console Messages

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('$ROOT/.claude/tools/chrome-devtools/list-console-messages.ts');
  const result = await listConsoleMessages.execute({
    pageSize: 50,                     // Optional: default 20
    includePreservedMessages: false   // Optional: include preserved
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Navigate Page

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { navigatePage } = await import('$ROOT/.claude/tools/chrome-devtools/navigate-page.ts');
  const result = await navigatePage.execute({
    url: 'https://example.com',  // URL to navigate to
    type: 'load',                // Optional: 'load' or 'reload'
    timeout: 30000               // Optional: wait timeout in ms
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Execute JavaScript

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { evaluateScript } = await import('$ROOT/.claude/tools/chrome-devtools/evaluate-script.ts');
  const result = await evaluateScript.execute({
    function: 'document.querySelector(\"h1\").textContent'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Quick Reference

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Generic inline execution:**

```bash
# Note: 2>/dev/null suppresses MCP debug logs
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { toolName } = await import('$ROOT/.claude/tools/chrome-devtools/tool-name.ts');
  const result = await toolName.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
