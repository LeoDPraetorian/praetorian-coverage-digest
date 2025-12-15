# Result Processing

Complete guide to processing Burp scan results and converting to Chariot models.

## Overview

Result processing converts Burp entities to Tabularium models:
- **Issues** → `model.Risk` (vulnerabilities)
- **Scanned Items** → `model.Attribute` (discovered endpoints)

## GetEntities Pattern

```go
func (c *BurpEnterpriseClient) GetEntities(scanID string) (*Entities, error) {
    // 1. Fetch issues
    issues, err := c.ListIssues(scanID)
    if err != nil {
        return nil, fmt.Errorf("failed to list issues: %w", err)
    }

    // 2. Fetch scanned items
    scannedItems, err := c.ListScannedItems(scanID)
    if err != nil {
        return nil, fmt.Errorf("failed to list scanned items: %w", err)
    }

    // 3. Convert to Chariot models
    risks := convertIssuesToRisks(scanID, issues)
    attributes := convertScannedItemsToAttributes(scannedItems)

    return &Entities{
        Risks:      risks,
        Attributes: attributes,
    }, nil
}
```

## Issue Conversion

See implementation in `convert.go` for complete conversion logic including:
- Severity mapping (high/medium/low/info → numerical scores)
- Evidence extraction (HTTP requests/responses)
- HTML content sanitization
- Tabularium model population

## Scanned Item Conversion

Converts discovered endpoints to URL attributes for asset enrichment.

## Related References

- [GraphQL Schema](graphql-schema.md) - Issue and scanned item queries
- [Entity Relationships](entity-relationships.md) - Issue/scanned item structure
