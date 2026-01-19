# FeatureBase Comments API Documentation

## Overview

The FeatureBase Comments API provides complete CRUD operations for managing comments on posts and changelog entries. Comments support threading (replies), voting, privacy controls, and pinning. This documentation is based on the official FeatureBase API at `docs.featurebase.app/comment`.

**Base URL**: `https://do.featurebase.app`

**Authentication**: X-API-Key header (not Bearer token)

**API Version**: v2

**Content Type**: `application/x-www-form-urlencoded` (not JSON)

---

## Authentication Configuration

Comments API uses a different authentication method than other FeatureBase endpoints:

```typescript
// Comments use X-API-Key header (not Authorization: Bearer)
const headers = {
  'X-API-Key': 'your-api-key-here',
  'Content-Type': 'application/x-www-form-urlencoded'
};
```

**Key Differences from Other APIs**:
- Header: `X-API-Key` (not `Authorization: Bearer`)
- Body format: `application/x-www-form-urlencoded` (not `application/json`)
- Parameter names: Uses snake_case in form data

---

## Comment Model

The comment model contains information about a comment made on a post or changelog:

```typescript
interface Comment {
  id: string;                    // Comment ID
  content: string;               // Comment content (HTML format)
  createdAt: string;             // ISO 8601 timestamp
  updatedAt?: string;            // ISO 8601 timestamp

  // Author information
  author: {
    id: string;
    name: string;
    email?: string;
    profilePicture?: string;
  };

  // Associations
  submissionId?: string;         // Associated post ID
  changelogId?: string;          // Associated changelog ID
  parentCommentId?: string;      // Parent comment for threading

  // Status flags
  isPrivate: boolean;            // Visible only to admins
  isDeleted: boolean;            // Soft delete flag
  isPinned: boolean;             // Pinned to top

  // Voting metrics
  upvotes: number;               // Upvote count
  downvotes: number;             // Downvote count
  score: number;                 // Total score

  // Metadata
  replies?: Comment[];           // Child comments (when expanded)
  replyCount?: number;           // Number of replies
}
```

---

## List Comments

**Endpoint**: `GET /v2/comment`

**Purpose**: Retrieve a paginated list of all comments for a post or changelog, with filtering by privacy, review status, and various sort orders.

### Request Parameters

```typescript
interface ListCommentsInput {
  submissionId?: string;         // Filter by post ID
  changelogId?: string;          // Filter by changelog ID
  limit?: number;                // 1-100, default: 10
  page?: number;                 // Page number, default: 1
  sortBy?: 'newest' | 'oldest' | 'popular';  // Sort order
  includePrivate?: boolean;      // Include private comments (admin only)
  includeDeleted?: boolean;      // Include soft-deleted comments (admin only)
}
```

**Parameter Details**:
- `submissionId`: Filter comments for a specific post (required if changelogId not provided)
- `changelogId`: Filter comments for a specific changelog (required if submissionId not provided)
- `limit`: Number of comments to return (1-100). Default: 10
- `page`: Page number for pagination. Default: 1
- `sortBy`: Sort order (newest, oldest, popular). Default: newest
- `includePrivate`: Include private comments visible only to admins
- `includeDeleted`: Include soft-deleted comments (for moderation)

### Query String Construction

```typescript
// Build query params
const searchParams = new URLSearchParams();

if (submissionId) searchParams.append('submissionId', submissionId);
if (changelogId) searchParams.append('changelogId', changelogId);
searchParams.append('limit', limit.toString());
searchParams.append('page', page.toString());
if (sortBy) searchParams.append('sortBy', sortBy);
if (includePrivate) searchParams.append('includePrivate', 'true');
if (includeDeleted) searchParams.append('includeDeleted', 'true');
```

### Response Schema

```typescript
interface ListCommentsResponse {
  comments: Comment[];
  page: number;
  totalPages: number;
  totalResults: number;
}
```

### Code Example - List Post Comments

```typescript
const response = await fetch(
  'https://do.featurebase.app/v2/comment?submissionId=post_abc123&limit=20',
  {
    method: 'GET',
    headers: {
      'X-API-Key': process.env.FEATUREBASE_API_KEY
    }
  }
);

const data = await response.json();

console.log(`Found ${data.totalResults} comments`);
data.comments.forEach(comment => {
  console.log(`${comment.author.name}: ${comment.content}`);
  console.log(`Upvotes: ${comment.upvotes}, Replies: ${comment.replyCount}`);

  if (comment.isPinned) {
    console.log('⭐ PINNED');
  }

  if (comment.parentCommentId) {
    console.log(`↳ Reply to comment ${comment.parentCommentId}`);
  }
});
```

