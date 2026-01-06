# Jira Custom Fields Reference

**Discovery, field types, and update patterns for Jira custom fields.**

## Understanding Custom Field IDs

Custom fields have unique IDs like `customfield_10001` that **vary by Jira instance**. Never hardcode these IDs - always discover them at runtime.

**Why IDs vary**:

- Created in different order per instance
- Plugins create fields with different IDs
- Field IDs are globally unique per Jira installation

## Field Discovery

### Primary Method: Get All Fields

```typescript
// Fetch all fields
const response = await fetch(`${baseUrl}/rest/api/3/field`, {
  headers: { Authorization: auth, Accept: "application/json" },
});

const fields = await response.json();

// Find custom field by name
const storyPointsField = fields.find((f) => f.name === "Story Points");
console.log(storyPointsField);
// {
//   id: "customfield_10016",
//   name: "Story Points",
//   custom: true,
//   schema: { type: "number", custom: "com.atlassian.jira.plugin.system.customfieldtypes:float" }
// }
```

**Response Structure**:

```json
[
  {
    "id": "customfield_10016",
    "key": "customfield_10016",
    "name": "Story Points",
    "custom": true,
    "orderable": true,
    "navigable": true,
    "searchable": true,
    "clauseNames": ["cf[10016]", "Story Points"],
    "schema": {
      "type": "number",
      "custom": "com.atlassian.jira.plugin.system.customfieldtypes:float",
      "customId": 10016
    }
  }
]
```

### Alternative: Create Issue Metadata (Jira 8.4+)

Get fields available for specific project/issue type:

```typescript
const response = await fetch(
  `${baseUrl}/rest/api/3/issue/createmeta/${projectKey}/issuetypes/${issueTypeId}`,
  { headers: { Authorization: auth, Accept: "application/json" } }
);

const metadata = await response.json();
// Contains only fields valid for that project/issue type
```

### Caching Strategy

Cache field metadata for 24 hours (fields rarely change):

```typescript
class FieldCache {
  private fields: Map<string, Field> = new Map();
  private fieldsByName: Map<string, Field> = new Map();
  private lastFetch: number = 0;
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  async getFieldByName(name: string): Promise<Field | undefined> {
    await this.ensureFresh();
    return this.fieldsByName.get(name);
  }

  async getFieldById(id: string): Promise<Field | undefined> {
    await this.ensureFresh();
    return this.fields.get(id);
  }

  private async ensureFresh() {
    if (Date.now() - this.lastFetch > this.TTL) {
      await this.refresh();
    }
  }

  private async refresh() {
    const fields = await fetch(`${baseUrl}/rest/api/3/field`, {
      headers: { Authorization: auth, Accept: "application/json" },
    }).then((r) => r.json());

    this.fields = new Map(fields.map((f) => [f.id, f]));
    this.fieldsByName = new Map(fields.map((f) => [f.name, f]));
    this.lastFetch = Date.now();
  }

  invalidate() {
    this.lastFetch = 0;
  }
}
```

## Field Types and Input Formats

### Text Fields

**Single-line text**:

```typescript
// Read
const value = issue.fields.customfield_10001; // "Some text"

// Write
await updateIssue(issueKey, {
  customfield_10001: "New text value",
});
```

**Multi-line text (textarea)**:

```typescript
// Read
const value = issue.fields.customfield_10002; // "Line 1\nLine 2"

// Write
await updateIssue(issueKey, {
  customfield_10002: "Multi-line\ntext value",
});
```

### Number Fields

```typescript
// Read
const storyPoints = issue.fields.customfield_10016; // 5

// Write
await updateIssue(issueKey, {
  customfield_10016: 8,
});
```

### Date Fields

**Date only**:

```typescript
// Read
const dueDate = issue.fields.customfield_10003; // "2026-01-15"

// Write (ISO 8601 date)
await updateIssue(issueKey, {
  customfield_10003: "2026-01-15",
});
```

**Date and time**:

```typescript
// Read
const startTime = issue.fields.customfield_10004; // "2026-01-15T09:00:00.000+0000"

// Write (ISO 8601 datetime)
await updateIssue(issueKey, {
  customfield_10004: "2026-01-15T09:00:00.000+0000",
});
```

### Select Fields (Single)

```typescript
// Read
const priority = issue.fields.customfield_10005;
// { id: "10001", self: "...", value: "High" }

// Write - by value
await updateIssue(issueKey, {
  customfield_10005: { value: "High" },
});

// Write - by id (preferred)
await updateIssue(issueKey, {
  customfield_10005: { id: "10001" },
});
```

### Select Fields (Multi)

```typescript
// Read
const components = issue.fields.customfield_10006;
// [
//   { id: "10001", value: "Frontend" },
//   { id: "10002", value: "Backend" }
// ]

// Write - set values
await updateIssue(issueKey, {
  customfield_10006: [{ value: "Frontend" }, { value: "Backend" }],
});

// Write - add value
await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
  method: "PUT",
  body: JSON.stringify({
    update: {
      customfield_10006: [{ add: { value: "DevOps" } }],
    },
  }),
});

// Write - remove value
await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
  method: "PUT",
  body: JSON.stringify({
    update: {
      customfield_10006: [{ remove: { value: "Frontend" } }],
    },
  }),
});
```

