# FeatureBase Changelog API Documentation

## Overview

The FeatureBase Changelog API provides complete CRUD operations for managing changelog entries. Changelog entries are used to communicate product updates, new features, bug fixes, and improvements to users. This documentation is extracted from the MCP tool implementations in `.claude/tools/featurebase/`.

**Base URL**: `https://do.featurebase.app`

**Authentication**: Bearer token authentication via `Authorization` header

**API Version**: v2

---

## Authentication Configuration

All changelog API requests use the HTTPPort client with the following configuration:

```typescript
import { createFeaturebaseClient } from '.claude/tools/featurebase';

// Create authenticated client
const client = createFeaturebaseClient({
  apiKey: 'your-api-key-here'
});

// Or load from config
const client = createFeaturebaseClient(); // Loads from .claude/tools/config/
```

**HTTP Client Configuration**:
- Base URL: `https://do.featurebase.app`
- Authentication: Bearer token in `Authorization` header
- Timeout: 30 seconds
- Retry: 3 attempts on 408, 429, 5xx errors
- Methods: GET, POST, PUT, DELETE

---

## List Changelog Entries

**Endpoint**: `GET /v2/changelogs`

**Purpose**: Fetch a paginated list of changelog entries with optional filtering by tags and search query.

### Request Parameters

```typescript
interface ListChangelogInput {
  limit?: number;          // 1-100, default: 10
  cursor?: string;         // Pagination cursor (optional)
  tags?: string[];         // Filter by tag names (optional)
  q?: string;             // Search query for title/content (optional)
}
```

**Parameter Details**:
- `limit`: Number of entries to return (1-100). Default: 10
- `cursor`: Pagination cursor from previous response (page-based pagination)
- `tags`: Array of tag names to filter by (joined with commas in query string)
- `q`: Search query string (sanitized for control characters)

### Query String Construction

```typescript
// Build query params
const searchParams: Record<string, string | number> = {
  limit: 10,
};

if (cursor) searchParams.cursor = cursor;
if (tags) searchParams.tags = tags.join(','); // ['feature', 'update'] -> 'feature,update'
if (q) searchParams.q = q;
```

### Response Schema

```typescript
interface ListChangelogResponse {
  results: Array<{
    id: string;
    title: string;
    content: string;
    publishedAt: string;      // ISO 8601 date
    updatedAt?: string;       // ISO 8601 date
    tags?: string[];
  }>;
  page: number;               // Current page number
  totalResults: number;       // Total count of results
}
```

### Output (Token Optimized)

```typescript
interface ListChangelogOutput {
  entries: Array<{
    id: string;
    title: string;
    content: string;          // Truncated to 500 chars for optimization
    publishedAt: string;
    updatedAt?: string;
    tags?: string[];
  }>;
  nextCursor: string | null;  // Always null (page-based pagination)
  totalCount: number;
  estimatedTokens: number;
}
```

### Code Example

```typescript
import { listChangelog } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

// List first 10 changelog entries
const result = await listChangelog.execute(
  {
    limit: 10,
    tags: ['feature', 'update'],
    q: 'authentication'
  },
  client
);

console.log(`Found ${result.totalCount} entries`);
result.entries.forEach(entry => {
  console.log(`${entry.title} (${entry.publishedAt})`);
  console.log(`Tags: ${entry.tags?.join(', ')}`);
});
```

### Token Estimates
- Without custom tool: ~3000 tokens
- With custom tool (when used): ~500 tokens
- Reduction: 83%

### Error Handling

```typescript
try {
  const result = await listChangelog.execute(input, client);
} catch (error) {
  // Error messages are sanitized to prevent information leakage
  console.error('FeatureBase API error:', error.message);
}
```

---

## Create Changelog Entry

**Endpoint**: `POST /v2/changelogs`

**Purpose**: Create a new changelog entry with title, content, published date, and optional tags.

### Request Body