### Code Example - List Changelog Comments

```typescript
const response = await fetch(
  'https://do.featurebase.app/v2/comment?changelogId=changelog_xyz789&sortBy=popular',
  {
    method: 'GET',
    headers: {
      'X-API-Key': process.env.FEATUREBASE_API_KEY
    }
  }
);

const data = await response.json();
console.log(`Found ${data.totalResults} comments on changelog`);
```

### Code Example - Pagination

```typescript
// Fetch first page
let page = 1;
const limit = 20;

const response = await fetch(
  `https://do.featurebase.app/v2/comment?submissionId=post_abc123&limit=${limit}&page=${page}`,
  {
    method: 'GET',
    headers: { 'X-API-Key': process.env.FEATUREBASE_API_KEY }
  }
);

const data = await response.json();
console.log(`Page ${data.page} of ${data.totalPages}`);

// Fetch next page if available
if (page < data.totalPages) {
  page++;
  // Fetch next page...
}
```

---

## Create Comment

**Endpoint**: `POST /v2/comment`

**Purpose**: Create a new comment or reply to an existing comment for a submission or changelog. Comments can be marked as private, making them visible only to admins of the organization.

### Request Parameters

```typescript
interface CreateCommentInput {
  submissionId?: string;         // Required if changelogId not provided
  changelogId?: string;          // Required if submissionId not provided
  content: string;               // Required, comment text
  parentCommentId?: string;      // Optional, for threading/replies
  isPrivate?: boolean;           // Optional, admin-only visibility
}
```

**Field Validation**:
- `submissionId` OR `changelogId`: One is required
- `content`: Required, 1-10000 characters
- `parentCommentId`: Optional, creates a reply to another comment
- `isPrivate`: Optional, defaults to false

### Request Format

**CRITICAL**: Use `application/x-www-form-urlencoded`, NOT JSON:

```typescript
// Build form data
const formData = new URLSearchParams();
formData.append('submissionId', 'post_abc123');
formData.append('content', 'This is a great feature!');
formData.append('parentCommentId', 'comment_parent123');  // Optional
formData.append('isPrivate', 'false');  // Optional

