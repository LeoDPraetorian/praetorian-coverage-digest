# Performance Optimization

Performance patterns for Burp integration.

## Connection Pooling

```go
// Reuse HTTPClient across operations
httpClient := web.NewHTTPClient(nil)
client := NewBurpEnterpriseClient(httpClient, token, baseURL)
```

## Site Tree Caching

```go
// Tree cached on client instance
tree, _ := client.Tree() // First call: API request
tree, _ := client.Tree() // Subsequent calls: cache hit
```

Invalidate after tree modifications:
```go
c.tree = nil
```

## Pagination

```go
offset := 0
limit := 100

for !done {
    result, _ := client.ListScans(offset, limit)
    offset += limit
}
```

## Concurrent Operations

```go
g, ctx := errgroup.WithContext(ctx)

for _, siteID := range siteIDs {
    siteID := siteID
    g.Go(func() error {
        return client.CreateOnDemandSiteSchedule(siteID, configID)
    })
}

err := g.Wait()
```

## Related References

- [Client Architecture](client-architecture.md) - Caching strategy
- [Scan Lifecycle Management](scan-lifecycle.md) - Parallel scan monitoring
