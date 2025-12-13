# Autonomous Debugging Workflow

Complete step-by-step workflow for autonomous browser debugging with validation loops.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Launch Chrome](#step-1-launch-chrome)
- [Step 2: Analyze Console](#step-2-analyze-console)
- [Step 3: Fix Issues](#step-3-fix-issues)
- [Step 4: Verify Fix (Feedback Loop)](#step-4-verify-fix-feedback-loop)
- [Step 5: Iterate](#step-5-iterate)
- [Exit Criteria](#exit-criteria)
- [Troubleshooting](#troubleshooting)

---

## Overview

The autonomous debugging workflow is a **self-correcting feedback loop**:

```
┌─────────────────────────────────────────┐
│  1. Launch Chrome & Navigate            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Read Console Messages               │
│     - Filter errors vs warnings         │
│     - Identify root cause               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Fix Identified Issues               │
│     - Locate problematic code           │
│     - Apply fixes                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Verify Fix                          │
│     - Reload page                       │
│     - Re-read console                   │
└──────────────┬──────────────────────────┘
               │
               ▼
         Errors remain?
         YES: Loop to step 3
         NO: Done ✅
```

**Key principle**: Never assume fixes work. Always verify in browser and iterate.

---

## Prerequisites

Before starting the debugging workflow:

1. **Dev server must be running**: Ensure `npm start` or equivalent is active
2. **Know the URL**: Identify which page/route has the error
3. **Have Chrome DevTools MCP configured**: Verify MCP tools are available

**Verify prerequisites:**

```bash
# Check if dev server is running (example for port 3000)
curl -s http://localhost:3000 > /dev/null && echo "✅ Dev server running" || echo "❌ Start dev server first"

# Check Chrome DevTools MCP tools available
npx tsx -e "(async () => {
  try {
    const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
    console.log('✅ Chrome DevTools MCP available');
  } catch {
    console.log('❌ Chrome DevTools MCP not configured');
  }
})();"
```

---

## Step 1: Launch Chrome

**Goal**: Open Chrome browser and navigate to the problematic page.

### 1.1 Launch Chrome with Target URL

```bash
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  const result = await newPage.execute({
    url: 'http://localhost:3000/problematic-route'
  });
  console.log('Chrome launched:', JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Expected output:**

```json
{
  "status": "success",
  "page": {
    "id": "...",
    "url": "http://localhost:3000/problematic-route"
  }
}
```

### 1.2 Wait for Page Load

**Important**: Give the page time to fully load before reading console (typically 2-5 seconds for modern SPAs).

```bash
# Wait for page load (use Bash sleep)
sleep 3
```

**Alternative**: Use `mcp__chrome-devtools__wait_for` if you need to wait for specific elements.

---

## Step 2: Analyze Console

**Goal**: Read console messages and identify errors that need fixing.

### 2.1 Read All Console Messages

```bash
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const messages = await listConsoleMessages.execute({});
  console.log(JSON.stringify(messages, null, 2));
})();" 2>/dev/null
```

**Expected output:**

```json
{
  "messages": [
    {
      "type": "error",
      "text": "TypeError: Cannot read properties of undefined (reading 'name')",
      "source": "http://localhost:3000/static/js/bundle.js:1234:56",
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
      "source": "console-api"
    }
  ]
}
```

### 2.2 Filter and Prioritize

**Filter out expected warnings:**
- React DevTools messages
- Third-party library warnings (unless relevant)
- Build-time warnings (Webpack, Vite)

**Prioritize errors:**
1. **JavaScript errors** (TypeError, ReferenceError, etc.)
2. **React errors** (rendering errors, hook violations)
3. **API errors** (network failures, 404s, 500s)
4. **Import errors** (module not found)

### 2.3 Identify Root Cause

**From the error message, determine:**
- **What broke**: Which component/function has the error?
- **Why it broke**: What's the root cause (undefined variable, missing prop, etc.)?
- **Where to fix**: Which file needs modification (from stack trace)?

**Example analysis:**

```
Error: "Cannot read properties of undefined (reading 'name')"
Location: UserProfile component, line 1234

Root cause: `user` object is undefined
Fix needed: Add null check or default value
File: src/components/UserProfile.tsx
```

---

## Step 3: Fix Issues

**Goal**: Modify code to resolve the identified errors.

### 3.1 Locate Problematic Code

Use the stack trace to find the exact file and line number:

```bash
# Read the file containing the error
Read src/components/UserProfile.tsx
```

**Look for the error location** mentioned in the stack trace.

### 3.2 Apply Fix

**Common fix patterns:**

**Pattern 1: Null/Undefined Check**
```typescript
// ❌ Before (error)
<div>{user.name}</div>

// ✅ After (fixed)
<div>{user?.name ?? 'Unknown'}</div>
```

**Pattern 2: Missing Prop**
```typescript
// ❌ Before (error)
<UserProfile />

// ✅ After (fixed)
<UserProfile user={currentUser} />
```

**Pattern 3: Import Error**
```typescript
// ❌ Before (error)
import { Button } from './Button';

// ✅ After (fixed)
import { Button } from '@/components/Button';
```

**Pattern 4: React Hook Violation**
```typescript
// ❌ Before (error)
if (condition) {
  const [state, setState] = useState(0);
}

// ✅ After (fixed)
const [state, setState] = useState(0);
if (condition) {
  // Use state here
}
```

### 3.3 Make the Edit

```bash
# Use Edit tool to modify the file
Edit src/components/UserProfile.tsx \
  --old-string '<div>{user.name}</div>' \
  --new-string '<div>{user?.name ?? "Unknown"}</div>'
```

---

## Step 4: Verify Fix (Feedback Loop)

**🚨 CRITICAL: You MUST verify the fix in the browser. Never skip this step.**

### 4.1 Reload the Page

**Option A: Refresh current page**
```bash
# Reload the page (trigger browser refresh)
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  await newPage.execute({
    url: 'http://localhost:3000/problematic-route'
  });
})();" 2>/dev/null

# Wait for reload
sleep 3
```

**Option B: Re-launch Chrome** (if page is stuck)
```bash
# Close and re-open
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  await newPage.execute({
    url: 'http://localhost:3000/problematic-route'
  });
})();" 2>/dev/null
```

### 4.2 Re-Read Console Messages

```bash
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const messages = await listConsoleMessages.execute({});
  console.log(JSON.stringify(messages, null, 2));
})();" 2>/dev/null
```

### 4.3 Compare Results

**Check if:**
- ✅ **Error is gone**: The specific error no longer appears
- ⚠️ **New errors appeared**: Your fix introduced a different problem
- ❌ **Same error persists**: Fix didn't work or different root cause

---

## Step 5: Iterate

**Pattern: Run validator → fix errors → repeat**

### 5.1 If Errors Remain

**Go back to Step 2** (Analyze Console) and repeat:
- Analyze remaining errors
- Fix the next issue
- Verify fix
- Continue loop

### 5.2 If Console is Clean

**Exit criteria met** - proceed to completion:
- Document errors fixed
- Report final console state
- List files modified

### 5.3 If New Errors Appeared

**Rollback or fix forward:**

**Option A: Rollback the fix**
```bash
# Revert the last edit if it made things worse
git restore src/components/UserProfile.tsx
```

**Option B: Fix forward**
```bash
# Address the new error with another fix
# Then verify again
```

---

## Exit Criteria

**The debugging loop is complete when:**

1. ✅ **Zero errors** in console messages (error type)
2. ✅ **Page loads successfully** (no crash or blank screen)
3. ✅ **Expected functionality works** (user can interact with UI)
4. ⚠️ **Warnings are acceptable** (React DevTools, third-party libraries)

**Final verification:**

```bash
# Read console one last time
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const messages = await listConsoleMessages.execute({});
  const errors = messages.messages.filter(m => m.type === 'error');

  if (errors.length === 0) {
    console.log('✅ Console is clean - no errors');
  } else {
    console.log('❌ Errors remain:', JSON.stringify(errors, null, 2));
  }
})();" 2>/dev/null
```

**If errors remain**: Loop back to Step 2.

---

## Troubleshooting

### Chrome Won't Launch

**Problem**: `newPage.execute()` times out or fails

**Solutions**:
1. Check dev server is running: `curl http://localhost:3000`
2. Verify URL is correct (no typos)
3. Check Chrome DevTools MCP is configured in `.mcp.json`
4. Try killing existing Chrome processes: `pkill -f chrome`

