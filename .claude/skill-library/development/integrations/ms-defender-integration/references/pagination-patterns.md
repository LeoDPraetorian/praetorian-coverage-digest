# Microsoft Graph API Pagination Patterns

Microsoft Graph API uses OData-style pagination with `@odata.nextLink` tokens.

## TODO

- [ ] Document `$top` query parameter usage
- [ ] Add `@odata.nextLink` pagination loop example
- [ ] Document page size recommendations (100-1000 records)
- [ ] Add rate limiting considerations
- [ ] Include example of handling large alert datasets (10k+ alerts)
- [ ] Document concurrent pagination with errgroup pattern

## Pagination Pattern

```go
// TODO: Add complete pagination implementation example
// Reference: integration-chariot-patterns skill for pagination strategies
```

## Quick Links

- [Microsoft Graph Paging](https://learn.microsoft.com/en-us/graph/paging)
- [OData Query Parameters](https://learn.microsoft.com/en-us/graph/query-parameters)
