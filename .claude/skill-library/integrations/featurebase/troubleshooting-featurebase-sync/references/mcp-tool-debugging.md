# MCP Tool Debugging

**Debugging FeatureBase MCP tool failures during manual sync operations.**

---

## MCP Tool Error Structure

FeatureBase MCP tools return HTTPResult discriminated union:

```typescript
// Success case
{
  ok: true,
  data: {
    // Response data
  }
}

// Error case
{
  ok: false,
  error: {
    message: "Error description",
    status: 400,  // HTTP status code
    context: {...}  // Additional context
  }
}
```

---

## Common Error Status Codes

| Status | Meaning | Common Causes | Typical Fix |
| --- | --- | --- | --- |
| 400 | Bad Request | Missing required fields, invalid format | Validate input parameters |
| 401 | Unauthorized | Invalid API key | Check/rotate API key |
| 404 | Not Found | featurebaseId doesn't exist | Use correct ID or create instead |
| 409 | Conflict | Duplicate content | Update existing or change title |
| 429 | Rate Limit | Too many requests | Wait 60s, retry |
| 500 | Server Error | FeatureBase API bug | Wait and retry |
| 502 | Bad Gateway | Load balancer issue | Wait and retry |
| 503 | Service Unavailable | API down | Check status page |

---

## Debugging by Status Code

### 400 Bad Request

**Error example:**

```json
{
  "ok": false,
  "error": {
    "message": "Missing required field: boardId",
    "status": 400,
    "context": {
      "field": "boardId",
      "operation": "createPost"
    }
  }
}
```

**Fix procedure:**

```typescript
// Check input parameters
console.log('Input:', input);

// Add missing field
const validInput = {
  ...input,
  boardId: "board_abc123"  // Was missing
};

// Retry
const result = await createPost.execute(validInput, client);
```

**Common validation errors:**
- Missing `title`
- Missing `boardId` (for posts)
- Invalid `status` value
- Tags not an array
- Invalid date format

---

### 401 Unauthorized

**Error example:**

```json
{
  "ok": false,
  "error": {
    "message": "Invalid API key",
    "status": 401
  }
}
```

**Fix procedure:**

```bash
# 1. Check API key is set
echo $FEATUREBASE_API_KEY

# If empty or wrong:
# 2. Get correct API key from FeatureBase dashboard
# 3. Set environment variable
export FEATUREBASE_API_KEY="sk_live_..."

# 4. Retry operation
```

---

### 404 Not Found

**Error example:**

```json
{
  "ok": false,
  "error": {
    "message": "Post not found",
    "status": 404,
    "context": {
      "featurebaseId": "post_xyz789"
    }
  }
}
```

**Fix procedure:**

```bash
# Option 1: featurebaseId is wrong
# - Get correct ID from FeatureBase
# - Update frontmatter

# Option 2: Post was deleted in FeatureBase
# - Remove local file (already deleted remotely)
git rm modules/chariot/docs/featurebase/posts/post_xyz789-*.md

# Option 3: Trying to update when should create
# - Use createPost instead of updatePost
# - Remove featurebaseId from frontmatter
```

---

### 409 Conflict

**Error example:**

```json
{
  "ok": false,
  "error": {
    "message": "Post with this title already exists",
    "status": 409,
    "context": {
      "existingId": "post_abc123",
      "title": "My Feature Request"
    }
  }
}
```

**Fix procedure:**

```bash
# Option 1: Update existing instead of creating
# - Use updatePost with existingId
await updatePost.execute({
  id: "post_abc123",
  ...updateData
}, client);

# Option 2: Change title to make unique
# - Edit markdown file
# - Change title field
# - Retry create

# Option 3: Delete duplicate first
# - Delete existing post
# - Then create new one
```

---

### 429 Too Many Requests

**Error example:**

```json
{
  "ok": false,
  "error": {
    "message": "Rate limit exceeded",
    "status": 429,
    "context": {
      "retryAfter": 60  // seconds
    }
  }
}
```

**Fix procedure:**

```bash
# 1. Wait for retry period
sleep 60

# 2. Retry operation
# (Ky library handles this automatically for up to 3 retries)

# 3. If manual operation, reduce request rate
# - Add delays between calls
# - Process in smaller batches
```

---

### 500/502/503 Server Errors

**Error example:**

```json
{
  "ok": false,
  "error": {
    "message": "Internal server error",
    "status": 500
  }
}
```

**Fix procedure:**

```bash
# 1. Ky library auto-retries (3 attempts)

# 2. If all retries fail, wait 15 minutes

# 3. Check FeatureBase status page

# 4. Retry manually
# (Re-run the MCP tool)

# 5. If persistent, contact FeatureBase support
# Provide:
#   - Request payload
#   - Error message
#   - Timestamp
```

---

## Testing API Connectivity

**Manual API test:**

```bash
# Test authentication
curl -H "Authorization: Bearer $FEATUREBASE_API_KEY" \
  https://api.featurebase.app/v1/posts?limit=1

# Expected: 200 OK with JSON response

# If 401: API key is invalid
# If timeout: Network or API issues
# If 5xx: API server problems
```

**Test rate limit headers:**

```bash
# Check if API exposes rate limit info
curl -I -H "Authorization: Bearer $FEATUREBASE_API_KEY" \
  https://api.featurebase.app/v1/posts

# Look for headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 75
# X-RateLimit-Reset: 1642123456
```
