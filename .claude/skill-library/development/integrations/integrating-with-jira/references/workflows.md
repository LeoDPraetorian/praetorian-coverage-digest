# Jira Workflows and Transitions Reference

**Programmatic workflow transitions, status management, and validation patterns.**

## Understanding Workflows

Jira workflows define the lifecycle of issues through statuses and transitions:

- **Status**: Current state of issue (e.g., "Open", "In Progress", "Done")
- **Transition**: Action that moves issue between statuses (e.g., "Start Progress", "Resolve")
- **Workflow**: Collection of statuses and transitions for an issue type

**Critical**: Transitions are workflow-specific. Always fetch available transitions before attempting to apply them.

## Fetching Available Transitions

```typescript
// Get transitions available for an issue
const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
  headers: { Authorization: auth, Accept: "application/json" },
});

const data = await response.json();
console.log(data.transitions);
// [
//   { id: "11", name: "Start Progress", to: { id: "3", name: "In Progress" } },
//   { id: "21", name: "Resolve", to: { id: "5", name: "Resolved" } },
//   { id: "31", name: "Close", to: { id: "6", name: "Closed" } }
// ]
```

**Expanded Response** (with fields and conditions):

```typescript
const response = await fetch(
  `${baseUrl}/rest/api/3/issue/${issueKey}/transitions?expand=transitions.fields`,
  { headers: { Authorization: auth } }
);
```

```json
{
  "transitions": [
    {
      "id": "21",
      "name": "Resolve",
      "to": {
        "id": "5",
        "name": "Resolved",
        "statusCategory": { "key": "done", "name": "Done" }
      },
      "fields": {
        "resolution": {
          "required": true,
          "schema": { "type": "resolution" },
          "allowedValues": [
            { "id": "1", "name": "Fixed" },
            { "id": "2", "name": "Won't Fix" },
            { "id": "3", "name": "Duplicate" }
          ]
        }
      }
    }
  ]
}
```

## Applying Transitions

### Basic Transition

```typescript
// Find transition by name
const transitions = await getTransitions(issueKey);
const transition = transitions.find((t) => t.name === "Start Progress");

if (!transition) {
  throw new Error(`Transition "Start Progress" not available for ${issueKey}`);
}

// Apply transition
await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
  method: "POST",
  headers: {
    Authorization: auth,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    transition: { id: transition.id },
  }),
});
```

### Transition with Required Fields

Some transitions require fields (e.g., resolution when closing):

```typescript
// Resolve issue with resolution
await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
  method: "POST",
  headers: {
    Authorization: auth,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    transition: { id: "21" }, // Resolve transition
    fields: {
      resolution: { name: "Fixed" },
    },
  }),
});
```

### Transition with Comment

```typescript
await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
  method: "POST",
  headers: {
    Authorization: auth,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    transition: { id: "21" },
    fields: {
      resolution: { name: "Fixed" },
    },
    update: {
      comment: [
        {
          add: {
            body: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Issue resolved via automation." }],
                },
              ],
            },
          },
        },
      ],
    },
  }),
});
```

## Helper Functions

### Transition by Name

```typescript
async function transitionIssue(
  issueKey: string,
  transitionName: string,
  fields?: Record<string, any>
): Promise<void> {
  // Fetch available transitions
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const { transitions } = await response.json();

  // Find matching transition
  const transition = transitions.find(
    (t: any) => t.name.toLowerCase() === transitionName.toLowerCase()
  );

  if (!transition) {
    const available = transitions.map((t: any) => t.name).join(", ");
    throw new Error(`Transition "${transitionName}" not available. Available: ${available}`);
  }

  // Apply transition
  const body: any = { transition: { id: transition.id } };
  if (fields) {
    body.fields = fields;
  }

  await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Usage
await transitionIssue("PROJ-123", "Resolve", { resolution: { name: "Fixed" } });
```

### Transition to Status

```typescript
async function transitionToStatus(
  issueKey: string,
  targetStatus: string,
  fields?: Record<string, any>
): Promise<void> {
  // Fetch available transitions
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const { transitions } = await response.json();

  // Find transition that leads to target status
  const transition = transitions.find(
    (t: any) => t.to.name.toLowerCase() === targetStatus.toLowerCase()
  );

  if (!transition) {
    const available = transitions.map((t: any) => t.to.name).join(", ");
    throw new Error(`No transition to "${targetStatus}" available. Reachable: ${available}`);
  }

  // Apply transition
  const body: any = { transition: { id: transition.id } };
  if (fields) {
    body.fields = fields;
  }

  await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Usage
await transitionToStatus("PROJ-123", "Done");
```

## Bulk Transitions

