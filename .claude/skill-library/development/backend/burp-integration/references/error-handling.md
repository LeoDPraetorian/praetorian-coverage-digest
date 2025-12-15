# Error Handling

Error handling patterns for Burp GraphQL integration.

## Standard Error Wrapping

```go
if err != nil {
    return nil, fmt.Errorf("operation failed: %w", err)
}
```

## Empty ID Validation

```go
if result.CreateSite.Site.ID == "" {
    return nil, fmt.Errorf("failed to create site (Burp DAST API error)")
}
```

## Input Validation

```go
if siteID == "" || configID == "" {
    return nil, fmt.Errorf("site id and config id are required")
}

valid, err := c.validateScanConfiguration(configID)
if !valid {
    return nil, fmt.Errorf("invalid scan configuration: %s", configID)
}
```

## Context Propagation

Always use `context.Context` for cancellation and timeouts:

```go
func MonitorScan(ctx context.Context, client *burp.BurpEnterpriseClient, scanID string) error {
    select {
    case <-ctx.Done():
        return ctx.Err()
    case <-ticker.C:
        // Continue monitoring
    }
}
```

## Related References

- [Client Architecture](client-architecture.md) - Error handling patterns
- [Scan Lifecycle Management](scan-lifecycle.md) - Timeout and cancellation
