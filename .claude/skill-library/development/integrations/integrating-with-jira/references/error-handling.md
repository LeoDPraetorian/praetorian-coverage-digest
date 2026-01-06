# Jira Error Handling Reference

**HTTP status codes, error response formats, and recovery strategies.**

## Error Response Structure

Jira returns errors in a consistent JSON format:

```json
{
  "errorMessages": ["The issue key 'INVALID-123' does not exist."],
  "errors": {
    "customfield_10001": "Field 'customfield_10001' cannot be set. It is not on the appropriate screen, or unknown."
  }
}
```

**Fields**:

- `errorMessages`: Array of general error messages
- `errors`: Object mapping field names to field-specific errors

## HTTP Status Codes

### Client Errors (4xx)

| Status  | Meaning            | Common Causes                                     | Recovery               |
| ------- | ------------------ | ------------------------------------------------- | ---------------------- |
| **400** | Bad Request        | Invalid JQL, malformed JSON, invalid field values | Fix request payload    |
| **401** | Unauthorized       | Invalid or expired credentials                    | Re-authenticate        |
| **403** | Forbidden          | Insufficient permissions                          | Check user permissions |
| **404** | Not Found          | Issue/project doesn't exist                       | Verify resource exists |
| **405** | Method Not Allowed | Wrong HTTP method                                 | Use correct method     |
| **409** | Conflict           | Concurrent modification                           | Retry with fresh data  |
| **429** | Too Many Requests  | Rate limit exceeded                               | Implement backoff      |

### Server Errors (5xx)

| Status  | Meaning               | Common Causes                | Recovery                |
| ------- | --------------------- | ---------------------------- | ----------------------- |
| **500** | Internal Server Error | Jira bug, server issue       | Retry with backoff      |
| **502** | Bad Gateway           | Proxy/load balancer issue    | Retry                   |
| **503** | Service Unavailable   | Jira maintenance, overloaded | Wait and retry          |
| **504** | Gateway Timeout       | Request too slow             | Simplify request, retry |

## Detailed Error Handling

### 400 Bad Request

**JQL Syntax Error**:

```json
{
  "errorMessages": ["Error in the JQL Query: The character '&' is a reserved JQL character."]
}
```

**Solution**: Validate JQL before execution:

```typescript
async function validateJql(jql: string): Promise<{ valid: boolean; errors?: string[] }> {
  const response = await fetch(`${baseUrl}/rest/api/3/jql/parse`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ queries: [jql] }),
  });

  const result = await response.json();
  const errors = result.queries[0]?.errors || [];

  return {
    valid: errors.length === 0,
    errors: errors.map((e: any) => e.msg),
  };
}
```

**Invalid Field Value**:

```json
{
  "errors": {
    "priority": "Priority name 'Critical' is not valid."
  }
}
```

**Solution**: Fetch valid options before setting:

```typescript
const priorities = await fetch(`${baseUrl}/rest/api/3/priority`).then((r) => r.json());
const validNames = priorities.map((p) => p.name);
```

**Field Not on Screen**:

```json
{
  "errors": {
    "customfield_10001": "Field 'customfield_10001' cannot be set. It is not on the appropriate screen, or unknown."
  }
}
```

**Solution**: Check field configuration in Jira admin, or use different API endpoint.

### 401 Unauthorized

**Invalid Credentials**:

```json
{
  "errorMessages": ["You do not have permission to view this request."]
}
```

**Common Causes**:

- Expired API token
- Wrong email/token combination
- Token revoked

**Solution**:

```typescript
async function handleUnauthorized(error: any): Promise<void> {
  // Log for debugging
  console.error("Authentication failed:", error);

  // Check token validity
  const isValid = await validateToken();
  if (!isValid) {
    // Refresh token or prompt re-authentication
    await refreshCredentials();
  }
}
```

### 403 Forbidden

**Insufficient Permissions**:

```json
{
  "errorMessages": ["You do not have permission to edit issues in project 'PROJ'."]
}
```

**Common Causes**:

- User not member of project
- Missing role permissions
- Issue security level restrictions

**Solution**:

```typescript
async function checkPermissions(projectKey: string, permission: string): Promise<boolean> {
  const response = await fetch(
    `${baseUrl}/rest/api/3/mypermissions?projectKey=${projectKey}&permissions=${permission}`,
    { headers: { Authorization: auth } }
  );

  const result = await response.json();
  return result.permissions[permission]?.havePermission === true;
}

// Usage
if (!(await checkPermissions("PROJ", "EDIT_ISSUES"))) {
  throw new Error("User lacks EDIT_ISSUES permission on PROJ");
}
```

