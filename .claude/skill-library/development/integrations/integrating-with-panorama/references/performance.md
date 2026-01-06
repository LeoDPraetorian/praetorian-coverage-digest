# Panorama Performance Optimization

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

Panorama API performance depends on query complexity, device load, and network latency. This guide covers caching strategies, pagination, bulk operations, and connection optimization for high-performance integrations.

## Quick Reference

### Performance Guidelines

| Technique               | Impact | Complexity |
| ----------------------- | ------ | ---------- |
| Response caching        | High   | Low        |
| Connection pooling      | Medium | Low        |
| Pagination              | High   | Medium     |
| Bulk operations         | High   | Medium     |
| Selective XPath queries | High   | Low        |
| Parallel requests       | Medium | Medium     |

## Caching Strategies

### Response Cache

```go
package panorama

import (
    "context"
    "crypto/sha256"
    "encoding/hex"
    "sync"
    "time"
)

// CacheEntry stores a cached response
type CacheEntry struct {
    Data      []byte
    ExpiresAt time.Time
}

// ResponseCache caches API responses
type ResponseCache struct {
    mu      sync.RWMutex
    entries map[string]*CacheEntry
    ttl     time.Duration
    maxSize int
}

func NewResponseCache(ttl time.Duration, maxSize int) *ResponseCache {
    cache := &ResponseCache{
        entries: make(map[string]*CacheEntry),
        ttl:     ttl,
        maxSize: maxSize,
    }

    // Start cleanup goroutine
    go cache.cleanup()

    return cache
}

func (c *ResponseCache) Get(key string) ([]byte, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()

    entry, exists := c.entries[key]
    if !exists || time.Now().After(entry.ExpiresAt) {
        return nil, false
    }

    return entry.Data, true
}

func (c *ResponseCache) Set(key string, data []byte) {
    c.mu.Lock()
    defer c.mu.Unlock()

    // Evict if at capacity
    if len(c.entries) >= c.maxSize {
        c.evictOldest()
    }

    c.entries[key] = &CacheEntry{
        Data:      data,
        ExpiresAt: time.Now().Add(c.ttl),
    }
}

func (c *ResponseCache) Invalidate(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    delete(c.entries, key)
}

func (c *ResponseCache) InvalidatePrefix(prefix string) {
    c.mu.Lock()
    defer c.mu.Unlock()

    for key := range c.entries {
        if strings.HasPrefix(key, prefix) {
            delete(c.entries, key)
        }
    }
}

func (c *ResponseCache) cleanup() {
    ticker := time.NewTicker(1 * time.Minute)
    for range ticker.C {
        c.mu.Lock()
        now := time.Now()
        for key, entry := range c.entries {
            if now.After(entry.ExpiresAt) {
                delete(c.entries, key)
            }
        }
        c.mu.Unlock()
    }
}

func (c *ResponseCache) evictOldest() {
    var oldestKey string
    var oldestTime time.Time

    for key, entry := range c.entries {
        if oldestKey == "" || entry.ExpiresAt.Before(oldestTime) {
            oldestKey = key
            oldestTime = entry.ExpiresAt
        }
    }

    if oldestKey != "" {
        delete(c.entries, oldestKey)
    }
}

// GenerateCacheKey creates a consistent cache key from request params
func GenerateCacheKey(operation string, params url.Values) string {
    h := sha256.New()
    h.Write([]byte(operation))

    // Sort params for consistent keys
    keys := make([]string, 0, len(params))
    for k := range params {
        keys = append(keys, k)
    }
    sort.Strings(keys)

    for _, k := range keys {
        h.Write([]byte(k))
        for _, v := range params[k] {
            h.Write([]byte(v))
        }
    }

    return hex.EncodeToString(h.Sum(nil))
}
```

### Cache-Aware Client

