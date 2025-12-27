# Linear API Patterns

Implementation details for creating Linear tickets via MCP wrappers, including quirks, limitations, and troubleshooting.

## Wrapper Architecture

### Why Use Wrappers?

**Direct MCP approach (old):**

- ❌ 15,000+ tokens consumed at session start
- ❌ Full Linear API schema loaded immediately
- ❌ Every tool definition in context

**TypeScript wrapper approach (current):**

- ✅ 0 tokens at session start
- ✅ On-demand loading via `npx tsx`
- ✅ Token-optimized responses

**Location**: `.claude/tools/linear/`

### Available Wrappers

| Wrapper           | Purpose                         |
| ----------------- | ------------------------------- |
| `create-issue.ts` | Create new issue/epic/sub-issue |
| `update-issue.ts` | Update existing issue fields    |
| `list-users.ts`   | Get Linear users for assignment |
| `list-teams.ts`   | Get available teams             |
| `list-cycles.ts`  | Get sprint/cycle information    |

---

## Creating Issues

### Basic Usage

```typescript
import { createIssue } from "./.claude/tools/linear/create-issue.js";

const result = await createIssue.execute({
  team: "Chariot",
  title: "Issue Title",
  description: "Issue description in Markdown",
  priority: 2, // 0=None, 1=Urgent, 2=High, 3=Normal, 4=Low
});

// Returns:
// {
//   success: true,
//   issue: {
//     id: "uuid",
//     identifier: "CHARIOT-1234",
//     title: "Issue Title",
//     url: "https://linear.app/..."
//   }
// }
```

### Field Reference

**Required:**

- `team`: String - Team name or ID

**Common:**

- `title`: String - Issue title
- `description`: String - Markdown description (supports newlines, code blocks, etc.)
- `priority`: Number - 0=None, 1=Urgent, 2=High, 3=Normal, 4=Low

**Optional:**

- `assignee`: String - User ID, name, email, or "me"
- `state`: String - State name or ID
- `project`: String - Project name or ID
- `labels`: String[] - Label names or IDs
- `dueDate`: String - ISO date format
- `parentId`: String - Parent issue ID (for sub-issues)

### Creating Sub-Issues

**Step 1: Create Epic**

```typescript
const epicResult = await createIssue.execute({
  team: "Chariot",
  title: "Epic: Feature Name",
  description: epicDescription,
  priority: 2,
});

const epicId = epicResult.issue.id; // Save this!
```

**Step 2: Create Sub-Issues**

```typescript
const subIssue1 = await createIssue.execute({
  team: "Chariot",
  title: "Sub-Issue: Component A",
  description: subIssueDescription,
  priority: 2,
  parentId: epicId, // Link to parent
});
```

---

## Input Validation & Sanitization

### Control Character Handling

The wrapper validates input to prevent security issues while allowing markdown:

**Allowed (via `validateNoControlCharsAllowWhitespace`):**

- ✅ Newlines (`\n`)
- ✅ Tabs (`\t`)
- ✅ Carriage returns (`\r`)

**Blocked:**

- ❌ Null bytes (`\x00`)
- ❌ Backspace (`\x08`)
- ❌ Form feed (`\x0C`)
- ❌ Other control characters (`\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`, `\x7F`)

**Implementation:**

```typescript
// In sanitize.ts
const DANGEROUS_CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

export function validateNoControlCharsAllowWhitespace(input: string): boolean {
  return !DANGEROUS_CONTROL_CHAR_PATTERN.test(input);
}
```

### Common Validation Errors

**Error: "Control characters not allowed"**

**Cause**: Description contains dangerous control characters

**Solutions:**

1. **Check for non-printable characters**

   ```bash
   cat -A /tmp/description.md  # Shows all characters
   ```

2. **Remove emojis** (can contain problematic bytes)

   ```typescript
   description = description.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
   ```

3. **Verify no hidden characters from copy-paste**
   - Copy from source → Paste into plain text editor → Re-copy

**Error: "Path traversal not allowed"**

**Cause**: Team/project/label names contain `../` or similar

**Solution**: Use proper names, not file paths

**Error: "Invalid characters detected"**

