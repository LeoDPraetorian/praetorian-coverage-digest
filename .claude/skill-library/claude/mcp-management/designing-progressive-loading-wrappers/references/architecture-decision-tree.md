# Architecture Decision Tree

Systematic guidance for deciding which progressive loading patterns to apply.

## Primary Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│ Is this a wrapper for an MCP server or API SDK?                 │
├────────────────┬────────────────────────────────────────────────┤
│ No             │ Not applicable - use other architectural       │
│                │ patterns for non-wrapper scenarios             │
├────────────────┴────────────────────────────────────────────────┤
│ Yes ↓                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ How many tools/endpoints will the wrapper expose?               │
├────────────────┬────────────────────────────────────────────────┤
│ < 5 tools      │ Progressive loading OPTIONAL                   │
│                │ Minimal impact, simpler architecture acceptable│
├────────────────┼────────────────────────────────────────────────┤
│ 5-20 tools     │ Progressive loading RECOMMENDED                │
│                │ Meaningful token savings, worth the complexity │
├────────────────┼────────────────────────────────────────────────┤
│ > 20 tools     │ Progressive loading + Lazy discovery MANDATORY │
│                │ Essential for scalability                      │
└────────────────┴────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Do tools return collections (lists, paginated data)?            │
├────────────────┬────────────────────────────────────────────────┤
│ No             │ Skip collection filtering                      │
├────────────────┼────────────────────────────────────────────────┤
│ Yes            │ IMPLEMENT: Summary + Limited Items pattern     │
│                │ Default limit: 20 items                        │
│                │ Include: total_count, has_more, pagination     │
└────────────────┴────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Do responses include large text fields (>500 chars)?            │
├────────────────┬────────────────────────────────────────────────┤
│ No             │ Skip truncation                                │
├────────────────┼────────────────────────────────────────────────┤
│ Yes            │ IMPLEMENT: Field Truncation pattern            │
│                │ Default: 500 chars with "... [truncated]"      │
│                │ Add: getFullField tool for complete content    │
└────────────────┴────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Do responses include nested relationships (graph APIs)?         │
├────────────────┬────────────────────────────────────────────────┤
│ No             │ Skip suppression                               │
├────────────────┼────────────────────────────────────────────────┤
│ Yes            │ IMPLEMENT: Nested Resource Suppression         │
│                │ Replace nested objects with ID references      │
│                │ Add: separate tools for relationship access    │
└────────────────┴────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Is token efficiency critical for performance?                   │
├────────────────┬────────────────────────────────────────────────┤
│ No             │ Implement only patterns that apply above       │
├────────────────┼────────────────────────────────────────────────┤
│ Yes            │ IMPLEMENT: Token Estimation in all responses   │
│                │ Add: tokenEstimate object with reduction %     │
│                │ Consider: Token budget enforcement             │
└────────────────┴────────────────────────────────────────────────┘
```

## Pattern Selection Matrix

Quick reference for which patterns to apply:

| Wrapper Characteristics        | Progressive Loading | Collection Filtering | Truncation  | Suppression | Token Estimation |
| ------------------------------ | ------------------- | -------------------- | ----------- | ----------- | ---------------- |
| Small (< 5 tools), simple data | Optional            | If applicable        | If needed   | If needed   | Optional         |
| Medium (5-20 tools), REST API  | Recommended         | Required             | Recommended | If needed   | Recommended      |
| Large (20+ tools), GraphQL     | Required            | Required             | Required    | Required    | Required         |
| Performance-critical           | Required            | Required             | Required    | Required    | Required         |

## Detailed Decision Criteria

### When to Use Progressive Loading

**Required when:**

- More than 20 tools
- Session startup time matters
- Context window conservation is critical
- Multi-tenant deployments (many sessions)

**Recommended when:**

- 5-20 tools
- Tools have complex schemas
- Some tools rarely used

**Optional when:**

- Fewer than 5 tools
- All tools used frequently
- Schema definitions small

### When to Use Summary + Limited Items

**Required when:**

- Endpoints can return 100+ items
- Paginated APIs
- Search/filter endpoints

**Consider adjusting default limit based on:**

- Item size (tokens per item)
- Typical use case needs
- Token budget constraints

| Item Size (tokens) | Recommended Default Limit |
| ------------------ | ------------------------- |
| < 50               | 50 items                  |
| 50-200             | 20 items                  |
| 200-500            | 10 items                  |
| > 500              | 5 items                   |

### When to Use Field Truncation

**Required when:**

- Fields commonly exceed 500 characters
- Fields are text-heavy (descriptions, bodies, logs)
- Full content rarely needed for initial understanding

**Truncation thresholds by field type:**

| Field Type     | Recommended Max | Rationale                        |
| -------------- | --------------- | -------------------------------- |
| Title          | No truncation   | Usually short, always needed     |
| Description    | 500 chars       | Summary sufficient for decisions |
| Body/Content   | 500 chars       | Full text rarely needed upfront  |
| Logs/Output    | 1000 chars      | Recent entries most relevant     |
| Error messages | 500 chars       | Key info at beginning            |
| Comments       | 300 chars       | Per-comment truncation           |

### When to Use Nested Resource Suppression

**Required when:**

- GraphQL or graph database APIs
- Relationships can be 3+ levels deep
- Related objects have substantial size

**Suppression strategies by relationship type:**

| Relationship       | Strategy                                |
| ------------------ | --------------------------------------- |
| One-to-one (owner) | ID only: `{ ownerId: "..." }`           |
| One-to-many        | Count + IDs: `{ commentCount: 5 }`      |
| Many-to-many       | ID array: `{ labelIds: ["...", "..."]}` |
| Deep nesting       | Separate tool                           |

## Architecture Templates

### Template: REST API Wrapper (20+ endpoints)

```
Architecture:
├── Progressive loading: REQUIRED
│   └── File-based tool discovery
├── Collection filtering: REQUIRED
│   └── Summary + Limited Items (default: 20)
├── Field truncation: RECOMMENDED
│   └── 500 char max for descriptions
├── Nested suppression: IF APPLICABLE
│   └── ID references for relationships
└── Token estimation: REQUIRED
    └── Include in all responses
```

### Template: GraphQL API Wrapper

```
Architecture:
├── Progressive loading: REQUIRED
│   └── Manifest-based discovery
├── Collection filtering: REQUIRED
│   └── Summary + Limited Items (default: 10)
├── Field truncation: REQUIRED
│   └── 500 char max for text fields
├── Nested suppression: REQUIRED
│   └── Flatten all relationships to IDs
│   └── Separate tools for each relationship
└── Token estimation: REQUIRED
    └── Baseline comparison critical
```

### Template: Small Utility Wrapper (< 5 tools)

```
Architecture:
├── Progressive loading: OPTIONAL
│   └── Eager loading acceptable
├── Collection filtering: IF APPLICABLE
│   └── Summary + Limited Items
├── Field truncation: IF APPLICABLE
│   └── Standard truncation
├── Nested suppression: IF APPLICABLE
│   └── Standard suppression
└── Token estimation: OPTIONAL
    └── Nice to have for visibility
```

## Related Patterns

- [Progressive Loading Examples](progressive-loading-examples.md) - Implementation
- [Response Filtering Patterns](response-filtering-patterns.md) - Collection handling
- [Validation Checklist](validation-checklist.md) - Verify decisions