```typescript
interface CreateChangelogInput {
  title: string;              // Required, max 255 chars
  content: string;            // Required, markdown supported
  publishedAt: string;        // Required, ISO 8601 format
  tags?: string[];            // Optional tags
}
```

**Field Validation**:
- `title`: Required, 1-255 characters, no control characters
- `content`: Required, supports markdown formatting
- `publishedAt`: Required, ISO 8601 date string (e.g., "2026-01-17T10:00:00Z")
- `tags`: Optional array of tag strings

### Request JSON

```json
{
  "title": "New Feature: Dark Mode",
  "content": "We've added dark mode support across the entire platform. Enable it in your settings.",
  "publishedAt": "2026-01-17T10:00:00Z",
  "tags": ["feature", "ui"]
}
```

### Response Schema

```typescript
interface CreateChangelogAPIResponse {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  createdAt: string;          // Timestamp when entry was created
  updatedAt: string;          // Timestamp of last update
}
```

### Output

```typescript
interface CreateChangelogOutput {
  entry: {
    id: string;
    title: string;
    content: string;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Code Example

```typescript
import { createChangelog } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await createChangelog.execute(
  {
    title: "New Feature: Dark Mode",
    content: "We've added dark mode support across the entire platform. Enable it in your settings.",
    publishedAt: new Date().toISOString(),
    tags: ["feature", "ui"]
  },
  client
);

console.log(`Created changelog entry: ${result.entry.id}`);
console.log(`Published at: ${result.entry.publishedAt}`);
```

### Validation Rules

```typescript
// Title validation
z.string()
  .min(1, 'title is required')
  .max(255, 'title cannot exceed 255 characters')
  .refine(validateNoControlChars, 'Control characters not allowed')

// Content validation
z.string()
  .min(1, 'content is required')

// PublishedAt validation
z.string()
  .min(1, 'publishedAt is required')

// Tags validation
z.array(z.string()).optional()
```

### Error Handling

```typescript
try {
  const result = await createChangelog.execute(input, client);
} catch (error) {
  // Sanitized error messages
  if (error.message.includes('title cannot exceed')) {
    console.error('Title too long');
  } else if (error.message.includes('publishedAt is required')) {
    console.error('Missing publication date');
  } else {
    console.error('Failed to create changelog:', error.message);
  }
}
```

---

## Update Changelog Entry

**Endpoint**: `POST /v2/changelogs/{changelogId}`

**Purpose**: Update an existing changelog entry. All fields are optional except `changelogId`.

### Request Parameters

```typescript
interface UpdateChangelogInput {
  changelogId: string;        // Required, no control characters
  title?: string;             // Optional, max 255 chars
  content?: string;           // Optional, markdown supported
  publishedAt?: string;       // Optional, ISO 8601 format
  tags?: string[];            // Optional tags
}
```

**Field Details**:
- `changelogId`: Required identifier for the entry to update
- `title`: Optional, 1-255 characters if provided
- `content`: Optional, markdown supported
- `publishedAt`: Optional, ISO 8601 date string
- `tags`: Optional array of tags

### Request URL Pattern

```
POST https://do.featurebase.app/v2/changelogs/{changelogId}
```

### Request Body

```json
{
  "title": "Updated Feature: Dark Mode",
  "content": "Updated description of dark mode feature with new screenshots.",
  "publishedAt": "2026-01-17T12:00:00Z",
  "tags": ["feature", "ui", "updated"]
}
```

### Partial Update Support

The API supports partial updates - only include fields you want to change:

```typescript
// Build update data (only non-undefined fields)
const updateData: UpdateChangelogData = {};
if (validated.title) updateData.title = validated.title;
if (validated.content) updateData.content = validated.content;
if (validated.publishedAt) updateData.publishedAt = validated.publishedAt;
if (validated.tags) updateData.tags = validated.tags;
```

### Response Schema

```typescript
interface UpdateChangelogAPIResponse {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  updatedAt: string;          // Timestamp of this update
}
```

### Output

```typescript
interface UpdateChangelogOutput {
  entry: {
    id: string;
    title: string;
    content: string;
    publishedAt: string;
    updatedAt: string;
  };
}
```

### Code Example - Full Update

```typescript
import { updateChangelog } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await updateChangelog.execute(
  {
    changelogId: 'changelog_test123',
    title: 'Updated Feature: Dark Mode',
    content: 'Updated description with more details.',
    publishedAt: '2026-01-17T12:00:00Z',
    tags: ['feature', 'ui', 'updated']
  },
  client
);

