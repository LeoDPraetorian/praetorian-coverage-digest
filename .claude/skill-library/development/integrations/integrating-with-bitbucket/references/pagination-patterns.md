# Pagination Patterns for Bitbucket API

**Complete guide to handling paginated responses in Bitbucket Cloud API 2.0.**

---

## Overview

Bitbucket Cloud API uses **cursor-based pagination** for collections. All list endpoints return paginated results with:

- `values`: Array of items for current page
- `next`: URL for next page (empty/null when no more pages)
- `previous`: URL for previous page (optional)
- `pagelen`: Number of items per page
- `size`: Total count of items (not always present)

**Default page size**: 10 items
**Maximum page size**: 100 items (recommended for efficiency)

---

## Pagination Response Structure

```json
{
  "pagelen": 100,
  "values": [
    { "id": 1, "...": "..." },
    { "id": 2, "...": "..." }
  ],
  "next": "https://api.bitbucket.org/2.0/repositories/workspace?page=2&pagelen=100",
  "previous": null,
  "size": 250
}
```

---

## Go Implementation

### Basic Pagination

```go
type PaginatedResponse struct {
    Values  []json.RawMessage `json:"values"`
    Next    string            `json:"next"`
    Pagelen int               `json:"pagelen"`
    Size    int               `json:"size,omitempty"`
}

func (c *Client) fetchAllPages(initialPath string) ([]json.RawMessage, error) {
    var allItems []json.RawMessage
    nextURL := initialPath

    for nextURL != "" {
        resp, err := c.Request("GET", nextURL, nil)
        if err != nil {
            return nil, fmt.Errorf("request failed: %w", err)
        }
        defer resp.Body.Close()

        var page PaginatedResponse
        if err := json.NewDecoder(resp.Body).Decode(&page); err != nil {
            return nil, fmt.Errorf("decode response: %w", err)
        }

        allItems = append(allItems, page.Values...)

        // Extract path from next URL
        if page.Next != "" {
            nextURL = strings.TrimPrefix(page.Next, c.BaseURL)
        } else {
            nextURL = ""
        }

        // Optional: Progress tracking
        fmt.Printf("Fetched %d items (page size: %d)\n", len(allItems), page.Pagelen)
    }

    return allItems, nil
}
```

### Type-Safe Pagination

```go
func (c *Client) ListRepositories(workspace string) ([]Repository, error) {
    var repos []Repository
    nextURL := fmt.Sprintf("/repositories/%s?pagelen=100", workspace)

    for nextURL != "" {
        resp, err := c.Request("GET", nextURL, nil)
        if err != nil {
            return nil, err
        }
        defer resp.Body.Close()

        var page struct {
            Values  []Repository `json:"values"`
            Next    string       `json:"next"`
            Pagelen int          `json:"pagelen"`
        }

        if err := json.NewDecoder(resp.Body).Decode(&page); err != nil {
            return nil, err
        }

        repos = append(repos, page.Values...)

        // Update next URL (strip base URL)
        if page.Next != "" {
            nextURL = page.Next[len(c.BaseURL):]
        } else {
            nextURL = ""
        }
    }

    return repos, nil
}
```

### Pagination with Error Handling

```go
func (c *Client) ListRepositoriesWithRetry(workspace string) ([]Repository, error) {
    var repos []Repository
    nextURL := fmt.Sprintf("/repositories/%s?pagelen=100", workspace)

    maxRetries := 3
    retryDelay := 2 * time.Second

    for nextURL != "" {
        var page struct {
            Values  []Repository `json:"values"`
            Next    string       `json:"next"`
        }

        // Retry logic
        var lastErr error
        for attempt := 0; attempt <= maxRetries; attempt++ {
            resp, err := c.Request("GET", nextURL, nil)
            if err != nil {
                lastErr = err
                time.Sleep(retryDelay)
                continue
            }
            defer resp.Body.Close()

            if resp.StatusCode == 429 {
                // Rate limited
                lastErr = fmt.Errorf("rate limited")
                time.Sleep(retryDelay * time.Duration(attempt+1))
                continue
            }

            if err := json.NewDecoder(resp.Body).Decode(&page); err != nil {
                lastErr = err
                break
            }

            // Success
            lastErr = nil
            break
        }

        if lastErr != nil {
            return nil, fmt.Errorf("failed after %d retries: %w", maxRetries, lastErr)
        }

        repos = append(repos, page.Values...)

        if page.Next != "" {
            nextURL = page.Next[len(c.BaseURL):]
        } else {
            nextURL = ""
        }
    }

    return repos, nil
}
```

---

## Python Implementation