const response = await fetch('https://do.featurebase.app/v2/comment', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.FEATUREBASE_API_KEY,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: formData.toString()
});
```

### Response Schema

```typescript
interface CreateCommentResponse {
  id: string;
  submissionId?: string;
  changelogId?: string;
  content: string;
  parentCommentId?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  upvotes: number;
  downvotes: number;
  score: number;
}
```

### Code Example - Create Top-Level Comment

```typescript
const createComment = async (submissionId: string, content: string) => {
  const formData = new URLSearchParams();
  formData.append('submissionId', submissionId);
  formData.append('content', content);

  const response = await fetch('https://do.featurebase.app/v2/comment', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.FEATUREBASE_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.statusText}`);
  }

  const comment = await response.json();
  console.log(`Created comment: ${comment.id}`);
  return comment;
};

// Usage
await createComment('post_abc123', 'This is a great feature!');
```

### Code Example - Create Reply (Threading)

```typescript
const createReply = async (
  submissionId: string,
  parentCommentId: string,
  content: string
) => {
  const formData = new URLSearchParams();
  formData.append('submissionId', submissionId);
  formData.append('parentCommentId', parentCommentId);
  formData.append('content', content);

  const response = await fetch('https://do.featurebase.app/v2/comment', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.FEATUREBASE_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const reply = await response.json();
  console.log(`Created reply: ${reply.id} (parent: ${reply.parentCommentId})`);
  return reply;
};

// Usage
await createReply('post_abc123', 'comment_parent123', 'Great point!');
```

### Code Example - Create Private Comment (Admin)

```typescript
const createPrivateComment = async (submissionId: string, content: string) => {
  const formData = new URLSearchParams();
  formData.append('submissionId', submissionId);
  formData.append('content', content);
  formData.append('isPrivate', 'true');  // Admin-only visibility

  const response = await fetch('https://do.featurebase.app/v2/comment', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.FEATUREBASE_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const comment = await response.json();
  console.log(`Created private comment: ${comment.id}`);
  return comment;
};

// Usage
await createPrivateComment('post_abc123', 'Internal note: needs review');
```

### Code Example - Create Changelog Comment

```typescript
const createChangelogComment = async (changelogId: string, content: string) => {
  const formData = new URLSearchParams();
  formData.append('changelogId', changelogId);  // Use changelogId instead of submissionId
  formData.append('content', content);

  const response = await fetch('https://do.featurebase.app/v2/comment', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.FEATUREBASE_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const comment = await response.json();
  console.log(`Created changelog comment: ${comment.id}`);
  return comment;
};

// Usage
await createChangelogComment('changelog_xyz789', 'Love this update!');
```

---

## Update Comment

**Endpoint**: `PATCH /v2/comment`

**Purpose**: Update a comment by providing the comment ID. Comments can be pinned to display them at the top of the comments section.

### Request Parameters

```typescript
interface UpdateCommentInput {
  commentId: string;             // Required, in URL path
  content?: string;              // Optional, updated comment text
  isPinned?: boolean;            // Optional, pin to top
  isPrivate?: boolean;           // Optional, change visibility
}
```

**Field Details**:
- `commentId`: Required, specified in URL path
- `content`: Optional, updated comment text (1-10000 characters)
- `isPinned`: Optional, pin comment to top of discussion
- `isPrivate`: Optional, change visibility (admin only)

### Request Format

```typescript
const formData = new URLSearchParams();
if (content) formData.append('content', content);
if (isPinned !== undefined) formData.append('isPinned', isPinned.toString());
if (isPrivate !== undefined) formData.append('isPrivate', isPrivate.toString());

const response = await fetch(`https://do.featurebase.app/v2/comment/${commentId}`, {
  method: 'PATCH',
  headers: {
    'X-API-Key': process.env.FEATUREBASE_API_KEY,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: formData.toString()
});
```

### Response Schema

```typescript
interface UpdateCommentResponse {
  id: string;
  content: string;
  isPinned: boolean;
  isPrivate: boolean;
  updatedAt: string;
}
```

### Code Example - Update Content

```typescript
const updateCommentContent = async (commentId: string, newContent: string) => {
  const formData = new URLSearchParams();
  formData.append('content', newContent);

  const response = await fetch(
    `https://do.featurebase.app/v2/comment/${commentId}`,
    {
      method: 'PATCH',
      headers: {
        'X-API-Key': process.env.FEATUREBASE_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    }
  );

  const updated = await response.json();
  console.log(`Updated comment: ${updated.id}`);
  console.log(`New content: ${updated.content}`);
  return updated;
};

// Usage
await updateCommentContent('comment_abc123', 'Updated: This is even better!');
```

### Code Example - Pin Comment

```typescript
const pinComment = async (commentId: string) => {
  const formData = new URLSearchParams();
  formData.append('isPinned', 'true');

  const response = await fetch(
    `https://do.featurebase.app/v2/comment/${commentId}`,
    {
      method: 'PATCH',
      headers: {
        'X-API-Key': process.env.FEATUREBASE_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    }
  );

  const pinned = await response.json();
  console.log(`Pinned comment: ${pinned.id}`);
  return pinned;
};

// Usage
await pinComment('comment_abc123');
```

### Code Example - Unpin Comment

```typescript
const unpinComment = async (commentId: string) => {
  const formData = new URLSearchParams();
  formData.append('isPinned', 'false');

  const response = await fetch(
    `https://do.featurebase.app/v2/comment/${commentId}`,
    {
      method: 'PATCH',
      headers: {
        'X-API-Key': process.env.FEATUREBASE_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    }
  );

  const unpinned = await response.json();
  console.log(`Unpinned comment: ${unpinned.id}`);
  return unpinned;
};

// Usage
await unpinComment('comment_abc123');
```

### Code Example - Change Privacy

```typescript
const makeCommentPrivate = async (commentId: string) => {
  const formData = new URLSearchParams();
  formData.append('isPrivate', 'true');

  const response = await fetch(
    `https://do.featurebase.app/v2/comment/${commentId}`,
    {
      method: 'PATCH',
      headers: {
        'X-API-Key': process.env.FEATUREBASE_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    }
  );

  const updated = await response.json();
  console.log(`Made comment private: ${updated.id}`);
  return updated;
};

// Usage
await makeCommentPrivate('comment_abc123');
```

---

## Delete Comment

**Endpoint**: `DELETE /v2/comment/{commentId}`

**Purpose**: Delete a comment from a post or changelog. Uses **soft delete** for comments with replies (sets `isDeleted: true`) to preserve threading structure. Hard deletes comments without replies.

### Request Parameters

```typescript
interface DeleteCommentInput {
  commentId: string;             // Required, in URL path
}
```

### Request URL Pattern

```
DELETE https://do.featurebase.app/v2/comment/{commentId}
```

### Soft Delete vs Hard Delete

**Soft Delete** (comments with replies):
- Sets `isDeleted: true` flag
- Comment content replaced with "[deleted]"
- Preserves threading structure
- Child comments remain intact
- Can be filtered using `includeDeleted` parameter

**Hard Delete** (comments without replies):
- Permanently removes comment from database
- No record remains
- Cannot be recovered

### Response Schema

```typescript
interface DeleteCommentResponse {
  success: boolean;
  commentId: string;
  deletionType: 'soft' | 'hard';  // Indicates deletion method
}
```

### Code Example - Delete Comment

```typescript
const deleteComment = async (commentId: string) => {
  const response = await fetch(
    `https://do.featurebase.app/v2/comment/${commentId}`,
    {
      method: 'DELETE',
      headers: {
        'X-API-Key': process.env.FEATUREBASE_API_KEY
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`Deleted comment: ${result.commentId}`);
  console.log(`Deletion type: ${result.deletionType}`);
  return result;
};

// Usage
await deleteComment('comment_abc123');
```

### Code Example - Delete with Error Handling

```typescript
const deleteCommentSafe = async (commentId: string) => {
  try {
    const response = await fetch(
      `https://do.featurebase.app/v2/comment/${commentId}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-Key': process.env.FEATUREBASE_API_KEY
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.error('Comment not found');
        return null;
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.deletionType === 'soft') {
      console.log('Comment soft-deleted (has replies)');
    } else {
      console.log('Comment permanently deleted');
    }

    return result;
  } catch (error) {
    console.error('Failed to delete comment:', error.message);
    throw error;
  }
};

// Usage
await deleteCommentSafe('comment_abc123');
```

---

## Threading & Replies

### Understanding Comment Threading

FeatureBase supports nested comments through the `parentCommentId` field:

```typescript
// Top-level comment
{
  id: 'comment_1',
  submissionId: 'post_abc123',
  content: 'This is a great feature!',
  parentCommentId: null,  // Top-level
  replyCount: 2
}

// Reply to comment_1
{
  id: 'comment_2',
  submissionId: 'post_abc123',
  content: 'I agree!',
  parentCommentId: 'comment_1',  // Reply to comment_1
  replyCount: 1
}

// Nested reply (reply to comment_2)
{
  id: 'comment_3',
  submissionId: 'post_abc123',
  content: 'Me too!',
  parentCommentId: 'comment_2',  // Reply to comment_2
  replyCount: 0
}
```

### Building Comment Thread Tree

```typescript
interface CommentNode {
  comment: Comment;
  children: CommentNode[];
}

const buildCommentTree = (comments: Comment[]): CommentNode[] => {
  const commentMap = new Map<string, CommentNode>();
  const rootComments: CommentNode[] = [];

  // Create nodes
  comments.forEach(comment => {
    commentMap.set(comment.id, { comment, children: [] });
  });

  // Build tree
  comments.forEach(comment => {
    const node = commentMap.get(comment.id)!;

    if (comment.parentCommentId) {
      const parent = commentMap.get(comment.parentCommentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not in current set, treat as root
        rootComments.push(node);
      }
    } else {
      rootComments.push(node);
    }
  });

  return rootComments;
};

// Usage
const response = await fetch(
  'https://do.featurebase.app/v2/comment?submissionId=post_abc123',
  { headers: { 'X-API-Key': process.env.FEATUREBASE_API_KEY } }
);
const data = await response.json();
const tree = buildCommentTree(data.comments);
```

### Rendering Nested Comments

```typescript
const renderCommentTree = (nodes: CommentNode[], depth: number = 0) => {
  nodes.forEach(node => {
    const indent = '  '.repeat(depth);
    console.log(`${indent}${node.comment.author.name}: ${node.comment.content}`);

    if (node.children.length > 0) {
      renderCommentTree(node.children, depth + 1);
    }
  });
};

// Output:
// Alice: This is a great feature!
//   Bob: I agree!
//     Charlie: Me too!
//   David: Absolutely!
```

---

## Complete Workflow Example

### Managing Comment Lifecycle

```typescript
const manageComments = async (postId: string) => {
  const apiKey = process.env.FEATUREBASE_API_KEY;
  const baseUrl = 'https://do.featurebase.app/v2/comment';

  // 1. Create top-level comment
  let formData = new URLSearchParams();
  formData.append('submissionId', postId);
  formData.append('content', 'This is a great feature!');

  let response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const comment = await response.json();
  console.log(`Created comment: ${comment.id}`);

  // 2. Create reply
  formData = new URLSearchParams();
  formData.append('submissionId', postId);
  formData.append('parentCommentId', comment.id);
  formData.append('content', 'I agree!');

  response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const reply = await response.json();
  console.log(`Created reply: ${reply.id}`);

  // 3. Pin the original comment
  formData = new URLSearchParams();
  formData.append('isPinned', 'true');

  response = await fetch(`${baseUrl}/${comment.id}`, {
    method: 'PATCH',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  const pinned = await response.json();
  console.log(`Pinned comment: ${pinned.id}`);

  // 4. List all comments
  response = await fetch(
    `${baseUrl}?submissionId=${postId}&limit=50`,
    { headers: { 'X-API-Key': apiKey } }
  );

  const { comments, totalResults } = await response.json();
  console.log(`Found ${totalResults} comments`);

  // 5. Delete reply (hard delete - no children)
  response = await fetch(`${baseUrl}/${reply.id}`, {
    method: 'DELETE',
    headers: { 'X-API-Key': apiKey }
  });

  const deleteResult = await response.json();
  console.log(`Deleted: ${deleteResult.deletionType}`);

  // 6. Delete comment with replies (soft delete)
  // (Would be soft deleted if it had replies)
};
```

---

## Error Handling

### Common Errors

```typescript
// 400 Bad Request - Missing required fields
{
  error: "submissionId or changelogId is required"
}

// 400 Bad Request - Invalid content
{
  error: "content must be between 1 and 10000 characters"
}

// 401 Unauthorized - Invalid API key
{
  error: "Invalid API key"
}

// 404 Not Found - Comment doesn't exist
{
  error: "Comment not found"
}

// 403 Forbidden - Insufficient permissions
{
  error: "You do not have permission to delete this comment"
}
```

### Error Handling Pattern

```typescript
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    switch (response.status) {
      case 400:
        throw new Error(`Invalid request: ${error.error || 'Bad request'}`);
      case 401:
        throw new Error('Authentication failed: Invalid API key');
      case 403:
        throw new Error('Permission denied');
      case 404:
        throw new Error('Comment not found');
      default:
        throw new Error(`API error ${response.status}: ${error.error || 'Unknown error'}`);
    }
  }
};

// Usage
try {
  const response = await fetch(url, options);
  await handleApiError(response);
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API call failed:', error.message);
  throw error;
}
```

---

## Best Practices

### 1. Always Use Form Data

```typescript
// ✅ CORRECT
const formData = new URLSearchParams();
formData.append('submissionId', postId);
formData.append('content', content);

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: formData.toString()
});

// ❌ WRONG
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ submissionId: postId, content })
});
```

### 2. Handle Soft Delete Properly

```typescript
// When deleting comments, check deletion type
const result = await deleteComment(commentId);
if (result.deletionType === 'soft') {
  console.log('Comment has replies - soft deleted');
  // UI should still show "[deleted]" with reply tree
} else {
  console.log('Comment permanently removed');
  // UI should remove comment entirely
}
```

### 3. Build Comment Trees for Display

```typescript
// Don't display flat list - build tree structure
const tree = buildCommentTree(comments);
renderCommentTree(tree);
```

### 4. Validate Content Length

```typescript
const validateContent = (content: string): boolean => {
  if (content.length < 1) {
    throw new Error('Comment cannot be empty');
  }
  if (content.length > 10000) {
    throw new Error('Comment exceeds maximum length (10000 characters)');
  }
  return true;
};
```

### 5. Use Proper Authentication Header

```typescript
// ✅ CORRECT for Comments API
headers: {
  'X-API-Key': apiKey
}

// ❌ WRONG - this is for other APIs
headers: {
  'Authorization': `Bearer ${apiKey}`
}
```

---

## Summary

The FeatureBase Comments API provides:

1. **List**: Paginated listing with filtering by post/changelog, privacy, and sorting
2. **Create**: Create comments and threaded replies with privacy controls
3. **Update**: Update content, pin comments, change visibility
4. **Delete**: Soft delete (with replies) or hard delete (without replies)

**Key Features**:
- Threading support via `parentCommentId`
- Soft delete for comments with replies (preserves structure)
- Pinning comments to top
- Private comments (admin-only visibility)
- Voting metrics (upvotes, downvotes, score)
- Page-based pagination
- Multiple sort orders (newest, oldest, popular)

**Authentication**:
- Uses `X-API-Key` header (not `Authorization: Bearer`)
- Content-Type: `application/x-www-form-urlencoded` (not JSON)
- Different from other FeatureBase APIs

**Threading Behavior**:
- Unlimited nesting depth via `parentCommentId`
- Soft delete preserves reply chains
- `replyCount` shows number of direct replies
- Build tree structure for proper display

**Best Practices**:
- Always use form data encoding
- Handle soft vs hard delete appropriately
- Build and render comment trees
- Validate content length (1-10000 chars)
- Use correct authentication header