console.log(`Updated changelog: ${result.entry.id}`);
console.log(`New updated timestamp: ${result.entry.updatedAt}`);
```

### Code Example - Partial Update

```typescript
// Only update the title
const result = await updateChangelog.execute(
  {
    changelogId: 'changelog_test123',
    title: 'Revised Title'
  },
  client
);

// Only update tags
const result = await updateChangelog.execute(
  {
    changelogId: 'changelog_test123',
    tags: ['feature', 'ui', 'enhancement']
  },
  client
);
```

### Validation Rules

```typescript
// ChangelogId validation
z.string()
  .min(1, 'changelogId is required')
  .refine(validateNoControlChars, 'Control characters not allowed')

// Title validation (optional)
z.string()
  .max(255, 'title cannot exceed 255 characters')
  .refine(validateNoControlChars, 'Control characters not allowed')
  .optional()

// Content validation (optional)
z.string().optional()

// PublishedAt validation (optional)
z.string().optional()

// Tags validation (optional)
z.array(z.string()).optional()
```

---

## Delete Changelog Entry

**Endpoint**: `DELETE /v2/changelogs/{changelogId}`

**Purpose**: Permanently delete a changelog entry.

### Request Parameters

```typescript
interface DeleteChangelogInput {
  changelogId: string;        // Required, no control characters
}
```

### Request URL Pattern

```
DELETE https://do.featurebase.app/v2/changelogs/{changelogId}
```

### Response Schema

```typescript
interface DeleteChangelogAPIResponse {
  success?: boolean;
}
```

### Output

```typescript
interface DeleteChangelogOutput {
  success: boolean;           // Always true on success
  changelogId: string;        // ID of deleted entry
}
```

### Code Example

```typescript
import { deleteChangelog } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await deleteChangelog.execute(
  {
    changelogId: 'changelog_test123'
  },
  client
);

if (result.success) {
  console.log(`Successfully deleted changelog: ${result.changelogId}`);
}
```

### Error Handling

```typescript
try {
  const result = await deleteChangelog.execute(
    { changelogId: 'changelog_test123' },
    client
  );
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Changelog entry does not exist');
  } else {
    console.error('Failed to delete changelog:', error.message);
  }
}
```

### Validation Rules

```typescript
z.string()
  .min(1, 'changelogId is required')
  .refine(validateNoControlChars, 'Control characters not allowed')
```

---

## Complete Workflow Example

### Create, Update, and Delete Lifecycle

```typescript
import {
  createChangelog,
  updateChangelog,
  deleteChangelog,
  listChangelog
} from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

async function manageChangelog() {
  const client = createFeaturebaseClient();

  // 1. Create new entry
  const created = await createChangelog.execute(
    {
      title: "Version 2.0 Released",
      content: "Major update with new features and performance improvements.",
      publishedAt: new Date().toISOString(),
      tags: ["release", "major"]
    },
    client
  );

  console.log(`Created: ${created.entry.id}`);

  // 2. Update the entry
  const updated = await updateChangelog.execute(
    {
      changelogId: created.entry.id,
      content: "Major update with new features, performance improvements, and bug fixes.",
      tags: ["release", "major", "bugfix"]
    },
    client
  );

  console.log(`Updated: ${updated.entry.updatedAt}`);

  // 3. List all entries to verify
  const list = await listChangelog.execute(
    { limit: 5, tags: ["release"] },
    client
  );

  console.log(`Found ${list.totalCount} release entries`);

  // 4. Delete the entry
  const deleted = await deleteChangelog.execute(
    { changelogId: created.entry.id },
    client
  );

  console.log(`Deleted: ${deleted.success}`);
}