```go
type CachingClient struct {
    *Client
    cache     *ResponseCache
    cacheable map[string]bool
}

func NewCachingClient(config ClientConfig) *CachingClient {
    return &CachingClient{
        Client: NewClient(config),
        cache:  NewResponseCache(5*time.Minute, 1000),
        cacheable: map[string]bool{
            "get":  true,
            "show": true,
        },
    }
}

func (c *CachingClient) Query(ctx context.Context, action string, xpath string) ([]byte, error) {
    params := url.Values{
        "type":   {"config"},
        "action": {action},
        "xpath":  {xpath},
    }

    // Check cache for cacheable operations
    if c.cacheable[action] {
        cacheKey := GenerateCacheKey(action, params)
        if cached, ok := c.cache.Get(cacheKey); ok {
            return cached, nil
        }

        // Fetch and cache
        result, err := c.makeRequest(ctx, params)
        if err != nil {
            return nil, err
        }

        c.cache.Set(cacheKey, result)
        return result, nil
    }

    return c.makeRequest(ctx, params)
}

// InvalidateOnWrite clears cache after write operations
func (c *CachingClient) Set(ctx context.Context, xpath string, element string) error {
    err := c.Client.Set(ctx, xpath, element)
    if err == nil {
        // Invalidate related cache entries
        c.cache.InvalidatePrefix(xpath)
    }
    return err
}
```

### TTL Recommendations

| Resource Type     | Recommended TTL | Rationale                 |
| ----------------- | --------------- | ------------------------- |
| Device inventory  | 5 minutes       | Rarely changes            |
| Security policies | 1 minute        | May be updated frequently |
| Address objects   | 2 minutes       | Moderate change frequency |
| System status     | 30 seconds      | Real-time data            |
| Commit status     | No cache        | Always fresh              |

## Pagination

### Paginated List Retrieval

```go
package panorama

// PaginationConfig configures pagination behavior
type PaginationConfig struct {
    PageSize   int
    MaxPages   int
    Concurrent bool
}

var DefaultPaginationConfig = PaginationConfig{
    PageSize:   100,
    MaxPages:   100,
    Concurrent: false,
}

// PaginatedResult holds paginated response data
type PaginatedResult struct {
    Items      []interface{}
    TotalCount int
    PageCount  int
}

// ListAll retrieves all items with pagination
func (c *Client) ListAll(ctx context.Context, xpath string, config PaginationConfig) (*PaginatedResult, error) {
    result := &PaginatedResult{
        Items: make([]interface{}, 0),
    }

    offset := 0
    for page := 0; page < config.MaxPages; page++ {
        params := url.Values{
            "type":   {"config"},
            "action": {"get"},
            "xpath":  {xpath},
            "offset": {strconv.Itoa(offset)},
            "limit":  {strconv.Itoa(config.PageSize)},
        }

        resp, err := c.makeRequest(ctx, params)
        if err != nil {
            return nil, fmt.Errorf("page %d failed: %w", page, err)
        }

        items, total, err := parsePaginatedResponse(resp)
        if err != nil {
            return nil, err
        }

        result.Items = append(result.Items, items...)
        result.TotalCount = total
        result.PageCount = page + 1

        // Check if we've retrieved everything
        if len(result.Items) >= total || len(items) < config.PageSize {
            break
        }

        offset += config.PageSize
    }

    return result, nil
}

// ListAllConcurrent retrieves pages concurrently
func (c *Client) ListAllConcurrent(ctx context.Context, xpath string, config PaginationConfig) (*PaginatedResult, error) {
    // First, get total count
    firstPage, err := c.getPage(ctx, xpath, 0, config.PageSize)
    if err != nil {
        return nil, err
    }

    totalCount := firstPage.TotalCount
    if totalCount <= config.PageSize {
        return firstPage, nil
    }

    // Calculate number of pages needed
    numPages := (totalCount + config.PageSize - 1) / config.PageSize
    if numPages > config.MaxPages {
        numPages = config.MaxPages
    }

    // Fetch remaining pages concurrently
    var wg sync.WaitGroup
    results := make([]*PaginatedResult, numPages)
    results[0] = firstPage
    errs := make([]error, numPages)

    for i := 1; i < numPages; i++ {
        wg.Add(1)
        go func(pageNum int) {
            defer wg.Done()
            offset := pageNum * config.PageSize
            results[pageNum], errs[pageNum] = c.getPage(ctx, xpath, offset, config.PageSize)
        }(i)
    }

    wg.Wait()

    // Check for errors and combine results
    combined := &PaginatedResult{
        Items:      make([]interface{}, 0, totalCount),
        TotalCount: totalCount,
        PageCount:  numPages,
    }

    for i, res := range results {
        if errs[i] != nil {
            return nil, fmt.Errorf("page %d failed: %w", i, errs[i])
        }
        combined.Items = append(combined.Items, res.Items...)
    }

    return combined, nil
}

func (c *Client) getPage(ctx context.Context, xpath string, offset, limit int) (*PaginatedResult, error) {
    params := url.Values{
        "type":   {"config"},
        "action": {"get"},
        "xpath":  {xpath},
        "offset": {strconv.Itoa(offset)},
        "limit":  {strconv.Itoa(limit)},
    }

    resp, err := c.makeRequest(ctx, params)
    if err != nil {
        return nil, err
    }

    items, total, err := parsePaginatedResponse(resp)
    if err != nil {
        return nil, err
    }

    return &PaginatedResult{
        Items:      items,
        TotalCount: total,
    }, nil
}
```