```typescript
async function bulkTransition(
  issueKeys: string[],
  transitionName: string,
  fields?: Record<string, any>
): Promise<{ success: string[]; failed: { key: string; error: string }[] }> {
  const success: string[] = [];
  const failed: { key: string; error: string }[] = [];

  for (const key of issueKeys) {
    try {
      await transitionIssue(key, transitionName, fields);
      success.push(key);
    } catch (error) {
      failed.push({ key, error: error.message });
    }

    // Respect rate limits
    await sleep(100);
  }

  return { success, failed };
}

// Usage
const results = await bulkTransition(["PROJ-1", "PROJ-2", "PROJ-3"], "Resolve", {
  resolution: { name: "Fixed" },
});
console.log(`Success: ${results.success.length}, Failed: ${results.failed.length}`);
```

## Getting Workflow Information

### All Statuses

```typescript
const response = await fetch(`${baseUrl}/rest/api/3/status`, {
  headers: { Authorization: auth },
});

const statuses = await response.json();
// [
//   { id: "1", name: "Open", statusCategory: { key: "new" } },
//   { id: "3", name: "In Progress", statusCategory: { key: "indeterminate" } },
//   { id: "5", name: "Resolved", statusCategory: { key: "done" } }
// ]
```

### Status Categories

Jira groups statuses into categories:

| Category Key    | Name        | Meaning         |
| --------------- | ----------- | --------------- |
| `new`           | To Do       | Not started     |
| `indeterminate` | In Progress | Being worked on |
| `done`          | Done        | Completed       |

```typescript
const response = await fetch(`${baseUrl}/rest/api/3/statuscategory`, {
  headers: { Authorization: auth },
});
```

### Workflow for Issue Type

```typescript
// Get workflow scheme for project
const response = await fetch(`${baseUrl}/rest/api/3/project/${projectKey}/workflowscheme`, {
  headers: { Authorization: auth },
});
```

## Transition Validators and Conditions

Workflows can have conditions that restrict transitions:

- **Conditions**: Determine if transition is visible (e.g., only project leads)
- **Validators**: Check fields before transition (e.g., required fields)
- **Post Functions**: Actions after transition (e.g., set resolution)

**Checking Required Fields**:

```typescript
async function getRequiredFieldsForTransition(
  issueKey: string,
  transitionId: string
): Promise<string[]> {
  const response = await fetch(
    `${baseUrl}/rest/api/3/issue/${issueKey}/transitions?expand=transitions.fields`,
    { headers: { Authorization: auth } }
  );

  const { transitions } = await response.json();
  const transition = transitions.find((t: any) => t.id === transitionId);

  if (!transition || !transition.fields) {
    return [];
  }

  return Object.entries(transition.fields)
    .filter(([_, field]: [string, any]) => field.required)
    .map(([fieldId]) => fieldId);
}
```

## Common Workflow Patterns

### Simple Workflow (Open → In Progress → Done)

```typescript
const SIMPLE_WORKFLOW = {
  Open: { transitions: ["Start Progress"] },
  "In Progress": { transitions: ["Resolve", "Reopen"] },
  Done: { transitions: ["Reopen"] },
};
```

### Bug Workflow

```typescript
const BUG_WORKFLOW = {
  Open: { transitions: ["Start Progress", "Reject"] },
  "In Progress": { transitions: ["Ready for Test", "Blocked"] },
  "Ready for Test": { transitions: ["Pass", "Fail"] },
  Blocked: { transitions: ["Unblock"] },
  Done: { transitions: ["Reopen"] },
};
```

## Error Handling

### Common Transition Errors

| Error                      | Cause                                        | Solution                                     |
| -------------------------- | -------------------------------------------- | -------------------------------------------- |
| 400 `Transition not valid` | Transition not available from current status | Fetch available transitions first            |
| 400 `Field required`       | Missing required field for transition        | Expand transitions.fields and provide values |
| 403 `Permission denied`    | User cannot perform transition               | Check user's project permissions             |
| 404 `Issue not found`      | Invalid issue key                            | Verify issue exists                          |

### Validation Before Transition

```typescript
async function canTransition(
  issueKey: string,
  transitionName: string
): Promise<{ can: boolean; reason?: string }> {
  try {
    const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
      headers: { Authorization: auth },
    });

    if (!response.ok) {
      return { can: false, reason: "Cannot fetch transitions" };
    }

    const { transitions } = await response.json();
    const transition = transitions.find(
      (t: any) => t.name.toLowerCase() === transitionName.toLowerCase()
    );

    if (!transition) {
      return {
        can: false,
        reason: `Transition not available. Available: ${transitions.map((t: any) => t.name).join(", ")}`,
      };
    }

    return { can: true };
  } catch (error) {
    return { can: false, reason: error.message };
  }
}
```

## Best Practices

1. **Always fetch transitions first** - Don't assume transition IDs are stable
2. **Handle required fields** - Expand transitions.fields to see requirements
3. **Validate before bulk operations** - Check each issue can transition
4. **Use status categories** - Check `done` category instead of specific status names
5. **Rate limit bulk transitions** - Add delays between API calls
6. **Log transition failures** - Keep audit trail of failed transitions