**Cause**: Shell metacharacters in input (`;`, `|`, `` ` ``, `$`)

**Solution**: Avoid these in team/project names (shouldn't occur in descriptions)

---

## Field Length Limits

Linear has undocumented field length limits. If you exceed them, the API will reject the request.

### Practical Limits (Empirical)

| Field         | Estimated Limit    | Recommendation                    |
| ------------- | ------------------ | --------------------------------- |
| `title`       | ~200 characters    | Keep under 150                    |
| `description` | ~50,000 characters | Keep under 10,000 for readability |

### Handling Long Descriptions

**Problem**: Epic description is 15,000 words with exhaustive details

**Solution**: Use progressive disclosure

1. Keep core content in description (<5,000 words)
2. Link to external docs for exhaustive details
3. Use collapsible sections (`<details>` tags)

**Example:**

```markdown
## Overview

[2-3 paragraph summary]

## Architecture

[Diagram]

## Implementation Phases

[High-level phases]

## Detailed Specifications

<details>
<summary>Click to expand full technical specs</summary>

[Exhaustive details here]

</details>
```

---

## Error Handling

### Wrapper Error Responses

**Success:**

```json
{
  "success": true,
  "issue": {
    "id": "uuid",
    "identifier": "CHARIOT-1234",
    "url": "https://..."
  }
}
```

**Failure:**

```json
{
  "success": false,
  "error": "Descriptive error message from Linear API"
}
```

### Common Errors

**"Team not found"**

**Cause**: Team name typo or team doesn't exist

**Solution**:

```typescript
// List available teams first
import { listTeams } from "./.claude/tools/linear/list-teams.js";
const teams = await listTeams.execute({});
console.log(teams); // Find correct team name
```

**"Invalid issue ID"**

**Cause**: Parent ID incorrect or doesn't exist

**Solution**: Verify epic was created successfully and save correct ID from response

**"Unauthorized"**

**Cause**: Linear credentials missing or expired

**Solution**: Check Linear OAuth tokens in `~/.mcp-auth/` or credentials in config

---

## Best Practices

### 1. Always Validate Responses

```typescript
const result = await createIssue.execute({...});

if (!result.success) {
  console.error('Failed to create issue:', result.error);
  // Handle error appropriately
  return;
}

console.log(`Created: ${result.issue.identifier}`);
```

### 2. Save Parent IDs for Sub-Issues

```typescript
// ✅ CORRECT
const epicResult = await createIssue.execute({...});
const epicId = epicResult.issue.id;

for (const subIssue of subIssues) {
  await createIssue.execute({
    ...subIssue,
    parentId: epicId
  });
}
```

```typescript
// ❌ WRONG - Hardcoded IDs
await createIssue.execute({
  ...subIssue,
  parentId: "12345", // This won't work!
});
```

### 3. Use Appropriate Priority

| Priority | Value | When to Use                         |
| -------- | ----- | ----------------------------------- |
| Urgent   | 1     | Critical bugs, security issues      |
| High     | 2     | Feature work, important initiatives |
| Normal   | 3     | Standard work, minor improvements   |
| Low      | 4     | Nice-to-haves, backlog items        |
| None     | 0     | Unprior itized, needs triage        |

**Default for epics:** Priority 2 (High)

### 4. Batch Operations Carefully

```typescript
// Create epic first
const epic = await createIssue.execute({...});

// Then create sub-issues sequentially
for (const subIssue of subIssues) {
  const result = await createIssue.execute({
    ...subIssue,
    parentId: epic.issue.id
  });

  if (!result.success) {
    console.error(`Failed: ${subIssue.title}`);
    // Continue with others or stop?
  }
}
```

**Why sequential?**

- Easier to debug which sub-issue failed
- Can log progress
- Avoids rate limiting issues

---

## Updating Issues

### Basic Update

```typescript
import { updateIssue } from "./.claude/tools/linear/update-issue.js";

await updateIssue.execute({
  id: "CHARIOT-1234", // Or UUID
  description: newDescription,
  assignee: "me",
});
```

### Partial Updates

Only provided fields are updated:

```typescript
// Only update description, leave everything else unchanged
await updateIssue.execute({
  id: "CHARIOT-1234",
  description: newDescription,
});
```

---

## Troubleshooting Checklist

Before creating tickets, verify:

- [ ] Epic description complete and <10,000 words
- [ ] Sub-issue descriptions complete
- [ ] No dangerous control characters in any field
- [ ] Team name correct (use `listTeams` to verify)
- [ ] Priority values are 0-4
- [ ] Parent ID will be captured from epic creation
- [ ] Error handling in place for all API calls

---

## Related Files

**Wrapper implementations:**

- `.claude/tools/linear/create-issue.ts`
- `.claude/tools/linear/update-issue.ts`
- `.claude/tools/config/lib/sanitize.ts` (validation functions)

**Documentation:**

- `docs/MCP-TOOLS-ARCHITECTURE.md` - Wrapper architecture overview
- `.claude/skill-library/claude/mcp-tools/mcp-tools-linear/SKILL.md` - Linear MCP tool catalog
