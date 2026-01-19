# Validation Rules

**Field validation rules for FeatureBase content creation.**

---

## Title Validation

**Rules:**
- **Minimum length**: 5 characters
- **Maximum length**: 200 characters
- **No leading/trailing whitespace**
- **Must be descriptive** (not just "Test" or "New Post")
- **No profanity or offensive language**

**Valid examples:**
- "Improve Asset Discovery Performance"
- "v2.5 Release Notes"
- "Getting Started with Integrations"

**Invalid examples:**
- "Test" (too short, not descriptive)
- " Improve Speed " (leading/trailing whitespace)
- "{very long title exceeding 200 characters...}" (too long)

**Validation logic:**

```typescript
function validateTitle(title: string): { valid: boolean; error?: string } {
  const trimmed = title.trim();

  if (trimmed.length < 5) {
    return { valid: false, error: "Title must be at least 5 characters" };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: "Title must not exceed 200 characters" };
  }

  if (trimmed !== title) {
    return { valid: false, error: "Title must not have leading/trailing whitespace" };
  }

  const nonDescriptive = ["test", "new", "post", "article", "changelog"];
  if (nonDescriptive.includes(trimmed.toLowerCase())) {
    return { valid: false, error: "Title must be descriptive" };
  }

  return { valid: true };
}
```

---

## BoardId Validation (Posts Only)

**Rules:**
- **Format**: `board_` prefix followed by alphanumeric characters
- **Pattern**: `^board_[a-z0-9]+$`
- **Case**: Lowercase only
- **Must exist**: BoardId must be valid in FeatureBase

**Valid examples:**
- `board_abc123`
- `board_features`
- `board_bugs`

**Invalid examples:**
- `abc123` (missing prefix)
- `board_` (no identifier after prefix)
- `BOARD_ABC123` (uppercase not allowed)
- `board-features` (hyphen not allowed, only underscore after prefix)

**Validation logic:**

```typescript
const BOARD_ID_PATTERN = /^board_[a-z0-9]+$/;

function validateBoardId(boardId: string): { valid: boolean; error?: string } {
  if (!BOARD_ID_PATTERN.test(boardId)) {
    return {
      valid: false,
      error: "BoardId must be lowercase and follow pattern: board_{alphanumeric}"
    };
  }

  return { valid: true };
}
```

**Available boards (fetch via API):**

```typescript
import { listBoards, createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();
const boards = await listBoards.execute({}, client);

if (boards.ok) {
  boards.data.forEach(board => {
    console.log(`${board.name}: ${board.id}`);
  });
}
```

---

## Tags Validation

**Rules:**
- **Format**: Array of strings
- **Each tag**: lowercase, hyphenated, no spaces
- **Pattern per tag**: `^[a-z0-9-]+$`
- **Maximum tags**: 10
- **Minimum length per tag**: 2 characters
- **Maximum length per tag**: 30 characters

**Valid examples:**
- `["security", "asset-management", "performance"]`
- `["bug", "ui", "critical"]`
- `[]` (empty array is valid)

**Invalid examples:**
- `"security"` (not an array)
- `["Security Features"]` (has space, uppercase)
- `["security", "asset_management"]` (underscore not allowed)
- `["a"]` (too short)
- `["verylongtagnamethatexceedsthirtychars"]` (too long)

**Validation logic:**

```typescript
const TAG_PATTERN = /^[a-z0-9-]+$/;

function validateTags(tags: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(tags)) {
    return { valid: false, error: "Tags must be an array" };
  }

  if (tags.length > 10) {
    return { valid: false, error: "Maximum 10 tags allowed" };
  }

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      return { valid: false, error: "Each tag must be a string" };
    }

    if (tag.length < 2) {
      return { valid: false, error: `Tag "${tag}" is too short (minimum 2 characters)` };
    }

    if (tag.length > 30) {
      return { valid: false, error: `Tag "${tag}" is too long (maximum 30 characters)` };
    }

    if (!TAG_PATTERN.test(tag)) {
      return {
        valid: false,
        error: `Tag "${tag}" must be lowercase alphanumeric with hyphens only`
      };
    }
  }

  return { valid: true };
}
```

---

## Slug Validation

