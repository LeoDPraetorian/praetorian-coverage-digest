# JQL (Jira Query Language) Reference

**Complete JQL syntax, operators, functions, and optimization patterns.**

## Basic Query Structure

```jql
project = "PROJ" AND status = "In Progress" AND assignee = currentUser() ORDER BY created DESC
```

**Components**:

- **Field**: `project`, `status`, `assignee`
- **Operator**: `=`, `IN`, `~`, `>=`
- **Value**: `"PROJ"`, `"In Progress"`, `currentUser()`
- **Keyword**: `AND`, `OR`, `NOT`, `ORDER BY`

## Field Types and Operators

### Text Fields

| Operator       | Description      | Example                    |
| -------------- | ---------------- | -------------------------- |
| `=`            | Exact match      | `summary = "Bug fix"`      |
| `~`            | Contains (fuzzy) | `summary ~ "bug"`          |
| `!~`           | Does not contain | `summary !~ "test"`        |
| `is EMPTY`     | No value         | `description is EMPTY`     |
| `is not EMPTY` | Has value        | `description is not EMPTY` |

### Numeric Fields

| Operator  | Description  | Example          |
| --------- | ------------ | ---------------- |
| `=`       | Equals       | `cf[10016] = 5`  |
| `!=`      | Not equals   | `cf[10016] != 0` |
| `>`, `>=` | Greater than | `cf[10016] > 3`  |
| `<`, `<=` | Less than    | `cf[10016] <= 8` |

### Date Fields

| Operator | Description       | Example                   |
| -------- | ----------------- | ------------------------- |
| `=`      | Exact date        | `created = "2026-01-04"`  |
| `>=`     | On or after       | `created >= "2026-01-01"` |
| `<=`     | On or before      | `created <= "2026-12-31"` |
| `>`      | After (relative)  | `updated > -7d`           |
| `<`      | Before (relative) | `updated < -30d`          |

**Relative Date Formats**:

- `-1d`: 1 day ago
- `-1w`: 1 week ago
- `-1m`: 1 month ago (30 days)
- `-1y`: 1 year ago
- `startOfDay()`, `endOfDay()`: Current day boundaries
- `startOfWeek()`, `endOfWeek()`: Current week boundaries
- `startOfMonth()`, `endOfMonth()`: Current month boundaries

### Select/Option Fields

| Operator | Description | Example                             |
| -------- | ----------- | ----------------------------------- |
| `=`      | Exact match | `priority = "High"`                 |
| `!=`     | Not equals  | `priority != "Low"`                 |
| `IN`     | In list     | `status IN ("Open", "In Progress")` |
| `NOT IN` | Not in list | `status NOT IN ("Done", "Closed")`  |

### User Fields

| Operator   | Description  | Example                           |
| ---------- | ------------ | --------------------------------- |
| `=`        | Exact user   | `assignee = "user@example.com"`   |
| `=`        | Current user | `assignee = currentUser()`        |
| `was`      | Historical   | `assignee was "user@example.com"` |
| `changed`  | Any change   | `assignee changed`                |
| `is EMPTY` | Unassigned   | `assignee is EMPTY`               |

## Common JQL Patterns

### Issues by Project and Status

```jql
project = "PROJ" AND status = "In Progress"
```

### Issues Assigned to Me

```jql
assignee = currentUser() AND resolution is EMPTY
```

### Recently Updated Issues

```jql
updated >= -7d ORDER BY updated DESC
```

### Issues Created in Date Range

```jql
created >= "2026-01-01" AND created <= "2026-03-31"
```

### Issues with Specific Labels

```jql
labels IN ("bug", "critical") AND project = "PROJ"
```

### Unresolved Issues by Priority

```jql
resolution is EMPTY AND priority IN ("Highest", "High") ORDER BY priority DESC
```

### Issues in Epic

```jql
"Epic Link" = "PROJ-100"
```

### Issues Without Epic

```jql
"Epic Link" is EMPTY AND issuetype != "Epic"
```

### Subtasks of Issue

```jql
parent = "PROJ-123"
```

### Issues Linked to Another Issue

```jql
issueFunction in linkedIssuesOf("PROJ-123")
```

### Issues Blocking Another Issue

```jql
issueFunction in linkedIssuesOf("PROJ-123", "blocks")
```

## Custom Field Queries

Custom fields use the `cf[ID]` syntax or quoted field name:

```jql
-- By ID (recommended for performance)
cf[10016] = 5

-- By name (requires exact match)
"Story Points" = 5

-- Custom select field
"Environment" = "Production"

-- Custom multi-select
"Affected Versions" in ("1.0", "1.1")
```

**Finding Custom Field IDs**:

```typescript
// API call to discover field IDs
const fields = await fetch(`${baseUrl}/rest/api/3/field`).then((r) => r.json());
const storyPoints = fields.find((f) => f.name === "Story Points");
console.log(storyPoints.id); // "customfield_10016"
```

## JQL Functions

### User Functions

| Function             | Description    | Example                               |
| -------------------- | -------------- | ------------------------------------- |
| `currentUser()`      | Logged-in user | `assignee = currentUser()`            |
| `membersOf("group")` | Users in group | `assignee in membersOf("developers")` |

### Date Functions

