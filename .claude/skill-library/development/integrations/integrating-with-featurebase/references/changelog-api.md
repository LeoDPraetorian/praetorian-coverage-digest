# Featurebase Changelog API Documentation

## Overview

The Featurebase Changelog API provides a complete CRUD interface for managing changelog entries. This API is implemented as a set of MCP (Model Context Protocol) tools that interact with the Featurebase v2 API endpoints.

**Base URL**: `v2/changelogs`

**Authentication**: API Key authentication via `X-API-Key` header (handled by HTTPPort client)

**Response Format**: JSON

---

## Table of Contents

1. [List Changelog Entries](#list-changelog-entries)
2. [Create Changelog Entry](#create-changelog-entry)
3. [Update Changelog Entry](#update-changelog-entry)
4. [Delete Changelog Entry](#delete-changelog-entry)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)

---

## List Changelog Entries

### Endpoint

```
GET /v2/changelogs
```

### Description

Fetches a paginated list of changelog entries with optional filtering and search capabilities. Content is truncated to 500 characters for token optimization.

### Tool Name

```
featurebase.list_changelog
```

### Request Parameters

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `limit` | number | No | 10 | Min: 1, Max: 100 | Number of changelog entries to return per page |
| `cursor` | string | No | - | - | Pagination cursor from previous response |
| `tags` | string[] | No | - | - | Filter by tag names (array of strings) |
| `q` | string | No | - | No control characters | Search query for title/content |

### Query Parameter Format

Query parameters are sent as URL-encoded strings:

- **limit**: Integer value (1-100)
- **cursor**: Opaque pagination token
- **tags**: Comma-separated tag names
- **q**: URL-encoded search string

### Response Schema

```typescript
{
  entries: Array<{
    id: string;                    // Unique changelog identifier
    title: string;                 // Changelog title
    content: string;               // Changelog content (truncated to 500 chars)
    publishedAt: string;           // ISO 8601 publication date
    updatedAt?: string;            // ISO 8601 last update date (optional)
    tags?: string[];               // Associated tags (optional)
  }>;
  nextCursor: string | null;       // Pagination cursor for next page
  totalCount: number;              // Total number of matching entries
  estimatedTokens: number;         // Estimated token count for response
}
```

### Response Fields

- **entries**: Array of changelog entry objects
- **nextCursor**: Pagination cursor for fetching next page (null if no more pages)
- **totalCount**: Total number of entries matching the query
- **estimatedTokens**: Estimated token usage for the response

### Token Optimization

- **Without custom tool**: ~3000 tokens
- **With custom tool**: 0 tokens (cached)
- **When used**: ~500 tokens
- **Reduction**: 83%

### Example Request

```typescript
const params = {
  limit: 25,
  tags: ['feature', 'improvement'],
  q: 'authentication'
};

const result = await listChangelog.execute(params, httpClient);
```

### Example Response

```json
{
  "entries": [
    {
      "id": "changelog-123",
      "title": "New Authentication System",
      "content": "We've implemented a new OAuth2-based authentication system...",
      "publishedAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-16T14:22:00Z",
      "tags": ["feature", "authentication"]
    },
    {
      "id": "changelog-124",
      "title": "Bug Fix: Login Session Timeout",
      "content": "Fixed an issue where user sessions would expire prematurely...",
      "publishedAt": "2026-01-14T09:15:00Z",
      "tags": ["bugfix", "authentication"]
    }
  ],
  "nextCursor": null,
  "totalCount": 2,
  "estimatedTokens": 487
}
```

---

## Create Changelog Entry

### Endpoint

```
POST /v2/changelogs
```

### Description

Creates a new changelog entry in the Featurebase system. Supports markdown content formatting.

### Tool Name

```
featurebase.create_changelog
```

### Request Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `title` | string | Yes | Min: 1 char, Max: 255 chars, No control characters | Changelog title |
| `content` | string | Yes | Min: 1 char | Changelog content (markdown supported) |
| `publishedAt` | string | Yes | ISO 8601 format | Publication date |
| `tags` | string[] | No | - | Optional tags for categorization |

### Request Body Format

```json
{
  "title": "string",
  "content": "string",
  "publishedAt": "ISO 8601 date string",
  "tags": ["string", "string"]
}
```

### Response Schema

```typescript
{
  entry: {
    id: string;                    // Unique changelog identifier
    title: string;                 // Changelog title
    content: string;               // Full changelog content
    publishedAt: string;           // ISO 8601 publication date
    createdAt: string;             // ISO 8601 creation timestamp
    updatedAt: string;             // ISO 8601 last update timestamp
  }
}
```

### Validation Rules

1. **Title**: Required, 1-255 characters, no control characters (\\x00-\\x1F, \\x7F)
2. **Content**: Required, minimum 1 character, supports markdown
3. **PublishedAt**: Required, must be valid ISO 8601 date string
4. **Tags**: Optional array of strings

### Example Request

```typescript
const params = {
  title: "Version 2.0 Release",
  content: `# Major Release: Version 2.0

We're excited to announce the release of version 2.0 with the following features:

- **New Dashboard**: Completely redesigned user interface
- **API v2**: RESTful API with improved performance
- **Mobile Support**: Full mobile responsive design

## Breaking Changes

- API v1 endpoints deprecated (sunset date: 2026-03-01)
- Legacy authentication removed`,
  publishedAt: "2026-01-17T12:00:00Z",
  tags: ["release", "major-version"]
};

const result = await createChangelog.execute(params, httpClient);
```

### Example Response

```json
{
  "entry": {
    "id": "changelog-125",
    "title": "Version 2.0 Release",
    "content": "# Major Release: Version 2.0\n\nWe're excited to announce...",
    "publishedAt": "2026-01-17T12:00:00Z",
    "createdAt": "2026-01-17T10:45:30Z",
    "updatedAt": "2026-01-17T10:45:30Z"
  }
}
```

---

## Update Changelog Entry

### Endpoint

```
POST /v2/changelogs/{changelogId}
```

### Description

Updates an existing changelog entry. All fields except `changelogId` are optional, allowing partial updates.

### Tool Name

```
featurebase.update_changelog
```

### Request Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `changelogId` | string | Yes | Min: 1 char, No control characters | Changelog ID to update |
| `title` | string | No | Max: 255 chars, No control characters | Updated changelog title |
| `content` | string | No | - | Updated changelog content (markdown supported) |
| `publishedAt` | string | No | ISO 8601 format | Updated publication date |
| `tags` | string[] | No | - | Updated tags |

### URL Parameters

- **changelogId**: The unique identifier of the changelog entry to update

### Request Body Format

```json
{
  "title": "string (optional)",
  "content": "string (optional)",
  "publishedAt": "ISO 8601 date string (optional)",
  "tags": ["string", "string"] (optional)
}
```

### Response Schema

```typescript
{
  entry: {
    id: string;                    // Unique changelog identifier
    title: string;                 // Updated changelog title
    content: string;               // Updated changelog content
    publishedAt: string;           // Updated publication date
    updatedAt: string;             // ISO 8601 timestamp of update
  }
}
```

### Update Behavior

- **Partial Updates**: Only provided fields are updated
- **Missing Fields**: Existing values are preserved
- **Empty Values**: Not allowed (validation will fail)
- **Tags**: Complete replacement (not merged)

### Example Request (Partial Update)

```typescript
// Update only the title
const params = {
  changelogId: "changelog-125",
  title: "Version 2.0 Release - Updated"
};

const result = await updateChangelog.execute(params, httpClient);
```

### Example Request (Full Update)

```typescript
const params = {
  changelogId: "changelog-125",
  title: "Version 2.0.1 Release",
  content: `# Patch Release: Version 2.0.1

This patch release includes critical bug fixes:

- Fixed authentication token expiration issue
- Resolved dashboard rendering bug on Safari
- Performance improvements for large datasets`,
  publishedAt: "2026-01-17T14:30:00Z",
  tags: ["release", "patch", "bugfix"]
};

const result = await updateChangelog.execute(params, httpClient);
```

### Example Response

```json
{
  "entry": {
    "id": "changelog-125",
    "title": "Version 2.0.1 Release",
    "content": "# Patch Release: Version 2.0.1\n\nThis patch release...",
    "publishedAt": "2026-01-17T14:30:00Z",
    "updatedAt": "2026-01-17T14:35:22Z"
  }
}
```

---

## Delete Changelog Entry

### Endpoint

```
DELETE /v2/changelogs/{changelogId}
```

### Description

Permanently deletes a changelog entry from the Featurebase system.

### Tool Name

```
featurebase.delete_changelog
```

### Request Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `changelogId` | string | Yes | Min: 1 char, No control characters | Changelog ID to delete |

### URL Parameters

- **changelogId**: The unique identifier of the changelog entry to delete

### Request Body

No request body required.

### Response Schema

```typescript
{
  success: boolean;                // Deletion status (true if successful)
  changelogId: string;             // ID of deleted changelog entry
}
```

### Example Request

```typescript
const params = {
  changelogId: "changelog-125"
};

const result = await deleteChangelog.execute(params, httpClient);
```

### Example Response

```json
{
  "success": true,
  "changelogId": "changelog-125"
}
```

### Important Notes

- **Permanent Deletion**: This operation cannot be undone
- **No Cascade**: Related objects (if any) are not automatically deleted
- **Error on Not Found**: Returns error if changelog ID doesn't exist

---

## Data Models

### ChangelogEntry (Full)

```typescript
interface ChangelogEntry {
  id: string;                      // Unique identifier
  title: string;                   // Entry title (max 255 chars)
  content: string;                 // Markdown content
  publishedAt: string;             // ISO 8601 publication date
  createdAt: string;               // ISO 8601 creation timestamp
  updatedAt: string;               // ISO 8601 last update timestamp
  tags?: string[];                 // Optional categorization tags
}
```

### ChangelogEntry (List View)

```typescript
interface ChangelogEntryListView {
  id: string;                      // Unique identifier
  title: string;                   // Entry title
  content: string;                 // Truncated to 500 characters
  publishedAt: string;             // ISO 8601 publication date
  updatedAt?: string;              // ISO 8601 last update (optional)
  tags?: string[];                 // Optional tags (optional)
}
```

### PaginationResponse

```typescript
interface PaginationResponse {
  nextCursor: string | null;       // Cursor for next page (null if last page)
  totalCount: number;              // Total matching entries
}
```

### Date Format

All dates use ISO 8601 format:

```
YYYY-MM-DDTHH:mm:ss.sssZ
```

Examples:
- `2026-01-17T12:00:00Z`
- `2026-01-17T12:00:00.000Z`
- `2026-01-17T12:00:00+00:00`

---

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
{
  error: {
    message: string;               // Sanitized error message
  }
}
```

### Common Error Scenarios

#### Validation Errors

**Status**: 400 Bad Request

```json
{
  "error": {
    "message": "title cannot exceed 255 characters"
  }
}
```

**Causes**:
- Invalid parameter types
- Missing required fields
- Validation constraint violations
- Control characters in string fields

#### Not Found Errors

**Status**: 404 Not Found

```json
{
  "error": {
    "message": "Changelog entry not found"
  }
}
```

**Causes**:
- Invalid changelog ID
- Deleted changelog entry
- Unauthorized access to private entry

#### Authentication Errors

**Status**: 401 Unauthorized

```json
{
  "error": {
    "message": "Invalid or missing API key"
  }
}
```

**Causes**:
- Missing API key
- Expired API key
- Invalid API key format

#### Rate Limiting

**Status**: 429 Too Many Requests

```json
{
  "error": {
    "message": "Rate limit exceeded"
  }
}
```

**Causes**:
- Exceeded API rate limits
- Too many requests in short time window

### Error Sanitization

All error messages are sanitized to prevent:
- Control character injection
- Stack trace leakage
- Sensitive data exposure

---

## Code Examples

### Complete TypeScript Integration

```typescript
import {
  listChangelog,
  createChangelog,
  updateChangelog,
  deleteChangelog
} from './tools/featurebase/';
import { createHTTPClient } from './config/lib/http-client';

// Initialize HTTP client
const httpClient = createHTTPClient({
  baseUrl: 'https://api.featurebase.app',
  apiKey: process.env.FEATUREBASE_API_KEY
});

// List changelogs with filtering
async function listRecentChangelogs() {
  const result = await listChangelog.execute({
    limit: 10,
    tags: ['release'],
    q: 'version'
  }, httpClient);

  console.log(`Found ${result.totalCount} changelogs`);
  result.entries.forEach(entry => {
    console.log(`- ${entry.title} (${entry.publishedAt})`);
  });
}

// Create a new changelog
async function createNewChangelog() {
  const result = await createChangelog.execute({
    title: "Security Update: CVE-2026-1234",
    content: `# Critical Security Patch

We've released a security patch to address CVE-2026-1234:

## Impact
- High severity vulnerability in authentication module
- Potential unauthorized access

## Resolution
- Update to version 2.0.2 immediately
- Rotate API keys as precaution`,
    publishedAt: new Date().toISOString(),
    tags: ['security', 'patch', 'critical']
  }, httpClient);

  console.log(`Created changelog: ${result.entry.id}`);
  return result.entry.id;
}

// Update existing changelog
async function updateExistingChangelog(changelogId: string) {
  const result = await updateChangelog.execute({
    changelogId,
    title: "Security Update: CVE-2026-1234 [RESOLVED]",
    tags: ['security', 'patch', 'critical', 'resolved']
  }, httpClient);

  console.log(`Updated changelog: ${result.entry.id}`);
}

// Delete changelog
async function deleteOldChangelog(changelogId: string) {
  const result = await deleteChangelog.execute({
    changelogId
  }, httpClient);

  if (result.success) {
    console.log(`Deleted changelog: ${result.changelogId}`);
  }
}

// Complete workflow
async function changelogWorkflow() {
  try {
    // List existing changelogs
    await listRecentChangelogs();

    // Create new changelog
    const changelogId = await createNewChangelog();

    // Update it
    await updateExistingChangelog(changelogId);

    // Later, delete if needed
    // await deleteOldChangelog(changelogId);

  } catch (error) {
    console.error('Changelog operation failed:', error.message);
  }
}
```

### Error Handling Example

```typescript
async function safeChangelogOperation() {
  try {
    const result = await createChangelog.execute({
      title: "Test Entry",
      content: "Test content",
      publishedAt: new Date().toISOString()
    }, httpClient);

    return result;

  } catch (error) {
    if (error.message.includes('cannot exceed 255 characters')) {
      console.error('Title too long, please shorten');
    } else if (error.message.includes('Invalid or missing API key')) {
      console.error('Authentication failed, check API key');
    } else if (error.message.includes('Rate limit exceeded')) {
      console.error('Too many requests, please wait');
    } else {
      console.error('Unexpected error:', error.message);
    }

    throw error;
  }
}
```

### Pagination Example

```typescript
async function fetchAllChangelogs() {
  const allEntries = [];
  let cursor: string | null = null;

  do {
    const result = await listChangelog.execute({
      limit: 100,
      ...(cursor && { cursor })
    }, httpClient);

    allEntries.push(...result.entries);
    cursor = result.nextCursor;

    console.log(`Fetched ${allEntries.length} of ${result.totalCount} entries`);

  } while (cursor !== null);

  return allEntries;
}
```

### Markdown Content Example

```typescript
async function createMarkdownChangelog() {
  const markdownContent = `# Version 3.0 Release Notes

## New Features

### 1. Advanced Analytics Dashboard
Track user engagement with real-time metrics:
- Page views and session duration
- Conversion funnel analysis
- A/B testing results

### 2. API Rate Limiting
Configurable rate limits per API key:
\`\`\`json
{
  "rateLimit": {
    "requests": 1000,
    "window": "1h"
  }
}
\`\`\`

### 3. Webhook Integration
Subscribe to events:
- changelog.created
- changelog.updated
- changelog.deleted

## Bug Fixes

- Fixed memory leak in WebSocket connections
- Resolved timezone display issues
- Corrected pagination cursor handling

## Deprecations

> **Warning**: API v1 will be sunset on 2026-06-01

## Migration Guide

See our [migration documentation](https://docs.example.com/migration/v3) for details.`;

  return await createChangelog.execute({
    title: "Version 3.0 - Major Release",
    content: markdownContent,
    publishedAt: new Date().toISOString(),
    tags: ['release', 'major-version', 'v3']
  }, httpClient);
}
```

---

## Best Practices

### 1. Content Length Management

For list operations, content is automatically truncated to 500 characters. For full content, fetch individual entries or use search with specific IDs.

### 2. Date Handling

Always use ISO 8601 format for dates. Consider timezone implications:

```typescript
// Recommended: Use UTC
const publishedAt = new Date().toISOString(); // 2026-01-17T12:00:00.000Z

// Avoid: Local timezone ambiguity
const publishedAt = new Date().toString(); // ❌ Invalid format
```

### 3. Tag Consistency

Maintain consistent tag naming conventions:

```typescript
// Good: lowercase, hyphenated
tags: ['major-release', 'breaking-change', 'security-patch']

// Avoid: mixed case, spaces
tags: ['Major Release', 'breaking_change', 'Security PATCH']
```

### 4. Pagination Strategy

Use cursor-based pagination for large datasets:

```typescript
// Efficient: Cursor-based
let cursor = null;
while (cursor !== null) {
  const result = await listChangelog.execute({ limit: 100, cursor }, client);
  // Process result.entries
  cursor = result.nextCursor;
}
```

### 5. Error Recovery

Implement exponential backoff for rate limiting:

```typescript
async function retryWithBackoff(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.message.includes('Rate limit') && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

---

## File Locations

All changelog API tools are located in:

```
/Users/nathansportsman/chariot-development-platform2/.claude/tools/featurebase/
├── list-changelog.ts      # GET /v2/changelogs
├── create-changelog.ts    # POST /v2/changelogs
├── update-changelog.ts    # POST /v2/changelogs/:id
└── delete-changelog.ts    # DELETE /v2/changelogs/:id
```

Supporting modules:
- `/Users/nathansportsman/chariot-development-platform2/.claude/tools/config/lib/http-client.ts` - HTTP client implementation
- `/Users/nathansportsman/chariot-development-platform2/.claude/tools/internal/sanitize-error.ts` - Error sanitization
- `/Users/nathansportsman/chariot-development-platform2/.claude/tools/config/lib/sanitize.ts` - Input validation

---

## Version History

- **v2**: Current API version (all endpoints)
- **Pagination**: Page-based (not cursor-based despite `nextCursor` field)
- **Token Optimization**: 83% reduction with custom tool caching

---

**Last Updated**: 2026-01-17

**Documentation Generated From**:
- `/Users/nathansportsman/chariot-development-platform2/.claude/tools/featurebase/list-changelog.ts`
- `/Users/nathansportsman/chariot-development-platform2/.claude/tools/featurebase/create-changelog.ts`
- `/Users/nathansportsman/chariot-development-platform2/.claude/tools/featurebase/update-changelog.ts`
- `/Users/nathansportsman/chariot-development-platform2/.claude/tools/featurebase/delete-changelog.ts`