### No Console Messages

**Problem**: `listConsoleMessages` returns empty array

**Solutions**:
1. Wait longer for page load: `sleep 5`
2. Check if page actually loaded (use `take_snapshot` to see)
3. Verify URL is correct
4. Check if errors appear later (async rendering)

### Same Error Persists After Fix

**Problem**: Fixed the code but error still appears in console

**Solutions**:
1. **Hard reload**: Browser cache may be serving old code
2. **Check source maps**: Error location may be incorrect due to bundling
3. **Different root cause**: Error message is misleading, dig deeper
4. **Multiple instances**: Same error in different files

### Too Many Errors

**Problem**: Console has 50+ errors, overwhelming

**Solutions**:
1. **Filter by severity**: Focus on errors, ignore warnings
2. **Fix root cause first**: One fix may resolve multiple errors
3. **Group by type**: Fix all "undefined" errors, then move to next type
4. **Take incremental approach**: Fix one, verify, repeat

### Page Crashes

**Problem**: Page goes blank or freezes after reload

**Solutions**:
1. **Take snapshot before crash**: See what UI looked like
2. **Check for infinite loops**: Console may show recursion errors
3. **Rollback last change**: Your fix may have broken something
4. **Check network tab**: API failures can cause crashes

---

## Related References

- [Chrome DevTools MCP Tools](chrome-devtools-tools.md) - Tool reference
- [Common Error Patterns](error-patterns.md) - Error-specific fixes
- [Iterative Fix Loop](iterative-loop.md) - Deep dive on iteration strategy
