---
name: debugging-chrome-console
description: Autonomous browser debugging workflow. Use when fixing frontend runtime errors - launches Chrome, analyzes console logs, iteratively fixes issues until console is clean.
allowed-tools: Bash, Read, Write, Edit, mcp__chrome-devtools__new_page, mcp__chrome-devtools__list_console_messages, mcp__chrome-devtools__take_snapshot
---

# Debugging Chrome Console

## When to Use This Skill

Use this skill when:

- User reports frontend runtime errors or "check the console" messages
- You need to verify if code changes fixed browser errors
- Debugging React errors, API failures, or JavaScript exceptions
- User asks to "debug the console" or "fix browser errors"
- You made frontend changes and need to verify they work in the browser

**Symptoms that trigger this skill:**

- "There's an error in the browser console"
- "The page isn't working"
- "I'm seeing [error message] in DevTools"
- "Can you check if there are any console errors?"

## Quick Start

**Basic autonomous debugging loop:**

1. Launch Chrome and navigate to the problematic page
2. Read console messages to identify errors
3. Fix the identified issues
4. Reload and verify console is clean
5. Repeat until no errors remain

**Example workflow:**

```bash
# 1. Launch Chrome with the app URL
npx tsx -e "(async () => {
  const { newPage } = await import('./.claude/tools/chrome-devtools/new-page.ts');
  await newPage.execute({ url: 'http://localhost:3000/problematic-route' });
})();"

# 2. Read console messages
npx tsx -e "(async () => {
  const { listConsoleMessages } = await import('./.claude/tools/chrome-devtools/list-console-messages.ts');
  const messages = await listConsoleMessages.execute({});
  console.log(JSON.stringify(messages, null, 2));
})();"

# 3. Fix errors based on console output
# 4. Reload page and repeat step 2
# 5. Continue until console is clean
```

## Table of Contents

This skill is organized into detailed reference documents. Read them as needed:

### Core Workflow

- **[Autonomous Debugging Workflow](references/workflow.md)** - Step-by-step debugging loop with validation
- **[Chrome DevTools MCP Tools](references/chrome-devtools-tools.md)** - Available MCP tools and usage patterns

### Debugging Patterns

- **[Common Error Patterns](references/error-patterns.md)** - React errors, API failures, import issues
- **[Iterative Fix Loop](references/iterative-loop.md)** - How to loop until console is clean

### Advanced Techniques

- **[Console Filtering](references/console-filtering.md)** - Ignore expected warnings, focus on real errors
- **[Snapshot Analysis](references/snapshot-analysis.md)** - Visual verification with screenshots

## Core Workflow

The autonomous debugging workflow follows this pattern:

**1. Launch & Navigate**

- Start Chrome with `mcp__chrome-devtools__new_page`
- Navigate to the problematic URL
- Wait for page load completion

**2. Analyze Console**

- Read console messages with `mcp__chrome-devtools__list_console_messages`
- Filter for errors and warnings (ignore expected messages)
- Identify root cause from error stack traces

**3. Fix Issues**

- Locate the problematic code file
- Apply fixes based on error messages
- Use Edit tool to modify code

**4. Verify Fix**

- Reload the page in Chrome
- Re-read console messages
- Check if errors are resolved

**5. Iterate**

- **If errors remain**: Return to step 3
- **If console is clean**: Done, report success

See [Detailed Workflow](references/workflow.md) for complete step-by-step instructions with validation loops.

## Best Practices

**Do:**

- ✅ **Always reload** the page after code changes
- ✅ **Read console** after every reload to verify fixes
- ✅ **Filter noise** - ignore expected warnings (React DevTools, third-party libraries)
- ✅ **Fix root causes** - don't just silence errors, solve the underlying problem
- ✅ **Iterate until clean** - continue loop until zero errors remain
- ✅ **Take snapshots** for visual verification of UI state
- ✅ **Check network tab** if API-related errors occur

**Don't:**

- ❌ **Assume fixes work** without verifying in browser
- ❌ **Stop at first fix** - there may be multiple errors
- ❌ **Ignore warnings** that indicate real problems
- ❌ **Skip the reload step** - browser cache may hide issues
- ❌ **Fix blindly** - always read console output first

## Critical Rules

### Non-Negotiable Constraints

**1. Always Verify in Browser**
You MUST reload the page and read console messages after every code change. Never assume a fix worked without browser verification.

**2. Iterate Until Clean**
The debugging loop continues until `listConsoleMessages` returns zero errors. Partial fixes are not completion.

**3. Use MCP Tools, Not Manual Steps**
Do NOT ask the user to manually open Chrome or copy console errors. Use the Chrome DevTools MCP tools autonomously.

**4. Fix Root Causes**
Don't suppress errors with try-catch blocks unless that's the proper solution. Solve the underlying problem.

## Quick Troubleshooting

| Problem              | Solution                                                    |
| -------------------- | ----------------------------------------------------------- |
| Chrome not launching | Ensure local dev server is running first (`npm start`)      |
| No console messages  | Page may not have loaded - check URL and wait longer        |
| Too many warnings    | Filter by severity: focus on `error` level first            |
| Same error persists  | Error may be coming from different file - check stack trace |
| Page crashes         | Take snapshot before crash to see UI state                  |

## Output Format

When completing the debugging workflow, report:

```
✅ Debugging Complete

Errors Fixed:
1. [Error 1] - Fixed by [action taken]
2. [Error 2] - Fixed by [action taken]

Final Console State:
- Errors: 0
- Warnings: 2 (expected - React DevTools)

Files Modified:
- path/to/file1.tsx
- path/to/file2.ts

Verification:
- Page loads successfully
- Console is clean (no errors)
- User-facing functionality works
```

## Related Skills

- `frontend-browser-test-engineer` - E2E testing with Playwright (for automated test creation)
- `debugging-systematically` - General debugging methodology (for non-browser issues)
- `react-developer` - React-specific patterns (for React error fixes)
- `gateway-mcp-tools` - MCP tool catalog (for other browser automation tasks)
