---
description: Natural language interface for Chrome DevTools - browser automation, network inspection, debugging
argument-hint: <describe your operation naturally>
allowed-tools: Bash, Read
---

# Chrome DevTools Management

**Speak naturally!** Just describe what you want after `/chrome` - I'll figure it out.

## 🚨 SETUP REQUIRED (One-Time)

Chrome DevTools MCP **connects to a running Chrome instance**. You must start Chrome with remote debugging **before** using these tools:

### macOS:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug &
```

### Linux:

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
```

### Windows:

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir=%TEMP%\chrome-debug
```

**Why?** The MCP connects to Chrome via WebSocket at `localhost:9222`. Without this, you'll get:

```
Error: Failed to fetch browser webSocket URL from http://localhost:9222/json/version
```

**Verify it's running:**

```bash
curl http://localhost:9222/json/version
# Should return Chrome version info
```

---

## Natural Language Examples

### Network Inspection

```bash
# All of these work:
/chrome show me the network requests
/chrome list all fetch and xhr requests
/chrome what network calls happened on this page
/chrome get the last 50 network requests
```

### Page Navigation

```bash
/chrome open a new page at https://example.com
/chrome navigate to https://app.chariot.com
/chrome go to the login page
/chrome create new tab for testing
```

### Debugging

```bash
/chrome take a screenshot
/chrome show console messages
/chrome what errors are in the console
/chrome take a full page screenshot
```

### Interaction

```bash
/chrome click the submit button
/chrome fill the email field with test@example.com
/chrome press Enter key
/chrome wait for "Success" text to appear
```

---

## How It Works

1. **You describe** your intent naturally
2. **I read** the Chrome DevTools skill for context and available operations
3. **I check** Chrome is running (localhost:9222)
4. **I execute** the appropriate wrapper
5. **I display** clean results

**No memorization needed!** Just tell me what you need.

---

## Implementation

When you invoke this command, I will:

1. Read the Chrome DevTools MCP tools skill:

```bash
Read: .claude/skill-library/claude/mcp-tools/mcp-tools-chrome-devtools/SKILL.md
```

2. Verify Chrome is running with remote debugging:

```bash
curl -s http://localhost:9222/json/version || echo "ERROR: Chrome not running with debugging"
```

3. Parse your natural language input to identify operation and parameters

4. Execute the matching wrapper operation

5. Format and display results

---

## What You Can Do

Based on the Chrome DevTools MCP (26 tools available):

**Page Management:**

- Create new pages/tabs
- Navigate to URLs
- Close pages
- List all open pages
- Select active page
- Resize viewport

**Interaction:**

- Click elements by UID
- Fill forms and inputs
- Press keys
- Drag elements
- Hover over elements
- Handle dialogs (accept/dismiss)

**Network Debugging:**

- List network requests (fetch/xhr)
- Get specific request details
- Filter by resource type
- Monitor API calls

**Console Debugging:**

- List console messages
- Get specific console message
- Filter by log level
- Monitor errors/warnings

**Performance:**

- Start/stop performance trace
- Analyze performance insights
- CPU throttling emulation

**Snapshots:**

- Take screenshots (partial or full page)
- Take DOM snapshots
- Save to file

**Advanced:**

- Execute JavaScript on page
- Upload files
- Wait for elements/text
- Network/CPU emulation

---

## Common Workflows

### Inspect Network Requests

```bash
/chrome list network requests

# I'll execute:
# 1. Verify Chrome running
# 2. List all fetch/xhr requests
# 3. Show: URL, method, status, response time
```

### Debug UI Issue

```bash
/chrome take full page screenshot and show console errors

# I'll execute:
# 1. Take screenshot → save to file
# 2. List console messages → filter errors
# 3. Display both results
```

### Automate Form Filling

```bash
/chrome navigate to https://example.com/login then fill email with test@example.com

# I'll execute:
# 1. Navigate to URL
# 2. Wait for page load
# 3. Find email input via snapshot
# 4. Fill with value
```

---

## Tips for Best Results

- **Start Chrome first**: `/chrome` tools require remote debugging enabled
- **Be specific**: "list fetch requests" is better than "show requests"
- **Use natural language**: I'll parse variations and figure it out
- **Check connection**: If tools fail, verify `curl localhost:9222` works

---

## Troubleshooting

### Error: "Failed to fetch browser webSocket URL"

**Cause**: Chrome not running with remote debugging
**Fix**: Run the setup command above

### Error: "No pages found"

**Cause**: No tabs open in debug Chrome instance
**Fix**: Open a tab in the Chrome instance you launched

### Tools are slow

**Cause**: Chrome debug instance has many tabs
**Fix**: Close unused tabs or restart Chrome

---

## Technical Reference

For developers or debugging, here are the underlying wrapper patterns:

### List Network Requests (Direct Execution)

```bash
npx tsx -e "(async () => {
  const { listNetworkRequests } = await import('./.claude/tools/chrome-devtools/list-network-requests.ts');
  const result = await listNetworkRequests.execute({
    resourceTypes: ['fetch', 'xhr'],
    pageSize: 30
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Take Screenshot (Direct Execution)

```bash
npx tsx -e "(async () => {
  const { takeScreenshot } = await import('./.claude/tools/chrome-devtools/take-screenshot.ts');
  const result = await takeScreenshot.execute({
    filePath: '/tmp/screenshot.png',
    fullPage: true
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### New Page (Direct Execution)

```bash
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  const result = await newPage.execute({
    url: 'https://example.com'
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```