## Bulk Operations

### Multi-Config API

```go
// BulkCreate creates multiple objects in a single API call
func (c *Client) BulkCreate(ctx context.Context, objects []ConfigObject) error {
    if len(objects) == 0 {
        return nil
    }

    // Build multi-config XML
    var multiConfig strings.Builder
    multiConfig.WriteString("<multi-config>")

    for i, obj := range objects {
        multiConfig.WriteString(fmt.Sprintf(
            `<entry-%d>
                <type>config</type>
                <action>set</action>
                <xpath>%s</xpath>
                <element>%s</element>
            </entry-%d>`,
            i, obj.XPath, obj.Element, i,
        ))
    }

    multiConfig.WriteString("</multi-config>")

    params := url.Values{
        "type":    {"multi-config"},
        "element": {multiConfig.String()},
        "key":     {c.credentials.APIKey},
    }

    _, err := c.makeRequest(ctx, params)
    return err
}

// ConfigObject represents a configuration item
type ConfigObject struct {
    XPath   string
    Element string
}

// Example usage
func createAddressObjects(client *Client, addresses []Address) error {
    objects := make([]ConfigObject, len(addresses))
    for i, addr := range addresses {
        objects[i] = ConfigObject{
            XPath: fmt.Sprintf("/config/shared/address/entry[@name='%s']", addr.Name),
            Element: fmt.Sprintf(`<entry name="%s"><ip-netmask>%s</ip-netmask><description>%s</description></entry>`,
                addr.Name, addr.IPNetmask, addr.Description),
        }
    }

    return client.BulkCreate(context.Background(), objects)
}
```

### Batch Size Optimization

```go
const (
    OptimalBatchSize = 100  // Good balance of throughput and reliability
    MaxBatchSize     = 500  // API may reject larger batches
)

// BatchProcessor processes items in optimal batch sizes
type BatchProcessor struct {
    client    *Client
    batchSize int
}

func (p *BatchProcessor) ProcessAll(ctx context.Context, items []ConfigObject) error {
    for i := 0; i < len(items); i += p.batchSize {
        end := i + p.batchSize
        if end > len(items) {
            end = len(items)
        }

        batch := items[i:end]
        if err := p.client.BulkCreate(ctx, batch); err != nil {
            return fmt.Errorf("batch %d-%d failed: %w", i, end, err)
        }
    }

    return nil
}
```

## Connection Optimization

### Connection Pooling