**Rules:**
- **Pattern**: `^[a-z0-9-]+$`
- **Length**: 10-80 characters
- **No leading/trailing hyphens**
- **No multiple consecutive hyphens**
- **Case**: Lowercase only

**Valid examples:**
- `improve-asset-discovery`
- `v2-5-release-notes`
- `getting-started-with-api`

**Invalid examples:**
- `-improve` (leading hyphen)
- `improve-` (trailing hyphen)
- `improve--discovery` (consecutive hyphens)
- `Improve_Asset` (uppercase, underscore)
- `short` (too short)

**Validation logic:**

```typescript
const SLUG_PATTERN = /^[a-z0-9-]+$/;

function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (slug.length < 10) {
    return { valid: false, error: "Slug must be at least 10 characters" };
  }

  if (slug.length > 80) {
    return { valid: false, error: "Slug must not exceed 80 characters" };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      valid: false,
      error: "Slug must be lowercase alphanumeric with hyphens only"
    };
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: "Slug must not have leading/trailing hyphens" };
  }

  if (slug.includes('--')) {
    return { valid: false, error: "Slug must not have consecutive hyphens" };
  }

  return { valid: true };
}
```

---

## Category Validation (Articles Only)

**Rules:**
- **Format**: kebab-case string
- **Pattern**: `^[a-z0-9-]+$`
- **Must be valid category**: From predefined list

**Valid categories:**
- `getting-started`
- `troubleshooting`
- `advanced`
- `api-documentation`
- `integrations`
- `security`

**Validation logic:**

```typescript
const VALID_CATEGORIES = [
  'getting-started',
  'troubleshooting',
  'advanced',
  'api-documentation',
  'integrations',
  'security'
];

function validateCategory(category: string): { valid: boolean; error?: string } {
  if (!VALID_CATEGORIES.includes(category)) {
    return {
      valid: false,
      error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
    };
  }

  return { valid: true };
}
```

---

## Date Validation

**Rules:**
- **Format**: ISO 8601 timestamp
- **Pattern**: `YYYY-MM-DDTHH:MM:SSZ`
- **Timezone**: UTC (Z suffix)
- **Not in past** (for publishedAt with scheduled publish)

**Valid examples:**
- `2026-01-14T10:00:00Z`
- `2026-01-20T15:30:00Z`

**Invalid examples:**
- `2026-01-14` (missing time)
- `2026-01-14 10:00:00` (space instead of T)
- `2026-01-14T10:00:00` (missing Z)
- `01/14/2026` (wrong format)

**Validation logic:**

```typescript
function validateISO8601(dateString: string): { valid: boolean; error?: string } {
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

  if (!iso8601Pattern.test(dateString)) {
    return {
      valid: false,
      error: "Date must be in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ"
    };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date value" };
  }

  return { valid: true };
}
```

---

## Status Validation (Posts Only)

**Rules:**
- **Must be valid status**: From predefined list (API-dependent)

**Common valid statuses:**
- `open`
- `in-progress`
- `planned`
- `completed`
- `archived`
- `declined`

**Validation logic:**

```typescript
const VALID_STATUSES = [
  'open',
  'in-progress',
  'planned',
  'completed',
  'archived',
  'declined'
];

function validateStatus(status: string): { valid: boolean; error?: string } {
  if (!VALID_STATUSES.includes(status)) {
    return {
      valid: false,
      error: `Status must be one of: ${VALID_STATUSES.join(', ')}`
    };
  }

  return { valid: true };
}
```

---

## Complete Validation Workflow

```typescript
function validatePost(data: PostData): ValidationResult {
  const errors: string[] = [];

  // Validate title
  const titleResult = validateTitle(data.title);
  if (!titleResult.valid) errors.push(titleResult.error);

  // Validate boardId
  const boardIdResult = validateBoardId(data.boardId);
  if (!boardIdResult.valid) errors.push(boardIdResult.error);

  // Validate tags (if provided)
  if (data.tags) {
    const tagsResult = validateTags(data.tags);
    if (!tagsResult.valid) errors.push(tagsResult.error);
  }

  // Validate status (if provided)
  if (data.status) {
    const statusResult = validateStatus(data.status);
    if (!statusResult.valid) errors.push(statusResult.error);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```
