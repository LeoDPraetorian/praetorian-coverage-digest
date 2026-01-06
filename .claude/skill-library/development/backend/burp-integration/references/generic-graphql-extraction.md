# Generic GraphQL Pattern Extraction

This document clarifies which patterns from `burp-integration` are Burp-specific versus reusable for other GraphQL APIs.

## Burp-Specific Patterns

These patterns are **unique to Burp Suite Enterprise** integration and should NOT be extracted:

### 1. Site Provisioning Workflow

- `EnsureSite` helper with folder/site/schedule orchestration
- Burp folder hierarchy (username-based folders)
- Daily schedule creation for seeds (recurring midnight scans)
- On-demand schedule creation for ad-hoc scans

**Why Burp-specific:** Burp's multi-tier entity model (folders → sites → schedules → scans) is unique to its architecture.

### 2. Scan Lifecycle Management

- Schedule item vs scan ID distinction
- Scan status polling (`SCAN_QUEUED`, `SCAN_RUNNING`, `SCAN_SUCCEEDED`)
- Scan cancellation patterns
- WebSocket subscriptions for async operations (API definition parsing)

**Why Burp-specific:** Burp's async scan execution model with schedule items wrapping scans is unique.

### 3. Chariot Header Injection

```go
{
    "name":  "Chariot",
    "value": format.Hash(username), // MD5 hash identifier
},
{
    "name":  "User-Agent",
    "value": format.Useragent(username), // Chariot-branded UA
}
```

**Why Burp-specific:** These headers are Chariot-specific for scan attribution in Burp logs.

### 4. Result Processing

- Burp issue conversion to `model.Risk` (Tabularium)
- Scanned items to `model.Asset` (Tabularium)
- Issue severity mapping (Burp → Chariot risk levels)

**Why Burp-specific:** Conversion logic is tailored to Burp's issue schema and Chariot's data models.

---

## Generic Patterns (Now in building-graphql-batch-clients)

These patterns are **reusable for any GraphQL API** (GitHub, GitLab, Azure DevOps) and have been extracted:

### 1. Variable Binding (Security)

**Pattern:** Always use GraphQL variables instead of string interpolation.

```go
// ❌ WRONG - Injection risk
query := fmt.Sprintf(`query { user(id: "%s") }`, userID)

// ✅ RIGHT - Safe variable binding
query := `query GetUser($id: ID!) { user(id: $id) }`
variables := map[string]any{"id": userID}
```

**Why generic:** Variable binding is a universal GraphQL security best practice.

### 2. Rate Limiting Approaches

**Pattern:** Respect API rate limits with exponential backoff and retry logic.

```go
// Check rate limit headers
remaining := resp.Header.Get("X-RateLimit-Remaining")
if remaining == "0" {
    resetTime := parseResetTime(resp.Header.Get("X-RateLimit-Reset"))
    time.Sleep(time.Until(resetTime))
}
```

**Why generic:** All GraphQL APIs have rate limits (GitHub: 5000/hour, GitLab: 2000/minute).

### 3. Error Response Structure

**Pattern:** Parse GraphQL errors from the `errors` array in responses.

```go
type GraphQLResponse struct {
    Data   json.RawMessage   `json:"data"`
    Errors []GraphQLError    `json:"errors"`
}

type GraphQLError struct {
    Message    string                 `json:"message"`
    Locations  []Location             `json:"locations"`
    Path       []string               `json:"path"`
    Extensions map[string]interface{} `json:"extensions"`
}
```

**Why generic:** GraphQL spec defines standard error format used by all implementations.

### 4. Testing with httptest.NewServer

**Pattern:** Mock GraphQL API responses for unit testing without real connectivity.

```go
server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]any{
        "data": map[string]any{
            "repository": map[string]any{"id": "repo-123"},
        },
    })
}))
defer server.Close()

client := NewClient(server.Client(), token, server.URL)
```

**Why generic:** `httptest.NewServer` is a universal Go testing pattern for HTTP APIs.

### 5. Batch Query Construction

**Pattern:** Combine multiple queries into a single GraphQL request using aliases.

```go
query := `
    query BatchFetch {
        repo1: repository(owner: "org", name: "repo1") { id }
        repo2: repository(owner: "org", name: "repo2") { id }
        repo3: repository(owner: "org", name: "repo3") { id }
    }
`
```

**Why generic:** GraphQL allows aliased queries to batch requests and reduce round trips.

### 6. Pagination Patterns

**Pattern:** Use cursor-based pagination for large result sets.

```go
query := `
    query ListIssues($cursor: String) {
        repository(owner: "org", name: "repo") {
            issues(first: 100, after: $cursor) {
                edges { node { id title } }
                pageInfo { endCursor hasNextPage }
            }
        }
    }
`
```

**Why generic:** Relay-style cursor pagination is the GraphQL standard (GitHub, GitLab, Shopify).

---

## Migration Path

When implementing a new GraphQL integration (e.g., GitHub API, GitLab API):

1. **Start with building-graphql-batch-clients** for generic patterns
2. **Reference burp-integration** only for Burp-specific workflows
3. **Extract domain-specific logic** into your own integration skill

**Example:** For GitHub integration, use:

- `building-graphql-batch-clients` → Variable binding, rate limiting, error handling, testing
- New `github-integration` skill → Repository cloning, issue tracking, webhook handling

---

## Skill Relationship Diagram

```
building-graphql-batch-clients (Generic)
    ├── Variable binding (security)
    ├── Rate limiting
    ├── Error handling
    ├── Testing patterns
    ├── Batch queries
    └── Pagination

burp-integration (Burp-specific)
    ├── Site provisioning
    ├── Scan lifecycle
    ├── Chariot headers
    └── Result conversion

github-integration (Future, GitHub-specific)
    ├── Extends: building-graphql-batch-clients
    ├── Repository operations
    ├── Issue tracking
    └── Webhook handling
```

---

## References

- **building-graphql-batch-clients** skill - Generic GraphQL patterns
- **burp-integration** skill (this skill) - Burp Suite Enterprise integration
- GraphQL Spec: https://spec.graphql.org/
- GitHub GraphQL API: https://docs.github.com/en/graphql
- GitLab GraphQL API: https://docs.gitlab.com/ee/api/graphql/