```go
func NewOptimizedClient(config ClientConfig) *Client {
    transport := &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        MaxConnsPerHost:     20,
        IdleConnTimeout:     90 * time.Second,
        TLSHandshakeTimeout: 10 * time.Second,
        TLSClientConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
        },
    }

    return &Client{
        baseURL:     config.BaseURL,
        credentials: config.Credentials,
        httpClient: &http.Client{
            Transport: transport,
            Timeout:   30 * time.Second,
        },
    }
}
```

### Keep-Alive Configuration

```go
// Ensure connections are reused
func (c *Client) makeRequest(ctx context.Context, params url.Values) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, "GET",
        c.baseURL+"/api/?"+params.Encode(), nil)
    if err != nil {
        return nil, err
    }

    // Enable keep-alive
    req.Header.Set("Connection", "keep-alive")

    c.applyAuth(req)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Must read entire body for connection reuse
    return io.ReadAll(resp.Body)
}
```

## Query Optimization

### Selective XPath Queries

```go
// ❌ Bad: Fetch entire configuration tree
xpath := "/config"

// ✅ Good: Fetch only what you need
xpath := "/config/shared/address/entry[@name='web-servers']"

// ✅ Better: Fetch specific attributes
xpath := "/config/shared/address/entry[@name='web-servers']/ip-netmask"
```

### Filter Queries

```go
// Fetch only active rules
xpath := "/config/devices/entry[@name='localhost.localdomain']/device-group/entry[@name='Production']/pre-rulebase/security/rules/entry[disabled='no']"

// Fetch rules matching application
xpath := "/config/.../rules/entry[application/member='ssl']"
```

## Parallel Requests

### Concurrent Device Queries

```go
// QueryMultipleDevices queries multiple devices concurrently
func (c *Client) QueryMultipleDevices(ctx context.Context, devices []string, xpath string) (map[string][]byte, error) {
    results := make(map[string][]byte)
    var mu sync.Mutex
    var wg sync.WaitGroup

    // Limit concurrency
    sem := make(chan struct{}, 5)

    for _, device := range devices {
        wg.Add(1)
        go func(d string) {
            defer wg.Done()

            sem <- struct{}{}        // Acquire
            defer func() { <-sem }() // Release

            params := url.Values{
                "type":   {"config"},
                "action": {"get"},
                "xpath":  {xpath},
                "target": {d},
            }

            data, err := c.makeRequest(ctx, params)
            if err != nil {
                return // Log error in production
            }

            mu.Lock()
            results[d] = data
            mu.Unlock()
        }(device)
    }

    wg.Wait()
    return results, nil
}
```

## Performance Monitoring

### Request Timing

```go
type TimedClient struct {
    *Client
    histogram *RequestHistogram
}

type RequestHistogram struct {
    mu      sync.Mutex
    buckets []time.Duration
    counts  []int
}

func (c *TimedClient) makeTimedRequest(ctx context.Context, params url.Values) ([]byte, error) {
    start := time.Now()
    defer func() {
        c.histogram.Record(time.Since(start))
    }()

    return c.Client.makeRequest(ctx, params)
}

func (h *RequestHistogram) Record(duration time.Duration) {
    h.mu.Lock()
    defer h.mu.Unlock()

    for i, bucket := range h.buckets {
        if duration <= bucket {
            h.counts[i]++
            return
        }
    }
    h.counts[len(h.counts)-1]++ // Overflow bucket
}

func (h *RequestHistogram) Percentile(p float64) time.Duration {
    // Implementation for p50, p95, p99 calculations
    // ...
}
```

## Best Practices Summary

1. **Cache aggressively** - Most configuration data is read-heavy
2. **Use selective XPath** - Never fetch `/config` directly
3. **Batch write operations** - Use multi-config for bulk updates
4. **Pool connections** - Reuse HTTP connections
5. **Paginate large results** - Use offset/limit parameters
6. **Parallelize carefully** - Respect rate limits when concurrent
7. **Monitor performance** - Track p95/p99 latencies

## Related References

- [Rate Limiting](rate-limiting.md) - Avoid hitting limits
- [Error Handling](error-handling.md) - Handle timeouts gracefully
- [API Reference](api-reference.md) - Efficient query patterns