| Function         | Description       | Example                     |
| ---------------- | ----------------- | --------------------------- |
| `now()`          | Current timestamp | `created < now()`           |
| `startOfDay()`   | Start of today    | `created >= startOfDay()`   |
| `endOfDay()`     | End of today      | `created <= endOfDay()`     |
| `startOfWeek()`  | Start of week     | `created >= startOfWeek()`  |
| `startOfMonth()` | Start of month    | `created >= startOfMonth()` |
| `startOfYear()`  | Start of year     | `created >= startOfYear()`  |

### Issue Functions

| Function                    | Description          | Example                                               |
| --------------------------- | -------------------- | ----------------------------------------------------- |
| `linkedIssuesOf(key)`       | Issues linked to key | `issueFunction in linkedIssuesOf("PROJ-1")`           |
| `linkedIssuesOf(key, type)` | Specific link type   | `issueFunction in linkedIssuesOf("PROJ-1", "blocks")` |
| `subtasksOf(key)`           | Subtasks of issue    | `issueFunction in subtasksOf("PROJ-1")`               |
| `parentsOf(key)`            | Parent issues        | `issueFunction in parentsOf("PROJ-1")`                |

### Project Functions

| Function                         | Description          | Example                                             |
| -------------------------------- | -------------------- | --------------------------------------------------- |
| `projectsLeadByUser(user)`       | Projects led by user | `project in projectsLeadByUser(currentUser())`      |
| `projectsWhereUserHasRole(role)` | Projects with role   | `project in projectsWhereUserHasRole("Developers")` |

## Ordering Results

```jql
-- Single field
ORDER BY created DESC

-- Multiple fields
ORDER BY priority DESC, created ASC

-- Null handling
ORDER BY assignee ASC NULLS FIRST
```

**Sortable Fields**: `created`, `updated`, `priority`, `status`, `assignee`, `reporter`, `summary`, `duedate`, `resolution`, `resolutiondate`, custom fields

## JQL Optimization

### 1. Use Indexed Fields First

**Indexed fields** (fast): `project`, `status`, `assignee`, `reporter`, `created`, `updated`, `priority`, `resolution`, `issuetype`

**Non-indexed fields** (slower): Custom fields, text search, labels

```jql
-- Good: Indexed field first
project = "PROJ" AND summary ~ "bug"

-- Bad: Non-indexed field first
summary ~ "bug" AND project = "PROJ"
```

### 2. Avoid Wildcards at Start

```jql
-- Good
summary ~ "error*"

-- Bad (full table scan)
summary ~ "*error"
```

### 3. Use IN Instead of Multiple ORs

```jql
-- Good
status IN ("Open", "In Progress", "Review")

-- Bad
status = "Open" OR status = "In Progress" OR status = "Review"
```

### 4. Limit Date Ranges

```jql
-- Good: Specific range
created >= "2026-01-01" AND created <= "2026-01-31"

-- Bad: Unbounded
created is not EMPTY
```

### 5. Avoid NOT with Large Result Sets

```jql
-- Good: Use explicit status list
status IN ("Open", "In Progress")

-- Bad: NOT can be slow
status != "Done"
```

## Advanced Patterns

### Issues Changed in Field

```jql
status changed FROM "Open" TO "In Progress" AFTER "2026-01-01"
```

### Issues That Were Ever Assigned

```jql
assignee was "user@example.com"
```

### Issues with Status Duration

```jql
status was "In Progress" DURING ("2026-01-01", "2026-01-31")
```

### Combining Historical and Current

```jql
status was "Open" AND status = "Done" AND resolved >= -7d
```

### Sprint Queries (Jira Software)

```jql
-- Current sprint
sprint in openSprints()

-- Specific sprint
sprint = "Sprint 1"

-- Future sprints
sprint in futureSprints()

-- Closed sprints
sprint in closedSprints()
```

### Board Queries

```jql
-- Issues on specific board
board = 123

-- Issues in board's backlog
sprint is EMPTY AND board = 123
```

## Common Pitfalls

| Pitfall                    | Cause                                    | Solution                                          |
| -------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `Field 'X' does not exist` | Wrong field name or custom field ID      | Use `/rest/api/3/field` to discover correct names |
| Slow query                 | Non-indexed field first, unbounded dates | Put indexed fields first, limit date ranges       |
| Empty results              | Case sensitivity in values               | Check exact value spelling in Jira UI             |
| `Invalid JQL`              | Syntax error                             | Validate in Jira's issue search before API        |
| Missing issues             | Field permissions                        | User may not have permission to see all issues    |

## API Usage

### Search Endpoint

```typescript
// GET request with JQL
const response = await fetch(
  `${baseUrl}/rest/api/3/search?` +
    `jql=${encodeURIComponent('project = "PROJ" AND status = "Open"')}&` +
    `fields=key,summary,status&` +
    `maxResults=100`
);

// POST request for complex JQL
const response = await fetch(`${baseUrl}/rest/api/3/search`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jql: 'project = "PROJ" AND status = "Open"',
    fields: ["key", "summary", "status"],
    maxResults: 100,
  }),
});
```

### Validating JQL

```typescript
// Validate JQL before execution
const validation = await fetch(`${baseUrl}/rest/api/3/jql/parse`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    queries: ['project = "PROJ" AND status = "Open"'],
  }),
});

const result = await validation.json();
if (result.queries[0].errors.length > 0) {
  console.error("Invalid JQL:", result.queries[0].errors);
}
```

### Autocomplete

```typescript
// Get autocomplete suggestions for field values
const suggestions = await fetch(
  `${baseUrl}/rest/api/3/jql/autocompletedata/suggestions?` + `fieldName=status&fieldValue=In`
);
```