### 404 Not Found

**Issue Not Found**:

```json
{
  "errorMessages": ["Issue does not exist or you do not have permission to see it."]
}
```

**Solution**:

```typescript
async function issueExists(issueKey: string): Promise<boolean> {
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}?fields=key`, {
    headers: { Authorization: auth },
  });

  return response.status === 200;
}
```

### 429 Rate Limited

**Rate Limit Response**:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1719936000
```

**Solution**: Implement exponential backoff with jitter:

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 5
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
      const baseDelay = Math.min(retryAfter * 1000, 2 ** attempt * 1000);
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;

      console.warn(`Rate limited, retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
}
```

### 500 Internal Server Error

**Solution**: Retry with exponential backoff:

```typescript
async function fetchWithServerErrorRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status >= 500 && response.status < 600) {
      const delay = 2 ** attempt * 1000;
      console.warn(
        `Server error ${response.status}, retry ${attempt + 1}/${maxRetries} after ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error(`Server error persisted after ${maxRetries} retries`);
}
```

## Comprehensive Error Handler

```typescript
interface JiraError {
  status: number;
  errorMessages: string[];
  errors: Record<string, string>;
}

class JiraApiError extends Error {
  constructor(
    public status: number,
    public errorMessages: string[],
    public fieldErrors: Record<string, string>
  ) {
    super(errorMessages.join("; ") || `Jira API error: ${status}`);
    this.name = "JiraApiError";
  }

  static async fromResponse(response: Response): Promise<JiraApiError> {
    let body: any = {};
    try {
      body = await response.json();
    } catch {
      // Response may not be JSON
    }

    return new JiraApiError(response.status, body.errorMessages || [], body.errors || {});
  }

  isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }

  isAuthError(): boolean {
    return this.status === 401;
  }

  isPermissionError(): boolean {
    return this.status === 403;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isValidationError(): boolean {
    return this.status === 400;
  }
}

async function jiraFetch(url: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw await JiraApiError.fromResponse(response);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
```

## Error Recovery Patterns

### Retry with Backoff

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (error) => error instanceof JiraApiError && error.isRetryable(),
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      const jitter = Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

// Usage
const issue = await withRetry(() => getIssue("PROJ-123"));
```

### Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }
}

// Usage
const breaker = new CircuitBreaker();
const issue = await breaker.execute(() => getIssue("PROJ-123"));
```

### Graceful Degradation

```typescript
async function getIssueWithFallback(issueKey: string): Promise<Issue | null> {
  try {
    return await getIssue(issueKey);
  } catch (error) {
    if (error instanceof JiraApiError) {
      if (error.isNotFound()) {
        return null; // Issue doesn't exist
      }

      if (error.isPermissionError()) {
        console.warn(`No permission to view ${issueKey}`);
        return null;
      }
    }

    // Re-throw unexpected errors
    throw error;
  }
}
```

## Logging Best Practices

```typescript
interface JiraApiLog {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  requestId?: string;
  error?: {
    messages: string[];
    fields: Record<string, string>;
  };
}

async function loggedFetch(url: string, options: RequestInit): Promise<Response> {
  const start = Date.now();

  const response = await fetch(url, options);

  const log: JiraApiLog = {
    timestamp: new Date().toISOString(),
    method: options.method || "GET",
    url,
    status: response.status,
    duration: Date.now() - start,
    requestId: response.headers.get("X-Request-Id") || undefined,
  };

  if (!response.ok) {
    const body = await response
      .clone()
      .json()
      .catch(() => ({}));
    log.error = {
      messages: body.errorMessages || [],
      fields: body.errors || {},
    };
  }

  console.log(JSON.stringify(log));

  return response;
}
```

## Common Pitfalls

| Pitfall               | Cause                        | Solution                              |
| --------------------- | ---------------------------- | ------------------------------------- |
| Silent failures       | Not checking response status | Always check `response.ok`            |
| Missing context       | Generic error messages       | Include issue key, field name in logs |
| Infinite retries      | No max retry limit           | Set reasonable retry limits           |
| Rate limit exhaustion | No backoff                   | Implement exponential backoff         |
| Auth loops            | Retrying 401 errors          | Don't retry auth failures             |