### Cascading Select

```typescript
// Read
const location = issue.fields.customfield_10007;
// {
//   value: "North America",
//   child: { value: "United States" }
// }

// Write
await updateIssue(issueKey, {
  customfield_10007: {
    value: "North America",
    child: { value: "United States" },
  },
});
```

### User Picker (Single)

```typescript
// Read
const reviewer = issue.fields.customfield_10008;
// {
//   accountId: "5b10a0effa615a0f1234",
//   displayName: "John Doe",
//   emailAddress: "john@example.com"
// }

// Write - by accountId (required for Cloud)
await updateIssue(issueKey, {
  customfield_10008: { accountId: "5b10a0effa615a0f1234" },
});

// Write - by name (Server/DC only, deprecated in Cloud)
await updateIssue(issueKey, {
  customfield_10008: { name: "jdoe" },
});
```

### User Picker (Multi)

```typescript
// Read
const watchers = issue.fields.customfield_10009;
// [
//   { accountId: "5b10a0effa615a0f1234", displayName: "John Doe" },
//   { accountId: "5b10a0effa615a0f5678", displayName: "Jane Doe" }
// ]

// Write
await updateIssue(issueKey, {
  customfield_10009: [{ accountId: "5b10a0effa615a0f1234" }, { accountId: "5b10a0effa615a0f5678" }],
});
```

### Labels

```typescript
// Read
const labels = issue.fields.labels; // ["bug", "critical", "frontend"]

// Write - replace all
await updateIssue(issueKey, {
  labels: ["bug", "urgent"],
});

// Write - add label
await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
  method: "PUT",
  body: JSON.stringify({
    update: {
      labels: [{ add: "new-label" }],
    },
  }),
});

// Write - remove label
await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
  method: "PUT",
  body: JSON.stringify({
    update: {
      labels: [{ remove: "old-label" }],
    },
  }),
});
```

### URL Fields

```typescript
// Read
const documentation = issue.fields.customfield_10010; // "https://docs.example.com"

// Write
await updateIssue(issueKey, {
  customfield_10010: "https://docs.example.com/new-page",
});
```

### Checkboxes

```typescript
// Read
const options = issue.fields.customfield_10011;
// [{ value: "Option 1" }, { value: "Option 3" }]

// Write
await updateIssue(issueKey, {
  customfield_10011: [{ value: "Option 1" }, { value: "Option 2" }],
});
```

### Radio Buttons

```typescript
// Read
const severity = issue.fields.customfield_10012;
// { id: "10001", value: "Critical" }

// Write
await updateIssue(issueKey, {
  customfield_10012: { value: "High" },
});
```

## Getting Select Field Options

```typescript
// Get available options for a select field
const response = await fetch(
  `${baseUrl}/rest/api/3/field/customfield_10005/context/${contextId}/option`,
  { headers: { Authorization: auth } }
);

const options = await response.json();
// {
//   values: [
//     { id: "10001", value: "High" },
//     { id: "10002", value: "Medium" },
//     { id: "10003", value: "Low" }
//   ]
// }
```

## Helper Function

```typescript
async function updateIssue(issueKey: string, fields: Record<string, any>) {
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
    method: "PUT",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update issue: ${JSON.stringify(error)}`);
  }
}
```

## Known Issues

### Incorrect Type Information

The API may return incorrect type information for certain locked fields (e.g., Sprint field). Workaround:

```typescript
const FIELD_TYPE_OVERRIDES: Record<string, string> = {
  Sprint: "array", // API may incorrectly report as string
  "Story Points": "number",
};

function getFieldType(field: Field): string {
  if (FIELD_TYPE_OVERRIDES[field.name]) {
    return FIELD_TYPE_OVERRIDES[field.name];
  }
  return field.schema?.type || "string";
}
```

### Screen Configuration

Custom fields may not appear if not added to the screen:

```json
{
  "errorMessages": [],
  "errors": {
    "customfield_10001": "Field 'customfield_10001' cannot be set. It is not on the appropriate screen, or unknown."
  }
}
```

**Solution**: Add field to the appropriate screen in Jira admin.

### Context-Specific Options

Select field options can vary by project/issue type context. Always fetch options for the specific context.

## Common Pitfalls

| Pitfall           | Cause                           | Solution                              |
| ----------------- | ------------------------------- | ------------------------------------- |
| `Field not found` | Wrong field ID                  | Use discovery API, don't hardcode     |
| `Cannot be set`   | Field not on screen             | Add to screen in Jira admin           |
| `Invalid value`   | Wrong format for field type     | Check field schema for correct format |
| Value rejected    | Option not in context           | Fetch options for specific context    |
| User not found    | Using name instead of accountId | Use accountId for Cloud               |