manageChangelog().catch(console.error);
```

---

## Bidirectional Sync with Markdown

### Sync from FeatureBase to Markdown Files

```typescript
import { syncToMarkdown } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await syncToMarkdown(
  {
    outputDir: './content',
    types: ['changelog'],
    limit: 100
  },
  client
);

console.log(`Synced ${result.filesWritten} changelog entries to markdown`);
```

**Generated File Structure**:
```
content/
└── changelog/
    ├── changelog_abc123-version-2-0-released.md
    └── changelog_def456-new-feature-dark-mode.md
```

**Markdown File Format**:
```markdown
---
featurebaseId: changelog_abc123
title: Version 2.0 Released
publishedAt: 2026-01-17T10:00:00Z
updatedAt: 2026-01-17T12:00:00Z
tags:
  - release
  - major
syncedAt: 2026-01-17T14:00:00Z
---

Major update with new features and performance improvements.

## What's New
- Feature A
- Feature B
- Performance improvements
```

### Sync from Markdown to FeatureBase

```typescript
import { syncFromMarkdown } from '.claude/tools/featurebase';
import { createFeaturebaseClient } from '.claude/tools/featurebase';

const client = createFeaturebaseClient();

const result = await syncFromMarkdown(
  {
    inputDir: './content',
    types: ['changelog']
  },
  client
);

console.log(`Created: ${result.created}`);
console.log(`Updated: ${result.updated}`);
console.log(`Conflicts: ${result.conflicts?.length || 0}`);
console.log(`Errors: ${result.errors.length}`);
```

**Conflict Detection**: Changelog sync does NOT check for conflicts (unlike posts and articles).

---

## API Response Patterns

### Pagination

Changelog uses **page-based pagination** (not cursor-based):

```typescript
// Response structure
{
  "results": [...],
  "page": 1,
  "totalResults": 42
}

// nextCursor is always null for changelog
{
  entries: [...],
  nextCursor: null,  // Page-based pagination
  totalCount: 42
}
```

### Error Responses

```typescript
// API errors are sanitized before returning to client
if (!response.ok) {
  const sanitized = sanitizeErrorMessage(response.error.message);
  throw new Error(`FeatureBase API error: ${sanitized}`);
}
```

**Common Error Messages**:
- "FeatureBase API error: Invalid API key"
- "Failed to create changelog: title cannot exceed 255 characters"
- "Failed to update changelog: changelogId is required"
- "Failed to delete changelog: Changelog not found"

---

## Security & Validation

### Input Sanitization

All user inputs are validated to prevent injection attacks:

```typescript
// Control character validation
z.string().refine(validateNoControlChars, 'Control characters not allowed')

// Applied to:
// - title
// - changelogId
// - q (search query)
```

### Token Optimization

Content is truncated in list operations to reduce token usage:

```typescript
// List operations truncate content to 500 chars
content: (entry.content || '').substring(0, 500)
```

### Authentication

Bearer token authentication via HTTP client:

```typescript
// Authorization header format
Authorization: Bearer {apiKey}
```

---

## Summary

The FeatureBase Changelog API provides:

1. **List**: Paginated listing with filtering by tags and search
2. **Create**: Create new entries with title, content, published date, and tags
3. **Update**: Partial or full updates to existing entries
4. **Delete**: Permanent deletion of entries

**Key Features**:
- Page-based pagination
- Tag filtering
- Full-text search
- Markdown content support
- Bidirectional sync with markdown files
- Token-optimized responses
- Comprehensive error handling
- Input sanitization for security

**Token Efficiency**:
- List operations: 83% reduction (3000 → 500 tokens)
- Content truncation for preview listings
- Full content available in individual fetch operations