### Basic Pagination

```python
def fetch_all_pages(self, initial_path: str) -> List[Dict[str, Any]]:
    """
    Fetch all pages from a paginated endpoint.

    Args:
        initial_path: Initial API path (e.g., "/repositories/workspace")

    Returns:
        List of all items across all pages
    """
    all_items = []
    next_url = initial_path

    while next_url:
        response = self._request("GET", next_url)
        data = response.json()

        all_items.extend(data.get("values", []))

        # Extract path from next URL
        next_full = data.get("next", "")
        next_url = next_full.replace(self.base_url, "") if next_full else ""

        # Optional: Progress tracking
        print(f"Fetched {len(all_items)} items (page size: {data.get('pagelen', 0)})")

    return all_items
```

### Generator-Based Pagination (Memory Efficient)

```python
from typing import Iterator

def iter_repositories(
    self,
    workspace: str,
    page_size: int = 100
) -> Iterator[Dict[str, Any]]:
    """
    Iterate over repositories using a generator (memory efficient).

    Args:
        workspace: Workspace slug
        page_size: Items per page (max 100)

    Yields:
        Repository dictionaries one at a time
    """
    next_url = f"/repositories/{workspace}?pagelen={page_size}"

    while next_url:
        response = self._request("GET", next_url)
        data = response.json()

        for repo in data.get("values", []):
            yield repo

        next_full = data.get("next", "")
        next_url = next_full.replace(self.base_url, "") if next_full else ""
```

### Pagination with Progress Callback

```python
from typing import Callable, Optional

def list_repositories_with_progress(
    self,
    workspace: str,
    progress_callback: Optional[Callable[[int, int], None]] = None
) -> List[Dict[str, Any]]:
    """
    List repositories with progress tracking.

    Args:
        workspace: Workspace slug
        progress_callback: Function called with (current_count, total_size)

    Returns:
        List of repository dictionaries
    """
    repos = []
    next_url = f"/repositories/{workspace}?pagelen=100"

    while next_url:
        response = self._request("GET", next_url)
        data = response.json()

        repos.extend(data.get("values", []))

        # Call progress callback if provided
        if progress_callback:
            total = data.get("size", 0)
            progress_callback(len(repos), total)

        next_full = data.get("next", "")
        next_url = next_full.replace(self.base_url, "") if next_full else ""

    return repos
```

---

## Pagination Parameters

### pagelen Parameter

Control items per page:

```bash
# Default (10 items)
GET /2.0/repositories/workspace

# Maximum (100 items - recommended)
GET /2.0/repositories/workspace?pagelen=100

# Custom (25 items)
GET /2.0/repositories/workspace?pagelen=25
```

**Recommendations:**

- Always use `pagelen=100` for efficiency
- Reduces total API requests by 10x
- Lower rate limit consumption

### Filtering with Pagination

Combine pagination with filters:

```bash
# Paginated with state filter
GET /2.0/repositories/workspace/repo/pullrequests?state=OPEN&pagelen=100

# Paginated with sort
GET /2.0/repositories/workspace?sort=-updated_on&pagelen=100
```

**Go Example:**

```go
func (c *Client) ListOpenPRs(workspace, repo string) ([]PullRequest, error) {
    path := fmt.Sprintf("/repositories/%s/%s/pullrequests?state=OPEN&pagelen=100",
        workspace, repo)
    return c.paginatePullRequests(path)
}
```

---

## Advanced Patterns

### Concurrent Page Fetching

**⚠️ Use with caution**: May trigger rate limits.

```go
func (c *Client) ListRepositoriesConcurrent(workspace string) ([]Repository, error) {
    // First request to get total pages
    firstResp, err := c.Request("GET", fmt.Sprintf("/repositories/%s?pagelen=100", workspace), nil)
    if err != nil {
        return nil, err
    }
    defer firstResp.Body.Close()

    var firstPage struct {
        Values  []Repository `json:"values"`
        Size    int          `json:"size"`
        Pagelen int          `json:"pagelen"`
        Next    string       `json:"next"`
    }
    if err := json.NewDecoder(firstResp.Body).Decode(&firstPage); err != nil {
        return nil, err
    }

    totalPages := (firstPage.Size + firstPage.Pagelen - 1) / firstPage.Pagelen
    repos := firstPage.Values

    // Fetch remaining pages concurrently
    type result struct {
        repos []Repository
        err   error
    }

    results := make(chan result, totalPages-1)
    nextURL := firstPage.Next

    // Spawn goroutines for each page (CAUTION: rate limits!)
    for i := 1; i < totalPages && nextURL != ""; i++ {
        pageURL := nextURL
        go func() {
            pageRepos, err := c.fetchSinglePage(pageURL)
            results <- result{repos: pageRepos, err: err}
        }()

        // Update nextURL (requires fetching each page URL sequentially)
        // This pattern is complex - sequential pagination is recommended
    }

    // Collect results
    for i := 1; i < totalPages; i++ {
        res := <-results
        if res.err != nil {
            return nil, res.err
        }
        repos = append(repos, res.repos...)
    }

    return repos, nil
}
```

