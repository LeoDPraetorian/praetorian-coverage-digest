---
description: Natural language interface for Featurebase - just describe what you want, no syntax to memorize!
argument-hint: <describe your operation naturally>
allowed-tools: Bash, Read, Skill
---

# Featurebase Content Management

**Speak naturally!** Just describe what you want after `/featurebase` - I'll figure it out.

## What You Can Do

### Posts (Feedback/Ideas)
- **List posts** - See feedback posts with filtering
- **Get post** - Get details of a specific post
- **Create post** - Submit new feedback or ideas
- **Update post** - Modify existing posts
- **Delete post** - Remove a post

### Changelog Entries
- **List changelog** - See product updates
- **Get changelog** - Get specific changelog entry
- **Create changelog** - Publish new product update
- **Update changelog** - Edit changelog entry
- **Delete changelog** - Remove changelog entry

### Help Articles
- **List articles** - Browse help documentation
- **Get article** - Read specific article
- **Create article** - Write new help article
- **Update article** - Edit existing article
- **Delete article** - Remove article

### Users
- **Identify user** - Create or update user profile
- **Get user** - Fetch user details
- **List users** - Browse all users
- **Delete user** - Remove user

### Custom Fields
- **List custom fields** - See available custom fields
- **Create custom field** - Add new custom field

### Comments
- **List comments** - See comments on a post
- **Create comment** - Add comment to a post
- **Update comment** - Edit a comment
- **Delete comment** - Remove a comment

### Sync Operations
- **Sync to markdown** - Export Featurebase content to local markdown files
- **Sync from markdown** - Push local markdown changes to Featurebase

---

## Natural Language Examples

### Posts

```bash
# All of these work:
/featurebase list posts
/featurebase show me recent feedback
/featurebase get post abc123
/featurebase create post titled "New feature request" with content "We need dark mode"
/featurebase update post abc123 status to approved
/featurebase delete post abc123
```

### Changelog

```bash
/featurebase list changelog entries
/featurebase show recent product updates
/featurebase get changelog xyz789
/featurebase create changelog "v2.0 Release" with content "Major update with new features"
/featurebase update changelog xyz789 title to "v2.0.1 Hotfix"
```

### Articles

```bash
/featurebase list help articles
/featurebase get article about authentication
/featurebase create article titled "Getting Started" in category "guides"
/featurebase update article abc123 content
```

### Users

```bash
/featurebase identify user with email user@example.com name "John Doe"
/featurebase get user by email user@example.com
/featurebase list all users
```

### Comments

```bash
/featurebase list comments on post abc123
/featurebase add comment "Great idea!" to post abc123
/featurebase update comment xyz789 content to "Updated feedback"
```

### Sync

```bash
/featurebase sync content to markdown
/featurebase sync from markdown to featurebase
/featurebase pull latest content
/featurebase push local changes
```

---

## How It Works

1. **You describe** your intent naturally (no rigid syntax required)
2. **I detect** the operation type and parameters
3. **I execute** the appropriate Featurebase wrapper
4. **I display** clean results back to you

**No memorization needed!** Just tell me what you need in plain language.

---

## Implementation

When you invoke this command, I will:

### Step 1: Detect Repository Root

**CRITICAL:** This command works from any directory (including submodules).

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
```

### Step 2: Parse Your Natural Language

I'll analyze your input for:
- **Operation type**: posts, changelog, articles, users, custom-fields, comments, sync
- **Action**: list, get, create, update, delete, sync
- **Parameters**: id, title, content, email, status, filters

### Step 3: Execute the Appropriate Wrapper

**All commands use dynamic repository root detection:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "..." 2>/dev/null
```

Based on your request, I'll execute one of:

**list-posts** - List feedback posts

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { listPosts, createFeaturebaseClient } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const client = createFeaturebaseClient();
  const result = await listPosts.execute({ limit: 20 }, client);
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**get-post** - Get specific post

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { getPost, createFeaturebaseClient } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const client = createFeaturebaseClient();
  const result = await getPost.execute({ id: 'POST_ID' }, client);
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**create-post** - Create new post

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { createPost, createFeaturebaseClient } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const client = createFeaturebaseClient();
  const result = await createPost.execute({
    title: 'Post Title',
    content: 'Post content here'
  }, client);
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**list-changelog** - List changelog entries

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { listChangelog, createFeaturebaseClient } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const client = createFeaturebaseClient();
  const result = await listChangelog.execute({ limit: 20 }, client);
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**create-changelog** - Create changelog entry

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { createChangelog, createFeaturebaseClient } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const client = createFeaturebaseClient();
  const result = await createChangelog.execute({
    title: 'v2.0 Release',
    content: 'Release notes content'
  }, client);
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**list-articles** - List help articles

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { listArticles, createFeaturebaseClient } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const client = createFeaturebaseClient();
  const result = await listArticles.execute({ limit: 20 }, client);
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**identify-user** - Create or update user

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { identifyUser, createFeaturebaseClient } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const client = createFeaturebaseClient();
  const result = await identifyUser.execute({
    email: 'user@example.com',
    name: 'User Name'
  }, client);
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**list-comments** - List comments on a post

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { listComments } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const result = await listComments.execute({ postId: 'POST_ID' });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**sync-to-markdown** - Export to local files

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { syncToMarkdown, createFeaturebaseClient } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const client = createFeaturebaseClient();
  const result = await syncToMarkdown({ outputDir: './content' }, client);
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**sync-from-markdown** - Push local changes

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { syncFromMarkdown, createFeaturebaseClient } = await import('$ROOT/.claude/tools/featurebase/index.ts');
  const client = createFeaturebaseClient();
  const result = await syncFromMarkdown({ inputDir: './content' }, client);
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

### Step 4: Format and Display Results

I'll parse the JSON response and display it in a clean, readable format with:
- Summary of operation result
- Created/updated item details
- Error messages (if any)
- Links to Featurebase dashboard

---

## Authentication

Featurebase tools use API key authentication configured in `$ROOT/.claude/tools/config/credentials.json`:

```json
{
  "featurebase": {
    "apiKey": "YOUR_API_KEY_HERE"
  }
}
```

**Get your API key from:** https://app.featurebase.app/settings/api

---

## Related Skills

For more complex workflows, these library skills are available:

- `creating-featurebase-content` - Content creation patterns
- `syncing-featurebase-content` - Bidirectional sync workflows
- `troubleshooting-featurebase-sync` - Debug sync issues

---

## Tips for Best Results

- **Be specific**: "create changelog for v2.0" > "make changelog"
- **Include context**: "with content X" helps populate fields
- **Use IDs**: Provide post/article IDs for get/update/delete operations
- **Natural variations work**: The parser handles different phrasings

---

## When Something Fails

If you encounter an error:

1. **State the error**: "The /featurebase command returned: [exact error message]"
2. **Show what you tried**: Include the natural language command you used
3. **Ask the user**: "Should I debug the interface or try a different approach?"
4. **Wait for response**: Do not silently fall back to low-level execution