**Note:** Sequential pagination is recommended. Concurrent fetching can trigger rate limits.

### Pagination with Caching

```go
type PageCache struct {
    cache map[string]*CachedPage
    mu    sync.RWMutex
    ttl   time.Duration
}

type CachedPage struct {
    Data      []json.RawMessage
    ExpiresAt time.Time
}

func (c *Client) ListRepositoriesCached(workspace string) ([]Repository, error) {
    cacheKey := fmt.Sprintf("repos:%s", workspace)

    // Check cache
    if cached := c.pageCache.Get(cacheKey); cached != nil {
        var repos []Repository
        for _, raw := range cached {
            var repo Repository
            json.Unmarshal(raw, &repo)
            repos = append(repos, repo)
        }
        return repos, nil
    }

    // Fetch from API
    repos, err := c.ListRepositories(workspace)
    if err != nil {
        return nil, err
    }

    // Cache results
    rawData := make([]json.RawMessage, len(repos))
    for i, repo := range repos {
        data, _ := json.Marshal(repo)
        rawData[i] = data
    }
    c.pageCache.Set(cacheKey, rawData)

    return repos, nil
}
```

---

## Best Practices

### 1. Always Use Maximum Page Size

```go
// ✅ GOOD: 100 items per page
path := fmt.Sprintf("/repositories/%s?pagelen=100", workspace)

// ❌ BAD: Default 10 items per page (10x more requests)
path := fmt.Sprintf("/repositories/%s", workspace)
```

### 2. Extract Path from Next URL

```go
// ✅ GOOD: Extract relative path
if page.Next != "" {
    nextURL = page.Next[len(c.BaseURL):]
}

// ❌ BAD: Use full URL (won't work with Request method)
nextURL = page.Next
```

### 3. Handle Empty Next Gracefully

```go
// ✅ GOOD: Check for empty/null
if page.Next != "" {
    nextURL = page.Next[len(c.BaseURL):]
} else {
    nextURL = ""
}

// ❌ BAD: Assume next always exists
nextURL = page.Next[len(c.BaseURL):]  // Panics if Next is ""
```

### 4. Use Generators for Large Datasets (Python)

```python
# ✅ GOOD: Memory efficient for 10,000+ items
for repo in client.iter_repositories("workspace"):
    process(repo)

# ❌ BAD: Loads all 10,000 items into memory
repos = client.list_repositories("workspace")
for repo in repos:
    process(repo)
```

### 5. Monitor Progress for Long Operations

```go
// ✅ GOOD: Show progress
fmt.Printf("Fetched %d/%d repositories\r", current, total)

// ❌ BAD: No feedback on long-running operations
// User doesn't know if request is hanging or progressing
```

---

## Common Pitfalls

### Pitfall 1: Not Handling Pagination

```go
// ❌ WRONG: Only gets first page (10-100 items)
resp, _ := client.Request("GET", "/repositories/workspace", nil)
var page struct {
    Values []Repository `json:"values"`
}
json.NewDecoder(resp.Body).Decode(&page)
return page.Values  // Missing remaining pages!
```

### Pitfall 2: Using Full URLs in Requests

```go
// ❌ WRONG: nextURL contains full URL including base
nextURL := page.Next  // "https://api.bitbucket.org/2.0/repositories/..."
resp, _ := client.Request("GET", nextURL, nil)  // Results in malformed URL
```

### Pitfall 3: Infinite Loop on Error

```go
// ❌ WRONG: Infinite loop if API always returns same next URL
for page.Next != "" {
    // If this fails, Next might not update, causing infinite loop
    resp, _ := client.Request("GET", page.Next, nil)
}
```

**Fix:** Add iteration limit or error handling:

```go
// ✅ CORRECT: Limit iterations
maxPages := 100
pageCount := 0
for page.Next != "" && pageCount < maxPages {
    // Fetch page
    pageCount++
}
```

---

## Related Documentation

- [client-implementation.md](client-implementation.md) - Client examples using pagination
- [rate-limiting.md](rate-limiting.md) - Rate limit considerations for pagination
- [error-handling.md](error-handling.md) - Error recovery during pagination
